import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadImage } from "../middleware/upload";
import { enqueueNews, runSocialQueue } from "../lib/socialPublisher";

const router = Router();

// Public: Get all news
router.get("/", async (req, res, next) => {
  try {
    const news = await prisma.news.findMany({ orderBy: { createdAt: "desc" } });
    res.json(news);
  } catch (e) { next(e); }
});

// Admin: Create news
router.post("/", requireAuth, requireRole("admin", "project_manager"), uploadImage.single("image"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      content: z.string().min(10),
      titleAm: z.string().optional(),
      contentAm: z.string().optional(),
      videoUrl: z.string().optional(),
      autoShare: z.preprocess(
        (value) => (value === undefined ? undefined : value === true || value === "true" || value === "on" || value === "1"),
        z.boolean().optional()
      ),
      socialCaption: z.string().max(2000).optional(),
    }).parse(req.body);

    const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : null;

    const created = await prisma.news.create({
      data: {
        ...d,
        videoUrl: d.videoUrl?.trim() || null,
        imageUrl,
        author: req.user!.username,
        autoShare: d.autoShare ?? true,
        socialCaption: d.socialCaption?.trim() || null,
      },
    });
    if (created.autoShare) {
      await enqueueNews(created);
      // Give configured channels a chance to go out immediately; the periodic
      // worker retries anything that the platform temporarily rejects.
      runSocialQueue(10).catch((error) => console.error("[social] immediate run failed", error));
    }
    res.json(created);
  } catch (e) { next(e); }
});

// Admin: Update news
router.put("/:id", requireAuth, requireRole("admin", "project_manager"), uploadImage.single("image"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      content: z.string().min(10),
      titleAm: z.string().optional(),
      contentAm: z.string().optional(),
      videoUrl: z.string().optional(),
      autoShare: z.preprocess(
        (value) => (value === undefined ? undefined : value === true || value === "true" || value === "on" || value === "1"),
        z.boolean().optional()
      ),
      socialCaption: z.string().max(2000).optional(),
    }).parse(req.body);

    const data: any = {
      ...d,
      videoUrl: d.videoUrl?.trim() || null,
      socialCaption: d.socialCaption?.trim() || null,
    };
    if (req.file) data.imageUrl = `/uploads/news/${req.file.filename}`;

    const updated = await prisma.news.update({
      where: { id: req.params.id },
      data,
    });
    if (updated.autoShare) {
      await enqueueNews(updated);
      runSocialQueue(10).catch((error) => console.error("[social] immediate run failed", error));
    }
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