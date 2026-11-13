import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  getPublicSiteSettings,
  publishTheme,
  savePublicSiteSettings,
  toPublicPayload,
} from "../lib/siteSettings";
import { invalidateVisitorCache } from "../lib/ga4";

const router = Router();

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "brand");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".png") {
      return cb(new Error("The logo must be a PNG file"));
    }
    cb(null, true);
  },
});

function isPng(file: Express.Multer.File) {
  const header = Buffer.alloc(8);
  const fd = fs.openSync(file.path, "r");
  try {
    fs.readSync(fd, header, 0, 8, 0);
  } finally {
    fs.closeSync(fd);
  }
  return header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function removeUploadedFile(url: string) {
  if (!url.startsWith("/uploads/brand/")) return;
  const target = path.join(process.cwd(), url.replace(/^\//, ""));
  fs.unlink(target, () => undefined);
}

/** Admin: upload a replacement PNG logo (used in the public header, footer and login). */
router.post("/logo", requireAuth, requireRole("admin"), logoUpload.single("logo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a PNG logo to upload" });
    if (!isPng(req.file)) {
      fs.unlink(req.file.path, () => undefined);
      return res.status(400).json({ message: "The uploaded file is not a valid PNG image" });
    }
    const previous = await getPublicSiteSettings();
    const settings = await savePublicSiteSettings(
      {
        brand: {
          logoUrl: `/uploads/brand/${req.file.filename}`,
          logoUpdatedAt: new Date().toISOString(),
        },
      },
      req.user?.username
    );
    if (previous.brand.logoUrl && previous.brand.logoUrl !== settings.brand.logoUrl) {
      removeUploadedFile(previous.brand.logoUrl);
    }
    res.json({ success: true, settings });
  } catch (e) {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    next(e);
  }
});

/** Admin: remove the current logo and fall back to the EB monogram. */
router.delete("/logo", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const previous = await getPublicSiteSettings();
    const settings = await savePublicSiteSettings(
      { brand: { logoUrl: "", logoUpdatedAt: new Date().toISOString() } },
      req.user?.username
    );
    removeUploadedFile(previous.brand.logoUrl);
    res.json({ success: true, settings });
  } catch (e) {
    next(e);
  }
});

/** Public: banner copy, social links and the visitor-counter switch. */
router.get("/", async (_req, res, next) => {
  try {
    const settings = await getPublicSiteSettings();
    // Revalidate every load: the payload is tiny and admin edits should show
    // up on the next page view (Express' ETag keeps repeat loads cheap).
    res.set("Cache-Control", "no-cache");
    res.json(toPublicPayload(settings));
  } catch (e) {
    next(e);
  }
});

/** Admin: publish the working brand palette to every surface at once. */
router.post("/theme/publish", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const settings = await publishTheme(req.user?.username);
    res.json({ success: true, theme: settings.theme });
  } catch (e) {
    next(e);
  }
});

/** Admin: full settings including the GA4 property id. */
router.get("/admin", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const settings = await getPublicSiteSettings();
    res.json({
      ...settings,
      analytics: {
        serviceAccountConfigured: Boolean(
          process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY
        ),
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Admin: update any subset of the public-site blocks. */
router.put("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = body.contact?.email;
    if (typeof email === "string" && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid public contact email address" });
    }
    const settings = await savePublicSiteSettings(body, req.user?.username);
    invalidateVisitorCache();
    res.json({ success: true, settings });
  } catch (e) {
    next(e);
  }
});

export default router;
