import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const slideSchema = z.object({
  title: z.string().min(1),
  titleAm: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  subtitleAm: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  taglineAm: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaLabelAm: z.string().nullable().optional(),
  ctaUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

/** Public: active hero slides in display order. */
router.get("/", async (_req, res, next) => {
  try {
    const slides = await prisma.heroText.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(slides);
  } catch (e) { next(e); }
});

/** Admin: every slide, including inactive ones. */
router.get("/all", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const slides = await prisma.heroText.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(slides);
  } catch (e) { next(e); }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const data = slideSchema.parse(req.body);
    const last = await prisma.heroText.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const slide = await prisma.heroText.create({
      data: { ...data, sortOrder: data.sortOrder ?? (last?.sortOrder ?? -1) + 1 },
    });
    res.json({ success: true, slide });
  } catch (e) { next(e); }
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const data = slideSchema.partial().parse(req.body);
    const slide = await prisma.heroText.update({ where: { id: req.params.id }, data });
    res.json({ success: true, slide });
  } catch (e) { next(e); }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.heroText.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
