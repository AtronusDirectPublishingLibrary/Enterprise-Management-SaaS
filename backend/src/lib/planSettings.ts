import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const PLAN_ALERT_SETTINGS_KEY = "planAlerts";

export interface PlanAlertSettings {
  emailEnabled: boolean;
  includeAdmins: boolean;
  recipients: string[];
  /** Alert when actual performance falls this many % below the pro-rata target. */
  paceTolerancePct: number;
  /** Gap (in %) that escalates an alert to CRITICAL. */
  criticalGapPct: number;
  /** Days before a milestone/report due date to raise a reminder. */
  dueSoonDays: number;
}

export const DEFAULT_PLAN_ALERT_SETTINGS: PlanAlertSettings = {
  emailEnabled: true,
  includeAdmins: true,
  recipients: [],
  paceTolerancePct: 20,
  criticalGapPct: 40,
  dueSoonDays: 14,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export async function getPlanAlertSettings(): Promise<PlanAlertSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: PLAN_ALERT_SETTINGS_KEY },
  });
  const stored = (row?.value ?? {}) as Partial<PlanAlertSettings>;
  const envRecipients = (process.env.PLAN_ALERT_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    ...DEFAULT_PLAN_ALERT_SETTINGS,
    ...stored,
    recipients: Array.from(new Set([...(stored.recipients ?? []), ...envRecipients])),
  };
}

export async function savePlanAlertSettings(
  patch: Partial<PlanAlertSettings>,
  updatedBy?: string
): Promise<PlanAlertSettings> {
  const current = await getPlanAlertSettings();
  const next: PlanAlertSettings = {
    emailEnabled: patch.emailEnabled ?? current.emailEnabled,
    includeAdmins: patch.includeAdmins ?? current.includeAdmins,
    recipients: Array.isArray(patch.recipients)
      ? Array.from(
          new Set(
            patch.recipients
              .map((entry) => String(entry).trim())
              .filter((entry) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry))
          )
        )
      : current.recipients,
    paceTolerancePct: clamp(patch.paceTolerancePct ?? current.paceTolerancePct, 0, 90),
    criticalGapPct: clamp(patch.criticalGapPct ?? current.criticalGapPct, 1, 100),
    dueSoonDays: clamp(patch.dueSoonDays ?? current.dueSoonDays, 1, 120),
  };

  const value = next as unknown as Prisma.InputJsonValue;
  await prisma.appSetting.upsert({
    where: { key: PLAN_ALERT_SETTINGS_KEY },
    create: { key: PLAN_ALERT_SETTINGS_KEY, value, updatedBy },
    update: { value, updatedBy },
  });

  return next;
}
