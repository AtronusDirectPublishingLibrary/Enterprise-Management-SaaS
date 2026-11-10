import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { allows } from "../lib/access";
import { upload } from "../middleware/upload";

const router = Router();

/**
 * The sidebar exposes document management to positions that own the
 * `documents` workspace (plus project managers). Keep the API in step with
 * that UI so an IT Officer or HR Manager can actually save what they see.
 */
function canManageDocuments(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role === "project_manager" || allows(req.user, "documents")) return next();
  return res.status(403).json({ message: "Your position does not have document management access." });
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

/** Public library: only documents that do not belong to a PMS project. */
router.get("/", async (_req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { projectId: null },
      orderBy: { uploadDate: "desc" },
    });
    res.json(docs);
  } catch (e) { next(e); }
});

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

      const created = await prisma.document.create({
        data: {
          ...documentData(input),
          projectId: clean(input.projectId),
          fileUrl: `/uploads/${req.file.filename}`,
          fileName: req.file.originalname,
          uploadedBy: uploaderName || uploader?.username || req.user!.username,
        },
      });
      res.status(201).json(created);
    } catch (e) { next(e); }
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
      if (input.projectId !== undefined) data.projectId = clean(input.projectId);
      if (req.file) {
        data.fileUrl = `/uploads/${req.file.filename}`;
        data.fileName = req.file.originalname;
      }

      const updated = await prisma.document.update({ where: { id: req.params.id }, data });
      res.json(updated);
    } catch (e) { next(e); }
  }
);

router.delete("/:id", requireAuth, canManageDocuments, async (req, res, next) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
