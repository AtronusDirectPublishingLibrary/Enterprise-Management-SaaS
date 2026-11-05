import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { recomputeProjectProgress } from "../lib/progress";
import { runAutomations } from "../lib/automation";

const router = Router();
router.use(requireAuth);

const ActivityInput = z.object({
  milestoneId:       z.string().optional().nullable(),
  workPackageId:     z.string().optional().nullable(),
  parentActivityId:  z.string().optional().nullable(),
  title:             z.string().min(2).max(200),
  description: z.string().max(500).optional().nullable().transform(v => v || ""),
  startDate:         z.coerce.date(),
  endDate:           z.coerce.date(),
  progress: z.coerce.number().int().min(0).max(100).optional().default(0),
  status:            z.string().optional(),
  assignedTo:        z.string().optional(),
  predecessorIds:    z.array(z.string()).optional(),
  financialPlan:     z.coerce.number().min(0).optional(),
  actualExpenditure: z.coerce.number().min(0).optional(),
});

function newActivityId(projectId: string) {
  const ts   = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${projectId}-A-${ts}-${rand}`;
}

async function pushDependentTasks(
  parentActivityId: string,
  delayMs: number,
  projectId: string,
  visited: Set<string> = new Set(),
) {
  if (delayMs === 0) return;
  if (visited.has(parentActivityId)) return;
  visited.add(parentActivityId);

  const parent = await prisma.activity.findUnique({
    where: { activityId: parentActivityId },
    include: { successors: true },
  });
  if (!parent || !parent.successors) return;

  for (const dep of parent.successors) {
    if (visited.has(dep.activityId)) continue;
    const newStart = new Date(dep.startDate.getTime() + delayMs);
    const newEnd   = new Date(dep.endDate.getTime() + delayMs);
    await prisma.activity.update({
      where: { id: dep.id },
      data: { startDate: newStart, endDate: newEnd },
    });
    await pushDependentTasks(dep.activityId, delayMs, projectId, visited);
  }
}

router.get("/:projectId", async (req, res, next) => {
  try {
    const rows = await prisma.activity.findMany({
      where: { projectId: req.params.projectId },
      include: { predecessors: { select: { activityId: true } } },
      orderBy: { activityId: "asc" },
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/:projectId", async (req, res, next) => {
  try {
    const d = ActivityInput.parse(req.body);
    const activityId = newActivityId(req.params.projectId);
    const duration = Math.round((d.endDate.getTime() - d.startDate.getTime()) / 86_400_000);

    const created = await prisma.activity.create({
      data: {
        projectId:         req.params.projectId,
        activityId,
        milestoneId:       d.milestoneId ?? null,
        workPackageId:     d.workPackageId ?? null,
        parentActivityId:  d.parentActivityId ?? null,
        title:             d.title,
        description:       d.description ?? "",
        startDate:         d.startDate,
        endDate:           d.endDate,
        duration,
        progress:          d.progress ?? 0,
        status:            d.status ?? "Not Started",
        assignedTo:        d.assignedTo ?? null,
        financialPlan:     d.financialPlan ?? 0,
        actualExpenditure: d.actualExpenditure ?? 0,
        createdBy:         req.user!.username,
        lastModifiedBy:    req.user!.username,
        ...(d.predecessorIds && d.predecessorIds.length > 0 ? {
          predecessors: { connect: d.predecessorIds.map(id => ({ activityId: id })) },
        } : {}),
      },
    });

    await recomputeProjectProgress(req.params.projectId);
    await logAudit(req.params.projectId, "ACTIVITY_ADDED", req.user!.username, { activityId });
    res.json({ success: true, activityId, activity: created });
  } catch (e) { next(e); }
});

router.put("/:activityId", async (req, res, next) => {
  try {
    const d = ActivityInput.partial().parse(req.body);
    const existing = await prisma.activity.findUnique({ where: { activityId: req.params.activityId } });
    if (!existing) return res.status(404).json({ message: "Activity not found" });

    const update: any = { ...d, lastModifiedBy: req.user!.username, lastModifiedDate: new Date() };
    if (d.startDate && d.endDate)
      update.duration = Math.round((d.endDate.getTime() - d.startDate.getTime()) / 86_400_000);

    if (d.predecessorIds) {
      update.predecessors = { set: d.predecessorIds.map(id => ({ activityId: id })) };
      delete update.predecessorIds;
    }

    const updated = await prisma.activity.update({
      where: { activityId: req.params.activityId }, data: update,
    });

    if (d.endDate && existing.endDate) {
      const delayMs = d.endDate.getTime() - existing.endDate.getTime();
      if (delayMs !== 0) {
        await pushDependentTasks(existing.activityId, delayMs, existing.projectId, new Set());
      }
    }

    await recomputeProjectProgress(existing.projectId);
    
    // Trigger Automation
    if (d.status && d.status !== existing.status) {
      await runAutomations(existing.projectId, "STATUS_CHANGE", { title: existing.title, newValue: d.status });
    }

    res.json({ success: true, activity: updated });
  } catch (e) { next(e); }
});

router.delete("/:activityId", async (req, res, next) => {
  try {
    const existing = await prisma.activity.findUnique({ where: { activityId: req.params.activityId } });
    if (!existing) return res.status(404).json({ message: "Activity not found" });
    await prisma.activity.delete({ where: { activityId: req.params.activityId } });
    await recomputeProjectProgress(existing.projectId);
    await logAudit(existing.projectId, "ACTIVITY_DELETED", req.user!.username, { activityId: req.params.activityId });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;