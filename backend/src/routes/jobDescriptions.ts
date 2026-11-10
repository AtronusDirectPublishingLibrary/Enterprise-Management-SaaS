import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { allows, isAdminUser } from "../lib/access";
import { logAudit } from "../lib/audit";

/**
 * Job descriptions are HR-owned documents. Files live outside /uploads so the
 * browser cannot fetch them by guessing a URL: every download goes through this
 * router and is checked against HR access or a specific employee assignment.
 */
const router = Router();
router.use(requireAuth);

const STORAGE_DIR = path.join(process.cwd(), "storage", "job-descriptions");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STORAGE_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error("Upload a PDF or Word document"));
    }
    cb(null, true);
  },
});

const canManage = (user: Express.Request["user"]) =>
  Boolean(user) && (isAdminUser(user!) || allows(user!, "recruitment"));

function removeFile(filePath?: string | null) {
  if (!filePath) return;
  fs.unlink(path.resolve(filePath), () => undefined);
}

function safeOriginalName(name: string) {
  return path.basename(name).replace(/[^\w.\- ()]/g, "_").slice(0, 180);
}

const metadataSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  department: z.string().trim().max(180).optional().nullable(),
  position: z.string().trim().max(180).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
  version: z.string().trim().max(30).optional(),
  effectiveDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

/** HR: every job description with its assignment list. */
router.get("/", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const descriptions = await prisma.jobDescription.findMany({
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, username: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, username: true, department: true, jobTitle: true } } },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    res.json(descriptions);
  } catch (error) {
    next(error);
  }
});

/** Any employee: only the descriptions explicitly assigned to them. */
router.get("/mine", async (req, res, next) => {
  try {
    const assignments = await prisma.jobDescriptionAssignment.findMany({
      where: { userId: req.user!.sub, jobDescription: { status: "ACTIVE" } },
      include: {
        jobDescription: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { assignedAt: "desc" },
    });
    res.set("Cache-Control", "no-store");
    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

/** HR: upload a new job description. */
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!canManage(req.user)) {
      if (req.file) removeFile(req.file.path);
      return res.status(403).json({ message: "HR access is required" });
    }
    if (!req.file) return res.status(400).json({ message: "Attach the job description document" });
    const body = metadataSchema.parse({
      title: req.body.title,
      department: req.body.department,
      position: req.body.position,
      summary: req.body.summary,
      version: req.body.version,
      effectiveDate: req.body.effectiveDate,
    });
    if (!body.title) {
      removeFile(req.file.path);
      return res.status(400).json({ message: "A title is required" });
    }

    const description = await prisma.jobDescription.create({
      data: {
        title: body.title,
        department: body.department || null,
        position: body.position || null,
        summary: body.summary || null,
        version: body.version || "1.0",
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
        fileName: safeOriginalName(req.file.originalname),
        filePath: path.relative(process.cwd(), req.file.path),
        fileSize: req.file.size,
        mimeType: req.file.mimetype || "application/pdf",
        uploadedById: req.user!.sub,
      },
    });
    await logAudit("HR", "JOB_DESCRIPTION_UPLOADED", req.user!.username, {
      jobDescriptionId: description.id,
      file: description.fileName,
    });
    res.status(201).json(description);
  } catch (error) {
    if (req.file) removeFile(req.file.path);
    next(error);
  }
});

/** HR: edit metadata and optionally replace the file. */
router.put("/:id", upload.single("file"), async (req, res, next) => {
  try {
    if (!canManage(req.user)) {
      if (req.file) removeFile(req.file.path);
      return res.status(403).json({ message: "HR access is required" });
    }
    const existing = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      if (req.file) removeFile(req.file.path);
      return res.status(404).json({ message: "Job description not found" });
    }
    const body = metadataSchema.parse({
      title: req.body.title,
      department: req.body.department,
      position: req.body.position,
      summary: req.body.summary,
      version: req.body.version,
      effectiveDate: req.body.effectiveDate,
      status: req.body.status,
    });

    const description = await prisma.jobDescription.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.department !== undefined ? { department: body.department || null } : {}),
        ...(body.position !== undefined ? { position: body.position || null } : {}),
        ...(body.summary !== undefined ? { summary: body.summary || null } : {}),
        ...(body.version !== undefined ? { version: body.version || "1.0" } : {}),
        ...(body.effectiveDate !== undefined
          ? { effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(req.file
          ? {
              fileName: safeOriginalName(req.file.originalname),
              filePath: path.relative(process.cwd(), req.file.path),
              fileSize: req.file.size,
              mimeType: req.file.mimetype || "application/pdf",
            }
          : {}),
      },
    });
    if (req.file) removeFile(existing.filePath);
    res.json(description);
  } catch (error) {
    if (req.file) removeFile(req.file.path);
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const existing = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Job description not found" });
    await prisma.jobDescription.delete({ where: { id: existing.id } });
    removeFile(existing.filePath);
    await logAudit("HR", "JOB_DESCRIPTION_DELETED", req.user!.username, { jobDescriptionId: existing.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** HR: assign one description to one or many employees. */
router.post("/:id/assign", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z.object({ userIds: z.array(z.string()).min(1).max(200) }).parse(req.body);
    const description = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
    if (!description) return res.status(404).json({ message: "Job description not found" });

    const users = await prisma.user.findMany({
      where: { id: { in: body.userIds } },
      select: { id: true, username: true, firstName: true, lastName: true },
    });

    let assigned = 0;
    for (const user of users) {
      const existing = await prisma.jobDescriptionAssignment.findUnique({
        where: { jobDescriptionId_userId: { jobDescriptionId: description.id, userId: user.id } },
      });
      if (existing) continue;
      await prisma.jobDescriptionAssignment.create({
        data: {
          jobDescriptionId: description.id,
          userId: user.id,
          assignedById: req.user!.sub,
        },
      });
      await prisma.notification.create({
        data: {
          recipient: user.username,
          type: "ASSIGNMENT",
          title: "Job description assigned",
          body: `${description.title} (v${description.version}) is now available in My Portal.`,
          link: "/my-hr",
        },
      });
      assigned += 1;
    }
    await logAudit("HR", "JOB_DESCRIPTION_ASSIGNED", req.user!.username, {
      jobDescriptionId: description.id,
      assigned,
    });
    res.json({ success: true, assigned });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/assign/:userId", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    await prisma.jobDescriptionAssignment.deleteMany({
      where: { jobDescriptionId: req.params.id, userId: req.params.userId },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** HR: people who can be assigned a job description. */
router.get("/assignable-users", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        department: true,
        jobTitle: true,
        position: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

/** Employee: record that they opened their assigned description. */
router.post("/:id/view", async (req, res, next) => {
  try {
    const assignment = await prisma.jobDescriptionAssignment.findUnique({
      where: { jobDescriptionId_userId: { jobDescriptionId: req.params.id, userId: req.user!.sub } },
    });
    if (!assignment) return res.status(404).json({ message: "No job description assigned to you with that id" });
    const updated = await prisma.jobDescriptionAssignment.update({
      where: { id: assignment.id },
      data: { viewedAt: assignment.viewedAt || new Date() },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/** Employee: acknowledge receipt, optionally with an e-signature. */
router.post("/:id/acknowledge", async (req, res, next) => {
  try {
    const body = z
      .object({ signedName: z.string().trim().min(3).max(160) })
      .parse(req.body);
    const assignment = await prisma.jobDescriptionAssignment.findUnique({
      where: { jobDescriptionId_userId: { jobDescriptionId: req.params.id, userId: req.user!.sub } },
      include: { jobDescription: true },
    });
    if (!assignment) return res.status(404).json({ message: "No job description assigned to you with that id" });
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { signatureUrl: true, initialsUrl: true, initialsText: true },
    });

    const now = new Date();
    await prisma.$transaction([
      prisma.jobDescriptionAssignment.update({
        where: { id: assignment.id },
        data: { viewedAt: assignment.viewedAt || now, acknowledgedAt: now },
      }),
      prisma.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "JOB_DESCRIPTION",
          entityId: assignment.jobDescriptionId,
          decision: "ACKNOWLEDGED",
          signedName: body.signedName,
          signatureUrl: user?.signatureUrl || null,
          initialsUrl: user?.initialsUrl || null,
          initialsText: user?.initialsText || null,
          note: `Acknowledged ${assignment.jobDescription.title} v${assignment.jobDescription.version}`,
        },
      }),
    ]);
    await logAudit("HR", "JOB_DESCRIPTION_ACKNOWLEDGED", req.user!.username, {
      jobDescriptionId: assignment.jobDescriptionId,
    });
    res.json({ success: true, acknowledgedAt: now });
  } catch (error) {
    next(error);
  }
});

/** Authenticated file download, limited to HR or an assigned employee. */
router.get("/:id/file", async (req, res, next) => {
  try {
    const description = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
    if (!description) return res.status(404).json({ message: "Job description not found" });

    if (!canManage(req.user)) {
      const assignment = await prisma.jobDescriptionAssignment.findUnique({
        where: { jobDescriptionId_userId: { jobDescriptionId: description.id, userId: req.user!.sub } },
      });
      if (!assignment) return res.status(403).json({ message: "This job description is not assigned to you" });
      if (!assignment.viewedAt) {
        await prisma.jobDescriptionAssignment.update({
          where: { id: assignment.id },
          data: { viewedAt: new Date() },
        });
      }
    }

    const absolute = path.resolve(description.filePath);
    if (!fs.existsSync(absolute)) return res.status(404).json({ message: "The stored file is missing" });
    res.setHeader("Content-Type", description.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(description.fileName)}`
    );
    res.sendFile(absolute);
  } catch (error) {
    next(error);
  }
});

export default router;
