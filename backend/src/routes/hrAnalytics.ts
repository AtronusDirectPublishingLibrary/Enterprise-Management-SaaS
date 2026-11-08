import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const trainings = await prisma.training.findMany();
    
    // Basic Metrics
    const headcount = users.length;
    const expiredTrainings = trainings.filter(t => t.expiresAt && new Date(t.expiresAt) < new Date()).length;
    
    // Group by Department
    const byDept: Record<string, number> = {};
    users.forEach(u => {
      const d = u.department || "Unassigned";
      byDept[d] = (byDept[d] || 0) + 1;
    });

    // Group by Month (Last 12 Months)
    const now = new Date();
    const hiresByMonth = Array(12).fill(0);
    const labels = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('default', { month: 'short' }));
    }
    
    users.forEach(u => {
      const d = new Date(u.createdDate);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffMonths >= 0 && diffMonths < 12) hiresByMonth[11 - diffMonths]++;
    });

    res.json({
      headcount,
      expiredTrainings,
      byDept,
      chart: { labels, data: hiresByMonth },
      roadmap: { y2028: 250, y2030: 400, y2032: 600, y2035: 1000 }
    });
  } catch (err) { res.status(500).json({ error: "Failed to generate analytics" }); }
});

export default router;