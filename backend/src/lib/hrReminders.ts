import { prisma } from "./prisma";

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

  // Timesheet deadline, a few days ahead so people have time to fill it in.
  const setting = await prisma.timesheetSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  const submissionDay = setting?.submissionDay ?? 25;
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const deadline = new Date(year, month - 1, submissionDay);
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / DAY);

  if (daysLeft >= 0 && daysLeft <= 3) {
    const [staff, sheets] = await Promise.all([
      prisma.user.findMany({ where: { role: { not: "viewer" } }, select: { id: true, username: true } }),
      prisma.timesheet.findMany({ where: { month, year }, select: { userId: true, status: true } }),
    ]);
    const done = new Set(
      sheets.filter((sheet) => sheet.status === "SUBMITTED" || sheet.status === "APPROVED").map((sheet) => sheet.userId)
    );
    for (const member of staff) {
      if (done.has(member.id)) continue;
      await send(
        member.username,
        `Timesheet due ${fmt(deadline)}`,
        `Your timesheet for ${new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })} is due in ${daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}.`
      );
    }
  }

  return result;
}
