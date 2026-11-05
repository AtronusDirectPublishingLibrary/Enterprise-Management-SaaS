import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { projects: { include: { project: true } } },
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
    }).parse(req.body);

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

export default router;