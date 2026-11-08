import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Helper to convert array of objects to CSV
function toCSV(data: any[], fields: string[]): string {
  if (data.length === 0) return fields.join(",");
  const rows = data.map(row => {
    return fields.map(field => {
      const parts = field.split(".");
      let value = row;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    }).join(",");
  });
  return [fields.join(","), ...rows].join("\n");
}

// Export Balances
router.get("/balances", async (req, res) => {
  try {
    const data = await prisma.leaveBalance.findMany({
      include: { user: { select: { firstName: true, lastName: true, username: true, department: true } } }
    });
    const fields = ["user.username", "user.firstName", "user.lastName", "user.department", "leaveType", "entitledDays", "usedDays", "rolloverDays"];
    const csv = toCSV(data, fields);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leave_balances.csv');
    res.send(csv);
  } catch (err) { res.status(500).send("Error generating CSV"); }
});

// Export Training Compliance
router.get("/training", async (req, res) => {
  try {
    const data = await prisma.training.findMany({
      include: { user: { select: { firstName: true, lastName: true, department: true } } }
    });
    const fields = ["user.firstName", "user.lastName", "user.department", "title", "provider", "completedAt", "expiresAt"];
    const csv = toCSV(data, fields);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=training_compliance.csv');
    res.send(csv);
  } catch (err) { res.status(500).send("Error generating CSV"); }
});

export default router;