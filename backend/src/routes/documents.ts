import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// Public: Get all documents
router.get("/", async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({ orderBy: { uploadDate: "desc" } });
    res.json(docs);
  } catch (e) { next(e); }
});

// Admin: Create document (with file upload)
router.post("/", requireAuth, requireRole("admin", "project_manager"), upload.single("file"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      docNumber: z.string().optional(),
      thematic: z.string().default("General"),
      type: z.string().default("Report"),
      notes: z.string().optional(),
    }).parse(req.body);

    if (!req.file) return res.status(400).json({ message: "File upload is required" });

    const created = await prisma.document.create({
      data: { 
        ...d, 
        fileUrl: `/uploads/${req.file.filename}`, 
        fileName: req.file.originalname,
        uploadedBy: req.user!.username 
      },
    });
    res.json(created);
  } catch (e) { next(e); }
});

// Admin: Update document
router.put("/:id", requireAuth, requireRole("admin", "project_manager"), upload.single("file"), async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      docNumber: z.string().optional(),
      thematic: z.string().optional(),
      type: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const data: any = { ...d };
    if (req.file) {
      data.fileUrl = `/uploads/${req.file.filename}`;
      data.fileName = req.file.originalname;
    }

    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// Admin: Delete document
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;