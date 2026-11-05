import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { sendNotification } from "../lib/notify";

const router = Router();
router.use(requireAuth);

const CommentInput = z.object({
  targetType: z.enum(["PROJECT", "ACTIVITY", "MILESTONE", "DOCUMENT"]),
  targetId:   z.string(),
  body:       z.string().min(1).max(5000),
});

router.get("/", async (req, res, next) => {
  try {
    const { targetType, targetId } = req.query as any;
    if (!targetType || !targetId) return res.status(400).json({ message: "targetType and targetId required" });
    
    const comments = await prisma.comment.findMany({
      where: { targetType, targetId, deleted: false },
      include: { reactions: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = CommentInput.parse(req.body);
    const comment = await prisma.comment.create({
      data: {
        ...d,
        author: req.user!.username,
      },
      include: { reactions: true },
    });

    // Send a notification to a mock admin (or the project owner if you had one)
    await sendNotification(
      "admin", 
      "COMMENT", 
      `${req.user!.username} commented`, 
      d.body.substring(0, 50) + (d.body.length > 50 ? "..." : ""),
      `/database/pms/${d.targetId}`
    );

    res.json({ success: true, comment });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.author !== req.user!.username && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }
    await prisma.comment.update({ where: { id: req.params.id }, data: { deleted: true, body: "[deleted]" } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post("/:id/reactions", async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const commentId = req.params.id;
    
    const existing = await prisma.reaction.findUnique({
      where: { commentId_emoji_author: { commentId, emoji, author: req.user!.username } }
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ success: true, action: "removed" });
    }

    await prisma.reaction.create({
      data: { commentId, emoji, author: req.user!.username }
    });
    res.json({ success: true, action: "added" });
  } catch (e) { next(e); }
});

export default router;