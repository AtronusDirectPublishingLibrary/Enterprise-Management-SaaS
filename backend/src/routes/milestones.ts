import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { recomputeProjectProgress } from "../lib/progress";

const router = Router();
router.use(requireAuth);

const MilestoneInput = z.object({
  title:       z.string().min(2).max(200),
  description: z.string().max(500).optional().default(""),
  startDate:   z.coerce.date(),
  endDate:     z.coerce.date(),
  progress:    z.number().int().min(0).max(100).optional(),
  status:      z.string().optional(),
});

function newMilestoneId(projectId: string) {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${projectId}-M-${ts}-${rand}`;
}

router.get("/:projectId", async (req, res, next) => {
  try {
    const rows = await prisma.milestone.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { milestoneId: "asc" },
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/:projectId", async (req, res, next) => {
  try {
    const d = MilestoneInput.parse(req.body);
    const milestoneId = newMilestoneId(req.params.projectId);
    const created = await prisma.milestone.create({
      data: {
        projectId: req.params.projectId,
        milestoneId,
        title: d.title, description: d.description,
        startDate: d.startDate, endDate: d.endDate,
        progress: d.progress ?? 0, status: d.status ?? "Not Started",
        createdBy: req.user!.username, lastModifiedBy: req.user!.username,
      },
    });
    await recomputeProjectProgress(req.params.projectId);
    await logAudit(req.params.projectId, "MILESTONE_ADDED", req.user!.username, { milestoneId });
    res.json({ success: true, milestoneId, milestone: created });
  } catch (e) { next(e); }
});

router.put("/:milestoneId", async (req, res, next) => {
  try {
    const d = MilestoneInput.partial().parse(req.body);
    const existing = await prisma.milestone.findUnique({ where: { milestoneId: req.params.milestoneId } });
    if (!existing) return res.status(404).json({ message: "Milestone not found" });
    const updated = await prisma.milestone.update({
      where: { milestoneId: req.params.milestoneId },
      data: { ...d, lastModifiedBy: req.user!.username, lastModifiedDate: new Date() },
    });
    await recomputeProjectProgress(existing.projectId);
    await logAudit(existing.projectId, "MILESTONE_UPDATED", req.user!.username, { milestoneId: req.params.milestoneId });
    res.json({ success: true, milestone: updated });
  } catch (e) { next(e); }
});

router.delete("/:milestoneId", async (req, res, next) => {
  try {
    const m = await prisma.milestone.findUnique({ where: { milestoneId: req.params.milestoneId } });
    if (!m) return res.status(404).json({ message: "Milestone not found" });
    await prisma.milestone.delete({ where: { milestoneId: req.params.milestoneId } });
    await recomputeProjectProgress(m.projectId);
    await logAudit(m.projectId, "MILESTONE_DELETED", req.user!.username, { milestoneId: req.params.milestoneId });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;