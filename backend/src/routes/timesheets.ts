import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/rbac";
import { buildTimesheetCompliance } from "../lib/timesheetCompliance";
import { isAdminUser, isHrAdmin } from "../lib/access";

const router = Router();
const prisma = new PrismaClient();
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

/** The reporting gate shown before a timesheet can be signed and submitted. */
router.get("/compliance", async (req: any, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    res.set("Cache-Control", "no-store");
    res.json(await buildTimesheetCompliance(req.user.sub, month, year));
  } catch (err) {
    res.status(500).json({ error: "Failed to check reporting compliance" });
  }
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
    const ts = await prisma.timesheet.findUnique({ where: { id: req.params.id } });
    if (!ts) return res.status(404).json({ error: "Not found" });
    if (ts.userId !== (req as any).user?.sub && (req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "Only the owner can submit this timesheet" });
    }
    const compliance = await buildTimesheetCompliance(ts.userId, ts.month, ts.year);
    if (compliance.blockers.length) {
      return res.status(409).json({
        error: compliance.message,
        message: compliance.message,
        blockers: compliance.blockers,
      });
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
    const hrQueue = isHrAdmin(req.user);
    const data = await prisma.timesheet.findMany({
      where: {
        OR: [
          ...(hrQueue ? [{ status: "SUBMITTED" }] : []),
          {
            status: "FORWARDED",
            ...(hrQueue ? {} : { supervisorId: req.user.sub }),
          },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true, position: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        entries: true,
      },
      orderBy: { submittedAt: "asc" },
    });
    res.json(
      data.map((sheet) => ({
        ...sheet,
        stage: sheet.status === "SUBMITTED" ? "HR" : "SUPERVISOR",
      })),
    );
  } catch (err) { res.status(500).json({ error: "Failed to fetch pending" }); }
});

// POST /api/timesheets/:id/forward - HR & Admin Manager sends the sheet to the supervisor
router.post("/:id/forward", async (req: any, res) => {
  try {
    if (!isHrAdmin(req.user)) {
      return res.status(403).json({ message: "Only the Human Resource and Administration Manager can forward timesheets." });
    }
    const ts = await prisma.timesheet.findUnique({ where: { id: req.params.id } });
    if (!ts) return res.status(404).json({ message: "Timesheet not found" });
    if (ts.status !== "SUBMITTED") {
      return res.status(409).json({ message: "Only a submitted timesheet can be forwarded." });
    }
    if (!ts.supervisorId) {
      return res.status(409).json({ message: "This employee has no immediate supervisor recorded. Assign a supervisor before forwarding." });
    }
    const updated = await prisma.timesheet.update({
      where: { id: ts.id },
      data: {
        status: "FORWARDED",
        hrReviewedAt: new Date(),
        hrReviewedBy: req.user.username,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to forward the timesheet" });
  }
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
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            position: true,
            department: true,
            employeeNo: true,
            signatureUrl: true,
            initialsUrl: true,
            initialsText: true,
          },
        },
        supervisor: { select: { firstName: true, lastName: true, position: true, signatureUrl: true } },
        entries: { orderBy: { date: "asc" } },
      },
    });
    if (!ts) return res.status(404).json({ error: "Timesheet not found" });
    const isOwner      = ts.userId === req.user?.sub;
    const isSupervisor = ts.supervisorId === req.user?.sub;
    const isAdmin      = ["admin", "executive"].includes(req.user?.role) || isHrAdmin(req.user);
    if (!isOwner && !isSupervisor && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    // The printed timesheet is signed for the Human Resource & Administration
    // office, not by the employee's immediate supervisor. Prefer the person who
    // actually reviewed the sheet; fall back to the current HR & Admin Manager.
    const reviewer = ts.hrReviewedBy
      ? await prisma.user.findUnique({
          where: { username: ts.hrReviewedBy },
          select: {
            firstName: true,
            lastName: true,
            username: true,
            position: true,
            signatureUrl: true,
            initialsUrl: true,
            initialsText: true,
          },
        })
      : null;
    const hrAdmin =
      (reviewer?.position === "Human Resource and Administration Manager" ? reviewer : null) ||
      (await prisma.user.findFirst({
        where: { position: "Human Resource and Administration Manager" },
        orderBy: { username: "asc" },
        select: {
          firstName: true,
          lastName: true,
          username: true,
          position: true,
          signatureUrl: true,
          initialsUrl: true,
          initialsText: true,
        },
      }));
    res.json({ ...ts, hrAdmin });
  } catch (err) { res.status(500).json({ error: "Failed to fetch" }); }
});
// PUT /api/timesheets/:id/action
router.put("/:id/action", async (req: any, res) => {
  try {
    const { status, rejectionReason, signedName } = req.body;
    const existing = await prisma.timesheet.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Timesheet not found" });
    const isAssignedSupervisor = existing.supervisorId === req.user?.sub;
    const isPrivileged = ["admin", "executive", "project_manager"].includes(req.user?.role) || isAdminUser(req.user);
    if (!isAssignedSupervisor && !isPrivileged) {
      return res.status(403).json({ message: "Only the assigned supervisor can approve this timesheet." });
    }
    // Final approval is a supervisor decision, made only after HR forwarded
    // the sheet. A technical admin retains an emergency override.
    if (existing.status !== "FORWARDED" && !isAdminUser(req.user)) {
      return res.status(409).json({ message: "This timesheet is still with HR & Admin; it must be forwarded to the supervisor before approval." });
    }
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