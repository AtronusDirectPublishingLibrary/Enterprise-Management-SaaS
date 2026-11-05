import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const BriefInput = z.object({
  content: z.string(),
  format:  z.string().optional().default("markdown"),
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const brief = await prisma.projectBrief.findUnique({
      where: { projectId: req.params.projectId },
    });
    res.json(brief || { projectId: req.params.projectId, content: "", format: "markdown" });
  } catch (e) { next(e); }
});

router.put("/:projectId", async (req, res, next) => {
  try {
    const d = BriefInput.parse(req.body);
    const brief = await prisma.projectBrief.upsert({
      where: { projectId: req.params.projectId },
      update: { content: d.content, format: d.format, updatedBy: req.user!.username },
      create: { projectId: req.params.projectId, content: d.content, format: d.format, updatedBy: req.user!.username },
    });
    res.json({ success: true, brief });
  } catch (e) { next(e); }
});

export default router;