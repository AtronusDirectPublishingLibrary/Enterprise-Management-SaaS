import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET my annual plan for the current year
router.get("/my-plan", async (req: any, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const plan = await prisma.annualLeavePlan.findUnique({
      where: { userId_year: { userId: req.user.sub, year } },
      include: { items: { orderBy: { startDate: "asc" } } },
    });
    res.json(plan || null);
  } catch (err) { res.status(500).json({ error: "Failed to fetch plan" }); }
});

// Create or update draft plan
router.post("/", async (req: any, res) => {
  try {
    const { year, items } = req.body;
    const userId = req.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { immediateSupervisorId: true } });

    const plan = await prisma.annualLeavePlan.upsert({
      where: { userId_year: { userId, year } },
      update: {
        status: "DRAFT",
        submittedAt: null,
        items: {
          deleteMany: {},
          create: items.map((i: any) => ({
            startDate: new Date(i.startDate),
            endDate: new Date(i.endDate),
            days: i.days || 1,
            leaveType: i.leaveType || "ANNUAL",
            notes: i.notes || null,
          })),
        },
      },
      create: {
        userId,
        year,
        status: "DRAFT",
        supervisorId: user?.immediateSupervisorId || null,
        items: {
          create: items.map((i: any) => ({
            startDate: new Date(i.startDate),
            endDate: new Date(i.endDate),
            days: i.days || 1,
            leaveType: i.leaveType || "ANNUAL",
            notes: i.notes || null,
          })),
        },
      },
      include: { items: true },
    });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save plan", details: err.message });
  }
});

// Submit plan to supervisor
router.post("/:id/submit", async (req: any, res) => {
  try {
    const data = await prisma.annualLeavePlan.update({
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
          entityType: "ANNUAL_PLAN",
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
  } catch (err) { res.status(500).json({ error: "Failed to submit plan" }); }
});

// Supervisor approves/rejects
router.put("/:id/action", async (req: any, res) => {
  try {
    const { status, rejectionReason, signedName } = req.body;
    const data = await prisma.annualLeavePlan.update({
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
          entityType: "ANNUAL_PLAN",
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
  } catch (err) { res.status(500).json({ error: "Failed to update plan" }); }
});

// HR views all plans
router.get("/", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const plans = await prisma.annualLeavePlan.findMany({
      where: { year },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(plans);
  } catch (err) { res.status(500).json({ error: "Failed to fetch plans" }); }
});

// HR verifies an approved plan
router.put("/:id/verify", async (req, res) => {
  try {
    const data = await prisma.annualLeavePlan.update({
      where: { id: req.params.id },
      data: { status: "VERIFIED", hrVerifiedAt: new Date() },
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to verify plan" }); }
});

export default router;