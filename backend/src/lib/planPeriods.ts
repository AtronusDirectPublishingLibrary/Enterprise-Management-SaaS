import type { PlanPeriod } from "@prisma/client";
import { prisma } from "./prisma";

export const PERIOD_TYPES = ["ROADMAP", "STRATEGIC", "AOP"] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const PERIOD_STATES = [
  "Planned",
  "Preparing",
  "Active",
  "Closing",
  "Closed",
  "Archived",
] as const;
export type PeriodState = (typeof PERIOD_STATES)[number];

/** How long each level of the planning hierarchy lasts, and how early to prepare its successor. */
export const PERIOD_CADENCE: Record<
  PeriodType,
  { months: number; leadDays: number; parentType: PeriodType | null }
> = {
  ROADMAP: { months: 120, leadDays: 365, parentType: null },
  STRATEGIC: { months: 60, leadDays: 180, parentType: "ROADMAP" },
  AOP: { months: 12, leadDays: 120, parentType: "STRATEGIC" },
};

const DAY_MS = 86_400_000;

export function isPeriodType(value: string): value is PeriodType {
  return (PERIOD_TYPES as readonly string[]).includes(value);
}

/** Add calendar months without rolling the day over (31 Jan + 1 month stays 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const daysInMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, daysInMonth));
  return result;
}

/** The window immediately after a period, preserving its length. */
export function nextPeriodWindow(type: string, start: Date, end: Date): { start: Date; end: Date } {
  const cadence =
    PERIOD_CADENCE[(isPeriodType(type) ? type : "AOP") as PeriodType] ?? PERIOD_CADENCE.AOP;
  const nextStart = new Date(end.getTime() + DAY_MS);
  const nextEnd = new Date(addMonths(nextStart, cadence.months).getTime() - DAY_MS);
  return { start: nextStart, end: nextEnd };
}

/**
 * EBPE labels annual plans by fiscal year (July–June) and also refers to them by
 * Ethiopian calendar year, e.g. "2026/27 EFY" = "2019 E.C.".
 * Longer plans are labelled by their Gregorian span.
 */
export function periodLabelFor(
  type: string,
  start: Date,
  end: Date
): { label: string; labelAlt: string | null } {
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (type === "AOP") {
    if (start.getUTCMonth() === 6 && end.getUTCMonth() === 5) {
      const y = startYear;
      return {
        label: `${y}/${String(y + 1).slice(2)} EFY`,
        labelAlt: `${y - 7} E.C.`,
      };
    }
    return { label: `FY ${startYear}-${endYear}`, labelAlt: null };
  }

  return { label: `${startYear}-${endYear}`, labelAlt: null };
}

/**
 * Shift every year mentioned in a period label ("Q1 2026/27", "FY 2026", "2030")
 * so KPI readings keep their cadence when a plan rolls into the next period.
 * Two-digit year suffixes in "YYYY/YY" are shifted together.
 */
export function shiftPeriodLabel(label: string, years: number): string {
  if (!years) return label;

  const shifted: string[] = [];
  const masked = label.replace(/\b(\d{4})\/(\d{2})\b/g, (_match, year: string) => {
    const next = Number(year) + years;
    shifted.push(`${next}/${String((next + 1) % 100).padStart(2, "0")}`);
    return `\u0000${shifted.length - 1}\u0000`;
  });

  return masked
    .replace(/\b(\d{4})\b/g, (match) => String(Number(match) + years))
    .replace(/\u0000(\d+)\u0000/g, (_match, index: string) => shifted[Number(index)]);
}

export function periodStateForPlanStatus(status: string): PeriodState {
  if (status === "Active") return "Active";
  if (status === "Closed") return "Closed";
  if (status === "Approved") return "Preparing";
  return "Planned";
}

/**
 * Give a plan its period record. Called when plans are created through any route
 * and lazily by the lifecycle job, so historic plans are backfilled on first run.
 */
export async function ensurePlanPeriod(
  planId: string,
  createdBy = "system"
): Promise<PlanPeriod | null> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { parent: { select: { id: true } } },
  });
  if (!plan) return null;
  if (plan.periodId) {
    return prisma.planPeriod.findUnique({ where: { id: plan.periodId } });
  }

  const existing = await prisma.planPeriod.findUnique({
    where: { type_label: { type: plan.type, label: plan.periodLabel } },
  });
  if (existing) {
    await prisma.plan.update({ where: { id: plan.id }, data: { periodId: existing.id } });
    return existing;
  }

  const parentPeriod = plan.parent ? await ensurePlanPeriod(plan.parent.id, createdBy) : null;
  const last = await prisma.planPeriod.findFirst({
    where: { type: plan.type },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  const period = await prisma.planPeriod.create({
    data: {
      type: plan.type,
      sequence: (last?.sequence ?? 0) + 1,
      label: plan.periodLabel,
      labelAlt: null,
      startDate: plan.startDate,
      endDate: plan.endDate,
      state: periodStateForPlanStatus(plan.status),
      parentPeriodId: parentPeriod?.id ?? null,
      activatedAt: plan.status === "Active" ? new Date() : null,
      createdBy,
    },
  });
  await prisma.plan.update({ where: { id: plan.id }, data: { periodId: period.id } });
  return period;
}

/** Rebuild the successor chain for one type, ordered by start date. */
export async function linkPeriodSuccessions(type: PeriodType) {
  const periods = await prisma.planPeriod.findMany({
    where: { type },
    orderBy: [{ startDate: "asc" }, { sequence: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.planPeriod.updateMany({
      where: { type, successorId: { not: null } },
      data: { successorId: null },
    });
    for (let index = 0; index < periods.length - 1; index += 1) {
      await tx.planPeriod.update({
        where: { id: periods[index].id },
        data: { successorId: periods[index + 1].id },
      });
    }
  });

  return periods.length;
}

/** A period covers another when it starts no later and ends no earlier. */
export function periodCovers(parent: { startDate: Date; endDate: Date }, child: { startDate: Date; endDate: Date }) {
  return (
    new Date(parent.startDate).getTime() <= new Date(child.startDate).getTime() &&
    new Date(parent.endDate).getTime() >= new Date(child.endDate).getTime()
  );
}

/** Find the period of the level above that contains the given window. */
export async function findCoveringParentPeriod(
  type: PeriodType,
  start: Date,
  end: Date
): Promise<{ id: string; planId: string | null; label: string } | null> {
  const parentType = PERIOD_CADENCE[type].parentType;
  if (!parentType) return null;

  const candidates = await prisma.planPeriod.findMany({
    where: { type: parentType },
    select: { id: true, label: true, startDate: true, endDate: true, plan: { select: { id: true } } },
    orderBy: { startDate: "asc" },
  });

  const match = candidates.find((candidate) => periodCovers(candidate, { startDate: start, endDate: end }));
  if (!match) return null;
  return { id: match.id, planId: match.plan?.id ?? null, label: match.label };
}

export interface CurrentablePlan {
  status: string;
  startDate: Date;
  endDate: Date;
}

/**
 * The plan whose period contains today. If no period contains today, the most
 * recently finished plan is returned but flagged, so callers never present an
 * expired plan as the current one.
 */
export function resolveCurrentPlan<T extends CurrentablePlan>(
  plans: T[],
  now = new Date()
): { plan: T; periodEnded: boolean } | null {
  if (!plans.length) return null;
  const today = now.getTime();
  const isLive = (plan: T) =>
    new Date(plan.startDate).getTime() <= today && new Date(plan.endDate).getTime() >= today;

  const live = plans.filter(isLive);
  const activeLive = live.find((plan) => plan.status === "Active");
  if (activeLive) return { plan: activeLive, periodEnded: false };
  if (live.length) {
    return {
      plan: [...live].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )[0],
      periodEnded: false,
    };
  }

  const finished = plans
    .filter((plan) => new Date(plan.endDate).getTime() < today)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  if (finished.length) return { plan: finished[0], periodEnded: true };

  const upcoming = [...plans].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )[0];
  return upcoming ? { plan: upcoming, periodEnded: false } : null;
}

/** Keep a period's state consistent with a manual plan status change. */
export async function syncPeriodFromPlan(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { periodId: true, status: true },
  });
  if (!plan?.periodId) return null;

  const period = await prisma.planPeriod.findUnique({ where: { id: plan.periodId } });
  if (!period) return null;

  if (plan.status === "Active") {
    // Publishing early must not mark a future period as already active.
    if (new Date(period.startDate).getTime() > Date.now()) {
      return prisma.planPeriod.update({
        where: { id: period.id },
        data: { state: "Preparing" },
      });
    }

    const predecessor = await prisma.planPeriod.findFirst({
      where: { successorId: period.id },
      select: { id: true },
    });
    return prisma.planPeriod.update({
      where: { id: period.id },
      data: {
        state: "Active",
        activatedAt: period.activatedAt ?? new Date(),
        closedAt: null,
      },
    }).then(async (updated) => {
      if (predecessor) {
        await prisma.planPeriod.update({
          where: { id: predecessor.id },
          data: { state: "Closing" },
        });
      }
      return updated;
    });
  }

  if (plan.status === "Closed") {
    return prisma.planPeriod.update({
      where: { id: period.id },
      data: { state: "Closed", closedAt: period.closedAt ?? new Date() },
    });
  }

  return null;
}

/** Record a lifecycle decision once. Returns false when it already happened. */
export async function recordTransition(input: {
  periodId: string;
  action: string;
  dedupeKey: string;
  actor?: string;
  note?: string;
}) {
  try {
    await prisma.periodTransition.create({
      data: {
        periodId: input.periodId,
        action: input.action,
        actor: input.actor ?? "system",
        note: input.note ?? null,
        dedupeKey: input.dedupeKey,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return false;
    }
    throw error;
  }
}
