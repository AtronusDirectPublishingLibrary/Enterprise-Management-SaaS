import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

const MilestoneInput = z.object({
  title: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const ProjectInput = z.object({
  title:            z.string().min(2).max(200),
  description:      z.string().max(1000).optional().default(""),
  sourceOfFunds:    z.string(),
  sourceOfFundsOther: z.string().optional(),
  startDate:        z.coerce.date(),
  endDate:          z.coerce.date(),
  status:           z.string().optional(),
  priority:         z.string().optional(),
  projectCategory:  z.string().optional(),
  leadDirectorate:  z.string().optional(),
  leadDivision:     z.string().optional(),
  projectManager:   z.string().optional(),
  milestones:       z.array(MilestoneInput).optional().default([]),
});

async function nextProjectId() {
  const rows = await prisma.project.findMany({ select: { projectId: true } });
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.projectId.replace(/^P-/, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `P-${String(max + 1).padStart(4, "0")}`;
}

router.get("/", async (req, res, next) => {
  try {
    const { status, priority, projectId, search, category, directorate, division,
            startDateFrom, startDateTo, endDateFrom, endDateTo, sourceOfFunds, pi } = req.query as any;
    const where: any = {};
    if (status && status !== "All") where.status = status;
    if (priority && priority !== "All") where.priority = priority;
    if (projectId && projectId !== "All") where.projectId = projectId;
    if (category && category !== "All") where.projectCategory = category;
    if (directorate && directorate !== "All") where.leadDirectorate = directorate;
    if (division && division !== "All") where.leadDivision = division;
    if (sourceOfFunds && sourceOfFunds !== "All") where.sourceOfFunds = { startsWith: sourceOfFunds };
    const andClauses: any[] = [];
    if (search) andClauses.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
    if (pi) andClauses.push({
      OR: [
        { piName: { contains: pi, mode: "insensitive" } },
        { piEmail: { contains: pi, mode: "insensitive" } },
      ],
    });
    if (andClauses.length > 0) where.AND = andClauses;
    if (startDateFrom || startDateTo) where.startDate = {};
    if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
    if (startDateTo) where.startDate.lte = new Date(startDateTo);
    if (endDateFrom || endDateTo) where.endDate = {};
    if (endDateFrom) where.endDate.gte = new Date(endDateFrom);
    if (endDateTo) where.endDate.lte = new Date(endDateTo);

    const projects = await prisma.project.findMany({ where, orderBy: { projectId: "asc" } });
    res.json(projects);
  } catch (e) { next(e); }
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const p = await prisma.project.findUnique({ where: { projectId: req.params.projectId } });
    if (!p) return res.status(404).json({ message: "Project not found" });
    res.json(p);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = ProjectInput.parse(req.body);
    const projectId = await nextProjectId();
    const source = d.sourceOfFunds === "Other" && d.sourceOfFundsOther
      ? `Other: ${d.sourceOfFundsOther.trim()}`
      : d.sourceOfFunds;

    const created = await prisma.project.create({
      data: {
        projectId, title: d.title, description: d.description,
        sourceOfFunds: source, startDate: d.startDate, endDate: d.endDate,
        status: d.status || "Not Started", priority: d.priority || "Medium",
        projectCategory: d.projectCategory, leadDirectorate: d.leadDirectorate,
        leadDivision: d.leadDivision, projectManager: d.projectManager,
        createdBy: req.user!.username, lastModifiedBy: req.user!.username,
      },
    });

    // Create milestones if provided
    if (d.milestones && d.milestones.length > 0) {
      for (const ms of d.milestones) {
        await prisma.milestone.create({
          data: {
            projectId: created.projectId,
            milestoneId: `${created.projectId}-M-${Date.now().toString(36).toUpperCase().slice(-4)}`,
            title: ms.title,
            startDate: ms.startDate,
            endDate: ms.endDate,
            status: "Not Started",
            progress: 0,
            createdBy: req.user!.username,
          }
        });
      }
    }

    await logAudit(source, "PROJECT_ADDED", req.user!.username, { projectId });
    res.json({ success: true, projectId, project: created });
  } catch (e) { next(e); }
});

router.put("/:projectId", async (req, res, next) => {
  try {
    const d = ProjectInput.parse(req.body);
    const exists = await prisma.project.findUnique({ where: { projectId: req.params.projectId } });
    if (!exists) return res.status(404).json({ message: "Project not found" });
    const source = d.sourceOfFunds === "Other" && d.sourceOfFundsOther
      ? `Other: ${d.sourceOfFundsOther.trim()}`
      : d.sourceOfFunds;

    const updated = await prisma.project.update({
      where: { projectId: req.params.projectId },
      data: {
        title: d.title, description: d.description,
        sourceOfFunds: source, startDate: d.startDate, endDate: d.endDate,
        status: d.status, priority: d.priority,
        projectCategory: d.projectCategory, leadDirectorate: d.leadDirectorate,
        leadDivision: d.leadDivision, projectManager: d.projectManager,
        lastModifiedBy: req.user!.username, lastModifiedDate: new Date(),
      },
    });
    await logAudit(source, "PROJECT_UPDATED", req.user!.username, { projectId: req.params.projectId });
    res.json({ success: true, project: updated });
  } catch (e) { next(e); }
});

router.delete("/:projectId", requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { projectId: req.params.projectId } });
    await logAudit("PMS", "PROJECT_DELETED", req.user!.username, { projectId: req.params.projectId });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
