import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const texts = await prisma.heroText.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    res.json(texts);
  } catch (e) { next(e); }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { title, subtitle } = z.object({ title: z.string().min(1), subtitle: z.string().optional() }).parse(req.body);
    const text = await prisma.heroText.create({ data: { title, subtitle } });
    res.json({ success: true, text });
  } catch (e) { next(e); }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.heroText.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;