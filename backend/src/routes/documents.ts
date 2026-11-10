import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { allows } from "../lib/access";
import { upload } from "../middleware/upload";
import { nextDocumentNumber } from "../lib/numbering";

const router = Router();

/**
 * The sidebar exposes document management to positions that own the
 * `documents` workspace (plus project managers). Keep the API in step with
 * that UI so an IT Officer or HR Manager can actually save what they see.
 */
function canManageDocuments(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (
    req.user.role === "project_manager" ||
    allows(req.user, "documents") ||
    allows(req.user, "archive")
  ) {
    return next();
  }
  return res.status(403).json({ message: "Your position does not have document management access." });
}

/** The internal archive is for staff whose position grants archive or document access. */
function canViewArchive(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (allows(req.user, "archive") || allows(req.user, "documents") || req.user.role === "project_manager") {
    return next();
  }
  return res.status(403).json({ message: "Your position does not have access to the internal document archive." });
}

const optionalText = z.string().trim().optional().nullable();

const DocumentInput = z.object({
  title: z.string().trim().min(2),
  docNumber: optionalText,
  thematic: optionalText,
  thematicOther: optionalText,
  type: optionalText,
  typeOther: optionalText,
  unit: optionalText,
  language: optionalText,
  version: optionalText,
  firstEndorsement: optionalText,
  recentRenewal: optionalText,
  expiry: optionalText,
  status: optionalText,
  notes: optionalText,
  projectId: optionalText,
  isPublic: z
    .preprocess(
      (value) => (value === undefined ? undefined : value === true || value === "true" || value === "on" || value === "1"),
      z.boolean().optional()
    )
    .optional(),
});

const clean = (value?: string | null) => {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : null;
};

function documentData(input: z.infer<typeof DocumentInput>) {
  return {
    title: input.title.trim(),
    docNumber: clean(input.docNumber),
    thematic: clean(input.thematic) || "General",
    thematicOther: clean(input.thematicOther),
    type: clean(input.type) || "Report",
    typeOther: clean(input.typeOther),
    unit: clean(input.unit),
    language: clean(input.language) || "English",
    version: clean(input.version),
    firstEndorsement: clean(input.firstEndorsement),
    recentRenewal: clean(input.recentRenewal),
    expiry: clean(input.expiry),
    status: clean(input.status) || "Active",
    notes: clean(input.notes),
  };
}

/**
 * Public website library. Only documents explicitly marked public and still
 * active are exposed, so internal contracts and staff papers never leak.
 */
router.get("/public", async (_req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { projectId: null, isPublic: true, status: "Active" },
      orderBy: { publishedAt: "desc" },
    });
    res.json(docs);
  } catch (e) { next(e); }
});

/** Internal document archive: authenticated staff with database access. */
router.get("/", requireAuth, canViewArchive, async (_req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { projectId: null },
      orderBy: { uploadDate: "desc" },
    });
    res.json(docs);
  } catch (e) { next(e); }
});

/**
 * Manual numbers are accepted but must be unique (case-insensitive). Blank
 * numbers are generated from the document type and the current year.
 */
async function findDocNumberConflict(docNumber: string, excludeId?: string) {
  return prisma.document.findFirst({
    where: {
      docNumber: { equals: docNumber, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, title: true },
  });
}

async function assertDocNumberAvailable(docNumber: string | null, excludeId?: string) {
  if (!docNumber) return;
  const conflict = await findDocNumberConflict(docNumber, excludeId);
  if (conflict) {
    const error: any = new Error(`Document number ${docNumber} is already used by “${conflict.title}”.`);
    error.status = 409;
    throw error;
  }
}

/** Project workspace: documents attached to one PMS project. */
router.get("/project/:projectId", requireAuth, requireAccess("pms"), async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { uploadDate: "desc" },
    });
    res.json(docs);
  } catch (e) { next(e); }
});

router.post(
  "/",
  requireAuth,
  canManageDocuments,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const input = DocumentInput.parse(req.body);
      if (!req.file) return res.status(400).json({ message: "Choose a file to upload." });

      if (input.projectId) {
        const project = await prisma.project.findUnique({
          where: { projectId: input.projectId },
          select: { projectId: true },
        });
        if (!project) return res.status(404).json({ message: "That project no longer exists." });
      }

      // Signatures and document metadata use the person's full name; the
      // username stays as the fallback for accounts without a staff name.
      const uploader = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { firstName: true, lastName: true, username: true },
      });
      const uploaderName = [uploader?.firstName, uploader?.lastName].filter(Boolean).join(" ").trim();
      const data = documentData(input);
      // Auto-numbers skip any value already reserved manually, so the
      // generated reference can never collide with an existing document.
      let docNumber = data.docNumber;
      if (!docNumber) {
        for (let attempt = 0; attempt < 100 && !docNumber; attempt += 1) {
          const candidate = await nextDocumentNumber(data.type);
          if (!(await findDocNumberConflict(candidate))) docNumber = candidate;
        }
      }
      if (!docNumber) {
        return res.status(409).json({ message: "Could not allocate a unique document number. Try again." });
      }
      await assertDocNumberAvailable(docNumber);
      const isPublic = input.isPublic === true;

      const created = await prisma.document.create({
        data: {
          ...data,
          docNumber,
          isPublic,
          publishedAt: isPublic ? new Date() : null,
          projectId: clean(input.projectId),
          fileUrl: `/uploads/${req.file.filename}`,
          fileName: req.file.originalname,
          uploadedBy: uploaderName || uploader?.username || req.user!.username,
        },
      });
      res.status(201).json(created);
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ message: "That document number is already in use. Choose another one." });
      }
      if (e?.status) return res.status(e.status).json({ message: e.message });
      next(e);
    }
  }
);

router.put(
  "/:id",
  requireAuth,
  canManageDocuments,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const input = DocumentInput.partial().parse(req.body);
      const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ message: "Document not found." });

      const merged: Record<string, unknown> = { ...existing };
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) merged[key] = value;
      }
      const data: Record<string, unknown> = {
        ...documentData({ ...(merged as z.infer<typeof DocumentInput>), title: (merged.title as string) || existing.title }),
      };
      if (input.docNumber !== undefined) {
        const docNumber = clean(input.docNumber);
        await assertDocNumberAvailable(docNumber, existing.id);
        data.docNumber = docNumber || undefined;
      }
      if (input.isPublic !== undefined) {
        data.isPublic = input.isPublic;
        data.publishedAt = input.isPublic ? existing.publishedAt || new Date() : null;
      }
      if (input.projectId !== undefined) data.projectId = clean(input.projectId);
      if (req.file) {
        data.fileUrl = `/uploads/${req.file.filename}`;
        data.fileName = req.file.originalname;
      }

      const updated = await prisma.document.update({ where: { id: req.params.id }, data });
      res.json(updated);
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ message: "That document number is already in use. Choose another one." });
      }
      next(e);
    }
  }
);

router.delete("/:id", requireAuth, canManageDocuments, async (req, res, next) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
