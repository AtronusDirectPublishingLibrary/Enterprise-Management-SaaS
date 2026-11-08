import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req: any, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: { supervisorId: req.user.sub, status: "PENDING" },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" }
    });
    const plans = await prisma.annualLeavePlan.findMany({
      where: { supervisorId: req.user.sub, status: "SUBMITTED" },
      include: { user: { select: { firstName: true, lastName: true } }, items: true },
      orderBy: { submittedAt: "desc" }
    });
    res.json({ leaves, plans });
  } catch (err) { res.status(500).json({ error: "Failed to fetch approvals" }); }
});

export default router;