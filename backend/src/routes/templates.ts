import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Create a project from a template
router.post("/clone/:projectId", async (req, res, next) => {
  try {
    const sourceId = req.params.projectId;
    const newTitle = req.body.title || "Cloned Project";

    // 1. Fetch source project with all relations
    const source = await prisma.project.findUnique({
      where: { projectId: sourceId },
      include: {
        workPackages: true,
        milestones: true,
        activities: true,
      },
    });

    if (!source) return res.status(404).json({ message: "Source project not found" });

    // 2. Generate new ID
    const rows = await prisma.project.findMany({ select: { projectId: true } });
    const max = rows.reduce((m, r) => {
      const n = parseInt(r.projectId.replace(/^P-/, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const newId = `P-${String(max + 1).padStart(4, "0")}`;

    // 3. Create new project
    const newProject = await prisma.project.create({
      data: {
        projectId: newId,
        title: newTitle,
        description: source.description,
        sourceOfFunds: source.sourceOfFunds,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Default 3 months
        status: "Not Started",
        priority: source.priority,
        createdBy: req.user!.username,
        lastModifiedBy: req.user!.username,
      },
    });

    // 4. Clone Work Packages
    const wpMap = new Map();
    for (const wp of source.workPackages) {
      const newWpId = `${newId}-WP${wp.workPackageId.split("WP")[1] || Math.floor(Math.random()*1000)}`;
      const newWp = await prisma.workPackage.create({
        data: {
          projectId: newId,
          workPackageId: newWpId,
          title: wp.title,
          description: wp.description,
          startDate: wp.startDate,
          endDate: wp.endDate,
          status: "Not Started",
          progress: 0,
          createdBy: req.user!.username,
        },
      });
      wpMap.set(wp.workPackageId, newWp.workPackageId);
    }

    // 5. Clone Activities
    for (const act of source.activities) {
      const newActId = `${newId}-A-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      await prisma.activity.create({
        data: {
          projectId: newId,
          activityId: newActId,
          workPackageId: act.workPackageId ? wpMap.get(act.workPackageId) : null,
          title: act.title,
          description: act.description,
          startDate: act.startDate,
          endDate: act.endDate,
          duration: act.duration,
          status: "Not Started",
          progress: 0,
          financialPlan: act.financialPlan,
          actualExpenditure: 0,
          createdBy: req.user!.username,
        },
      });
    }

    res.json({ success: true, newProjectId: newId });
  } catch (e) { next(e); }
});

export default router;