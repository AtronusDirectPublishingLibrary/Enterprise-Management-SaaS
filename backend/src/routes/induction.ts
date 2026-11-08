import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import { DEFAULT_INDUCTION_TASKS } from "../lib/hrCycles";
import { logAudit } from "../lib/audit";

const router = Router();

const buildTasks = (startDate: Date) =>
  DEFAULT_INDUCTION_TASKS.map((task, index) => ({
    title: task.title,
    category: task.category,
    dueAt: new Date(startDate.getTime() + task.offsetDays * 86_400_000),
    sortOrder: index,
  }));

/** Admin: every induction with progress. */
router.get("/", requireRole("admin", "executive"), async (_req, res, next) => {
  try {
    const inductions = await prisma.induction.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, department: true, jobTitle: true } },
        tasks: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(inductions);
  } catch (error) {
    next(error);
  }
});

/** Admin: start an induction for a member of staff (idempotent per person). */
router.post("/", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const body = z
      .object({
        userId: z.string().min(1),
        startDate: z.string().optional(),
      })
      .parse(req.body);

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const existing = await prisma.induction.findFirst({ where: { userId: body.userId } });
    if (existing) return res.status(409).json({ message: "This person already has an induction" });

    const induction = await prisma.induction.create({
      data: { userId: body.userId, startDate, tasks: { create: buildTasks(startDate) } },
      include: { tasks: true },
    });
    await logAudit("HR", "INDUCTION_STARTED", req.user!.username, { userId: body.userId });
    res.status(201).json(induction);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/tasks", requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1),
        category: z.string().optional(),
        dueAt: z.string().nullable().optional(),
      })
      .parse(req.body);

    const task = await prisma.inductionTask.create({
      data: {
        inductionId: req.params.id,
        title: body.title,
        category: body.category || "GENERAL",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

/** Anyone involved can tick a task off; HR can reopen it. */
router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const body = z.object({ completed: z.boolean() }).parse(req.body);
    const task = await prisma.inductionTask.findUnique({
      where: { id: req.params.id },
      include: { induction: true },
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isOwner = task.induction.userId === req.user!.sub;
    const isHr = ["admin", "executive"].includes(req.user!.role);
    if (!isOwner && !isHr) return res.status(403).json({ message: "Forbidden" });

    const updated = await prisma.inductionTask.update({
      where: { id: task.id },
      data: { completedAt: body.completed ? new Date() : null },
    });

    const remaining = await prisma.inductionTask.count({
      where: { inductionId: task.inductionId, completedAt: null },
    });
    await prisma.induction.update({
      where: { id: task.inductionId },
      data:
        remaining === 0
          ? { status: "COMPLETED", completedAt: new Date() }
          : { status: "ACTIVE", completedAt: null },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
