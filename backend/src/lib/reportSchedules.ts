import { prisma } from "./prisma";
import { buildConsolidatedReport } from "./consolidatedReport";
import { mailConfigured, sendMail } from "./mailer";

export const SCHEDULE_FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Next delivery date for a frequency, always in the future. */
export function nextRunFor(frequency: string, from: Date = new Date()): Date {
  const next = new Date(from);
  next.setHours(7, 0, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  switch (frequency) {
    case "WEEKLY":
      return next;
    case "QUARTERLY":
      return addDays(next, 90);
    case "MONTHLY":
    default:
      next.setMonth(next.getMonth() + 1);
      return next;
  }
}

export function reportLink(input: { type: string; planId?: string | null }) {
  const base = (process.env.APP_PUBLIC_URL || process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
  const query = new URLSearchParams({ type: input.type });
  if (input.planId) query.set("planId", input.planId);
  return `${base}/consolidated-reports?${query.toString()}`;
}

async function deliverSchedule(schedule: {
  id: string;
  type: string;
  planId: string | null;
  recipients: string[];
  frequency: string;
  lastRunAt: Date | null;
  nextRunAt: Date;
}) {
  const type = schedule.type as "AOP" | "STRATEGIC" | "ROADMAP";
  const report = await buildConsolidatedReport({
    type,
    planId: schedule.planId || undefined,
    generatedBy: "Scheduled delivery",
  });
  const link = reportLink({ type: schedule.type, planId: schedule.planId });

  let mail: { status: string; error?: string } = { status: "SKIPPED" };
  if (schedule.recipients.length) {
    const title = report?.meta.title || `Consolidated ${schedule.type} report`;
    const period = report?.meta.periodLabel || "current period";
    const completion = report ? `${report.headline.completion}%` : "not available";
    mail = await sendMail({
      to: schedule.recipients,
      subject: `${title} · ${period}`,
      html: `
        <p>The scheduled consolidated report is ready.</p>
        <p><strong>${title}</strong><br/>Period: ${period}<br/>Overall delivery: ${completion}</p>
        <p><a href="${link}">Open the report</a></p>
        <p style="color:#666;font-size:12px">Sent automatically by the BEMS planning system.</p>
      `,
      text: `${title} (${period}) — overall delivery ${completion}. Open: ${link}`,
    });
  }

  const ranAt = new Date();
  await prisma.reportSchedule.update({
    where: { id: schedule.id },
    data: { lastRunAt: ranAt, nextRunAt: nextRunFor(schedule.frequency, ranAt) },
  });
  return { reportFound: Boolean(report), mailStatus: mail.status, mailError: mail.error, link };
}

/** Delivery loop for the background job and the manual "send now" action. */
export async function runDueReportSchedules() {
  const due = await prisma.reportSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: "asc" },
    take: 25,
  });
  const summary = { evaluated: due.length, sent: 0, skipped: 0, failed: 0, errors: [] as string[] };
  for (const schedule of due) {
    try {
      const result = await deliverSchedule(schedule);
      if (result.mailStatus === "SENT") summary.sent++;
      else if (result.mailStatus === "FAILED") {
        summary.failed++;
        summary.errors.push(`${schedule.id}: ${result.mailError || "mail failed"}`);
      } else summary.skipped++;
    } catch (error) {
      summary.failed++;
      summary.errors.push(`${schedule.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { ...summary, mailConfigured: mailConfigured() };
}

/** Send one schedule immediately, regardless of its next run date. */
export async function runScheduleNow(id: string) {
  const schedule = await prisma.reportSchedule.findUnique({ where: { id } });
  if (!schedule) throw new Error("Report schedule not found.");
  const result = await deliverSchedule(schedule);
  return { ...result, mailConfigured: mailConfigured() };
}
