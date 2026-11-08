import { prisma } from "./prisma";
import {
  defaultReportFrequency,
  generatePlanReports,
  reportWindows,
} from "./planReports";
import {
  PERIOD_CADENCE,
  addMonths,
  ensurePlanPeriod,
  findCoveringParentPeriod,
  nextPeriodWindow,
  periodLabelFor,
  shiftPeriodLabel,
  type PeriodType,
} from "./planPeriods";

const DAY_MS = 86_400_000;

type SourceItem = Awaited<ReturnType<typeof loadSource>>["items"][number];

async function loadSource(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { items: { include: { targets: true } } },
  });
  if (!plan) throw httpError(404, "Plan not found");
  return plan;
}

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

export interface RolloverOptions {
  createdBy: string;
  label?: string;
  labelAlt?: string | null;
  title?: string;
  startDate?: Date;
  endDate?: Date;
  /** Carry activities that are already complete (default false). */
  includeCompleted?: boolean;
  /** Keep reported progress on carried activities (default true). */
  keepProgress?: boolean;
  /** Copy KPI actual values into the new period (default false). */
  copyActuals?: boolean;
  parentPlanId?: string | null;
  /** Create the period's reporting deadlines (default true). */
  generateReports?: boolean;
  /** Roll the covering parent plan forward when it has no successor yet (default true). */
  prepareParentPeriod?: boolean;
  /** Internal recursion guard for the parent cascade. */
  _parentDepth?: number;
}

export interface RolloverItemSummary {
  kind: string;
  total: number;
  carried: number;
  skipped: number;
}

export interface RolloverKpiChange {
  title: string;
  unit: string | null;
  previousBaseline: number | null;
  baseline: number | null;
}

export interface RolloverPlan {
  source: {
    id: string;
    type: string;
    title: string;
    label: string;
    startDate: string;
    endDate: string;
  };
  target: {
    label: string;
    labelAlt: string | null;
    title: string;
    startDate: string;
    endDate: string;
    parentPlanId: string | null;
    parentPlanLabel: string | null;
  };
  items: RolloverItemSummary[];
  kpis: RolloverKpiChange[];
  reports: { frequency: string; windows: number };
  warnings: string[];
  totalItems: number;
  totalCarried: number;
}

interface CloneNode {
  oldId: string;
  parentOldId: string | null;
  data: {
    kind: string;
    code: string | null;
    title: string;
    description: string | null;
    owner: string | null;
    sortOrder: number;
    unit: string | null;
    baseline: number | null;
    targetValue: number | null;
    currentValue: number | null;
    direction: string | null;
    frequency: string | null;
    dataSource: string | null;
    isFeatured: boolean;
    startDate: Date | null;
    endDate: Date | null;
    budget: number | null;
    status: string;
    progress: number;
    linkedItemId: string | null;
  };
  targets: {
    periodLabel: string;
    target: number | null;
    targetLabel: string | null;
    actual: number | null;
    note: string | null;
  }[];
}

/** Rank readings chronologically even when labels mix Q1/Q4, halves and years. */
function readingRank(label: string): number {
  const years = label.match(/\d{4}/g);
  const year = years ? Math.max(...years.map(Number)) : 0;
  const quarter = /Q(\d)/i.exec(label);
  const half = /H(\d)/i.exec(label);
  const slot = quarter ? Number(quarter[1]) : half ? Number(half[1]) * 2 : 5;
  return year * 10 + slot;
}

function latestReading(item: SourceItem): number | null {
  const readings = item.targets
    .filter((target) => target.actual != null)
    .sort((a, b) => readingRank(a.periodLabel) - readingRank(b.periodLabel));
  const latest = readings[readings.length - 1];
  return latest?.actual ?? null;
}

export interface PreparedRollover {
  plan: RolloverPlan;
  sourcePeriodId: string | null;
  successorPeriodId: string | null;
  createdPeriodId: string | null;
  nodes: CloneNode[];
  window: { start: Date; end: Date };
}

/**
 * Work out everything a rollover will do without touching the plan tree.
 * When `allowWrites` is false this is a pure preview: no period or plan rows.
 */
export async function prepareRollover(
  planId: string,
  options: RolloverOptions,
  allowWrites = false
): Promise<PreparedRollover> {
  const source = await loadSource(planId);
  const type: PeriodType = (["ROADMAP", "STRATEGIC", "AOP"] as const).includes(
    source.type as PeriodType
  )
    ? (source.type as PeriodType)
    : "AOP";
  const cadence = PERIOD_CADENCE[type];
  const warnings: string[] = [];

  const sourcePeriod = source.periodId
    ? await prisma.planPeriod.findUnique({
        where: { id: source.periodId },
        include: { successor: true },
      })
    : null;
  if (!sourcePeriod) {
    warnings.push(
      "The source plan had no period record; one will be created and linked on commit."
    );
  }

  const fallbackStart = new Date(source.endDate.getTime() + DAY_MS);
  const fallbackEnd = new Date(addMonths(fallbackStart, cadence.months).getTime() - DAY_MS);
  const derived = sourcePeriod
    ? nextPeriodWindow(source.type, sourcePeriod.startDate, sourcePeriod.endDate)
    : { start: fallbackStart, end: fallbackEnd };

  let windowStart = options.startDate ?? derived.start;
  let windowEnd =
    options.endDate ??
    (options.startDate
      ? new Date(addMonths(windowStart, cadence.months).getTime() - DAY_MS)
      : derived.end);

  if (windowEnd.getTime() <= windowStart.getTime()) {
    throw httpError(400, "The new period must end after it starts");
  }

  const generated = periodLabelFor(source.type, windowStart, windowEnd);
  let label = options.label?.trim() || generated.label;
  let labelAlt =
    options.labelAlt !== undefined ? options.labelAlt : generated.labelAlt;

  const yearDelta =
    windowStart.getUTCFullYear() -
    new Date(sourcePeriod?.startDate ?? source.startDate).getUTCFullYear();
  const monthDelta =
    (windowStart.getUTCFullYear() -
      new Date(sourcePeriod?.startDate ?? source.startDate).getUTCFullYear()) *
      12 +
    (windowStart.getUTCMonth() - new Date(sourcePeriod?.startDate ?? source.startDate).getUTCMonth());

  // A successor period may already exist (prepared earlier or created by hand).
  let successorPeriodId: string | null = null;
  let createdPeriodId: string | null = null;
  if (sourcePeriod?.successorId) {
    const successor = sourcePeriod.successor;
    if (successor) {
      const existingPlan = await prisma.plan.findUnique({
        where: { periodId: successor.id },
        select: { id: true, title: true },
      });
      if (existingPlan) {
        throw httpError(
          409,
          `The next period (${successor.label}) already has a plan: "${existingPlan.title}". Open it instead of rolling over again.`
        );
      }
      successorPeriodId = successor.id;
      label = options.label?.trim() || successor.label;
      labelAlt = successor.labelAlt;
      windowStart = options.startDate ?? successor.startDate;
      windowEnd = options.endDate ?? successor.endDate;
    }
  } else {
    const sameLabel = await prisma.planPeriod.findUnique({
      where: { type_label: { type: source.type, label } },
    });
    if (sameLabel) {
      const existingPlan = await prisma.plan.findUnique({
        where: { periodId: sameLabel.id },
        select: { id: true, title: true },
      });
      if (existingPlan) {
        throw httpError(
          409,
          `A ${source.type} plan for ${label} already exists: "${existingPlan.title}".`
        );
      }
      successorPeriodId = sameLabel.id;
      labelAlt = sameLabel.labelAlt;
    }
  }

  let parentPlanId = await resolveParentPlan(source, type, windowStart, windowEnd, options.parentPlanId);
  if (
    !parentPlanId &&
    allowWrites &&
    (options.prepareParentPeriod ?? true) &&
    options.parentPlanId === undefined &&
    (options._parentDepth ?? 0) < 2
  ) {
    parentPlanId = await ensureCoveringParentPlan(
      type,
      windowStart,
      windowEnd,
      options.createdBy,
      (options._parentDepth ?? 0) + 1
    );
  }
  let parentPlanLabel: string | null = null;
  if (parentPlanId) {
    const parentPlan = await prisma.plan.findUnique({
      where: { id: parentPlanId },
      select: { title: true, periodLabel: true, type: true },
    });
    if (!parentPlan) throw httpError(400, "Parent plan not found");
    const allowed = type === "AOP" ? "STRATEGIC" : type === "STRATEGIC" ? "ROADMAP" : null;
    if (allowed !== parentPlan.type) {
      throw httpError(400, `A ${source.type} plan can only be linked to a ${allowed} plan`);
    }
    parentPlanLabel = `${parentPlan.periodLabel} · ${parentPlan.title}`;
  } else if (cadence.parentType) {
    warnings.push(
      (options.prepareParentPeriod ?? true)
        ? `No ${cadence.parentType} plan covers ${label} yet; committing will prepare the next ${cadence.parentType} period first, then link this plan into it.`
        : `No ${cadence.parentType} plan covers ${label}; the new plan will be created unlinked.`
    );
  }

  // Alignment: map the source's linked items to the new parent plan by code.
  const linkedIds = [...new Set(source.items.map((item) => item.linkedItemId).filter((id): id is string => Boolean(id)))];
  const linkedItems = linkedIds.length
    ? await prisma.planItem.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true, code: true },
      })
    : [];
  const codeByLinkedId = new Map(
    linkedItems.filter((item) => item.code).map((item) => [item.id, item.code as string])
  );
  const parentCodeMap = parentPlanId
    ? new Map(
        (
          await prisma.planItem.findMany({
            where: { planId: parentPlanId, code: { not: null } },
            select: { id: true, code: true },
          })
        ).map((item) => [item.code as string, item.id])
      )
    : new Map<string, string>();
  if (linkedIds.length && !parentCodeMap.size) {
    warnings.push(
      "Alignment links could not be carried because no covering parent plan is available."
    );
  }

  let title = options.title?.trim();
  if (!title) {
    const swapped = source.title.split(source.periodLabel).join(label);
    title = swapped !== source.title ? swapped : shiftPeriodLabel(source.title, yearDelta);
    if (title === source.title) title = `${source.title} (${label})`;
  }

  // ── Build the item tree ────────────────────────────────────────────────────
  const byParent = new Map<string | null, SourceItem[]>();
  for (const item of source.items) {
    const key = item.parentId ?? null;
    const bucket = byParent.get(key) ?? [];
    bucket.push(item);
    byParent.set(key, bucket);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const summary = new Map<string, RolloverItemSummary>();
  const kpis: RolloverKpiChange[] = [];
  const nodes: CloneNode[] = [];
  const includeCompleted = options.includeCompleted ?? false;
  const keepProgress = options.keepProgress ?? true;
  const copyActuals = options.copyActuals ?? false;
  let carriedWithoutCode = 0;
  let readingsWithoutYear = 0;

  const shiftDate = (date: Date | null) => (date ? addMonths(new Date(date), monthDelta) : null);

  const walk = (parentOldId: string | null) => {
    const items = byParent.get(parentOldId) ?? [];
    let order = 0;

    for (const item of items) {
      const isScheduleItem = item.kind === "ACTIVITY" || item.kind === "MILESTONE";
      const completed = item.status === "Completed" || item.progress >= 100;
      const skip = isScheduleItem && completed && !includeCompleted;

      const stats = summary.get(item.kind) ?? { kind: item.kind, total: 0, carried: 0, skipped: 0 };
      stats.total += 1;
      summary.set(item.kind, stats);

      if (skip) {
        stats.skipped += 1;
        continue;
      }
      stats.carried += 1;

      if (item.code) {
        // keep the code; alignment is re-established below
      } else if (item.linkedItemId) {
        carriedWithoutCode += 1;
      }

      const previousBaseline = item.baseline ?? null;
      const baseline = item.kind === "KPI" ? latestReading(item) ?? item.currentValue ?? previousBaseline : item.baseline;

      const targets = new Map<string, CloneNode["targets"][number]>();
      for (const target of item.targets) {
        const shiftedLabel = shiftPeriodLabel(target.periodLabel, yearDelta);
        if (shiftedLabel === target.periodLabel && /\d{4}/.test(target.periodLabel)) {
          readingsWithoutYear += 1;
        }
        targets.set(shiftedLabel, {
          periodLabel: shiftedLabel,
          target: target.target ?? null,
          targetLabel: target.targetLabel ?? null,
          actual: copyActuals ? target.actual ?? null : null,
          note: null,
        });
      }

      if (item.kind === "KPI") {
        kpis.push({ title: item.title, unit: item.unit, previousBaseline, baseline: baseline ?? null });
        if (baseline == null) {
          warnings.push(`KPI "${item.title}" has no actual to re-base from; it keeps its old baseline.`);
        }
      }

      const linkedCode = item.linkedItemId ? codeByLinkedId.get(item.linkedItemId) : undefined;
      const relinked = linkedCode ? parentCodeMap.get(linkedCode) ?? null : null;

      nodes.push({
        oldId: item.id,
        parentOldId,
        data: {
          kind: item.kind,
          code: item.code ?? null,
          title: item.title,
          description: item.description ?? null,
          owner: item.owner ?? null,
          sortOrder: order,
          unit: item.unit ?? null,
          baseline: baseline ?? null,
          targetValue: item.targetValue ?? null,
          currentValue: keepProgress ? item.currentValue ?? null : null,
          direction: item.direction ?? null,
          frequency: item.frequency ?? null,
          dataSource: item.dataSource ?? null,
          isFeatured: item.isFeatured,
          startDate: shiftDate(item.startDate),
          endDate: shiftDate(item.endDate),
          budget: item.budget ?? null,
          status: keepProgress && isScheduleItem && item.status !== "Completed" && item.progress > 0
            ? "In Progress"
            : "Planned",
          progress: keepProgress && isScheduleItem ? item.progress ?? 0 : 0,
          linkedItemId: relinked,
        },
        targets: [...targets.values()],
      });

      order += 1;
      walk(item.id);
    }
  };
  walk(null);

  if (carriedWithoutCode > 0) {
    warnings.push(
      `${carriedWithoutCode} aligned item(s) have no code, so their alignment could not be matched by code.`
    );
  }
  if (readingsWithoutYear > 0) {
    warnings.push(
      `${readingsWithoutYear} KPI reading label(s) contain no year and could not be re-dated.`
    );
  }

  if (allowWrites) {
    const sourcePeriodRow =
      sourcePeriod ?? (await ensurePlanPeriod(source.id, options.createdBy));
    if (sourcePeriodRow && !successorPeriodId) {
      const last = await prisma.planPeriod.findFirst({
        where: { type: source.type },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const parentPeriodId = parentPlanId
        ? (
            await prisma.plan.findUnique({
              where: { id: parentPlanId },
              select: { periodId: true },
            })
          )?.periodId ?? null
        : null;

      const period = await prisma.planPeriod.create({
        data: {
          type: source.type,
          sequence: (last?.sequence ?? 0) + 1,
          label,
          labelAlt,
          startDate: windowStart,
          endDate: windowEnd,
          state: "Preparing",
          parentPeriodId,
          preparedAt: new Date(),
          createdBy: options.createdBy,
        },
      });
      successorPeriodId = period.id;
      createdPeriodId = period.id;
      if (sourcePeriodRow.id) {
        await prisma.planPeriod.update({
          where: { id: sourcePeriodRow.id },
          data: { successorId: period.id },
        });
      }
    } else if (sourcePeriodRow && successorPeriodId) {
      await prisma.planPeriod.update({
        where: { id: sourcePeriodRow.id },
        data: { successorId: successorPeriodId },
      });
    }
  }

  const reportFrequency = defaultReportFrequency(source.type);
  const plan: RolloverPlan = {
    source: {
      id: source.id,
      type: source.type,
      title: source.title,
      label: source.periodLabel,
      startDate: source.startDate.toISOString(),
      endDate: source.endDate.toISOString(),
    },
    target: {
      label,
      labelAlt,
      title,
      startDate: windowStart.toISOString(),
      endDate: windowEnd.toISOString(),
      parentPlanId,
      parentPlanLabel,
    },
    items: [...summary.values()],
    kpis,
    reports: {
      frequency: reportFrequency,
      windows: reportWindows(reportFrequency, windowStart, windowEnd).length,
    },
    warnings,
    totalItems: [...summary.values()].reduce((sum, entry) => sum + entry.total, 0),
    totalCarried: [...summary.values()].reduce((sum, entry) => sum + entry.carried, 0),
  };

  return {
    plan,
    sourcePeriodId: sourcePeriod?.id ?? null,
    successorPeriodId,
    createdPeriodId,
    nodes,
    window: { start: windowStart, end: windowEnd },
  };
}

/**
 * When a new period reaches beyond its parent's end (e.g. an annual plan in
 * 2032 after the 2026-2030 strategy expired), roll the parent forward first so
 * the new plan lands inside a real strategic period instead of being orphaned.
 */
async function ensureCoveringParentPlan(
  type: PeriodType,
  start: Date,
  end: Date,
  createdBy: string,
  depth: number
): Promise<string | null> {
  const parentType = PERIOD_CADENCE[type].parentType;
  if (!parentType) return null;

  // Parent plans created before periods existed must get their period record
  // before we can look for a covering window.
  const withoutPeriod = await prisma.plan.findMany({
    where: { type: parentType, periodId: null },
    select: { id: true },
  });
  for (const plan of withoutPeriod) {
    try {
      await ensurePlanPeriod(plan.id, createdBy);
    } catch {
      // A parent that cannot be prepared should not block the child.
    }
  }

  const covering = await findCoveringParentPeriod(type, start, end);
  if (covering?.planId) return covering.planId;
  if (covering) return null;

  const parentPeriods = await prisma.planPeriod.findMany({
    where: { type: parentType },
    orderBy: { endDate: "desc" },
    select: { id: true, endDate: true, plan: { select: { id: true, endDate: true } } },
  });
  const latest = parentPeriods.find((period) => period.plan);
  if (!latest?.plan) return null;
  if (new Date(latest.plan.endDate).getTime() >= start.getTime()) return null;

  try {
    await commitRollover(latest.plan.id, { createdBy, _parentDepth: depth });
  } catch {
    return null;
  }

  const rolled = await findCoveringParentPeriod(type, start, end);
  return rolled?.planId ?? null;
}

async function resolveParentPlan(
  source: { type: string; parentPlanId: string | null },
  type: PeriodType,
  start: Date,
  end: Date,
  requested: string | null | undefined
): Promise<string | null> {
  if (requested !== undefined) return requested;

  const parentType = PERIOD_CADENCE[type].parentType;
  if (!parentType) return null;

  if (source.parentPlanId) {
    const parent = await prisma.plan.findUnique({
      where: { id: source.parentPlanId },
      include: { period: { include: { successor: true } } },
    });
    if (parent) {
      const successorPeriod = parent.period?.successor;
      if (successorPeriod) {
        const successorPlan = await prisma.plan.findUnique({
          where: { periodId: successorPeriod.id },
          select: { id: true },
        });
        if (successorPlan) return successorPlan.id;
      }
      if (
        new Date(parent.startDate).getTime() <= start.getTime() &&
        new Date(parent.endDate).getTime() >= end.getTime()
      ) {
        return parent.id;
      }
    }
  }

  const covering = await findCoveringParentPeriod(type, start, end);
  return covering?.planId ?? null;
}

export interface RolloverCommit extends RolloverPlan {
  periodId: string;
  planId: string;
  createdItems: number;
  reportsCreated: number;
}

/** Materialise the successor period and plan. Idempotent per period. */
export async function commitRollover(
  planId: string,
  options: RolloverOptions
): Promise<RolloverCommit> {
  const prepared = await prepareRollover(planId, options, true);
  if (!prepared.successorPeriodId) {
    throw httpError(500, "Could not determine the successor period");
  }

  const source = await prisma.plan.findUnique({
    where: { id: planId },
    select: { title: true, summary: true, vision: true, mission: true, owner: true, type: true },
  });
  if (!source) throw httpError(404, "Plan not found");

  try {
    const createdPlan = await prisma.$transaction(
      async (tx) => {
        const plan = await tx.plan.create({
          data: {
            type: source.type,
            title: prepared.plan.target.title,
            periodLabel: prepared.plan.target.label,
            startDate: prepared.window.start,
            endDate: prepared.window.end,
            status: "Draft",
            summary: source.summary,
            vision: source.vision,
            mission: source.mission,
            owner: source.owner,
            parentPlanId: prepared.plan.target.parentPlanId,
            periodId: prepared.successorPeriodId,
            isPublished: false,
            createdBy: options.createdBy,
          },
        });

        const idMap = new Map<string, string>();
        for (const node of prepared.nodes) {
          const parentId = node.parentOldId ? idMap.get(node.parentOldId) ?? null : null;
          const item = await tx.planItem.create({
            data: {
              ...node.data,
              planId: plan.id,
              parentId,
              targets: node.targets.length ? { create: node.targets } : undefined,
            },
          });
          idMap.set(node.oldId, item.id);
        }

        return plan;
      },
      { timeout: 60_000 }
    );

    let reportsCreated = 0;
    if (options.generateReports ?? true) {
      try {
        const reports = await generatePlanReports(createdPlan.id);
        reportsCreated = reports.created;
      } catch (error) {
        prepared.plan.warnings.push(
          `Reporting deadlines could not be created: ${(error as Error).message}`
        );
      }
    }

    return {
      ...prepared.plan,
      periodId: prepared.successorPeriodId,
      planId: createdPlan.id,
      createdItems: prepared.nodes.length,
      reportsCreated,
    };
  } catch (error) {
    // Leave no empty "Preparing" period behind if the copy failed.
    if (prepared.createdPeriodId) {
      const orphan = await prisma.planPeriod.findUnique({
        where: { id: prepared.createdPeriodId },
        select: { plan: { select: { id: true } } },
      });
      if (!orphan?.plan) {
        await prisma.planPeriod.delete({ where: { id: prepared.createdPeriodId } });
      }
    }
    throw error;
  }
}
