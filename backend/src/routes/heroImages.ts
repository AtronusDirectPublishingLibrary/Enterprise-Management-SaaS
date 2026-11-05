import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const images = await prisma.heroImage.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    res.json(images);
  } catch (e) { next(e); }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    const image = await prisma.heroImage.create({ data: { url } });
    res.json({ success: true, image });
  } catch (e) { next(e); }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.heroImage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;