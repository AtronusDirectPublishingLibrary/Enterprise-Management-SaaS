import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    // Fetch all projects with their activities to calculate total progress and budget
    const projects = await prisma.project.findMany({
      include: {
        activities: true,
      },
      orderBy: { projectId: "asc" },
    });

    const portfolios = projects.map(p => {
      // Aggregate financials
      const totalPlan = p.activities.reduce((s, a) => s + Number(a.financialPlan || 0), 0);
      const totalActual = p.activities.reduce((s, a) => s + Number(a.actualExpenditure || 0), 0);
      
      // Calculate health
      const now = new Date().getTime();
      const end = new Date(p.endDate).getTime();
      let health = "On Track";
      if (now > end && p.progress < 100) health = "Overdue";
      else if (now > new Date(p.startDate).getTime() && p.progress === 0) health = "At Risk";

      return {
        projectId: p.projectId,
        title: p.title,
        status: p.status,
        progress: p.progress,
        health,
        totalPlan,
        totalActual,
      };
    });

    // Calculate overall totals
    const totalBudget = portfolios.reduce((s, p) => s + p.totalPlan, 0);
    const totalSpent = portfolios.reduce((s, p) => s + p.totalActual, 0);
    const avgProgress = Math.round(portfolios.reduce((s, p) => s + p.progress, 0) / (portfolios.length || 1));

    res.json({
      portfolios,
      summary: { totalBudget, totalSpent, avgProgress },
    });
  } catch (e) { next(e); }
});

export default router;