import { prisma } from "./prisma";
import { logAudit } from "./audit";

const REMINDER_TYPE = "QMS_REVIEW_DUE";
const REMINDER_WINDOW_DAYS = 30;
const DEDUPE_DAYS = 7;

/**
 * Notify owners of approved documents whose periodic review falls inside the
 * next 30 days. Reminders are suppressed for seven days per document so the
 * daily scheduler cannot flood the notification bell.
 */
export async function runQmsReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + REMINDER_WINDOW_DAYS);

  const due = await prisma.qmsDocument.findMany({
    where: {
      status: "APPROVED",
      reviewDueAt: { not: null, lte: cutoff },
    },
    select: {
      id: true,
      code: true,
      title: true,
      version: true,
      reviewDueAt: true,
      owner: { select: { username: true } },
    },
    orderBy: { reviewDueAt: "asc" },
  });

  if (due.length === 0) return { sent: 0 };

  const dedupeSince = new Date(now);
  dedupeSince.setDate(dedupeSince.getDate() - DEDUPE_DAYS);

  let sent = 0;
  for (const document of due) {
    if (!document.owner?.username || !document.reviewDueAt) continue;
    const link = `/qms/documents/${document.id}`;

    try {
      const recent = await prisma.notification.findFirst({
        where: {
          recipient: document.owner.username,
          type: REMINDER_TYPE,
          link,
          createdAt: { gte: dedupeSince },
        },
        select: { id: true },
      });
      if (recent) continue;

      const dueDate = document.reviewDueAt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      await prisma.notification.create({
        data: {
          recipient: document.owner.username,
          type: REMINDER_TYPE,
          title: `QMS review due: ${document.code} v${document.version}`,
          body: `${document.title} is due for periodic review on ${dueDate}. Open the register to plan the review.`,
          link,
        },
      });
      await logAudit("QMS", "QMS_REVIEW_REMINDER", "system", {
        documentId: document.id,
        code: document.code,
        version: document.version,
        reviewDueAt: document.reviewDueAt.toISOString().slice(0, 10),
        recipient: document.owner.username,
      });
      sent += 1;
    } catch (error) {
      console.error(`[qms-reminders] failed for document ${document.id}`, error);
    }
  }

  return { sent };
}
