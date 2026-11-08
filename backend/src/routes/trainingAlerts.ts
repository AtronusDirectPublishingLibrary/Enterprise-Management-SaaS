import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const [expired, expiringSoon] = await Promise.all([
      prisma.training.findMany({
        where: { expiresAt: { lt: now } },
        include: { user: { select: { firstName: true, lastName: true, department: true } } }
      }),
      prisma.training.findMany({
        where: { expiresAt: { gte: now, lte: in30Days } },
        include: { user: { select: { firstName: true, lastName: true, department: true } } }
      })
    ]);

    res.json({ expired, expiringSoon, total: expired.length + expiringSoon.length });
  } catch (err) { res.status(500).json({ error: "Failed to fetch alerts" }); }
});

export default router;