import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      include: {
        projects: { include: { project: true } },
        corporateObjective: {
          select: {
            id: true,
            title: true,
            kind: true,
            plan: { select: { id: true, type: true, title: true, periodLabel: true } },
          },
        },
      },
      orderBy: { targetDate: "asc" },
    });
    res.json(goals);
  } catch (e) { next(e); }
});

router.post("/", requireRole("admin", "project_manager"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      targetDate: z.coerce.date(),
      planItemId: z.string().nullable().optional(),
    }).parse(req.body);

    if (d.planItemId) {
      const objective = await prisma.planItem.findUnique({ where: { id: d.planItemId } });
      if (!objective) return res.status(404).json({ message: "Corporate objective not found" });
    }

    const goal = await prisma.goal.create({
      data: { ...d, createdBy: req.user!.username },
    });
    res.json(goal);
  } catch (e) { next(e); }
});

router.post("/:goalId/link/:projectId", async (req, res, next) => {
  try {
    const link = await prisma.projectGoal.create({
      data: { goalId: req.params.goalId, projectId: req.params.projectId },
    });
    res.json(link);
  } catch (e) { next(e); }
});

/** Link (or unlink) a project objective to the corporate objective it serves. */
router.patch("/:goalId", requireRole("admin", "project_manager"), async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(2).optional(),
        description: z.string().nullable().optional(),
        targetDate: z.coerce.date().optional(),
        status: z.string().optional(),
        planItemId: z.string().nullable().optional(),
      })
      .parse(req.body ?? {});

    if (body.planItemId) {
      const objective = await prisma.planItem.findUnique({ where: { id: body.planItemId } });
      if (!objective) return res.status(404).json({ message: "Corporate objective not found" });
    }

    const goal = await prisma.goal.update({
      where: { id: req.params.goalId },
      data: body,
      include: { projects: { include: { project: true } } },
    });
    res.json(goal);
  } catch (e) { next(e); }
});

export default router;