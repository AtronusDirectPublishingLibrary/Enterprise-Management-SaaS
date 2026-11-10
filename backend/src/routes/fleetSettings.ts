import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireRole } from "../middleware/rbac";
import {
  FLEET_SETTING_DEFAULTS,
  FLEET_SETTING_LABELS,
  FleetSettings,
} from "../lib/fleetSettings";

const router = Router();

/**
 * Fleet configuration.
 *   GET  /         - read every setting (any authenticated user; needs the fleet sidebar to reach)
 *   PUT  /:key     - update one setting (admin only)
 *   PUT  /         - bulk update (admin only)
 *
 * The `fleet` grant gates the router mount in index.ts; the write endpoints
 * add an additional admin-only guard here.
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.fleetSetting.findMany({ orderBy: { key: "asc" } });
    // Ensure every default key exists in the response, even if not yet seeded
    const existing = new Map(rows.map((r) => [r.key, r]));
    const keys = Object.keys(FLEET_SETTING_DEFAULTS) as (keyof FleetSettings)[];
    const payload = keys.map((k) => {
      const row = existing.get(k);
      const defaultValue = FLEET_SETTING_DEFAULTS[k];
      return {
        key: k,
        value: row ? row.value : String(defaultValue),
        label: row?.description || FLEET_SETTING_LABELS[k],
        type:
          typeof defaultValue === "number"
            ? "number"
            : typeof defaultValue === "boolean"
            ? "boolean"
            : "string",
        updatedAt: row?.updatedAt || null,
      };
    });
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

const updateSchema = z.object({
  value: z.string(),
});

router.put("/:key", requireRole(["admin"]), async (req: any, res) => {
  try {
    const key = req.params.key;
    if (!(key in FLEET_SETTING_DEFAULTS)) {
      return res.status(404).json({ error: `Unknown setting: ${key}` });
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const { value } = parsed.data;
    // Coerce & validate boolean/number
    const defaultVal = FLEET_SETTING_DEFAULTS[key as keyof FleetSettings];
    if (typeof defaultVal === "boolean") {
      if (!["true", "false"].includes(value.toLowerCase())) {
        return res.status(400).json({ error: "Boolean setting expects 'true' or 'false'" });
      }
    } else if (typeof defaultVal === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: "Numeric setting expects a valid number" });
      }
    }
    const updated = await prisma.fleetSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        description: FLEET_SETTING_LABELS[key as keyof FleetSettings],
      },
      update: { value },
    });
    await logAudit("FLEET", "SETTING_UPDATED", req.user?.username || "system", {
      key,
      value,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

const bulkSchema = z.object({
  updates: z.array(z.object({ key: z.string(), value: z.string() })).min(1),
});

router.put("/", requireRole(["admin"]), async (req: any, res) => {
  try {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const results: any[] = [];
    for (const update of parsed.data.updates) {
      if (!(update.key in FLEET_SETTING_DEFAULTS)) continue;
      const updated = await prisma.fleetSetting.upsert({
        where: { key: update.key },
        create: {
          key: update.key,
          value: update.value,
          description: FLEET_SETTING_LABELS[update.key as keyof FleetSettings],
        },
        update: { value: update.value },
      });
      results.push(updated);
    }
    await logAudit("FLEET", "SETTINGS_BULK_UPDATED", req.user?.username || "system", {
      count: results.length,
    });
    res.json({ updated: results.length, settings: results });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk update settings" });
  }
});

export default router;