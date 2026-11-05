import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/:projectId", async (req, res, next) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { addedAt: "asc" },
    });
    res.json(members);
  } catch (e) { next(e); }
});

router.post("/:projectId", requireRole("admin", "project_manager"), async (req, res, next) => {
  try {
    const { username, role } = z.object({
      username: z.string().min(1),
      role: z.string().optional().default("member"),
    }).parse(req.body);

    const member = await prisma.projectMember.upsert({
      where: { projectId_username: { projectId: req.params.projectId, username } },
      update: { role },
      create: { projectId: req.params.projectId, username, role, addedBy: req.user!.username },
    });
    res.json({ success: true, member });
  } catch (e) { next(e); }
});

router.delete("/:projectId/:username", requireRole("admin", "project_manager"), async (req, res, next) => {
  try {
    await prisma.projectMember.delete({
      where: { projectId_username: { projectId: req.params.projectId, username: req.params.username } },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;