import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { buildExecutiveAnalytics } from "../lib/executiveAnalytics";

const router = Router();
router.use(requireAuth, requireRole("admin", "executive", "project_manager"));

function filtersFrom(query: any) {
  return {
    department: typeof query.department === "string" && query.department !== "all" ? query.department : undefined,
    status: typeof query.status === "string" && query.status !== "all" ? query.status : undefined,
    fund: typeof query.fund === "string" && query.fund !== "all" ? query.fund : undefined,
    manager: typeof query.manager === "string" && query.manager !== "all" ? query.manager : undefined,
  };
}

/** AI-assisted, cross-filtered portfolio intelligence for the executive page. */
router.get("/executive-bi", async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await buildExecutiveAnalytics(filtersFrom(req.query)));
  } catch (error) {
    next(error);
  }
});

/** Power BI-ready flat extract. The dashboard's own export uses the same shape. */
router.get("/executive-bi/export", async (req, res, next) => {
  try {
    const analytics = await buildExecutiveAnalytics(filtersFrom(req.query));
    const columns = [
      "projectId",
      "title",
      "status",
      "priority",
      "department",
      "division",
      "manager",
      "fund",
      "startDate",
      "endDate",
      "progress",
      "plan",
      "actual",
      "variance",
      "utilization",
      "health",
      "daysToDue",
      "activityCount",
      "milestoneCount",
    ];
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      columns.join(","),
      ...analytics.projects.map((row: any) => columns.map((column) => quote(row[column])).join(",")),
    ].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="EB-EMS_Executive_BI_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

router.get("/executive", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany();
    const activities = await prisma.activity.findMany();
    const users = await prisma.user.findMany({ select: { username: true, firstName: true, lastName: true } });

    // 1. Project Status Breakdown
    const statusCounts: Record<string, number> = projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 2. Workload (Tasks assigned per user)
    const workload = users.map(u => {
      const assignedTasks = activities.filter(a => a.assignedTo === u.username);
      return {
        username: u.username,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        totalTasks: assignedTasks.length,
        inProgress: assignedTasks.filter(a => a.status === "In Progress").length,
        completed: assignedTasks.filter(a => a.status === "Complete" || a.status === "Completed").length,
      };
    }).filter(w => w.totalTasks > 0); // Only show users with tasks

    // 3. Portfolio Health (Simple check: if progress is way behind schedule)
    const projectHealth = projects.map(p => {
      const now = new Date().getTime();
      const end = new Date(p.endDate).getTime();
      const start = new Date(p.startDate).getTime();
      
      let health = "On Track";
      if (now > end && p.progress < 100) health = "Overdue";
      else if (now > start && p.progress === 0) health = "At Risk";
      
      return { projectId: p.projectId, title: p.title, status: p.status, progress: p.progress, health };
    });

    res.json({ statusCounts, workload, projectHealth });
  } catch (e) { next(e); }
});

export default router;