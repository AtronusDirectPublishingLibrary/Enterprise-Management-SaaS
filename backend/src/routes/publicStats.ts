import { Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * Public, read-only programme facts for the corporate site.
 * Everything is derived from the approved plans so the public numbers cannot
 * drift from the planning data.
 */
const router = Router();

router.get("/at-a-glance", async (_req, res, next) => {
  try {
    const [aop, roadmap] = await Promise.all([
      prisma.plan.findFirst({
        where: { type: "AOP", status: "Active" },
        orderBy: { startDate: "desc" },
        select: { id: true, periodLabel: true, updatedAt: true },
      }),
      prisma.plan.findFirst({
        where: { type: "ROADMAP", status: "Active" },
        orderBy: { startDate: "desc" },
        select: { id: true, startDate: true, endDate: true, updatedAt: true },
      }),
    ]);

    const [budget, majorActivities, phases, kpis, plans] = await Promise.all([
      aop
        ? prisma.planItem.aggregate({
            where: { planId: aop.id, kind: "OBJECTIVE" },
            _sum: { budget: true },
          })
        : null,
      aop
        ? prisma.planItem.count({ where: { planId: aop.id, kind: "OBJECTIVE" } })
        : 0,
      roadmap
        ? prisma.planItem.count({ where: { planId: roadmap.id, kind: "PILLAR" } })
        : 0,
      roadmap
        ? prisma.planItem.findMany({
            where: { planId: roadmap.id, kind: "KPI", code: { in: ["RM-KPI-1", "RM-KPI-2"] } },
            select: { code: true, targetValue: true, unit: true },
          })
        : [],
      prisma.plan.findMany({
        where: { isPublished: true },
        orderBy: { startDate: "asc" },
        select: {
          type: true,
          title: true,
          periodLabel: true,
          items: { where: { kind: "KPI" }, select: { id: true } },
        },
      }),
    ]);

    const doses = kpis.find((kpi) => kpi.code === "RM-KPI-1");
    const jobs = kpis.find((kpi) => kpi.code === "RM-KPI-2");
    const freshest = [aop?.updatedAt, roadmap?.updatedAt]
      .filter(Boolean)
      .sort((a, b) => new Date(b as Date).getTime() - new Date(a as Date).getTime())[0];

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({
      asOf: freshest ?? new Date().toISOString(),
      programme: {
        value: budget?._sum.budget ?? 0,
        currency: "ETB",
        periodLabel: aop?.periodLabel ?? null,
        majorActivities,
      },
      roadmap: {
        startYear: roadmap ? new Date(roadmap.startDate).getUTCFullYear() : null,
        endYear: roadmap ? new Date(roadmap.endDate).getUTCFullYear() : null,
        phases,
        dosesTarget: doses?.targetValue ?? null,
        dosesUnit: doses?.unit ?? null,
        jobsTarget: jobs?.targetValue ?? null,
        jobsUnit: jobs?.unit ?? null,
      },
      plans: plans.map((plan) => ({
        type: plan.type,
        title: plan.title,
        periodLabel: plan.periodLabel,
        targets: plan.items.length,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
