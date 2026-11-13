import { prisma } from "./prisma";
import { buildTimesheetCompliance } from "./timesheetCompliance";

/**
 * Daily HR reminder sweep.
 *
 * The self-service agenda only helps people who open the page, so the same due
 * dates are pushed into the notification bell. Every reminder is de-duplicated
 * per person per day, and only obligations that apply to the person's
 * profession are raised (a licence reminder only exists if they enrolled one).
 */

const DAY = 86_400_000;
const WINDOW_DAYS = 30;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const fmt = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export type ReminderResult = { sent: number; skipped: number };

export async function runHrReminders(): Promise<ReminderResult> {
  const today = startOfToday();
  const cutoff = new Date(today.getTime() + WINDOW_DAYS * DAY);
  const result: ReminderResult = { sent: 0, skipped: 0 };

  const send = async (recipient: string, title: string, body: string) => {
    const existing = await prisma.notification.findFirst({
      where: { recipient, title, createdAt: { gte: today } },
      select: { id: true },
    });
    if (existing) {
      result.skipped += 1;
      return;
    }
    await prisma.notification.create({
      data: { recipient, type: "HR_DEADLINE", title, body, link: "/my-hr" },
    });
    result.sent += 1;
  };

  // Credentials that expire or have expired (training records and HR documents).
  const [training, documents] = await Promise.all([
    prisma.training.findMany({
      where: { expiresAt: { lte: cutoff } },
      include: { user: { select: { username: true } } },
    }),
    prisma.staffDocument.findMany({
      where: { expiresAt: { lte: cutoff } },
      include: { user: { select: { username: true } } },
    }),
  ]);

  for (const record of training) {
    if (!record.expiresAt) continue;
    const expired = record.expiresAt < today;
    await send(
      record.user.username,
      `${expired ? "Expired" : "Expiring"}: ${record.title}`,
      expired
        ? `Your ${record.title} certificate expired on ${fmt(record.expiresAt)}. Book the renewal to stay compliant.`
        : `Your ${record.title} certificate expires on ${fmt(record.expiresAt)}. Book the renewal in time.`
    );
  }

  for (const document of documents) {
    if (!document.expiresAt) continue;
    const expired = document.expiresAt < today;
    await send(
      document.user.username,
      `${expired ? "Expired" : "Expiring"}: ${document.title}`,
      expired
        ? `${document.title} expired on ${fmt(document.expiresAt)}. Upload the renewed document.`
        : `${document.title} expires on ${fmt(document.expiresAt)}. Upload the renewal when you receive it.`
    );
  }

  // Timesheet gate reminders. The reporting obligations are checked before
  // the nudge, so each person receives the actual reason they are blocked as
  // well as the deadline. Reminders go out at T-5, T-2, on the due date and
  // once the period is overdue.
  const setting = await prisma.timesheetSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  const submissionDay = setting?.submissionDay ?? 25;
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const deadline = new Date(year, month - 1, Math.min(28, submissionDay));
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / DAY);

  const reminderDays = new Set([5, 2, 0, -1, -7]);
  if (reminderDays.has(daysLeft)) {
    const [staff, sheets] = await Promise.all([
      prisma.user.findMany({ where: { role: { not: "viewer" } }, select: { id: true, username: true } }),
      prisma.timesheet.findMany({ where: { month, year }, select: { userId: true, status: true } }),
    ]);
    const done = new Set(
      sheets
        .filter((sheet) => ["SUBMITTED", "FORWARDED", "APPROVED"].includes(sheet.status))
        .map((sheet) => sheet.userId)
    );
    for (const member of staff) {
      if (done.has(member.id)) continue;
      const compliance = await buildTimesheetCompliance(member.id, month, year);
      const when =
        daysLeft === 0
          ? "is due today"
          : daysLeft > 0
            ? `is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${fmt(deadline)})`
            : `was due on ${fmt(deadline)} and is now overdue`;
      const reason = compliance.blockers.length
        ? ` Before submitting, complete: ${compliance.blockers.map((blocker) => blocker.title).slice(0, 2).join("; ")}${compliance.blockers.length > 2 ? ` and ${compliance.blockers.length - 2} more` : ""}.`
        : " Your reporting obligations are clear, so you can sign and submit.";
      await send(
        member.username,
        `Timesheet ${daysLeft < 0 ? "overdue" : daysLeft === 0 ? "due today" : `due in ${daysLeft} days`} · ${fmt(deadline)}`,
        `Your timesheet for ${new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })} ${when}.${reason}`
      );
    }
  }

  // Early in a new month, chase last month's unsubmitted sheet once. This is
  // deliberately limited to the first three days so it cannot become spam.
  if (today.getDate() <= 3) {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousDeadline = new Date(previousYear, previousMonth - 1, Math.min(28, submissionDay));
    const sheets = await prisma.timesheet.findMany({
      where: { month: previousMonth, year: previousYear, status: { notIn: ["SUBMITTED", "APPROVED"] } },
      include: { user: { select: { id: true, username: true } } },
    });
    for (const sheet of sheets) {
      const compliance = await buildTimesheetCompliance(sheet.user.id, previousMonth, previousYear);
      const reasons = compliance.blockers.length
        ? ` Clear ${compliance.blockers.length} overdue reporting obligation${compliance.blockers.length === 1 ? "" : "s"} first: ${compliance.blockers[0].title}${compliance.blockers.length > 1 ? "…" : ""}.`
        : " Your reporting obligations are clear.";
      await send(
        sheet.user.username,
        `Previous timesheet outstanding · ${fmt(previousDeadline)}`,
        `Your ${new Date(previousYear, previousMonth - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })} timesheet is still unsubmitted.${reasons}`
      );
    }
  }

  return result;
}
