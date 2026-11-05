import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { recomputeProjectProgress } from "../lib/progress";

const router = Router();
router.use(requireAuth);

const WPInput = z.object({
  title:       z.string().min(2).max(200),
  description: z.string().optional().nullable().transform(v => v || ""),
  startDate:   z.coerce.date(),
  endDate:     z.coerce.date(),
  progress:    z.coerce.number().int().min(0).max(100).optional().default(0),
  status:      z.string().optional().default("Not Started"),
  dependencies: z.string().optional().nullable(),
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const rows = await prisma.workPackage.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { workPackageId: "asc" },
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/:projectId", async (req, res, next) => {
  try {
    const d = WPInput.parse(req.body);
    const count = await prisma.workPackage.count({ where: { projectId: req.params.projectId } });
    const workPackageId = `${req.params.projectId}-WP${count + 1}`;
    
    // Use 'as any' to bypass strict typing if the Prisma client is stale
    const data: any = {
      projectId: req.params.projectId,
      workPackageId,
      title: d.title,
      description: d.description,
      startDate: d.startDate,
      endDate: d.endDate,
      progress: d.progress ?? 0,
      status: d.status ?? "Not Started",
      dependencies: d.dependencies ?? null,
      createdBy: req.user!.username,
      lastModifiedBy: req.user!.username,
    };

    const created = await prisma.workPackage.create({ data });
    await logAudit(req.params.projectId, "WP_ADDED", req.user!.username, { workPackageId });
    res.json({ success: true, workPackage: created });
  } catch (e) { next(e); }
});

router.put("/:workPackageId", async (req, res, next) => {
  try {
    const d = WPInput.partial().parse(req.body);
    const existing = await prisma.workPackage.findUnique({ where: { workPackageId: req.params.workPackageId } });
    if (!existing) return res.status(404).json({ message: "Work Package not found" });

    const update: any = { ...d, lastModifiedBy: req.user!.username, lastModifiedDate: new Date() };

    const updated = await prisma.workPackage.update({
      where: { workPackageId: req.params.workPackageId },
      data: update,
    });
    await recomputeProjectProgress(existing.projectId);
    await logAudit(existing.projectId, "WP_UPDATED", req.user!.username, { workPackageId: req.params.workPackageId });
    res.json({ success: true, workPackage: updated });
  } catch (e) { next(e); }
});

// ─── Fix #2: DELETE ────────────────────────────────────────────────
router.delete("/:workPackageId", async (req, res, next) => {
  try {
    const existing = await prisma.workPackage.findUnique({
      where: { workPackageId: req.params.workPackageId },
    });
    if (!existing) return res.status(404).json({ message: "Work Package not found" });
    await prisma.workPackage.delete({ where: { workPackageId: req.params.workPackageId } });
    await recomputeProjectProgress(existing.projectId);
    await logAudit(existing.projectId, "WP_DELETED", req.user!.username, {
      workPackageId: req.params.workPackageId,
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});
export default router;
