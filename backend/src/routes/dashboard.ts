import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany();
    const milestones = await prisma.milestone.findMany();
    const activities = await prisma.activity.findMany();
    
    // Fetch logs and safely convert BigInt to String for JSON serialization
    const recentLogsData = await prisma.auditLog.findMany({ 
      orderBy: { timestamp: "desc" }, 
      take: 10 
    });

    const recentLogs = recentLogsData.map(log => ({
      ...log,
      id: log.id.toString()
    }));

    // ---- KPI ----
    const totalProjects     = projects.length;
    const activeProjects    = projects.filter(p => p.status === "In Progress" || p.status === "On Hold").length;
    const completedProjects = projects.filter(p => p.status === "Completed").length;
    const completionRate    = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    const onTrackProjects = projects.filter(p => {
      if (["Completed", "Cancelled"].includes(p.status)) return false;
      if (!p.startDate || !p.endDate) return false;
      const totalDays   = (p.endDate.getTime() - p.startDate.getTime()) / 86_400_000;
      const elapsedDays = (Date.now() - p.startDate.getTime()) / 86_400_000;
      if (totalDays <= 0) return false;
      const expected = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
      return p.progress >= expected * 0.8;
    }).length;

    let totalPlan = 0, totalActual = 0;
    for (const a of activities) {
      totalPlan   += Number(a.financialPlan)     || 0;
      totalActual += Number(a.actualExpenditure) || 0;
    }
    const variance = totalPlan - totalActual;

    const byProject: Record<string, { plan: number; actual: number }> = {};
    for (const a of activities) {
      byProject[a.projectId] ??= { plan: 0, actual: 0 };
      byProject[a.projectId].plan   += Number(a.financialPlan)     || 0;
      byProject[a.projectId].actual += Number(a.actualExpenditure) || 0;
    }
    const overBudgetProjects = Object.values(byProject).filter(v => v.plan > 0 && v.actual > v.plan).length;

    // ---- Distributions ----
    const statusDistribution: Record<string, number> = {
      "Not Started": 0, "In Progress": 0, "On Hold": 0, "Completed": 0, "Cancelled": 0,
    };
    for (const p of projects) statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;

    const dirAgg: Record<string, { total: number; count: number }> = {};
    const divAgg: Record<string, { total: number; count: number }> = {};
    for (const p of projects) {
      const d = p.leadDepartment || "Unassigned";
      const v = p.leadDivision    || "Unassigned";
      dirAgg[d] ??= { total: 0, count: 0 }; dirAgg[d].total += p.progress; dirAgg[d].count++;
      divAgg[v] ??= { total: 0, count: 0 }; divAgg[v].total += p.progress; divAgg[v].count++;
    }
    const departmentProgress = Object.entries(dirAgg).map(([k, v]) => ({
      department: k, avgProgress: Math.round(v.total / v.count),
    }));
    const divisionProgress = Object.entries(divAgg).map(([k, v]) => ({
      division: k, avgProgress: Math.round(v.total / v.count),
    }));

    // ---- Plan vs Actual (top 10) ----
    const planActualData = Object.entries(byProject).map(([projectId, v]) => {
      const p = projects.find(x => x.projectId === projectId);
      return { projectId, title: p?.title || projectId, plan: v.plan, actual: v.actual };
    }).sort((a, b) => b.plan - a.plan).slice(0, 10);

    // ---- Milestone timeline (last 12 months) ----
    const timeline: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      timeline[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    for (const m of milestones) {
      if (m.status === "Complete" && m.endDate) {
        const d = new Date(m.endDate);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (k in timeline) timeline[k]++;
      }
    }
    const milestoneTimeline = {
      labels: Object.keys(timeline),
      data:   Object.values(timeline),
    };

    // ---- Upcoming milestones (next 7 days) ----
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86_400_000);
    const upcomingMilestones = milestones
      .filter(m => !["Complete", "Cancelled"].includes(m.status) && m.endDate && m.endDate >= now && m.endDate <= in7)
      .sort((a, b) => a.endDate!.getTime() - b.endDate!.getTime());

    // ---- Budget alerts ----
    const budgetAlerts = Object.entries(byProject)
      .filter(([, v]) => v.plan > 0 && v.actual >= v.plan * 0.9)
      .map(([projectId, v]) => {
        const p = projects.find(x => x.projectId === projectId);
        return {
          projectId,
          title: p?.title || projectId,
          plan: v.plan, actual: v.actual,
          percentage: Math.round((v.actual / v.plan) * 100),
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // ---- Source of funds ----
    const sourceOfFundsDistribution: Record<string, number> = {};
    for (const p of projects) {
      let s = p.sourceOfFunds || "Unspecified";
      if (s.startsWith("Other:")) s = "Other (specified)";
      sourceOfFundsDistribution[s] = (sourceOfFundsDistribution[s] || 0) + 1;
    }

    // ---- Activity-level financials for a single-project view ----
    let activityFinancialData: any = null;
    const single = req.query.projectId as string | undefined;
    if (single && single !== "All") {
      const p = projects.find(x => x.projectId === single);
      if (p) {
        const rows = activities.filter(a => a.projectId === single).map(a => {
          const plan = Number(a.financialPlan) || 0;
          const actual = Number(a.actualExpenditure) || 0;
          return {
            activityId: a.activityId, title: a.title,
            plan, actual, variance: plan - actual,
            status: a.status, progress: a.progress,
          };
        });
        activityFinancialData = { projectId: single, projectTitle: p.title, activities: rows };
      }
    }

    res.json({
      kpi: {
        totalProjects, activeProjects, onTrackProjects, completionRate,
        totalPlan, totalActual, variance, overBudgetProjects,
      },
      statusDistribution,
      departmentProgress,
      divisionProgress,
      planActualData,
      milestoneTimeline,
      upcomingMilestones,
      budgetAlerts,
      recentLogs,
      sourceOfFundsDistribution,
      activityFinancialData,
    });
  } catch (e) { next(e); }
});

export default router;