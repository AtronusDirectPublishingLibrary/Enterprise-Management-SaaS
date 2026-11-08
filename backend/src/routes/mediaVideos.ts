import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { MEDIA_UPLOAD_FIELDS } from "../middleware/uploadMedia";

const router = Router();

type UploadedFiles = Partial<Record<"video" | "poster" | "captions", Express.Multer.File[]>>;

function uploadedUrl(files: UploadedFiles, field: "video" | "poster" | "captions"): string | undefined {
  const file = files?.[field]?.[0];
  return file ? `/uploads/media/${file.filename}` : undefined;
}

function toBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "1", "on", "yes"].includes(value.toLowerCase())) return true;
    if (["false", "0", "off", "no"].includes(value.toLowerCase())) return false;
  }
  return fallback;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Public: active videos in display order. */
router.get("/", async (_req, res, next) => {
  try {
    const videos = await prisma.mediaVideo.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(videos);
  } catch (e) {
    next(e);
  }
});

/** Admin: every video, including hidden ones. */
router.get("/all", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const videos = await prisma.mediaVideo.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(videos);
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, requireRole("admin"), MEDIA_UPLOAD_FIELDS, async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(2),
        titleAm: z.string().optional(),
        caption: z.string().optional(),
        captionAm: z.string().optional(),
        videoUrl: z.string().optional(),
        posterUrl: z.string().optional(),
        captionsUrl: z.string().optional(),
        sortOrder: z.coerce.number().int().optional(),
        isActive: z.union([z.boolean(), z.string()]).optional(),
      })
      .parse(req.body);

    const files = (req.files || {}) as UploadedFiles;
    const videoUrl = uploadedUrl(files, "video") || toOptionalString(body.videoUrl);
    if (!videoUrl) return res.status(400).json({ message: "A video file or video URL is required" });

    const created = await prisma.mediaVideo.create({
      data: {
        title: body.title.trim(),
        titleAm: toOptionalString(body.titleAm),
        caption: toOptionalString(body.caption),
        captionAm: toOptionalString(body.captionAm),
        videoUrl,
        posterUrl: uploadedUrl(files, "poster") || toOptionalString(body.posterUrl),
        captionsUrl: uploadedUrl(files, "captions") || toOptionalString(body.captionsUrl),
        sortOrder: body.sortOrder ?? 0,
        isActive: toBool(body.isActive, true),
      },
    });

    res.json({ success: true, video: created });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", requireAuth, requireRole("admin"), MEDIA_UPLOAD_FIELDS, async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(2).optional(),
        titleAm: z.string().optional(),
        caption: z.string().optional(),
        captionAm: z.string().optional(),
        videoUrl: z.string().optional(),
        posterUrl: z.string().optional(),
        captionsUrl: z.string().optional(),
        sortOrder: z.coerce.number().int().optional(),
        isActive: z.union([z.boolean(), z.string()]).optional(),
      })
      .parse(req.body);

    const files = (req.files || {}) as UploadedFiles;
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.titleAm !== undefined) data.titleAm = toOptionalString(body.titleAm);
    if (body.caption !== undefined) data.caption = toOptionalString(body.caption);
    if (body.captionAm !== undefined) data.captionAm = toOptionalString(body.captionAm);
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = toBool(body.isActive);

    const videoUrl = uploadedUrl(files, "video") || toOptionalString(body.videoUrl);
    if (videoUrl) data.videoUrl = videoUrl;
    const posterUrl = uploadedUrl(files, "poster") || toOptionalString(body.posterUrl);
    if (posterUrl) data.posterUrl = posterUrl;
    const captionsUrl = uploadedUrl(files, "captions") || toOptionalString(body.captionsUrl);
    if (captionsUrl) data.captionsUrl = captionsUrl;

    const updated = await prisma.mediaVideo.update({ where: { id: req.params.id }, data });
    res.json({ success: true, video: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.mediaVideo.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
