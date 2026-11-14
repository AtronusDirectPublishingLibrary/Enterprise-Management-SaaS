import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyAuditChain } from "../lib/auditChain";
import { buildAuditExport } from "../lib/auditExport";
import { logAudit } from "../lib/audit";
import { createAuditCheckpoint, verifyAuditCheckpoint } from "../lib/auditCheckpoint";

const router = Router();

// GET /api/audit/verify - recalculate the chain and record the result.
router.get("/verify", async (req: any, res) => {
  try {
    const last = await prisma.auditLog.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    const result = await verifyAuditChain(0n, last?.id ?? 0n, {
      persist: true,
      checkedBy: req.user?.username || "system",
    });
    res.set("Cache-Control", "no-store").json(result);
  } catch (error) {
    console.error("[audit] verification failed", error);
    res.status(500).json({ error: "Failed to verify the audit chain" });
  }
});

// GET /api/audit/export?from=...&to=...&limit=... - signed evidence export.
router.get("/export", async (req: any, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ error: "from and to must be valid ISO dates" });
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: "from must be before to" });
    }
    const payload = await buildAuditExport({
      from,
      to,
      limit: Number(req.query.limit) || undefined,
      generatedBy: req.user?.username || "system",
    });
    await logAudit("AUDIT", "AUDIT_EXPORTED", req.user?.username || "system", {
      from: payload.range.from,
      to: payload.range.to,
      count: payload.count,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    res.set("Cache-Control", "no-store");
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="audit-export-${stamp}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error("[audit] export failed", error);
    res.status(500).json({ error: "Failed to export audit records" });
  }
});

// GET /api/audit/history/:entityType/:entityId - field-level change history.
router.get("/history/:entityType/:entityId", async (req, res) => {
  try {
    const changes = await prisma.fieldChange.findMany({
      where: { entityType: req.params.entityType, entityId: req.params.entityId },
      orderBy: { changedAt: "asc" },
      take: 500,
    });
    res.set("Cache-Control", "no-store").json(changes);
  } catch (error) {
    console.error("[audit] field history failed", error);
    res.status(500).json({ error: "Failed to load field history" });
  }
});

// GET /api/audit/checkpoints - signed external anchors for the chain head.
router.get("/checkpoints", async (_req, res) => {
  try {
    const rows = await prisma.auditCheckpoint.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    res.set("Cache-Control", "no-store").json(
      rows.map((row) => ({
        ...row,
        headId: row.headId.toString(),
        valid: verifyAuditCheckpoint(row),
      })),
    );
  } catch (error) {
    console.error("[audit] checkpoints failed", error);
    res.status(500).json({ error: "Failed to load audit checkpoints" });
  }
});

// POST /api/audit/checkpoints - create a signed checkpoint. Signing is a
// privileged action and requires the private key to be configured.
router.post("/checkpoints", async (req: any, res) => {
  try {
    if (!["admin", "executive"].includes(req.user?.role)) {
      return res.status(403).json({ error: "Only administrators or executives can create checkpoints" });
    }
    const checkpoint = await createAuditCheckpoint(req.user.username);
    res.status(201).json({ ...checkpoint, headId: checkpoint.headId.toString() });
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error("[audit] checkpoint failed", error);
    res.status(500).json({ error: "Failed to create an audit checkpoint" });
  }
});

// GET /api/audit - Fetch audit logs
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, action, user } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (action) where.action = { contains: String(action), mode: 'insensitive' };
    if (user) where.user = { contains: String(user), mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { timestamp: "desc" },
      }),
      prisma.auditLog.count({ where })
    ]);

    // Convert BigInt id to string for JSON serialization
    const serialized = logs.map(log => ({
      ...log,
      id: log.id.toString(),
    }));

    res.json({ data: serialized, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error("[audit] Error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;