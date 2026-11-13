import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { computePlanProgress } from "../lib/planProgress";

const router = Router();
router.use(requireAuth);

const PLAN_TYPES = ["ROADMAP", "STRATEGIC", "AOP"] as const;
const PLAN_TYPE_LABEL: Record<string, string> = {
  ROADMAP: "Roadmap",
  STRATEGIC: "Strategic Plan",
  AOP: "Annual Operational Plan",
};
/** Hierarchy depth: a roadmap contains strategic plans, which contain AOPs. */
const PLAN_RANK: Record<string, number> = { ROADMAP: 3, STRATEGIC: 2, AOP: 1 };

const planTypeSchema = z.enum(PLAN_TYPES);

type ScopedItem = {
  id: string;
  planId: string;
  parentId: string | null;
  linkedItemId: string | null;
  kind: string;
  code: string | null;
  title: string;
  description: string | null;
  owner: string | null;
  budget: number;
  progress: number;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

const money = (value: number) => Math.round(value * 100) / 100;
const pct = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

/**
 * One corporate roll-up for Corporate Objectives and Corporate Portfolios.
 *
 * Money follows the plan ledger: plan items carry the approved financial lines
 * (project financial plans are part of the AOP and the strategic plan), and the
 * PMS only contributes actual expenditure. Three duplication guards apply:
 *
 *  1. within a plan, a parent item's budget is ignored when a descendant holds
 *     a budget (the descendant is the real financial line);
 *  2. across plans, an upper-level item that a lower-level item aligns to is
 *     ignored, so a strategic goal is never added on top of its AOP activities;
 *  3. project financial plans are reported separately and never added to the
 *     plan budget — only their actual expenditure is part of the corporate
 *     spend.
 */
router.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({ type: planTypeSchema.optional(), period: z.string().trim().optional() })
      .parse(req.query);

    const allPlans = await prisma.plan.findMany({
      select: {
        id: true,
        type: true,
        title: true,
        periodLabel: true,
        status: true,
        isPublished: true,
        parentPlanId: true,
        startDate: true,
        endDate: true,
        owner: true,
      },
      orderBy: [{ startDate: "desc" }, { title: "asc" }],
    });

    const selectedPlans = allPlans.filter(
      (plan) =>
        (!query.type || plan.type === query.type) &&
        (!query.period || plan.periodLabel === query.period),
    );
    const selectedPlanIds = new Set(selectedPlans.map((plan) => plan.id));
    const planTypeById = new Map(allPlans.map((plan) => [plan.id, plan.type]));

    // Items are read for every plan so a filtered strategic/roadmap view can
    // show the financial envelope delivered by its unselected child plans,
    // while the corporate total still counts each line only once.
    const allItems = (await prisma.planItem.findMany({
      select: {
        id: true,
        planId: true,
        parentId: true,
        linkedItemId: true,
        kind: true,
        code: true,
        title: true,
        description: true,
        owner: true,
        budget: true,
        progress: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    })) as ScopedItem[];
    const items = allItems.filter((item) => selectedPlanIds.has(item.planId));

    // Linked items are needed even when they live in a plan outside the filter
    // (for example an AOP item aligned to a strategic goal).
    const externalLinkIds = [
      ...new Set(
        items
          .map((item) => item.linkedItemId)
          .filter((id): id is string => Boolean(id))
          .filter((id) => !items.some((item) => item.id === id)),
      ),
    ];
    const externalLinked = externalLinkIds.length
      ? ((await prisma.planItem.findMany({
          where: { id: { in: externalLinkIds } },
          select: {
            id: true,
            planId: true,
            parentId: true,
            linkedItemId: true,
            kind: true,
            code: true,
            title: true,
            description: true,
            owner: true,
            budget: true,
            progress: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        })) as ScopedItem[])
      : [];

    const byId = new Map<string, ScopedItem>([...items, ...externalLinked].map((item) => [item.id, item]));
    const selectedItemIds = new Set(items.map((item) => item.id));

    // Progress comes from the shared engine so KPI readings, activity status
    // and cross-plan linked contributions are resolved exactly as they are on
    // the plan screens.
    const progressByPlan = new Map<string, Record<string, { progress: number }>>();
    const planCompletion = new Map<string, number>();
    for (const plan of allPlans) {
      const progress = await computePlanProgress(plan.id);
      progressByPlan.set(plan.id, progress?.items ?? {});
      planCompletion.set(plan.id, progress?.completion ?? 0);
    }

    // ── Duplication guard 1: parent budgets that are split into children ─────
    const itemById = new Map(items.map((item) => [item.id, item]));
    const parentWithBudgetChild = new Set<string>();
    for (const item of items) {
      if (!(Number(item.budget) > 0)) continue;
      let parentId = item.parentId;
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        parentWithBudgetChild.add(parentId);
        parentId = itemById.get(parentId)?.parentId ?? null;
      }
    }

    // ── Duplication guard 2: upper-level items aligned from a lower plan ─────
    const alignedParent = new Set<string>();
    for (const item of items) {
      if (!item.linkedItemId || !selectedItemIds.has(item.linkedItemId)) continue;
      const parent = byId.get(item.linkedItemId);
      if (!parent) continue;
      const itemRank = PLAN_RANK[planTypeById.get(item.planId) || ""] ?? 0;
      const parentRank = PLAN_RANK[planTypeById.get(parent.planId) || ""] ?? 0;
      if (parentRank > itemRank) alignedParent.add(parent.id);
    }

    const budgetItems = items.filter(
      (item) => Number(item.budget) > 0 && !parentWithBudgetChild.has(item.id) && !alignedParent.has(item.id),
    );
    const budgetByItem = new Map(budgetItems.map((item) => [item.id, Number(item.budget)]));

    // Per-plan financial envelope, used for the plan rows. A parent budget is
    // skipped when a child carries the money, and a child plan's lines are
    // added only when that child plan is outside the current filter.
    const allParentWithBudgetChild = new Set<string>();
    const allItemById = new Map(allItems.map((item) => [item.id, item]));
    for (const item of allItems) {
      if (!(Number(item.budget) > 0)) continue;
      let parentId = item.parentId;
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        allParentWithBudgetChild.add(parentId);
        parentId = allItemById.get(parentId)?.parentId ?? null;
      }
    }
    const budgetByPlanAll = new Map<string, number>();
    for (const item of allItems) {
      if (!(Number(item.budget) > 0) || allParentWithBudgetChild.has(item.id)) continue;
      budgetByPlanAll.set(item.planId, (budgetByPlanAll.get(item.planId) ?? 0) + Number(item.budget));
    }
    const planChildren = new Map<string, string[]>();
    for (const plan of allPlans) {
      if (!plan.parentPlanId) continue;
      const bucket = planChildren.get(plan.parentPlanId) ?? [];
      bucket.push(plan.id);
      planChildren.set(plan.parentPlanId, bucket);
    }
    const descendantPlanIds = (planId: string, seen = new Set<string>()): string[] => {
      const children = planChildren.get(planId) ?? [];
      const result: string[] = [];
      for (const child of children) {
        if (seen.has(child)) continue;
        seen.add(child);
        result.push(child, ...descendantPlanIds(child, seen));
      }
      return result;
    };
    const envelopeBudget = (planId: string) => {
      let total = budgetByPlanAll.get(planId) ?? 0;
      for (const childId of descendantPlanIds(planId)) {
        if (selectedPlanIds.has(childId)) continue;
        total += budgetByPlanAll.get(childId) ?? 0;
      }
      return total;
    };

    // ── Goal ownership: each item rolls up to its nearest corporate goal ─────
    // Plans use GOAL where the template defines one, and OBJECTIVE for the
    // corporate goals derived from the AOP/strategic templates. A goal-level
    // objective is a top-level objective or one nested directly under a pillar.
    const descendantOf = (candidate: ScopedItem, ancestorId: string): boolean => {
      let parentId = candidate.parentId;
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        if (parentId === ancestorId) return true;
        seen.add(parentId);
        parentId = itemById.get(parentId)?.parentId ?? null;
      }
      return false;
    };
    const isGoalNode = (item: ScopedItem | undefined): boolean => {
      if (!item) return false;
      if (item.kind === "GOAL") return true;
      if (item.kind === "OBJECTIVE") return true;
      // A roadmap is organised by phase pillars and has no objectives under
      // them, so the phase is its corporate goal. A strategic pillar that does
      // contain objectives stays a grouping and the objectives carry the goal.
      if (item.kind === "PILLAR" && !item.parentId) {
        return !items.some(
          (candidate) =>
            (candidate.kind === "GOAL" || candidate.kind === "OBJECTIVE") &&
            descendantOf(candidate, item.id),
        );
      }
      return false;
    };

    const goalOwnerCache = new Map<string, string | null>();
    const goalOwnerOf = (startId: string | null, visited = new Set<string>()): string | null => {
      if (!startId || visited.has(startId)) return null;
      if (goalOwnerCache.has(startId)) return goalOwnerCache.get(startId) ?? null;
      visited.add(startId);
      const item = byId.get(startId);
      if (!item) return null;
      if (isGoalNode(item) && selectedItemIds.has(item.id)) {
        goalOwnerCache.set(startId, item.id);
        return item.id;
      }
      const viaParent = item.parentId ? goalOwnerOf(item.parentId, visited) : null;
      const owner = viaParent ?? (item.linkedItemId ? goalOwnerOf(item.linkedItemId, visited) : null);
      goalOwnerCache.set(startId, owner);
      return owner;
    };

    // Goal rows can duplicate across plan types: an AOP goal aligned to a
    // strategic goal is the same corporate goal with an annual delivery line.
    const rootGoalCache = new Map<string, string>();
    const rootGoalOf = (goalId: string, seen = new Set<string>()): string => {
      if (rootGoalCache.has(goalId)) return rootGoalCache.get(goalId)!;
      if (seen.has(goalId)) return goalId;
      seen.add(goalId);
      const goal = byId.get(goalId);
      if (!goal?.linkedItemId) {
        rootGoalCache.set(goalId, goalId);
        return goalId;
      }
      const linked = byId.get(goal.linkedItemId);
      if (
        linked &&
        isGoalNode(linked) &&
        selectedItemIds.has(linked.id) &&
        (PLAN_RANK[planTypeById.get(linked.planId) || ""] ?? 0) >
          (PLAN_RANK[planTypeById.get(goal.planId) || ""] ?? 0)
      ) {
        const root = rootGoalOf(linked.id, seen);
        rootGoalCache.set(goalId, root);
        return root;
      }
      rootGoalCache.set(goalId, goalId);
      return goalId;
    };

    const goalItems = items.filter(isGoalNode);
    const rootGoalIds = new Set(goalItems.map((goal) => rootGoalOf(goal.id)));

    const itemsByGoal = new Map<string, ScopedItem[]>();
    for (const item of items) {
      const owner = goalOwnerOf(item.id);
      if (!owner) continue;
      const root = rootGoalOf(owner);
      const bucket = itemsByGoal.get(root) ?? [];
      bucket.push(item);
      itemsByGoal.set(root, bucket);
    }

    const goals = [...rootGoalIds]
      .map((goalId) => {
        const goal = byId.get(goalId)!;
        const group = itemsByGoal.get(goalId) ?? [goal];
        const plan = allPlans.find((entry) => entry.id === goal.planId);
        const progressSource = progressByPlan.get(goal.planId) ?? {};
        const budget = money(
          group.reduce((sum, item) => sum + (budgetByItem.get(item.id) ?? 0), 0),
        );
        const measured = group
          .filter(
            (item) =>
              item.kind === "ACTIVITY" ||
              item.kind === "MILESTONE" ||
              item.kind === "KPI" ||
              !items.some((candidate) => candidate.parentId === item.id),
          )
          .map((item) => ({
            weight: budgetByItem.get(item.id) ?? 0,
            value: progressSource[item.id]?.progress ?? item.progress ?? 0,
          }))
          .filter((entry) => Number.isFinite(entry.value));
        const weighted = measured.filter((entry) => entry.weight > 0);
        const avgSource = weighted.length ? weighted : measured;
        const progress = avgSource.length
          ? pct(
              avgSource.reduce((sum, entry) => sum + entry.value, 0) / avgSource.length,
            )
          : pct(progressSource[goal.id]?.progress ?? goal.progress ?? 0);

        return {
          id: goal.id,
          planId: goal.planId,
          planTitle: plan?.title ?? "",
          planType: plan?.type ?? planTypeById.get(goal.planId) ?? "",
          planTypeLabel: PLAN_TYPE_LABEL[plan?.type ?? ""] ?? plan?.type ?? "",
          periodLabel: plan?.periodLabel ?? "",
          code: goal.code,
          title: goal.title,
          description: goal.description,
          owner: goal.owner,
          status: goal.status,
          progress,
          budget,
          activityCount: group.filter((item) => item.kind === "ACTIVITY" || item.kind === "MILESTONE").length,
          itemCount: group.length,
          mergedGoalItems: group.filter(isGoalNode).length,
        };
      })
      .sort((a, b) => b.budget - a.budget || a.title.localeCompare(b.title));

    // ── Projects: delivery portfolio, linked to the plan they serve ──────────
    const activityTotals = await prisma.activity.groupBy({
      by: ["projectId"],
      _sum: { financialPlan: true, actualExpenditure: true },
      _count: { _all: true },
    });
    const activityMap = new Map(
      activityTotals.map((row) => [
        row.projectId,
        {
          financialPlan: Number(row._sum.financialPlan ?? 0),
          actual: Number(row._sum.actualExpenditure ?? 0),
          activities: row._count._all,
        },
      ]),
    );

    const projectRows = await prisma.project.findMany({
      select: {
        projectId: true,
        title: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
        planId: true,
        goals: { select: { goal: { select: { id: true, title: true } } } },
      },
      orderBy: { projectId: "asc" },
    });

    const now = Date.now();
    const projects = projectRows.map((project) => {
      const totals = activityMap.get(project.projectId) ?? { financialPlan: 0, actual: 0, activities: 0 };
      const end = new Date(project.endDate).getTime();
      const start = new Date(project.startDate).getTime();
      const health =
        now > end && project.progress < 100
          ? "Overdue"
          : now > start && project.progress === 0
            ? "At Risk"
            : "On Track";
      const plan = project.planId ? allPlans.find((entry) => entry.id === project.planId) : null;
      return {
        projectId: project.projectId,
        title: project.title,
        status: project.status,
        progress: project.progress,
        health,
        startDate: project.startDate,
        endDate: project.endDate,
        planId: project.planId,
        planTitle: plan?.title ?? null,
        planType: plan?.type ?? null,
        planTypeLabel: plan ? PLAN_TYPE_LABEL[plan.type] ?? plan.type : null,
        periodLabel: plan?.periodLabel ?? null,
        financialPlan: money(totals.financialPlan),
        actualExpenditure: money(totals.actual),
        activities: totals.activities,
        goals: project.goals.map((entry) => entry.goal),
      };
    });

    const scopedProjects = query.type || query.period
      ? projects.filter((project) => project.planId && selectedPlanIds.has(project.planId))
      : projects;
    const scopedProjectIds = new Set(scopedProjects.map((project) => project.projectId));
    const unassignedProjects = projects.filter((project) => !project.planId);
    const pmsActual = money(scopedProjects.reduce((sum, project) => sum + project.actualExpenditure, 0));
    const pmsFinancialPlan = money(scopedProjects.reduce((sum, project) => sum + project.financialPlan, 0));

    // ── Plan and portfolio rows ─────────────────────────────────────────────
    const plans = selectedPlans.map((plan) => {
      const planItems = items.filter((item) => item.planId === plan.id);
      const planGoalRoots = new Set(
        planItems.filter(isGoalNode).map((item) => rootGoalOf(item.id)),
      );
      return {
        id: plan.id,
        type: plan.type,
        typeLabel: PLAN_TYPE_LABEL[plan.type] ?? plan.type,
        title: plan.title,
        periodLabel: plan.periodLabel,
        status: plan.status,
        isPublished: plan.isPublished,
        startDate: plan.startDate,
        endDate: plan.endDate,
        budget: money(
          envelopeBudget(plan.id),
        ),
        progress: pct(planCompletion.get(plan.id) ?? 0),
        itemCount: planItems.length,
        goalCount: planGoalRoots.size,
        projectCount: projects.filter((project) => project.planId === plan.id).length,
        actualExpenditure: money(
          projects
            .filter((project) => project.planId === plan.id)
            .reduce((sum, project) => sum + project.actualExpenditure, 0),
        ),
      };
    });

    const portfolios = plans
      .map((plan) => ({
        key: `${plan.type}:${plan.periodLabel}:${plan.id}`,
        planId: plan.id,
        title: plan.title,
        planType: plan.type,
        planTypeLabel: plan.typeLabel,
        periodLabel: plan.periodLabel,
        status: plan.status,
        progress: plan.progress,
        budget: plan.budget,
        actualExpenditure: plan.actualExpenditure,
        goalCount: plan.goalCount,
        projectCount: plan.projectCount,
        itemCount: plan.itemCount,
      }))
      .sort((a, b) => b.budget - a.budget || a.periodLabel.localeCompare(b.periodLabel));

    const totalPlanBudget = money(plans.reduce((sum, plan) => sum + plan.budget, 0));

    // Progress follows the same envelope as the money: when a type is filtered,
    // the child plans that supply its financial envelope also supply progress.
    const envelopePlanIds = new Set(selectedPlanIds);
    for (const plan of selectedPlans) {
      for (const childId of descendantPlanIds(plan.id)) envelopePlanIds.add(childId);
    }
    const progressBudgetItems = allItems.filter(
      (item) =>
        Number(item.budget) > 0 &&
        !allParentWithBudgetChild.has(item.id) &&
        envelopePlanIds.has(item.planId),
    );
    const progressWeight = progressBudgetItems.reduce((sum, item) => sum + Number(item.budget), 0);
    const budgetWeightedProgress = progressBudgetItems.length && progressWeight > 0
      ? pct(
          progressBudgetItems.reduce(
            (sum, item) => sum + (progressByPlan.get(item.planId)?.[item.id]?.progress ?? item.progress ?? 0) * Number(item.budget),
            0,
          ) / progressWeight,
        )
      : pct(
          selectedPlans.length
            ? selectedPlans.reduce((sum, plan) => sum + (planCompletion.get(plan.id) ?? 0), 0) /
                selectedPlans.length
            : 0,
        );

    // ── PMS organisational goals, linked to their projects and plans ────────
    const pmsGoalRows = await prisma.goal.findMany({
      include: {
        projects: {
          select: {
            project: {
              select: {
                projectId: true,
                title: true,
                planId: true,
              },
            },
          },
        },
      },
      orderBy: { targetDate: "asc" },
    });

    const pmsGoals = pmsGoalRows
      .map((goal) => {
        const linkedProjects = goal.projects.map((entry) => entry.project);
        const inScope = linkedProjects.filter(
          (project) => !query.type && !query.period ? true : project.planId && selectedPlanIds.has(project.planId),
        );
        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          targetDate: goal.targetDate,
          status: goal.status,
          progress: goal.progress,
          projects: linkedProjects,
          inScopeProjects: inScope,
          unlinked: linkedProjects.length === 0,
        };
      })
      .filter((goal) =>
        query.type || query.period ? goal.inScopeProjects.length > 0 : true,
      );

    // Delivery objectives declared in the PMS can name the corporate
    // objective they serve. Roll their projects into that corporate goal so
    // project reporting aligns with the documents without moving the money.
    const linkedProjectObjectives = await prisma.goal.findMany({
      where: { planItemId: { in: [...selectedItemIds] } },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        planItemId: true,
        projects: {
          select: { project: { select: { projectId: true, title: true, planId: true } } },
        },
      },
    });

    const scopedProjectById = new Map(scopedProjects.map((project) => [project.projectId, project]));
    const objectivesByCorporateGoal = new Map<string, typeof linkedProjectObjectives>();
    for (const objective of linkedProjectObjectives) {
      if (!objective.planItemId) continue;
      const owner = goalOwnerOf(objective.planItemId);
      if (!owner) continue;
      const root = rootGoalOf(owner);
      const bucket = objectivesByCorporateGoal.get(root) ?? [];
      bucket.push(objective);
      objectivesByCorporateGoal.set(root, bucket);
    }

    const goalsWithObjectives = goals.map((goal) => {
      const objectives = objectivesByCorporateGoal.get(goal.id) ?? [];
      const projectIds = new Set<string>();
      for (const objective of objectives) {
        for (const entry of objective.projects) {
          if (entry.project.planId && !selectedPlanIds.has(entry.project.planId) && (query.type || query.period)) {
            continue;
          }
          projectIds.add(entry.project.projectId);
        }
      }
      const contributingProjects = [...projectIds]
        .map((projectId) => scopedProjectById.get(projectId))
        .filter((project): project is (typeof scopedProjects)[number] => Boolean(project));
      return {
        ...goal,
        projectObjectives: objectives.map((objective) => ({
          id: objective.id,
          title: objective.title,
          status: objective.status,
          progress: objective.progress,
          projects: objective.projects.map((entry) => entry.project),
        })),
        projectObjectiveCount: objectives.length,
        contributingProjectCount: contributingProjects.length,
        contributingActual: money(
          contributingProjects.reduce((sum, project) => sum + project.actualExpenditure, 0),
        ),
      };
    });

    const periods = [...new Set(allPlans.map((plan) => `${plan.type}:${plan.periodLabel}`))]
      .map((key) => {
        const separator = key.indexOf(":");
        const type = key.slice(0, separator);
        const periodLabel = key.slice(separator + 1);
        return {
          type,
          typeLabel: PLAN_TYPE_LABEL[type] ?? type,
          periodLabel,
          label: `${PLAN_TYPE_LABEL[type] ?? type} · ${periodLabel}`,
          count: allPlans.filter((plan) => plan.type === type && plan.periodLabel === periodLabel).length,
        };
      })
      .sort((a, b) => b.periodLabel.localeCompare(a.periodLabel));

    res.json({
      filters: {
        selected: { type: query.type ?? null, period: query.period ?? null },
        types: PLAN_TYPES.map((type) => ({
          value: type,
          label: PLAN_TYPE_LABEL[type],
          count: allPlans.filter((plan) => plan.type === type).length,
        })),
        periods,
      },
      summary: {
        totalBudget: totalPlanBudget,
        pmsActual,
        pmsFinancialPlan,
        avgProgress: budgetWeightedProgress,
        corporateGoalCount: goals.length,
        pmsGoalCount: pmsGoals.length,
        planCount: selectedPlans.length,
        portfolioCount: portfolios.length,
        projectCount: scopedProjects.length,
        activityCount: scopedProjects.reduce((sum, project) => sum + project.activities, 0),
        unassignedProjectCount: unassignedProjects.length,
      },
      reconciliation: {
        countedItems: budgetItems.length,
        skippedParentBudgets: items.filter(
          (item) => Number(item.budget) > 0 && parentWithBudgetChild.has(item.id),
        ).length,
        skippedAlignedParents: alignedParent.size,
        pmsFinancialPlanExcluded: true,
        note:
          "Portfolio budgets come from the approved financial lines of the Annual Operational Plan, Strategic Plan and Roadmap. Actual project expenditure is reported against those approved budgets.",
      },
      goals: goalsWithObjectives,
      pmsGoals,
      plans,
      portfolios,
      projects,
      unassignedProjects,
    });
  } catch (e) {
    next(e);
  }
});

/** Link a project to the plan period whose targets it delivers. */
router.post("/project/:projectId/plan", requireRole("admin", "executive", "project_manager"), async (req, res, next) => {
  try {
    const { planId } = z.object({ planId: z.string().nullable() }).parse(req.body ?? {});
    const project = await prisma.project.findUnique({
      where: { projectId: req.params.projectId },
      select: { projectId: true },
    });
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
      if (!plan) return res.status(404).json({ message: "Plan not found" });
    }
    const updated = await prisma.project.update({
      where: { projectId: project.projectId },
      data: { planId },
      select: { projectId: true, planId: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
