import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { isQmsApprover } from "../lib/access";

const router = Router();

// ---------------------------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "SOP",
  "Specification",
  "Protocol",
  "Record",
  "Policy",
  "Work Instruction",
  "Form",
] as const;

const DEPARTMENTS = [
  "QA",
  "Production",
  "QC",
  "Warehouse",
  "Engineering",
  "Regulatory",
  "HR",
  "IT",
] as const;

const CODE_PATTERN = /^[A-Z]{2,5}-[A-Z]{2,5}-\d{3,5}$/;
const VERSION_PATTERN = /^\d+\.\d+(\.\d+)?$/;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".xlsx", ".xls"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/**
 * QMS documents are larger than the shared 20 MB uploader. This dedicated
 * multer instance keeps the existing middleware (and every other module)
 * untouched while enforcing the WHO document-control limits.
 */
const qmsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) cb(null, true);
    else cb(new Error("Use a PDF, DOC, DOCX, XLS or XLSX file"));
  },
});

function uploadSingle(req: any, res: any, next: any) {
  qmsUpload.single("file")(req, res, (err: any) => {
    if (err) {
      const message =
        err?.code === "LIMIT_FILE_SIZE"
          ? "File is larger than the 50 MB limit"
          : err?.message || "File upload failed";
      return res.status(400).json({ error: message });
    }
    next();
  });
}

function cleanBody(body: any) {
  const out: any = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (value === "") continue;
    if (value === "null" || value === "undefined") {
      out[key] = null;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function uploadFields(file?: Express.Multer.File) {
  if (!file) return {};
  return {
    fileUrl: `/uploads/${file.filename}`,
    fileName: file.originalname,
    fileSize: file.size,
  };
}

function canCreateQmsDocument(user: any) {
  if (isQmsApprover(user)) return true;
  return ["Human Resource and Administration Manager", "Operation Manager"].includes(
    (user?.position || "").trim()
  );
}

function canEditQmsDocument(doc: { ownerId: string; approverId: string | null }, user: any) {
  if (doc.ownerId === user?.sub) return true;
  if (doc.approverId && doc.approverId === user?.sub) return true;
  return isQmsApprover(user);
}

function canSupersedeQmsDocument(doc: { ownerId: string }, user: any) {
  return doc.ownerId === user?.sub || isQmsApprover(user);
}

function versionSummary(doc: any) {
  return {
    id: doc.id,
    code: doc.code,
    title: doc.title,
    version: doc.version,
    status: doc.status,
    createdAt: doc.createdAt,
    approvedAt: doc.approvedAt,
    supersededAt: doc.supersededAt,
    fileName: doc.fileName,
    changeSummary: doc.changeSummary,
  };
}

function nextVersion(version: string) {
  const [major] = version.split(".");
  return `${Number.parseInt(major, 10) + 1}.0`;
}

function actor(user: any) {
  return user?.username || "system";
}

async function notifyUser(username: string, title: string, body: string, link: string) {
  try {
    await prisma.notification.create({
      data: { recipient: username, type: "QMS_WORKFLOW", title, body, link },
    });
  } catch (error) {
    // A notification failure must never undo a committed workflow transition.
    console.error("qms notification failed", error);
  }
}

async function notifyApprovers(title: string, body: string, link: string, approverId?: string | null) {
  try {
    const recipients = approverId
      ? await prisma.user.findMany({ where: { id: approverId }, select: { username: true } })
      : await prisma.user.findMany({
          where: {
            OR: [
              { position: { in: ["Chief Executive Officer", "QA and regulatory Affairs Officer"] } },
              { role: "admin" },
            ],
          },
          select: { username: true },
        });
    if (recipients.length === 0) return;
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        recipient: r.username,
        type: "QMS_WORKFLOW",
        title,
        body,
        link,
      })),
    });
  } catch (error) {
    console.error("qms approver notification failed", error);
  }
}

async function assertUsersExist(ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return true;
  const found = await prisma.user.count({ where: { id: { in: wanted } } });
  return found === wanted.length;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createSchema = z.object({
  code: z.string().trim().toUpperCase().regex(CODE_PATTERN, "Code must look like SOP-QA-001"),
  title: z.string().trim().min(5, "Title must be at least 5 characters"),
  titleAm: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  category: z.enum(CATEGORIES),
  department: z.enum(DEPARTMENTS).optional().nullable(),
  version: z.string().trim().regex(VERSION_PATTERN, "Version must look like 1.0 or 2.1").optional(),
  ownerId: z.string().min(1).optional(),
  reviewerId: z.string().min(1).optional().nullable(),
  approverId: z.string().min(1).optional().nullable(),
  fileUrl: z.string().trim().max(2000).optional().nullable(),
  changeSummary: z.string().trim().max(5000).optional().nullable(),
  effectiveDate: z.coerce.date().optional().nullable(),
  reviewDueAt: z.coerce.date().optional().nullable(),
});

const updateSchema = createSchema.partial();

const submitSchema = z.object({}).passthrough();

const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason of at least 3 characters"),
});

const supersedeSchema = z.object({
  changeSummary: z.string().trim().min(5, "Describe what changed in the new version"),
  ownerId: z.string().min(1).optional(),
  reviewerId: z.string().min(1).optional().nullable(),
  approverId: z.string().min(1).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * GET /people — assignee pickers for the editor. Mounted before /:id.
 */
router.get("/people", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        position: true,
        department: true,
      },
      orderBy: [{ firstName: "asc" }, { username: "asc" }],
      take: 1000,
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

/**
 * GET /due-for-review — approved documents with a review date inside the
 * reminder window. Mounted before /:id.
 */
router.get("/due-for-review", async (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const items = await prisma.qmsDocument.findMany({
      where: {
        status: "APPROVED",
        reviewDueAt: { not: null, lte: cutoff },
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, username: true } },
        approver: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
      orderBy: { reviewDueAt: "asc" },
    });
    res.json({ items, days, cutoff });
  } catch {
    res.status(500).json({ error: "Failed to fetch documents due for review" });
  }
});

/**
 * GET / — register with filters and a global KPI summary.
 */
router.get("/", async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.category) where.category = String(req.query.category);
    if (req.query.department) where.department = String(req.query.department);
    if (req.query.filter === "due") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 30);
      where.status = "APPROVED";
      where.reviewDueAt = { not: null, lte: cutoff };
    }
    const search = String(req.query.search || "").trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { titleAm: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const dueCutoff = new Date();
    dueCutoff.setDate(dueCutoff.getDate() + 30);

    const [items, total, approved, inReview, dueForReview] = await prisma.$transaction([
      prisma.qmsDocument.findMany({
        where,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, username: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true, username: true } },
          approver: { select: { id: true, firstName: true, lastName: true, username: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 500,
      }),
      prisma.qmsDocument.count(),
      prisma.qmsDocument.count({ where: { status: "APPROVED" } }),
      prisma.qmsDocument.count({ where: { status: "IN_REVIEW" } }),
      prisma.qmsDocument.count({
        where: { status: "APPROVED", reviewDueAt: { not: null, lte: dueCutoff } },
      }),
    ]);

    res.json({
      items,
      summary: { total, approved, inReview, dueForReview },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch QMS documents" });
  }
});

/**
 * GET /:id — one document plus every version registered under its code.
 */
router.get("/:id", async (req, res) => {
  try {
    const document = await prisma.qmsDocument.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    const chain = await prisma.qmsDocument.findMany({
      where: { code: document.code },
      orderBy: [{ createdAt: "asc" }],
    });

    res.json({ ...document, versionChain: chain.map(versionSummary) });
  } catch {
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

/**
 * GET /:id/download — RBAC-enforced attachment stream.
 */
router.get("/:id/download", async (req: any, res) => {
  try {
    const document = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (!document.fileUrl) return res.status(404).json({ error: "This document has no file attached" });

    await logAudit("QMS", "QMS_DOC_DOWNLOADED", actor(req.user), {
      documentId: document.id,
      code: document.code,
      version: document.version,
    });

    if (/^https?:\/\//i.test(document.fileUrl)) {
      return res.redirect(document.fileUrl);
    }

    const filename = path.basename(document.fileUrl);
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "The stored file is missing from the server" });
    }
    return res.download(filePath, document.fileName || filename);
  } catch {
    res.status(500).json({ error: "Failed to download document" });
  }
});

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

router.post("/", uploadSingle, async (req: any, res) => {
  try {
    if (!canCreateQmsDocument(req.user)) {
      return res.status(403).json({ error: "Your position may view QMS documents but not create them" });
    }

    const parsed = createSchema.safeParse(cleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const data = parsed.data;
    const ownerId = data.ownerId || req.user.sub;
    const version = data.version || "1.0";

    if (!(await assertUsersExist([ownerId, data.reviewerId, data.approverId]))) {
      return res.status(400).json({ error: "One of the selected people no longer exists" });
    }

    if (version !== "1.0" && !data.changeSummary) {
      return res.status(400).json({ error: "A change summary is required above version 1.0" });
    }

    const existing = await prisma.qmsDocument.findFirst({
      where: { code: data.code },
      select: { id: true, version: true },
    });
    if (existing) {
      return res.status(409).json({
        error: `${data.code} is already registered (version ${existing.version}). Use Supersede to create a new version.`,
      });
    }

    const created = await prisma.qmsDocument.create({
      data: {
        code: data.code,
        title: data.title,
        titleAm: data.titleAm ?? null,
        description: data.description ?? null,
        category: data.category,
        department: data.department ?? null,
        version,
        status: "DRAFT",
        ownerId,
        reviewerId: data.reviewerId ?? null,
        approverId: data.approverId ?? null,
        ...uploadFields(req.file),
        ...(req.file ? {} : { fileUrl: data.fileUrl ?? null, fileName: null, fileSize: null }),
        effectiveDate: data.effectiveDate ?? null,
        reviewDueAt: data.reviewDueAt ?? addYears(new Date(), 2),
        changeSummary: data.changeSummary ?? null,
      },
    });

    await logAudit("QMS", "QMS_DOC_CREATED", actor(req.user), {
      documentId: created.id,
      code: created.code,
      version: created.version,
      category: created.category,
      title: created.title,
    });

    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "That code and version already exist" });
    }
    console.error("qms create failed", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.put("/:id", uploadSingle, async (req: any, res) => {
  try {
    const document = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (!["DRAFT", "IN_REVIEW"].includes(document.status)) {
      return res.status(409).json({ error: `A ${document.status} document cannot be edited` });
    }
    if (!canEditQmsDocument(document, req.user)) {
      return res.status(403).json({ error: "Only the owner, assigned approver or a QMS approver may edit" });
    }

    const parsed = updateSchema.safeParse(cleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const data = parsed.data;

    const ownerId = data.ownerId ?? document.ownerId;
    const reviewerId = data.reviewerId !== undefined ? data.reviewerId : document.reviewerId;
    const approverId = data.approverId !== undefined ? data.approverId : document.approverId;
    if (!(await assertUsersExist([ownerId, reviewerId, approverId]))) {
      return res.status(400).json({ error: "One of the selected people no longer exists" });
    }

    const nextVersionValue = data.version ?? document.version;
    const nextChangeSummary = data.changeSummary ?? document.changeSummary;
    if (nextVersionValue !== "1.0" && !nextChangeSummary) {
      return res.status(400).json({ error: "A change summary is required above version 1.0" });
    }

    const nextCode = data.code ?? document.code;
    if (nextCode !== document.code) {
      const family = await prisma.qmsDocument.findFirst({
        where: { code: nextCode, NOT: { id: document.id } },
        select: { id: true },
      });
      if (family) {
        return res.status(409).json({ error: `${nextCode} already belongs to another document family` });
      }
    }

    const fileFields = req.file
      ? uploadFields(req.file)
      : data.fileUrl !== undefined && data.fileUrl !== document.fileUrl
        ? { fileUrl: data.fileUrl ?? null, fileName: null, fileSize: null }
        : {};

    const updated = await prisma.qmsDocument.update({
      where: { id: document.id },
      data: {
        ...(data.code !== undefined && { code: nextCode }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.titleAm !== undefined && { titleAm: data.titleAm ?? null }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.department !== undefined && { department: data.department ?? null }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.ownerId !== undefined && { ownerId }),
        ...(data.reviewerId !== undefined && { reviewerId: reviewerId ?? null }),
        ...(data.approverId !== undefined && { approverId: approverId ?? null }),
        ...(data.changeSummary !== undefined && { changeSummary: data.changeSummary ?? null }),
        ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate ?? null }),
        ...(data.reviewDueAt !== undefined && { reviewDueAt: data.reviewDueAt ?? null }),
        ...fileFields,
      },
    });

    await logAudit("QMS", "QMS_DOC_UPDATED", actor(req.user), {
      documentId: updated.id,
      code: updated.code,
      version: updated.version,
      fields: Object.keys(data),
      fileReplaced: Boolean(req.file),
    });

    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "That code and version already exist" });
    }
    console.error("qms update failed", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// ---------------------------------------------------------------------------
// Workflow transitions
// ---------------------------------------------------------------------------

router.post("/:id/submit", async (req: any, res) => {
  try {
    submitSchema.parse(req.body || {});
    const document = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (document.ownerId !== req.user.sub) {
      return res.status(403).json({ error: "Only the document owner can submit it for review" });
    }
    if (document.status !== "DRAFT") {
      return res.status(409).json({ error: `Document is ${document.status}, not DRAFT` });
    }

    const updated = await prisma.qmsDocument.update({
      where: { id: document.id },
      data: { status: "IN_REVIEW" },
    });

    await logAudit("QMS", "QMS_DOC_SUBMITTED", actor(req.user), {
      documentId: updated.id,
      code: updated.code,
      version: updated.version,
      reviewerId: updated.reviewerId,
      approverId: updated.approverId,
    });

    await notifyApprovers(
      `QMS document awaiting approval: ${updated.code} v${updated.version}`,
      `${updated.title} was submitted for review by ${actor(req.user)}.`,
      `/qms/documents/${updated.id}`,
      updated.approverId
    );

    res.json(updated);
  } catch (error: any) {
    if (error?.name === "ZodError") return res.status(400).json({ error: "Invalid input" });
    console.error("qms submit failed", error);
    res.status(500).json({ error: "Failed to submit document" });
  }
});

router.post("/:id/approve", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may approve documents" });
    }
    const document = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (document.status !== "IN_REVIEW") {
      return res.status(409).json({ error: `Document is ${document.status}, not IN_REVIEW` });
    }

    const now = new Date();
    const updated = await prisma.qmsDocument.update({
      where: { id: document.id },
      data: {
        status: "APPROVED",
        approverId: req.user.sub,
        approvedAt: now,
        rejectionReason: null,
        effectiveDate: document.effectiveDate ?? now,
        reviewDueAt: document.reviewDueAt ?? addYears(now, 2),
      },
    });

    await logAudit("QMS", "QMS_DOC_APPROVED", actor(req.user), {
      documentId: updated.id,
      code: updated.code,
      version: updated.version,
      effectiveDate: updated.effectiveDate?.toISOString().slice(0, 10),
      reviewDueAt: updated.reviewDueAt?.toISOString().slice(0, 10),
    });

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerId },
      select: { username: true },
    });
    if (owner) {
      await notifyUser(
        owner.username,
        `QMS document approved: ${updated.code} v${updated.version}`,
        `${updated.title} is now approved and effective.`,
        `/qms/documents/${updated.id}`
      );
    }

    res.json(updated);
  } catch (error) {
    console.error("qms approve failed", error);
    res.status(500).json({ error: "Failed to approve document" });
  }
});

router.post("/:id/reject", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may reject documents" });
    }
    const parsed = rejectSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const document = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (document.status !== "IN_REVIEW") {
      return res.status(409).json({ error: `Document is ${document.status}, not IN_REVIEW` });
    }

    const updated = await prisma.qmsDocument.update({
      where: { id: document.id },
      data: {
        status: "DRAFT",
        approverId: req.user.sub,
        rejectionReason: parsed.data.reason,
        approvedAt: null,
      },
    });

    await logAudit("QMS", "QMS_DOC_REJECTED", actor(req.user), {
      documentId: updated.id,
      code: updated.code,
      version: updated.version,
      reason: parsed.data.reason,
    });

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerId },
      select: { username: true },
    });
    if (owner) {
      await notifyUser(
        owner.username,
        `QMS document returned for changes: ${updated.code} v${updated.version}`,
        parsed.data.reason,
        `/qms/documents/${updated.id}`
      );
    }

    res.json(updated);
  } catch (error) {
    console.error("qms reject failed", error);
    res.status(500).json({ error: "Failed to reject document" });
  }
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

router.post("/:id/supersede", async (req: any, res) => {
  try {
    const parsed = supersedeSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const current = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Document not found" });
    if (current.status !== "APPROVED") {
      return res.status(409).json({ error: `Only an APPROVED document can be superseded (it is ${current.status})` });
    }
    if (!canSupersedeQmsDocument(current, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may supersede this document" });
    }

    const ownerId = parsed.data.ownerId || current.ownerId;
    const reviewerId =
      parsed.data.reviewerId !== undefined ? parsed.data.reviewerId : current.reviewerId;
    const approverId =
      parsed.data.approverId !== undefined ? parsed.data.approverId : current.approverId;
    if (!(await assertUsersExist([ownerId, reviewerId, approverId]))) {
      return res.status(400).json({ error: "One of the selected people no longer exists" });
    }

    const version = nextVersion(current.version);
    const existing = await prisma.qmsDocument.findFirst({
      where: { code: current.code, version },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ error: `${current.code} v${version} already exists` });
    }

    const created = await prisma.$transaction(async (tx) => {
      const draft = await tx.qmsDocument.create({
        data: {
          code: current.code,
          title: current.title,
          titleAm: current.titleAm,
          description: current.description,
          category: current.category,
          department: current.department,
          version,
          status: "DRAFT",
          ownerId,
          reviewerId,
          approverId,
          changeSummary: parsed.data.changeSummary,
          reviewDueAt: addYears(new Date(), 2),
        },
      });
      await tx.qmsDocument.update({
        where: { id: current.id },
        data: {
          status: "SUPERSEDED",
          supersededAt: new Date(),
          supersededById: draft.id,
        },
      });
      return draft;
    });

    await logAudit("QMS", "QMS_DOC_SUPERSEDED", actor(req.user), {
      previousId: current.id,
      newId: created.id,
      code: created.code,
      previousVersion: current.version,
      newVersion: created.version,
      changeSummary: parsed.data.changeSummary,
    });

    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "That version already exists for this document code" });
    }
    console.error("qms supersede failed", error);
    res.status(500).json({ error: "Failed to supersede document" });
  }
});

router.post("/:id/obsolete", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may obsolete a document" });
    }
    const document = await prisma.qmsDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (document.status !== "APPROVED") {
      return res.status(409).json({ error: `Only an APPROVED document can be obsoleted (it is ${document.status})` });
    }

    const updated = await prisma.qmsDocument.update({
      where: { id: document.id },
      data: { status: "OBSOLETE" },
    });

    await logAudit("QMS", "QMS_DOC_OBSOLETED", actor(req.user), {
      documentId: updated.id,
      code: updated.code,
      version: updated.version,
      previousStatus: document.status,
    });

    res.json(updated);
  } catch (error) {
    console.error("qms obsolete failed", error);
    res.status(500).json({ error: "Failed to obsolete document" });
  }
});

export default router;
