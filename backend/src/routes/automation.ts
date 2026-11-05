import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/:projectId", async (req, res, next) => {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: "asc" },
    });
    res.json(rules);
  } catch (e) { next(e); }
});

router.post("/:projectId", requireRole("admin", "project_manager"), async (req, res, next) => {
  try {
    const d = z.object({
      name: z.string().min(1),
      triggerEvent: z.string(),
      triggerValue: z.string().optional(),
      actionType: z.string(),
      actionTarget: z.string().optional(),
      actionValue: z.string().optional(),
    }).parse(req.body);

    const rule = await prisma.automationRule.create({
      data: {
        projectId: req.params.projectId,
        ...d,
        createdBy: req.user!.username,
      },
    });
    res.json(rule);
  } catch (e) { next(e); }
});

router.delete("/:id", requireRole("admin", "project_manager"), async (req, res, next) => {
  try {
    await prisma.automationRule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;