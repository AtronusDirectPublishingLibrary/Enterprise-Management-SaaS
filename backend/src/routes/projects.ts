import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { listImports, recordImport, rollbackImport } from "../lib/importBatches";

const router = Router();
router.use(requireAuth);
const canImport = requireRole("admin", "executive", "project_manager");
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Row-level PMS permission: a project manager may edit only projects they
 * created or are named as manager of. Administrators and executives may edit
 * any project; every other role is read-only.
 */
async function canEditProject(req: any, res: any, next: any) {
  try {
    if (["admin", "executive"].includes(req.user!.role)) return next();
    if (req.user!.role !== "project_manager") {
      return res.status(403).json({ message: "Only project managers, executives and administrators can change projects." });
    }
    const project = await prisma.project.findUnique({ where: { projectId: req.params.projectId } });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { firstName: true, lastName: true, position: true },
    });
    const names = new Set(
      [
        user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null,
        user?.position,
      ]
        .filter(Boolean)
        .map((name) => String(name).trim().toLowerCase())
    );
    const owns =
      project.createdBy === req.user!.username ||
      (project.projectManager ? names.has(project.projectManager.trim().toLowerCase()) : false);
    if (!owns) {
      return res.status(403).json({
        message: "Only the assigned project manager, an executive or an administrator can edit this project.",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

function normaliseCsvRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      typeof value === "string" ? value.trim() : value,
    ])
  );
}

function csvText(value: unknown) {
  return String(value ?? "").trim();
}

function csvNumber(value: unknown) {
  const text = String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, "");
  return text === "" ? null : Number(text);
}

function csvDate(value: unknown) {
  const text = csvText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

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

router.get("/template", canImport, (_req, res) => {
  const csv = [
    "projectId,title,description,projectCategory,sourceOfFunds,startDate,endDate,status,priority,progress,leadDirectorate,leadDivision,projectManager",
    'P-0001,Expanded vaccine distribution,Regional distribution and cold-chain coverage,Access,Treasury,2026-01-01,2026-12-31,In Progress,High,35,Operations,Distribution,Dessalew Adane',
    ',New diagnostics laboratory,Establish diagnostic testing capacity,Diagnostics,Competitive Grants,2026-03-01,2027-02-28,Not Started,Medium,0,Quality,Quality Assurance,Hirut Bekele',
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="pms-projects-template.csv"');
  res.send(`\uFEFF${csv}\n`);
});

router.get("/imports", canImport, async (_req, res, next) => {
  try { res.json(await listImports("PMS_PROJECTS")); } catch (e) { next(e); }
});

router.post("/imports/:batchId/rollback", canImport, async (req: any, res, next) => {
  try { res.json(await rollbackImport(req.params.batchId, req.user!)); } catch (e) { next(e); }
});

router.post("/import", canImport, csvUpload.single("file"), async (req: any, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Choose a CSV file to upload." });
    }
    let rows: Record<string, unknown>[];
    try {
      rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
    } catch {
      return res.status(400).json({ message: "The file is not a valid CSV. Download the template and try again." });
    }
    if (!rows.length) return res.status(400).json({ message: "The CSV has no project rows." });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const snapshot: { created: string[]; updated: { projectId: string; before: unknown }[] } = { created: [], updated: [] };

    for (const [index, raw] of rows.entries()) {
      const row = normaliseCsvRow(raw);
      const line = index + 2;
      const title = csvText(row.title);
      const requestedId = csvText(row.projectid).toUpperCase();
      const existing = requestedId
        ? await prisma.project.findUnique({ where: { projectId: requestedId } })
        : null;
      if (!title) {
        skipped++;
        errors.push(`Row ${line}: title is required.`);
        continue;
      }

      const startDate = csvDate(row.startdate);
      const endDate = csvDate(row.enddate);
      if (!startDate && !existing) {
        skipped++;
        errors.push(`Row ${line}: startDate is required for a new project.`);
        continue;
      }
      if (!endDate && !existing) {
        skipped++;
        errors.push(`Row ${line}: endDate is required for a new project.`);
        continue;
      }
      if (csvText(row.startdate) && !startDate) {
        skipped++;
        errors.push(`Row ${line}: startDate is not a valid date.`);
        continue;
      }
      if (csvText(row.enddate) && !endDate) {
        skipped++;
        errors.push(`Row ${line}: endDate is not a valid date.`);
        continue;
      }

      const progressValue = csvNumber(row.progress);
      const data = {
        title,
        description: csvText(row.description) || existing?.description || "",
        projectCategory: csvText(row.projectcategory) || existing?.projectCategory || null,
        sourceOfFunds: csvText(row.sourceoffunds) || existing?.sourceOfFunds || "Treasury",
        startDate: startDate || existing!.startDate,
        endDate: endDate || existing!.endDate,
        status: csvText(row.status) || existing?.status || "Not Started",
        priority: csvText(row.priority) || existing?.priority || "Medium",
        progress: progressValue == null ? existing?.progress ?? 0 : Math.max(0, Math.min(100, Math.round(progressValue))),
        leadDirectorate: csvText(row.leaddirectorate) || existing?.leadDirectorate || null,
        leadDivision: csvText(row.leaddivision) || existing?.leadDivision || null,
        projectManager: csvText(row.projectmanager) || existing?.projectManager || null,
        lastModifiedBy: req.user!.username,
        lastModifiedDate: new Date(),
      };

      if (existing) {
        await prisma.project.update({ where: { projectId: existing.projectId }, data });
        snapshot.updated.push({ projectId: existing.projectId, before: existing });
        updated++;
      } else {
        const projectId = requestedId || (await nextProjectId());
        await prisma.project.create({
          data: {
            ...data,
            projectId,
            createdBy: req.user!.username,
          },
        });
        snapshot.created.push(projectId);
        created++;
      }
    }

    await logAudit("PMS", "PROJECT_IMPORT", req.user!.username, { created, updated, skipped });
    const summary = { created, updated, skipped, total: rows.length, errors };
    const batch = await recordImport({
      module: "PMS_PROJECTS",
      user: req.user!,
      fileName: req.file.originalname,
      summary,
      snapshot,
    });
    res.json({ ...summary, batchId: batch.id });
  } catch (e) {
    next(e);
  }
});

/** Dry run for the PMS project importer: nothing is written. */
router.post("/import/preview", canImport, csvUpload.single("file"), async (req: any, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Choose a CSV file to preview." });
    }
    let rows: Record<string, unknown>[];
    try {
      rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
    } catch {
      return res.status(400).json({ message: "The file is not a valid CSV. Download the template and try again." });
    }
    if (!rows.length) return res.status(400).json({ message: "The CSV has no project rows." });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const preview: { line: number; action: "create" | "update" | "skip"; title: string; projectId: string }[] = [];

    for (const [index, raw] of rows.entries()) {
      const row = normaliseCsvRow(raw);
      const line = index + 2;
      const title = csvText(row.title);
      const requestedId = csvText(row.projectid).toUpperCase();
      const existing = requestedId
        ? await prisma.project.findUnique({ where: { projectId: requestedId } })
        : null;
      if (!title) {
        skipped++; errors.push(`Row ${line}: title is required.`);
        preview.push({ line, action: "skip", title: "(no title)", projectId: requestedId });
        continue;
      }
      if (!csvDate(row.startdate) && !existing) {
        skipped++; errors.push(`Row ${line}: startDate is required for a new project.`);
        preview.push({ line, action: "skip", title, projectId: requestedId });
        continue;
      }
      if (!csvDate(row.enddate) && !existing) {
        skipped++; errors.push(`Row ${line}: endDate is required for a new project.`);
        preview.push({ line, action: "skip", title, projectId: requestedId });
        continue;
      }
      if (csvText(row.startdate) && !csvDate(row.startdate)) {
        skipped++; errors.push(`Row ${line}: startDate is not a valid date.`);
        preview.push({ line, action: "skip", title, projectId: requestedId });
        continue;
      }
      if (csvText(row.enddate) && !csvDate(row.enddate)) {
        skipped++; errors.push(`Row ${line}: endDate is not a valid date.`);
        preview.push({ line, action: "skip", title, projectId: requestedId });
        continue;
      }
      if (existing) {
        updated++;
        preview.push({ line, action: "update", title, projectId: existing.projectId });
      } else {
        created++;
        preview.push({ line, action: "create", title, projectId: requestedId || "(next available)" });
      }
    }

    res.json({
      preview: true,
      total: rows.length,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 50),
      rows: preview.slice(0, 100),
    });
  } catch (e) { next(e); }
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const p = await prisma.project.findUnique({ where: { projectId: req.params.projectId } });
    if (!p) return res.status(404).json({ message: "Project not found" });
    res.json(p);
  } catch (e) { next(e); }
});

router.post("/", canImport, async (req, res, next) => {
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

router.put("/:projectId", canEditProject, async (req, res, next) => {
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
