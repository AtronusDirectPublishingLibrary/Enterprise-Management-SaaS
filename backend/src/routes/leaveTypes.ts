import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

const clean = (value: unknown) => String(value ?? "").trim();

/**
 * Two-letter timesheet abbreviations: Sick Leave → SL, Annual Leave → AL,
 * Compassionate Leave → CL, Absent → AB. Collisions fall back to the first two
 * letters of the name, then a trailing digit.
 */
export function buildShortCode(name: string, used: Set<string>): string {
  const words = clean(name).replace(/[^A-Za-z\s]/g, "").split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`
    : clean(name).replace(/[^A-Za-z]/g, "").slice(0, 2);
  let code = initials.toUpperCase().padEnd(2, "X");

  if (!used.has(code)) return code;

  const letters = clean(name).replace(/[^A-Za-z]/g, "").toUpperCase();
  for (let index = 1; index < letters.length; index += 1) {
    const candidate = `${letters[0]}${letters[index]}`;
    if (!used.has(candidate)) return candidate;
  }
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${code[0]}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return code;
}

async function usedShortCodes(excludeId?: string) {
  const rows = await prisma.leaveType.findMany({
    where: { shortCode: { not: null }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { shortCode: true },
  });
  return new Set(rows.map((row) => row.shortCode as string));
}

/** Backfill any leave type created before short codes existed. */
async function ensureShortCodes() {
  const missing = await prisma.leaveType.findMany({
    where: { shortCode: null },
    orderBy: { createdAt: "asc" },
  });
  if (!missing.length) return;
  const used = await usedShortCodes();
  for (const type of missing) {
    const code = buildShortCode(type.name, used);
    used.add(code);
    await prisma.leaveType.update({ where: { id: type.id }, data: { shortCode: code } });
  }
}

// GET /api/leave-types - Fetch all leave types
router.get("/", async (_req, res) => {
  try {
    await ensureShortCodes();
    const types = await prisma.leaveType.findMany({ orderBy: { createdAt: "asc" } });
    res.json(types);
  } catch (err) { res.status(500).json({ error: "Failed to fetch leave types" }); }
});

// GET /api/leave-types/active - Fetch only active types (for dropdowns)
router.get("/active", async (_req, res) => {
  try {
    await ensureShortCodes();
    const types = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json(types);
  } catch (err) { res.status(500).json({ error: "Failed to fetch active leave types" }); }
});

// POST /api/leave-types - Create new leave type
router.post("/", async (req, res) => {
  try {
    const { name, code, defaultDays, maxRolloverDays, rolloverExpireYr } = req.body;
    if (!clean(name) || !clean(code)) {
      return res.status(400).json({ error: "Name and code are required" });
    }
    const shortCode = buildShortCode(name, await usedShortCodes());
    const data = await prisma.leaveType.create({
      data: {
        name: clean(name),
        code: clean(code).toUpperCase(),
        shortCode,
        defaultDays: Number(defaultDays) || 20,
        maxRolloverDays: Number(maxRolloverDays) || 5,
        rolloverExpireYr: Number(rolloverExpireYr) || 1,
      },
    });
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to create leave type" }); }
});

// PUT /api/leave-types/:id - Update leave type
router.put("/:id", async (req, res) => {
  try {
    const { name, code, defaultDays, maxRolloverDays, rolloverExpireYr, isActive } = req.body;
    const existing = await prisma.leaveType.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Leave type not found" });

    const nextName = name !== undefined ? clean(name) : existing.name;
    const nameChanged = nextName !== existing.name;
    const shortCode = nameChanged
      ? buildShortCode(nextName, await usedShortCodes(existing.id))
      : existing.shortCode;

    const data = await prisma.leaveType.update({
      where: { id: req.params.id },
      data: {
        name: nextName,
        code: code !== undefined ? clean(code).toUpperCase() : existing.code,
        shortCode,
        defaultDays: defaultDays !== undefined ? Number(defaultDays) : existing.defaultDays,
        maxRolloverDays: maxRolloverDays !== undefined ? Number(maxRolloverDays) : existing.maxRolloverDays,
        rolloverExpireYr: rolloverExpireYr !== undefined ? Number(rolloverExpireYr) : existing.rolloverExpireYr,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to update leave type" }); }
});

// DELETE /api/leave-types/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.leaveType.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to delete leave type" }); }
});

export default router;
