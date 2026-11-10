import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const OFFBOARDING_SETTINGS_KEY = "offboarding";

export interface OffboardingSettings {
  /** Minimum advance notice an employee must give when filing a resignation. */
  noticePeriodDays: number;
  /** Whether people may start their own exit from My Portal. */
  allowEmployeeInitiated: boolean;
}

export const DEFAULT_OFFBOARDING_SETTINGS: OffboardingSettings = {
  noticePeriodDays: 30,
  allowEmployeeInitiated: true,
};

const clampDays = (value: number) =>
  Math.min(365, Math.max(0, Number.isFinite(value) ? Math.round(value) : 30));

export async function getOffboardingSettings(): Promise<OffboardingSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: OFFBOARDING_SETTINGS_KEY } });
  const stored = (row?.value ?? {}) as Partial<OffboardingSettings>;
  return {
    noticePeriodDays: clampDays(Number(stored.noticePeriodDays ?? DEFAULT_OFFBOARDING_SETTINGS.noticePeriodDays)),
    allowEmployeeInitiated:
      stored.allowEmployeeInitiated ?? DEFAULT_OFFBOARDING_SETTINGS.allowEmployeeInitiated,
  };
}

export async function saveOffboardingSettings(
  patch: Partial<OffboardingSettings>,
  updatedBy?: string
): Promise<OffboardingSettings> {
  const current = await getOffboardingSettings();
  const next: OffboardingSettings = {
    noticePeriodDays: clampDays(patch.noticePeriodDays ?? current.noticePeriodDays),
    allowEmployeeInitiated: patch.allowEmployeeInitiated ?? current.allowEmployeeInitiated,
  };
  await prisma.appSetting.upsert({
    where: { key: OFFBOARDING_SETTINGS_KEY },
    create: { key: OFFBOARDING_SETTINGS_KEY, value: next as unknown as Prisma.InputJsonValue, updatedBy },
    update: { value: next as unknown as Prisma.InputJsonValue, updatedBy },
  });
  return next;
}

/** Date-only string (YYYY-MM-DD) for N days from today, used with <input type=date>. */
export function dateStringInDays(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}