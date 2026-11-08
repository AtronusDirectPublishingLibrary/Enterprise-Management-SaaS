import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/leave-types - Fetch all leave types
router.get("/", async (req, res) => {
  try {
    const types = await prisma.leaveType.findMany({ orderBy: { createdAt: "asc" } });
    res.json(types);
  } catch (err) { res.status(500).json({ error: "Failed to fetch leave types" }); }
});

// GET /api/leave-types/active - Fetch only active types (for dropdowns)
router.get("/active", async (req, res) => {
  try {
    const types = await prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    res.json(types);
  } catch (err) { res.status(500).json({ error: "Failed to fetch active leave types" }); }
});

// POST /api/leave-types - Create new leave type
router.post("/", async (req, res) => {
  try {
    const { name, code, defaultDays, maxRolloverDays, rolloverExpireYr } = req.body;
    const data = await prisma.leaveType.create({
      data: { name, code: code.toUpperCase(), defaultDays: Number(defaultDays) || 20, maxRolloverDays: Number(maxRolloverDays) || 5, rolloverExpireYr: Number(rolloverExpireYr) || 1 },
    });
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to create leave type" }); }
});

// PUT /api/leave-types/:id - Update leave type
router.put("/:id", async (req, res) => {
  try {
    const { name, code, defaultDays, maxRolloverDays, rolloverExpireYr, isActive } = req.body;
    const data = await prisma.leaveType.update({
      where: { id: req.params.id },
      data: { name, code: code?.toUpperCase(), defaultDays: Number(defaultDays), maxRolloverDays: Number(maxRolloverDays), rolloverExpireYr: Number(rolloverExpireYr), isActive },
    });
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to update leave type" }); }
});

// DELETE /api/leave-types/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.leaveType.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: "Failed to delete leave type" }); }
});

export default router;