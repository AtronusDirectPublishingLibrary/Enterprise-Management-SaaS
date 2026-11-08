import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

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