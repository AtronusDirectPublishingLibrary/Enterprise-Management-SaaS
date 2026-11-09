import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const holidaySchema = z.object({
  name: z.string().trim().min(2, "Holiday name is required").max(160),
  date: z.string().min(8, "A holiday date is required"),
  recurring: z.boolean().optional(),
});

/** Public read: the HR calendar and staff portal both need this list. */
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const year = Number(_req.query.year) || undefined;
    const holidays = await prisma.publicHoliday.findMany({
      where: year
        ? {
            date: {
              gte: new Date(Date.UTC(year, 0, 1)),
              lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
            },
          }
        : undefined,
      orderBy: { date: "asc" },
    });
    res.json(holidays);
  } catch (e) { next(e); }
});

router.post("/", requireAuth, requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const payload = holidaySchema.parse(req.body);
    const date = new Date(payload.date);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid holiday date" });
    }
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const existing = await prisma.publicHoliday.findUnique({ where: { date: day } });
    if (existing) {
      return res.status(409).json({ message: `A holiday is already recorded on ${day.toISOString().slice(0, 10)}.` });
    }
    const holiday = await prisma.publicHoliday.create({
      data: { name: payload.name, date: day, year: day.getUTCFullYear() },
    });
    res.status(201).json(holiday);
  } catch (e) { next(e); }
});

router.put("/:id", requireAuth, requireRole("admin", "executive"), async (req, res, next) => {
  try {
    const payload = holidaySchema.partial().parse(req.body);
    const data: { name?: string; date?: Date; year?: number } = {};
    if (payload.name) data.name = payload.name;
    if (payload.date) {
      const date = new Date(payload.date);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "Invalid holiday date" });
      data.date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      data.year = data.date.getUTCFullYear();
    }
    const holiday = await prisma.publicHoliday.update({ where: { id: req.params.id }, data });
    res.json(holiday);
  } catch (e) { next(e); }
});

router.delete("/:id", requireAuth, requireRole("admin", "executive"), async (req, res, next) => {
  try {
    await prisma.publicHoliday.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;