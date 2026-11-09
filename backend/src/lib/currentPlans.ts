import { prisma } from "./prisma";

export type PlanType = "AOP" | "STRATEGIC" | "ROADMAP";

const TYPE_ORDER: PlanType[] = ["AOP", "STRATEGIC", "ROADMAP"];

/**
 * Select the plan each report and progress form should follow.
 *
 * Precedence (highest wins), evaluated per plan level:
 *  1. the plan linked to an Active PlanPeriod — the lifecycle's source of truth;
 *  2. a plan whose status is Active;
 *  3. a plan whose date window contains today;
 *  4. the most recently starting plan.
 *
 * Creating or rolling a plan into a new period therefore moves the reports and
 * progress forms to it automatically, with no code change and no manual switch.
 */
export async function currentPlanFor(type: PlanType) {
  const plans = await prisma.plan.findMany({
    where: { type },
    include: { period: { select: { id: true, state: true, label: true } } },
    orderBy: { startDate: "desc" },
  });
  if (!plans.length) return null;

  const now = new Date();
  const score = (plan: (typeof plans)[number]) => {
    if (plan.period?.state === "Active") return 4;
    if (plan.status === "Active") return 3;
    if (plan.startDate <= now && plan.endDate >= now) return 2;
    return 1;
  };

  return plans
    .map((plan) => ({ plan, score: score(plan) }))
    .sort((a, b) => b.score - a.score || b.plan.startDate.getTime() - a.plan.startDate.getTime())[0]
    .plan;
}

type ResolvedPlan = NonNullable<Awaited<ReturnType<typeof currentPlanFor>>>;

export async function currentPlans(): Promise<Partial<Record<PlanType, ResolvedPlan>>> {
  const result: Partial<Record<PlanType, ResolvedPlan>> = {};
  for (const type of TYPE_ORDER) {
    const plan = await currentPlanFor(type);
    if (plan) result[type] = plan;
  }
  return result;
}

/** All plans for a level, with a flag marking the current period. */
export async function plansWithCurrentFlag(type?: PlanType) {
  const [plans, current] = await Promise.all([
    prisma.plan.findMany({
      where: type ? { type } : undefined,
      include: {
        period: { select: { state: true, label: true } },
        _count: { select: { items: true, progressUpdates: true, reports: true } },
      },
      orderBy: [{ type: "asc" }, { startDate: "desc" }],
    }),
    currentPlans(),
  ]);
  return {
    plans: plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      type: plan.type,
      periodLabel: plan.periodLabel,
      status: plan.status,
      startDate: plan.startDate,
      endDate: plan.endDate,
      isPublished: plan.isPublished,
      periodState: plan.period?.state || null,
      isCurrent: (current as Record<string, { id: string }>)[plan.type]?.id === plan.id,
      counts: plan._count,
    })),
    current: Object.fromEntries(Object.entries(current).map(([key, plan]) => [key, plan!.id])),
    asOf: new Date().toISOString(),
  };
}
