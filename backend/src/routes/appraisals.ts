import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import { DEFAULT_APPRAISAL_ITEMS, cycleForDate, cycleOptions } from "../lib/hrCycles";
import { logAudit } from "../lib/audit";

const router = Router();

/** Both roles need the cycle list; nobody needs the admin role to read it. */
router.get("/cycles", (_req, res) => {
  res.json(cycleOptions());
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

    const staff = await prisma.user.findMany({
      where: {
        role: { in: ["staff", "project_manager", "executive"] },
        ...(body.department ? { department: body.department } : {}),
      },
      select: { id: true },
    });

    let created = 0;
    for (const member of staff) {
      const exists = await prisma.appraisal.findUnique({
        where: { userId_cycle: { userId: member.id, cycle: cycle.cycle } },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.appraisal.create({
        data: {
          userId: member.id,
          cycle: cycle.cycle,
          periodLabel: cycle.periodLabel,
          periodStart: cycle.periodStart,
          periodEnd: cycle.periodEnd,
          status: "DRAFT",
          items: {
            create: DEFAULT_APPRAISAL_ITEMS.map((title, index) => ({
              title,
              weight: 20,
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
        selfRating: z.number().min(0).max(5).nullable().optional(),
        submit: z.boolean().optional(),
        items: z
          .array(
            z.object({
              id: z.string(),
              selfScore: z.number().min(0).max(5).nullable().optional(),
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
        managerRating: z.number().min(0).max(5).nullable().optional(),
        complete: z.boolean().optional(),
        items: z
          .array(
            z.object({
              id: z.string(),
              managerScore: z.number().min(0).max(5).nullable().optional(),
              comment: z.string().nullable().optional(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    const appraisal = await prisma.appraisal.findUnique({ where: { id: req.params.id } });
    if (!appraisal) return res.status(404).json({ message: "Appraisal not found" });

    for (const item of body.items || []) {
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
