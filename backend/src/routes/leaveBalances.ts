import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { requireRole } from "../middleware/rbac";

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const adminOnly = requireRole(["admin", "executive"]);

// GET /api/leave-balances/template - Download CSV template
router.get("/template", adminOnly, (req, res) => {
  const year = new Date().getFullYear();
  const csv = `username,year,entitledDays,rolloverDays\nahmed.k,${year},20,0\nsara.t,${year},20,5\ndaniel.a,${year},25,2`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=leave_balances_${year}.csv`);
  res.send(csv);
});

// POST /api/leave-balances/upload - Bulk import balances
router.post("/upload", adminOnly, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true }) as any[];
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    const currentYear = new Date().getFullYear();

    for (const row of records) {
      const username = row.username || row.Username;
      if (!username) { errors.push(`Row missing username`); continue; }

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) { errors.push(`User "${username}" not found`); skipped++; continue; }

      const year = Number(row.year) || currentYear;
      const entitledDays = Number(row.entitledDays) || 20;
      const rolloverDays = Number(row.rolloverDays) || 0;
      const leaveType = row.leaveType || "ANNUAL";

      try {
        await prisma.leaveBalance.upsert({
          where: { userId_year_leaveType: { userId: user.id, year, leaveType } },
          update: { entitledDays, rolloverDays },
          create: { userId: user.id, year, leaveType, entitledDays, rolloverDays, usedDays: 0 },
        });
        added++;
      } catch (err: any) {
        errors.push(`Failed for ${username}: ${err.message}`);
        skipped++;
      }
    }

    res.json({ success: true, added, skipped, total: records.length, errors: errors.slice(0, 10) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to parse CSV", details: err.message });
  }
});

// GET /api/leave-balances/my-balances - Self-service
router.get("/my-balances", async (req: any, res) => {
  try {
    const year = new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({ where: { userId: req.user.sub, year } });
    res.json(balances);
  } catch (err) { res.status(500).json({ error: "Failed to fetch balances" }); }
});

// GET /api/leave-balances - Admin view for all staff
router.get("/", adminOnly, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({
      where: { year },
      include: { user: { select: { firstName: true, lastName: true, username: true, role: true } } },
    });
    res.json(balances);
  } catch (err) { res.status(500).json({ error: "Failed to fetch balances" }); }
});

// POST /api/leave-balances - Single upsert
router.post("/", adminOnly, async (req, res) => {
  try {
    const { userId, year, leaveType, entitledDays, rolloverDays } = req.body;
    const data = await prisma.leaveBalance.upsert({
      where: { userId_year_leaveType: { userId, year, leaveType: leaveType || "ANNUAL" } },
      update: { entitledDays, rolloverDays },
      create: { userId, year, leaveType: leaveType || "ANNUAL", entitledDays, rolloverDays, usedDays: 0 },
    });
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: "Failed to set balance", details: err.message }); }
});

export default router;