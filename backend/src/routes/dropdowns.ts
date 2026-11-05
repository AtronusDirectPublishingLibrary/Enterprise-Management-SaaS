import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const options = await prisma.dropdownOption.findMany({ orderBy: { createdAt: 'asc' } });
    // Group by category for easy frontend consumption
    const grouped = options.reduce((acc, opt) => {
      if (!acc[opt.category]) acc[opt.category] = [];
      acc[opt.category].push(opt);
      return acc;
    }, {} as Record<string, typeof options>);
    res.json(grouped);
  } catch (e) { next(e); }
});

router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { category, value } = z.object({ category: z.string(), value: z.string().min(1) }).parse(req.body);
    const existing = await prisma.dropdownOption.findUnique({ where: { category_value: { category, value } } });
    if (existing) return res.status(400).json({ message: "Option already exists in this category." });
    
    const opt = await prisma.dropdownOption.create({ data: { category, value } });
    res.json(opt);
  } catch (e) { next(e); }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.dropdownOption.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;