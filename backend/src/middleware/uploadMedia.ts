import multer from "multer";
import path from "path";
import fs from "fs";
import { withFileScan } from "../lib/fileScan";

/** Uploads for the public Media section (video, poster and WebVTT captions). */

const uploadDir = path.join(process.cwd(), "uploads", "media");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED: Record<string, string[]> = {
  video: [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v"],
  poster: [".jpg", ".jpeg", ".png", ".webp", ".avif"],
  captions: [".vtt", ".srt"],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe || "upload"}`);
  },
});

export const uploadMedia = multer({
  storage,
  limits: { fileSize: 512 * 1024 * 1024 }, // 512 MB per file
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ALLOWED[file.fieldname];
    if (allowed && allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type for ${file.fieldname}: ${ext || "unknown"}`));
  },
});

export const MEDIA_UPLOAD_FIELDS = withFileScan(uploadMedia.fields([
  { name: "video", maxCount: 1 },
  { name: "poster", maxCount: 1 },
  { name: "captions", maxCount: 1 },
]));
