import { prisma } from "./prisma";

/**
 * Fleet & Transport configuration, backed by the `fleet_setting` table.
 * All access goes through this module so there is one place to add or
 * rename a setting without hunting through routes and UI.
 */

export type FleetSettings = {
  autoCleanupDays: number;
  approvalLevels: number;
  notifySupervisorAfterHours: number;
  notifyFleetAfterHours: number;
  requireOdometer: boolean;
  defaultVehicleType: string;
  rideAutoApprove: boolean;
  maxInTownHours: number;
};

export const FLEET_SETTING_DEFAULTS: FleetSettings = {
  autoCleanupDays: 7,
  approvalLevels: 2,
  notifySupervisorAfterHours: 24,
  notifyFleetAfterHours: 24,
  requireOdometer: true,
  defaultVehicleType: "Sedan",
  rideAutoApprove: false,
  maxInTownHours: 8,
};

export const FLEET_SETTING_LABELS: Record<keyof FleetSettings, string> = {
  autoCleanupDays: "Auto-cleanup days (after return date)",
  approvalLevels: "Approval levels (1 = fleet only, 2 = supervisor then fleet)",
  notifySupervisorAfterHours: "Nudge supervisor after (hours)",
  notifyFleetAfterHours: "Nudge fleet manager after (hours)",
  requireOdometer: "Require odometer start/end (true/false)",
  defaultVehicleType: "Default vehicle type",
  rideAutoApprove: "Auto-approve ride requests (true/false)",
  maxInTownHours: "Max in-town hours",
};

function coerce<K extends keyof FleetSettings>(
  key: K,
  raw: string | undefined
): FleetSettings[K] {
  const fallback = FLEET_SETTING_DEFAULTS[key];
  if (raw === undefined || raw === null || raw === "") return fallback as FleetSettings[K];
  if (typeof fallback === "number") {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : fallback) as FleetSettings[K];
  }
  if (typeof fallback === "boolean") {
    return ((raw as string).toLowerCase() === "true") as FleetSettings[K];
  }
  return raw as FleetSettings[K];
}

export async function getFleetSettings(): Promise<FleetSettings> {
  const rows = await prisma.fleetSetting.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const out = {} as FleetSettings;
  (Object.keys(FLEET_SETTING_DEFAULTS) as (keyof FleetSettings)[]).forEach((k) => {
    (out as any)[k] = coerce(k, byKey.get(k));
  });
  return out;
}

export async function setFleetSetting<K extends keyof FleetSettings>(
  key: K,
  value: FleetSettings[K],
  description?: string
): Promise<void> {
  const strValue =
    typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  await prisma.fleetSetting.upsert({
    where: { key },
    create: { key, value: strValue, description: description ?? FLEET_SETTING_LABELS[key] },
    update: { value: strValue, description: description ?? FLEET_SETTING_LABELS[key] },
  });
}

/**
 * Seed every default once. Safe to call at startup - only writes keys that
 * are missing, never overwrites what an admin has changed.
 */
export async function ensureFleetSettingsSeeded(): Promise<void> {
  const existing = await prisma.fleetSetting.findMany({ select: { key: true } });
  const have = new Set(existing.map((r) => r.key));
  const missing = (Object.keys(FLEET_SETTING_DEFAULTS) as (keyof FleetSettings)[]).filter(
    (k) => !have.has(k)
  );
  if (missing.length === 0) return;
  await prisma.fleetSetting.createMany({
    data: missing.map((k) => ({
      key: k,
      value:
        typeof FLEET_SETTING_DEFAULTS[k] === "boolean"
          ? FLEET_SETTING_DEFAULTS[k]
            ? "true"
            : "false"
          : String(FLEET_SETTING_DEFAULTS[k]),
      description: FLEET_SETTING_LABELS[k],
    })),
    skipDuplicates: true,
  });
}