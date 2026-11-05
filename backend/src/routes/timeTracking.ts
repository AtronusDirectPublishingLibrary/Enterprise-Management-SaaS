import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/:projectId", async (req, res, next) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { date: "desc" },
    });
    res.json(entries);
  } catch (e) { next(e); }
});

router.post("/:projectId", async (req, res, next) => {
  try {
    const d = z.object({
      activityId: z.string().optional(),
      hours: z.number().min(0.1),
      description: z.string().optional(),
      date: z.coerce.date().optional(),
    }).parse(req.body);

    const entry = await prisma.timeEntry.create({
      data: {
        projectId: req.params.projectId,
        username: req.user!.username,
        ...d,
        date: d.date || new Date(),
      },
    });
    res.json(entry);
  } catch (e) { next(e); }
});

export default router;