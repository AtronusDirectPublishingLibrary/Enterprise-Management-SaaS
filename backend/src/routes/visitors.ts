import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getPublicSiteSettings, toPublicPayload } from "../lib/siteSettings";
import { getVisitorSummary } from "../lib/ga4";

const router = Router();

// Helper to get start of day, week, month, year
const getStartDate = (type: "today" | "week" | "month" | "year") => {
  const d = new Date();
  if (type === "today") d.setHours(0, 0, 0, 0);
  if (type === "week") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
  }
  if (type === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  if (type === "year") {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
};

/**
 * One row per visitor per day. This keeps the fallback counter (used until GA4
 * credentials are configured) from counting refreshes as extra visitors.
 */
router.post("/log", async (req, res) => {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket.remoteAddress;
    const ip = String(rawIp || "unknown").split(",")[0].trim().slice(0, 120);

    const alreadyLogged = await prisma.visitorLog.findFirst({
      where: { ip, visitedAt: { gte: getStartDate("today") } },
      select: { id: true },
    });
    if (!alreadyLogged) {
      await prisma.visitorLog.create({ data: { ip } });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log visit" });
  }
});

/** Public: today / this month / this year / all-time visitors. */
router.get("/summary", async (_req, res, next) => {
  try {
    const settings = await getPublicSiteSettings();
    const publicSettings = toPublicPayload(settings);

    if (!publicSettings.visitors.display) {
      res.set("Cache-Control", "no-store");
      return res.json({ display: false });
    }

    const summary = await getVisitorSummary({
      propertyId: settings.visitors.propertyId,
      measurementId: settings.visitors.measurementId,
    });

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({ display: true, ...summary });
  } catch (e) {
    next(e);
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const todayStart = getStartDate("today");
    const weekStart = getStartDate("week");
    const monthStart = getStartDate("month");
    const yearStart = getStartDate("year");

    const [today, week, month, year, allTime] = await Promise.all([
      prisma.visitorLog.count({ where: { visitedAt: { gte: todayStart } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: weekStart } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: monthStart } } }),
      prisma.visitorLog.count({ where: { visitedAt: { gte: yearStart } } }),
      prisma.visitorLog.count(),
    ]);

    res.json({ today, week, month, year, allTime });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
