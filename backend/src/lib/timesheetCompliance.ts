import { prisma } from "./prisma";

export type ComplianceBlocker = {
  id: string;
  type: "REPORT" | "PROGRESS_UPDATE";
  title: string;
  reason: string;
  dueAt: string;
  plan?: string | null;
  reference?: string | null;
  link: string;
};

export type TimesheetCompliance = {
  month: number;
  year: number;
  periodLabel: string;
  submissionDay: number;
  deadline: string;
  submitted: boolean;
  canSubmit: boolean;
  blockers: ComplianceBlocker[];
  message: string;
};

function variantSet(user: {
  firstName?: string | null;
  lastName?: string | null;
  username: string;
}) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return [...new Set([user.username, full, `${user.firstName || ""} ${user.lastName || ""}`.trim()].filter(Boolean))];
}

function sameOwner(owner: string | null | undefined, variants: string[]) {
  if (!owner) return false;
  const normal = owner.toLowerCase().replace(/\s+/g, " ").trim();
  return variants.some((variant) => variant.toLowerCase().replace(/\s+/g, " ").trim() === normal);
}

export async function buildTimesheetCompliance(
  userId: string,
  month: number,
  year: number
): Promise<TimesheetCompliance> {
  const [user, setting, timesheet] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, username: true },
    }),
    prisma.timesheetSetting.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.timesheet.findUnique({
      where: { userId_month_year: { userId, month, year } },
      select: { status: true },
    }),
  ]);
  const submissionDay = setting?.submissionDay ?? 25;
  // The reporting day is inclusive: staff may submit throughout the due date.
  const deadline = new Date(year, month - 1, Math.min(28, submissionDay), 23, 59, 59, 999);
  const periodLabel = new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
  if (!user) {
    return {
      month,
      year,
      periodLabel,
      submissionDay,
      deadline: deadline.toISOString(),
      submitted: false,
      canSubmit: false,
      blockers: [],
      message: "Your staff record could not be found.",
    };
  }
  const variants = variantSet(user);
  const today = new Date();
  const blockers: ComplianceBlocker[] = [];

  // Reporting obligations owned by this person that are past their due date.
  const reports = await prisma.planReport.findMany({
    where: {
      status: { in: ["Pending"] },
      dueDate: { lt: today },
    },
    include: { plan: { select: { title: true, periodLabel: true } } },
    orderBy: { dueDate: "asc" },
    take: 50,
  });
  for (const report of reports) {
    if (!sameOwner(report.owner, variants)) continue;
    blockers.push({
      id: `report-${report.id}`,
      type: "REPORT",
      title: `${report.title} · ${report.periodLabel}`,
      reason: `The ${report.type.toLowerCase()} report was due on ${report.dueDate.toLocaleDateString("en-GB")} and is still pending.`,
      dueAt: report.dueDate.toISOString(),
      plan: report.plan.title,
      reference: report.type,
      link: "/reports",
    });
  }

  // Plan activities and milestones owned by this person that are overdue and
  // have no verified progress update. This is the "updates" side of the gate.
  const items = await prisma.planItem.findMany({
    where: {
      kind: { in: ["ACTIVITY", "MILESTONE"] },
      endDate: { lt: today },
      status: { notIn: ["Completed", "Cancelled"] },
    },
    include: {
      plan: { select: { id: true, title: true, periodLabel: true, startDate: true } },
      progressUpdates: {
        where: { status: { in: ["Verified", "Reviewed"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { endDate: "asc" },
    take: 120,
  });
  for (const item of items) {
    if (!sameOwner(item.owner, variants)) continue;
    if (item.progress >= 100) continue;
    const latest = item.progressUpdates[0];
    if (latest && latest.updatedAt >= (item.endDate || item.plan.startDate)) continue;
    blockers.push({
      id: `item-${item.id}`,
      type: "PROGRESS_UPDATE",
      title: item.title,
      reason: `This ${item.kind.toLowerCase()} passed its ${(item.endDate || today).toLocaleDateString("en-GB")} due date at ${item.progress}% with no verified progress update.`,
      dueAt: (item.endDate || today).toISOString(),
      plan: `${item.plan.title} · ${item.plan.periodLabel}`,
      reference: item.code,
      link: `/progress-updates?planId=${encodeURIComponent(item.plan.id)}&itemId=${encodeURIComponent(item.id)}`,
    });
  }

  const submitted = ["SUBMITTED", "FORWARDED", "APPROVED"].includes(timesheet?.status || "");
  const blockerCount = blockers.length;
  const message = submitted
    ? `Your ${periodLabel} timesheet is already submitted.`
    : blockerCount
      ? `Complete ${blockerCount} overdue reporting obligation${blockerCount === 1 ? "" : "s"} before submitting your ${periodLabel} timesheet.`
      : `No overdue reports or progress updates. Your ${periodLabel} timesheet can be submitted.`;
  return {
    month,
    year,
    periodLabel,
    submissionDay,
    deadline: deadline.toISOString(),
    submitted,
    canSubmit: !submitted && blockerCount === 0,
    blockers,
    message,
  };
}
