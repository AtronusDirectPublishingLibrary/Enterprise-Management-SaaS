import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import { DEFAULT_APPRAISAL_CRITERIA, cycleForDate, cycleOptions } from "../lib/hrCycles";
import { logAudit } from "../lib/audit";

const router = Router();

const criterionSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(800).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  weight: z.coerce.number().int().min(1).max(100),
  maxScore: z.coerce.number().min(1).max(10),
  guidance: z.string().trim().max(1200).optional().nullable(),
  appliesToDepartment: z.string().trim().max(120).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

async function ensureCriteria() {
  const count = await prisma.appraisalCriterion.count();
  if (count === 0) {
    await prisma.appraisalCriterion.createMany({
      data: DEFAULT_APPRAISAL_CRITERIA.map((criterion) => ({
        ...criterion,
        category: criterion.category || "Core",
      })),
    });
  }
}

/** Keep DRAFT appraisals aligned without rewriting scored or completed records. */
async function syncDraftAppraisals() {
  const criteria = await prisma.appraisalCriterion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  if (!criteria.length) return;
  const drafts = await prisma.appraisal.findMany({
    where: { status: "DRAFT" },
    include: { items: true, user: { select: { department: true } } },
  });
  for (const appraisal of drafts) {
    const applicable = criteria.filter(
      (criterion) =>
        !criterion.appliesToDepartment ||
        criterion.appliesToDepartment.toLowerCase() === (appraisal.user.department || "").toLowerCase()
    );
    for (const [index, criterion] of applicable.entries()) {
      const existing = appraisal.items.find((item) => item.title.toLowerCase() === criterion.title.toLowerCase());
      if (existing) {
        await prisma.appraisalItem.update({
          where: { id: existing.id },
          data: {
            description: criterion.description,
            category: criterion.category,
            weight: criterion.weight,
            maxScore: criterion.maxScore,
            sortOrder: index,
          },
        });
      } else {
        await prisma.appraisalItem.create({
          data: {
            appraisalId: appraisal.id,
            title: criterion.title,
            description: criterion.description,
            category: criterion.category,
            weight: criterion.weight,
            maxScore: criterion.maxScore,
            sortOrder: index,
          },
        });
      }
    }
  }
}

/** Both roles need the cycle list; nobody needs the admin role to read it. */
router.get("/cycles", (_req, res) => {
  res.json(cycleOptions());
});

/** The editable appraisal framework (criteria, weights and rating scale). */
router.get("/criteria", requireRole("admin", "executive"), async (_req, res, next) => {
  try {
    await ensureCriteria();
    const criteria = await prisma.appraisalCriterion.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    });
    res.json({
      criteria,
      totalWeight: criteria.filter((row) => row.isActive).reduce((sum, row) => sum + row.weight, 0),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/criteria", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    await ensureCriteria();
    const body = criterionSchema.parse(req.body);
    const count = await prisma.appraisalCriterion.count();
    const criterion = await prisma.appraisalCriterion.create({
      data: {
        ...body,
        category: body.category || "Core",
        sortOrder: body.sortOrder ?? count,
        isActive: body.isActive ?? true,
      },
    });
    await syncDraftAppraisals();
    await logAudit("HR", "APPRAISAL_CRITERION_CREATED", req.user!.username, { criterionId: criterion.id });
    res.status(201).json(criterion);
  } catch (error) {
    next(error);
  }
});

router.put("/criteria/:id", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const body = criterionSchema.partial().parse(req.body);
    const criterion = await prisma.appraisalCriterion.update({
      where: { id: req.params.id },
      data: body,
    });
    await syncDraftAppraisals();
    await logAudit("HR", "APPRAISAL_CRITERION_UPDATED", req.user!.username, { criterionId: criterion.id });
    res.json(criterion);
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Criterion not found" });
    next(error);
  }
});

router.delete("/criteria/:id", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    await prisma.appraisalCriterion.delete({ where: { id: req.params.id } });
    await logAudit("HR", "APPRAISAL_CRITERION_DELETED", req.user!.username, { criterionId: req.params.id });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Criterion not found" });
    next(error);
  }
});

/** Admin: every appraisal, optionally for one cycle. */
router.get("/", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const cycle = typeof req.query.cycle === "string" ? req.query.cycle : undefined;
    const appraisals = await prisma.appraisal.findMany({
      where: cycle ? { cycle } : undefined,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            department: true,
            jobTitle: true,
            immediateSupervisorId: true,
          },
        },
        items: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
    });
    res.json(appraisals);
  } catch (error) {
    next(error);
  }
});

/**
 * Admin: open the cycle for everyone in scope. Re-running is safe — people who
 * already have an appraisal for that cycle are skipped.
 */
router.post("/cycle", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const body = z
      .object({
        cycle: z.string().optional(),
        department: z.string().optional(),
      })
      .parse(req.body || {});

    const target = body.cycle
      ? cycleOptions().find((option) => option.cycle === body.cycle)
      : cycleForDate();
    const cycle = target || cycleForDate();

    await ensureCriteria();
    const criteria = await prisma.appraisalCriterion.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    const staff = await prisma.user.findMany({
      where: {
        role: { in: ["staff", "project_manager", "executive"] },
        ...(body.department ? { department: body.department } : {}),
      },
      select: { id: true, department: true },
    });

    let created = 0;
    for (const member of staff) {
      const exists = await prisma.appraisal.findUnique({
        where: { userId_cycle: { userId: member.id, cycle: cycle.cycle } },
        select: { id: true },
      });
      if (exists) continue;

      const applicable = criteria.filter(
        (criterion) =>
          !criterion.appliesToDepartment ||
          criterion.appliesToDepartment.toLowerCase() === (member.department || "").toLowerCase()
      );
      const items = applicable.length ? applicable : criteria;
      await prisma.appraisal.create({
        data: {
          userId: member.id,
          cycle: cycle.cycle,
          periodLabel: cycle.periodLabel,
          periodStart: cycle.periodStart,
          periodEnd: cycle.periodEnd,
          status: "DRAFT",
          items: {
            create: items.map((criterion, index) => ({
              title: criterion.title,
              description: criterion.description,
              category: criterion.category,
              weight: criterion.weight,
              maxScore: criterion.maxScore,
              sortOrder: index,
            })),
          },
        },
      });
      created += 1;
    }

    await logAudit("HR", "APPRAISAL_CYCLE_OPENED", req.user!.username, { cycle: cycle.cycle, created });
    res.json({ cycle: cycle.cycle, created, skipped: staff.length - created });
  } catch (error) {
    next(error);
  }
});

/** The signed-in person's appraisal for a cycle (current by default). */
router.get("/my", async (req, res, next) => {
  try {
    const cycle = typeof req.query.cycle === "string" ? req.query.cycle : cycleForDate().cycle;
    const appraisal = await prisma.appraisal.findUnique({
      where: { userId_cycle: { userId: req.user!.sub, cycle } },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        user: { select: { immediateSupervisor: { select: { firstName: true, lastName: true, username: true } } } },
      },
    });
    res.json(appraisal);
  } catch (error) {
    next(error);
  }
});

/** Staff: save a draft or submit the self-assessment. */
router.put("/my", async (req, res, next) => {
  try {
    const body = z
      .object({
        cycle: z.string().optional(),
        selfSummary: z.string().optional(),
        selfRating: z.number().min(0).max(10).nullable().optional(),
        submit: z.boolean().optional(),
        items: z
          .array(
            z.object({
              id: z.string(),
              selfScore: z.number().min(0).max(10).nullable().optional(),
              comment: z.string().nullable().optional(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    const cycle = body.cycle || cycleForDate().cycle;
    const appraisal = await prisma.appraisal.findUnique({
      where: { userId_cycle: { userId: req.user!.sub, cycle } },
    });
    if (!appraisal) return res.status(404).json({ message: "No appraisal is open for this cycle" });
    if (appraisal.status === "COMPLETED") {
      return res.status(400).json({ message: "This appraisal is already closed" });
    }

    for (const item of body.items || []) {
      const target = await prisma.appraisalItem.findFirst({ where: { id: item.id, appraisalId: appraisal.id } });
      if (target && item.selfScore != null && item.selfScore > target.maxScore) {
        return res.status(400).json({ message: `${target.title} uses a ${target.maxScore}-point scale.` });
      }
      await prisma.appraisalItem.updateMany({
        where: { id: item.id, appraisalId: appraisal.id },
        data: { selfScore: item.selfScore ?? null, comment: item.comment ?? null },
      });
    }

    const updated = await prisma.appraisal.update({
      where: { id: appraisal.id },
      data: {
        ...(body.selfSummary !== undefined ? { selfSummary: body.selfSummary } : {}),
        ...(body.selfRating !== undefined ? { selfRating: body.selfRating } : {}),
        ...(body.submit ? { status: "SELF_SUBMITTED", submittedAt: new Date() } : {}),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/** Manager/HR: score the review and close the appraisal. */
router.put("/:id/review", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const body = z
      .object({
        managerSummary: z.string().optional(),
        managerRating: z.number().min(0).max(10).nullable().optional(),
        complete: z.boolean().optional(),
        items: z
          .array(
            z.object({
              id: z.string(),
              managerScore: z.number().min(0).max(10).nullable().optional(),
              comment: z.string().nullable().optional(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    const appraisal = await prisma.appraisal.findUnique({ where: { id: req.params.id } });
    if (!appraisal) return res.status(404).json({ message: "Appraisal not found" });

    for (const item of body.items || []) {
      const target = await prisma.appraisalItem.findFirst({ where: { id: item.id, appraisalId: appraisal.id } });
      if (target && item.managerScore != null && item.managerScore > target.maxScore) {
        return res.status(400).json({ message: `${target.title} uses a ${target.maxScore}-point scale.` });
      }
      await prisma.appraisalItem.updateMany({
        where: { id: item.id, appraisalId: appraisal.id },
        data: { managerScore: item.managerScore ?? null, ...(item.comment ? { comment: item.comment } : {}) },
      });
    }

    const updated = await prisma.appraisal.update({
      where: { id: appraisal.id },
      data: {
        ...(body.managerSummary !== undefined ? { managerSummary: body.managerSummary } : {}),
        ...(body.managerRating !== undefined ? { managerRating: body.managerRating } : {}),
        status: body.complete ? "COMPLETED" : "MANAGER_REVIEWED",
        reviewedAt: new Date(),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
