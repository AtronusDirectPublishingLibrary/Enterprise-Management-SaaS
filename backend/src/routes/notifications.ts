import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Get all notifications for the current user
router.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipient: req.user!.username },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (e) { next(e); }
});

// Mark a specific notification as read
router.put("/:id/read", async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Mark all as read
router.put("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { recipient: req.user!.username, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;