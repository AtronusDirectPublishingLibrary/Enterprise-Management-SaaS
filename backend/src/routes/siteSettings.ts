import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  getPublicSiteSettings,
  savePublicSiteSettings,
  toPublicPayload,
} from "../lib/siteSettings";
import { invalidateVisitorCache } from "../lib/ga4";

const router = Router();

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
    const settings = await savePublicSiteSettings(req.body || {}, req.user?.username);
    invalidateVisitorCache();
    res.json({ success: true, settings });
  } catch (e) {
    next(e);
  }
});

export default router;
