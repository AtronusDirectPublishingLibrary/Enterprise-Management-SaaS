import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Public: Get all translations (used by the frontend)
router.get("/", async (req, res, next) => {
  try {
    const translations = await prisma.translation.findMany();
    res.json(translations);
  } catch (e) { next(e); }
});

// Admin: Update a translation
router.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { en, am } = z.object({ en: z.string(), am: z.string() }).parse(req.body);
    const updated = await prisma.translation.update({
      where: { id: req.params.id },
      data: { en, am },
    });
    res.json(updated);
  } catch (e) { next(e); }
});


// Admin: Create a new translation
router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const d = z.object({ key: z.string(), en: z.string(), am: z.string() }).parse(req.body);
    const created = await prisma.translation.create({ data: d });
    res.json(created);
  } catch (e) { next(e); }
});

// Admin: Delete a translation
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.translation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
export default router;