import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// Public: Get all news
router.get("/", async (req, res, next) => {
  try {
    const news = await prisma.news.findMany({ orderBy: { createdAt: "desc" } });
    res.json(news);
  } catch (e) { next(e); }
});

// Admin: Create news
router.post("/", requireAuth, requireRole("admin", "project_manager"), upload.single("image"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      content: z.string().min(10),
      titleAm: z.string().optional(),
      contentAm: z.string().optional(),
    }).parse(req.body);

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const created = await prisma.news.create({
      data: { ...d, imageUrl, author: req.user!.username },
    });
    res.json(created);
  } catch (e) { next(e); }
});

// Admin: Update news
router.put("/:id", requireAuth, requireRole("admin", "project_manager"), upload.single("image"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      content: z.string().min(10),
      titleAm: z.string().optional(),
      contentAm: z.string().optional(),
    }).parse(req.body);

    const data: any = { ...d };
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;

    const updated = await prisma.news.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// Admin: Delete news
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;