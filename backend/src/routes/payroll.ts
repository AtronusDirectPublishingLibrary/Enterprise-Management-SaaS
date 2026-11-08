import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const records = await prisma.salaryRecord.findMany({
      include: { user: { select: { firstName: true, lastName: true, username: true, department: true } } },
      orderBy: { effectiveAt: "desc" }
    });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed to fetch payroll" }); }
});

router.post("/", async (req, res) => {
  try {
    const { userId, baseSalary, allowance, currency, notes } = req.body;
    const record = await prisma.salaryRecord.create({
      data: { userId, baseSalary: Number(baseSalary) || 0, allowance: Number(allowance) || 0, currency: currency || "ETB", notes }
    });
    res.json(record);
  } catch (err) { res.status(500).json({ error: "Failed to create salary record" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.salaryRecord.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to delete" }); }
});

export default router;