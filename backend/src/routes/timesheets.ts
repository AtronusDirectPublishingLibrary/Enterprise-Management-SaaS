import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/rbac";

const router = Router();
const prisma = new PrismaClient();
const canApprove = requireRole(["admin", "executive", "project_manager"]);
const adminOnly  = requireRole(["admin"]);

// GET /api/timesheets/my-timesheet
router.get("/my-timesheet", async (req: any, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const timesheet = await prisma.timesheet.findUnique({
      where: { userId_month_year: { userId: req.user.sub, month, year } },
      include: { entries: { orderBy: { date: "asc" } } },
    });
    res.json(timesheet || null);
  } catch (err) { res.status(500).json({ error: "Failed to fetch" }); }
});

// POST /api/timesheets/save
router.post("/save", async (req: any, res) => {
  try {
    const { month, year, entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: "Entries must be a list" });
    const userId = req.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { immediateSupervisorId: true } });
    const rows = entries.map((entry: any) => {
      const leaveCode = entry.leaveCode ? String(entry.leaveCode).trim().toUpperCase().slice(0, 4) : null;
      const hours = Number(entry.hours);
      return {
        date: new Date(entry.date),
        hours: leaveCode ? 0 : (Number.isFinite(hours) ? hours : 0),
        leaveCode,
        description: entry.description || null,
        projectName: entry.projectName || "Regular",
      };
    });

    const timesheet = await prisma.timesheet.upsert({
      where: { userId_month_year: { userId, month, year } },
      update: {
        status: "DRAFT",
        entries: { deleteMany: {}, create: rows }
      },
      create: {
        userId, month, year, status: "DRAFT",
        supervisorId: user?.immediateSupervisorId || null,
        entries: { create: rows }
      },
      include: { entries: true },
    });
    res.json(timesheet);
  } catch (err: any) { res.status(500).json({ error: "Failed to save", details: err.message }); }
});

// POST /api/timesheets/:id/submit
router.post("/:id/submit", async (req: any, res) => {
  try {
    const ts = await prisma.timesheet.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!ts) return res.status(404).json({ error: "Not found" });
    if (ts.userId !== (req as any).user?.sub && (req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "Only the owner can submit this timesheet" });
    }
    const data = await prisma.timesheet.update({
      where: { id: req.params.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    if (typeof req.body?.signedName === "string" && req.body.signedName.trim().length >= 3) {
      const signer = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { signatureUrl: true, initialsUrl: true, initialsText: true },
      });
      await prisma.signatureRecord.create({
        data: {
          userId: req.user.sub,
          entityType: "TIMESHEET",
          entityId: data.id,
          decision: "SUBMITTED",
          signedName: req.body.signedName.trim(),
          signatureUrl: signer?.signatureUrl || null,
          initialsUrl: signer?.initialsUrl || null,
          initialsText: signer?.initialsText || null,
        },
      });
    }
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to submit" }); }
});

// GET /api/timesheets/pending
router.get("/pending", async (req: any, res) => {
  try {
    const data = await prisma.timesheet.findMany({
      where: { supervisorId: req.user.sub, status: "SUBMITTED" },
      include: { user: { select: { firstName: true, lastName: true } }, entries: true },
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to fetch pending" }); }
});

// GET /api/timesheets/settings
router.get("/settings", async (req, res) => {
  try {
    let settings = await prisma.timesheetSetting.findFirst();
    if (!settings) settings = await prisma.timesheetSetting.create({ data: { submissionDay: 25 } });
    res.json(settings);
  } catch (err) { res.status(500).json({ error: "Failed to fetch settings" }); }
});

// GET /api/timesheets/:id - single timesheet (owner, supervisor, or admin)
router.get("/:id", async (req: any, res) => {
  try {
    const ts = await prisma.timesheet.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        entries: { orderBy: { date: "asc" } },
      },
    });
    if (!ts) return res.status(404).json({ error: "Timesheet not found" });
    const isOwner      = ts.userId === req.user?.sub;
    const isSupervisor = ts.supervisorId === req.user?.sub;
    const isAdmin      = ["admin", "executive"].includes(req.user?.role);
    if (!isOwner && !isSupervisor && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(ts);
  } catch (err) { res.status(500).json({ error: "Failed to fetch" }); }
});
// PUT /api/timesheets/:id/action
router.put("/:id/action", canApprove, async (req: any, res) => {
  try {
    const { status, rejectionReason, signedName } = req.body;
    const data = await prisma.timesheet.update({
      where: { id: req.params.id },
      data: { status, rejectionReason, approvedAt: status === "APPROVED" ? new Date() : null },
    });
    if (typeof signedName === "string" && signedName.trim().length >= 3) {
      const signer = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { signatureUrl: true, initialsUrl: true, initialsText: true },
      });
      await prisma.signatureRecord.create({
        data: {
          userId: req.user.sub,
          entityType: "TIMESHEET",
          entityId: data.id,
          decision: status,
          signedName: signedName.trim(),
          signatureUrl: signer?.signatureUrl || null,
          initialsUrl: signer?.initialsUrl || null,
          initialsText: signer?.initialsText || null,
          note: rejectionReason || null,
        },
      });
    }
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to update" }); }
});

// PUT /api/timesheets/settings
router.put("/settings", adminOnly, async (req, res) => {
  try {
    const { submissionDay } = req.body;
    let settings = await prisma.timesheetSetting.findFirst();
    if (settings) {
      settings = await prisma.timesheetSetting.update({ where: { id: settings.id }, data: { submissionDay } });
    } else {
      settings = await prisma.timesheetSetting.create({ data: { submissionDay } });
    }
    res.json(settings);
  } catch (err) { res.status(500).json({ error: "Failed to update settings" }); }
});

export default router;