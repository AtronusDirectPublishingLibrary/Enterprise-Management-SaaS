import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const MessageInput = z.object({
  title: z.string().min(1).max(200),
  body:  z.string().min(1).max(10000),
  pinned: z.boolean().optional(),
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const messages = await prisma.projectMessage.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    res.json(messages);
  } catch (e) { next(e); }
});

router.post("/:projectId", async (req, res, next) => {
  try {
    const d = MessageInput.parse(req.body);
    const message = await prisma.projectMessage.create({
      data: {
        projectId: req.params.projectId,
        ...d,
        author: req.user!.username,
      },
    });
    res.json({ success: true, message });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const msg = await prisma.projectMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (msg.author !== req.user!.username && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await prisma.projectMessage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;