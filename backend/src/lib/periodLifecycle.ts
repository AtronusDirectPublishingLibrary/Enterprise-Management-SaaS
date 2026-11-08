import { prisma } from "./prisma";
import { commitRollover } from "./periodRollover";
import {
  PERIOD_CADENCE,
  ensurePlanPeriod,
  recordTransition,
  type PeriodType,
} from "./planPeriods";

const DAY_MS = 86_400_000;

export interface LifecycleSummary {
  now: string;
  dryRun: boolean;
  scanned: number;
  prepared: string[];
  activated: string[];
  closed: string[];
  archived: string[];
  notifications: string[];
  warnings: string[];
}

const label = (period: { type: string; label: string }) => `${period.type} ${period.label}`;

const cadenceFor = (type: string) =>
  PERIOD_CADENCE[(type as PeriodType) in PERIOD_CADENCE ? (type as PeriodType) : "AOP"];

const daysUntil = (date: Date, now: Date) => Math.ceil((date.getTime() - now.getTime()) / DAY_MS);

async function notifyPeriod(
  periodId: string,
  title: string,
  body: string,
  dedupeKey: string,
  recipients: string[],
  actor: string
) {
  if (!recipients.length) return false;
  const already = await prisma.periodTransition.findUnique({ where: { dedupeKey } });
  if (already) return false;

  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      recipient,
      type: "PERIOD",
      title,
      body,
      link: "/database/aop",
    })),
  });
  await recordTransition({ periodId, action: "NOTIFY", dedupeKey, actor, note: title });
  return true;
}

async function recipientsFor(owner?: string | null) {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { username: true },
  });
  const set = new Set(admins.map((admin) => admin.username));
  if (owner) set.add(owner);
  return [...set];
}

/**
 * Daily planning-period watch. Everything it does is recorded in the transition
 * ledger, so running it twice on the same day changes nothing.
 *
 * Order matters: close what has ended, archive closed periods whose successor is
 * live, activate what has started (only once approved), then prepare successors
 * ahead of the end date.
 */
export async function runPeriodLifecycle(
  options: { now?: Date; dryRun?: boolean; actor?: string } = {}
): Promise<LifecycleSummary> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const actor = options.actor ?? "system";

  const summary: LifecycleSummary = {
    now: now.toISOString(),
    dryRun,
    scanned: 0,
    prepared: [],
    activated: [],
    closed: [],
    archived: [],
    notifications: [],
    warnings: [],
  };

  // Lazily give historic plans their period record.
  if (!dryRun) {
    const unlinked = await prisma.plan.findMany({
      where: { periodId: null },
      select: { id: true },
    });
    for (const plan of unlinked) {
      try {
        await ensurePlanPeriod(plan.id, actor);
      } catch (error) {
        summary.warnings.push(
          `Could not create a period for plan ${plan.id}: ${(error as Error).message}`
        );
      }
    }
  }

  // ── 1. Close periods that have ended ───────────────────────────────────────
  const expired = await prisma.planPeriod.findMany({
    where: { state: { in: ["Active", "Closing"] }, endDate: { lt: now } },
    include: {
      plan: { select: { id: true, status: true, owner: true, title: true } },
      successor: { select: { id: true, state: true, label: true } },
    },
    orderBy: { endDate: "asc" },
  });
  summary.scanned += expired.length;

  for (const period of expired) {
    summary.closed.push(label(period));
    if (dryRun) continue;

    await prisma.planPeriod.update({
      where: { id: period.id },
      data: { state: "Closed", closedAt: period.closedAt ?? now },
    });
    if (period.plan?.id && ["Active", "Approved"].includes(period.plan.status)) {
      await prisma.plan.update({
        where: { id: period.plan.id },
        data: { status: "Closed" },
      });
    } else if (period.plan) {
      summary.warnings.push(
        `${label(period)} ended while its plan was still "${period.plan.status}".`
      );
    }
    await recordTransition({
      periodId: period.id,
      action: "CLOSE",
      dedupeKey: `close:${period.id}`,
      actor,
      note: `Period ended ${period.endDate.toISOString().slice(0, 10)}`,
    });

    if (period.successor && ["Active", "Preparing"].includes(period.successor.state)) {
      await notifyPeriod(
        period.id,
        `Planning period closed: ${label(period)}`,
        `${label(period)} has ended. Its successor ${period.successor.label} is ${period.successor.state.toLowerCase()}.`,
        `notify:closed:${period.id}`,
        await recipientsFor(period.plan?.owner),
        actor
      );
    }
  }

  // ── 2. Archive closed periods whose successor is live ──────────────────────
  const archivable = await prisma.planPeriod.findMany({
    where: { state: "Closed", successor: { state: "Active" } },
    select: { id: true, type: true, label: true },
  });
  for (const period of archivable) {
    summary.archived.push(label(period));
    if (dryRun) continue;
    await prisma.planPeriod.update({ where: { id: period.id }, data: { state: "Archived" } });
    await recordTransition({
      periodId: period.id,
      action: "ARCHIVE",
      dedupeKey: `archive:${period.id}`,
      actor,
      note: "Successor period is active",
    });
  }

  // ── 3. Activate periods that have started and are approved ────────────────
  const starting = await prisma.planPeriod.findMany({
    where: { state: { in: ["Planned", "Preparing"] }, startDate: { lte: now }, endDate: { gte: now } },
    include: {
      plan: { select: { id: true, status: true, owner: true, title: true } },
      predecessor: { select: { id: true, state: true } },
    },
    orderBy: { startDate: "asc" },
  });

  for (const period of starting) {
    if (!period.plan) {
      summary.warnings.push(`${label(period)} started but has no plan yet.`);
      continue;
    }
    if (!["Approved", "Active"].includes(period.plan.status)) {
      const notified = await notifyPeriod(
        period.id,
        `Approval needed: ${label(period)}`,
        `The period for "${period.plan.title}" has started but the plan is still "${period.plan.status}". Approve it to make it the active plan.`,
        `notify:approval:${period.id}:${now.toISOString().slice(0, 10)}`,
        await recipientsFor(period.plan.owner),
        actor
      );
      if (notified) summary.notifications.push(label(period));
      else summary.warnings.push(`${label(period)} is waiting for approval.`);
      continue;
    }

    const otherActive = await prisma.planPeriod.count({
      where: { type: period.type, state: "Active", id: { not: period.id } },
    });
    if (otherActive > 0) {
      summary.warnings.push(
        `${label(period)} cannot activate while another ${period.type} period is still active.`
      );
      continue;
    }

    summary.activated.push(label(period));
    if (dryRun) continue;

    await prisma.planPeriod.update({
      where: { id: period.id },
      data: { state: "Active", activatedAt: period.activatedAt ?? now },
    });
    await prisma.plan.update({
      where: { id: period.plan.id },
      data: { status: "Active" },
    });
    if (period.predecessor && ["Active", "Closing"].includes(period.predecessor.state)) {
      await prisma.planPeriod.update({
        where: { id: period.predecessor.id },
        data: { state: "Closing" },
      });
    }
    await recordTransition({
      periodId: period.id,
      action: "ACTIVATE",
      dedupeKey: `activate:${period.id}`,
      actor,
      note: "Start date reached and plan approved",
    });
  }

  // ── 4. Prepare successors ahead of the end date ────────────────────────────
  const live = await prisma.planPeriod.findMany({
    where: { state: { in: ["Active", "Closing"] }, successorId: null },
    include: {
      plan: { select: { id: true, title: true, owner: true } },
    },
  });

  for (const period of live) {
    const cadence = cadenceFor(period.type);
    const daysLeft = daysUntil(period.endDate, now);
    if (daysLeft > cadence.leadDays) continue;
    if (!period.plan) {
      summary.warnings.push(`${label(period)} is due to end but has no plan to roll over.`);
      continue;
    }

    const already = await prisma.periodTransition.findUnique({
      where: { dedupeKey: `prepare:${period.id}` },
    });
    if (already) continue;

    summary.prepared.push(label(period));
    if (dryRun) continue;

    try {
      const result = await commitRollover(period.plan.id, { createdBy: actor });
      await recordTransition({
        periodId: period.id,
        action: "PREPARE",
        dedupeKey: `prepare:${period.id}`,
        actor,
        note: `Prepared ${result.target.label} as plan ${result.planId}`,
      });
      await notifyPeriod(
        period.id,
        `Next period prepared: ${result.target.label}`,
        `A draft ${period.type} plan for ${result.target.label} was prepared from ${label(period)} and is ready for review.`,
        `notify:prepared:${period.id}`,
        await recipientsFor(period.plan.owner),
        actor
      );
    } catch (error) {
      summary.warnings.push(
        `Could not prepare the successor of ${label(period)}: ${(error as Error).message}`
      );
    }
  }

  return summary;
}
