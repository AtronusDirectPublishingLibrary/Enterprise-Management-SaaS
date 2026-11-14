import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getTenantBranding, setTenantBranding, TENANT_BRANDING_DEFAULTS } from "../lib/tenantSettings";

const router = Router();

router.get("/settings", requireAuth, async (_req, res) => {
  try {
    const settings = await getTenantBranding();
    res.json({ settings, defaults: TENANT_BRANDING_DEFAULTS });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load tenant settings", message: err?.message });
  }
});

const updateSchema = z.object({
  settings: z.record(z.string(), z.any()).default({}),
});

router.put("/settings", requireAuth, async (req: any, res) => {
  try {
    // tenant admins (or system/platform admins) can update branding
    const user = req.user || {};
    const isAdmin = user.role === "admin" || user.isTenantAdmin || user.isPlatformAdmin;
    if (!isAdmin) {
      return res.status(403).json({ error: "Only tenant administrators can update settings" });
    }
    const parsed = updateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const allowedKeys = new Set(Object.keys(TENANT_BRANDING_DEFAULTS));
    const updates: Record<string, any> = {};
    for (const [k, v] of Object.entries(parsed.data.settings || {})) {
      if (allowedKeys.has(k)) updates[k] = typeof v === "string" ? v : String(v ?? "");
    }
    const settings = await setTenantBranding(updates as any, user.sub || null);
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update tenant settings", message: err?.message });
  }
});

export default router;
