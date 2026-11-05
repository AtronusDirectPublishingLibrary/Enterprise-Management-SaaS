import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const round = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

export type ProgressSource = "target" | "manual" | "children" | "linked" | "none";

export interface ItemProgress {
  progress: number;
  source: ProgressSource;
  label?: string;
}

export interface PlanProgressResult {
  completion: number;
  items: Record<string, ItemProgress>;
  childPlans: { id: string; type: string; title: string; periodLabel: string; completion: number }[];
}

type PlanRecord = Prisma.PlanGetPayload<{
  include: {
    items: { include: { targets: true } };
    children: { select: { id: true; type: true; title: true; periodLabel: true } };
  };
}>;

type PlanItemWithTargets = PlanRecord["items"][number];

function fromTargets(item: PlanItemWithTargets): ItemProgress {
  if (item.kind === "ACTIVITY" || item.kind === "MILESTONE") {
    if (item.status === "Completed") return { progress: 100, source: "manual", label: "Completed" };
    return { progress: round(item.progress ?? 0), source: "manual" };
  }

  if (item.kind === "KPI") {
    const readings = [...item.targets]
      .filter((target) => target.actual != null && target.target != null && target.target !== 0)
      .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel));
    const latest = readings[readings.length - 1];
    const actual = latest?.actual ?? item.currentValue;
    const target = latest?.target ?? item.targetValue;
    if (actual != null && target != null && target !== 0) {
      const pct =
        item.direction === "decrease"
          ? actual === 0
            ? 100
            : (target / actual) * 100
          : (actual / target) * 100;
      return {
        progress: round(pct),
        source: "target",
        label: latest ? `${latest.periodLabel}: ${actual} / ${target}` : `${actual} / ${target}`,
      };
    }
    return { progress: 0, source: "none", label: "No actual recorded" };
  }

  if (item.status === "Completed") return { progress: 100, source: "manual", label: "Completed" };
  return { progress: round(item.progress ?? 0), source: "manual" };
}

/**
 * Completion is derived bottom-up: KPI readings against their latest target,
 * activity/milestone status and progress, then averages up the item tree.
 * Items aligned to items in a child plan (AOP -> Strategic -> Roadmap) blend in
 * the child item's completion so annual delivery moves the strategic target.
 */
export async function computePlanProgress(
  planId: string,
  depth = 0
): Promise<PlanProgressResult | null> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      items: { include: { targets: true } },
      children: { select: { id: true, type: true, title: true, periodLabel: true } },
    },
  });
  if (!plan) return null;
  return computeForPlan(plan, depth);
}

async function computeForPlan(plan: PlanRecord, depth: number): Promise<PlanProgressResult> {
  const byParent = new Map<string | null, PlanItemWithTargets[]>();
  for (const item of plan.items) {
    const key = item.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

  const linkedContributions = new Map<string, number[]>();
  const childPlans: PlanProgressResult["childPlans"] = [];

  if (plan.children.length && depth < 4) {
    for (const child of plan.children) {
      const childProgress = await computePlanProgress(child.id, depth + 1);
      if (!childProgress) continue;
      childPlans.push({
        id: child.id,
        type: child.type,
        title: child.title,
        periodLabel: child.periodLabel,
        completion: childProgress.completion,
      });

      const links = await prisma.planItem.findMany({
        where: { planId: child.id, linkedItemId: { not: null } },
        select: { id: true, linkedItemId: true },
      });
      for (const link of links) {
        if (!link.linkedItemId) continue;
        const progress = childProgress.items[link.id]?.progress;
        if (progress == null) continue;
        const bucket = linkedContributions.get(link.linkedItemId) ?? [];
        bucket.push(progress);
        linkedContributions.set(link.linkedItemId, bucket);
      }
    }
  }

  const resolved = new Map<string, ItemProgress>();
  const visiting = new Set<string>();

  const resolveItem = (item: PlanItemWithTargets): ItemProgress => {
    const cached = resolved.get(item.id);
    if (cached) return cached;
    if (visiting.has(item.id)) return { progress: 0, source: "none" };
    visiting.add(item.id);

    const children = byParent.get(item.id) ?? [];
    let base = fromTargets(item);
    if (children.length) {
      const values = children.map(resolveItem).map((entry) => entry.progress);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      base = {
        progress: round(average),
        source: "children",
        label: `${children.length} sub-item${children.length === 1 ? "" : "s"}`,
      };
    }

    const linked = linkedContributions.get(item.id) ?? [];
    let result = base;
    if (linked.length) {
      const all = [base.progress, ...linked];
      result = {
        progress: round(all.reduce((sum, value) => sum + value, 0) / all.length),
        source: "linked",
        label: `${base.label ? `${base.label} + ` : ""}${linked.length} linked plan item${
          linked.length === 1 ? "" : "s"
        }`,
      };
    }

    visiting.delete(item.id);
    resolved.set(item.id, result);
    return result;
  };

  for (const item of plan.items) resolveItem(item);

  const roots = byParent.get(null) ?? [];
  const completion = roots.length
    ? round(
        roots
          .map((root) => resolved.get(root.id)?.progress ?? 0)
          .reduce((sum, value) => sum + value, 0) / roots.length
      )
    : 0;

  const items: Record<string, ItemProgress> = {};
  for (const [id, value] of resolved.entries()) items[id] = value;

  return { completion, items, childPlans };
}

/** Lightweight completion number for list views. */
export async function planCompletion(planId: string): Promise<number> {
  const result = await computePlanProgress(planId);
  return result?.completion ?? 0;
}
