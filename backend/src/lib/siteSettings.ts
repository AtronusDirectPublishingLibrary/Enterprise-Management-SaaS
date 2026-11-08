import { prisma } from "./prisma";

/**
 * Admin-editable configuration for the public website shell.
 * Everything lives in the existing `app_setting` key/value table, so no schema
 * change is needed for these three blocks.
 */

export type BannerSettings = {
  enabled: boolean;
  message: string;
  messageAm: string;
  linkLabel: string;
  linkLabelAm: string;
  linkUrl: string;
};

export type SocialPlatform = "facebook" | "x" | "linkedin" | "telegram" | "youtube";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  enabled: boolean;
};

export type SocialSettings = {
  enabled: boolean;
  links: SocialLink[];
};

export type VisitorSettings = {
  /** Show the counter band above the footer. */
  display: boolean;
  /** GA4 web stream measurement id (G-XXXXXXX). Public by design. */
  measurementId: string;
  /** GA4 property id used for the server-side Data API report. */
  propertyId: string;
};

export type PublicSiteSettings = {
  banner: BannerSettings;
  social: SocialSettings;
  visitors: VisitorSettings;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "x", "linkedin", "telegram", "youtube"];

export const DEFAULT_SETTINGS: PublicSiteSettings = {
  banner: {
    enabled: true,
    message: "Welcome to Ethio-Biopharma Enterprise — building Ethiopia's health security.",
    messageAm: "እንኳን ወደ ኢትዮ-ባዮፋርማ ኢንተርፕራይዝ በደህና መጡ — የኢትዮጵያን የጤና ዋስትና እያገነባን።",
    linkLabel: "",
    linkLabelAm: "",
    linkUrl: "",
  },
  social: {
    enabled: true,
    links: SOCIAL_PLATFORMS.map((platform) => ({ platform, url: "", enabled: true })),
  },
  visitors: {
    display: true,
    measurementId: "",
    propertyId: "",
  },
};

const KEYS = {
  banner: "public.banner",
  social: "public.social",
  visitors: "public.visitors",
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normaliseBanner(value: unknown): BannerSettings {
  const raw = isObject(value) ? value : {};
  return {
    enabled: asBoolean(raw.enabled, DEFAULT_SETTINGS.banner.enabled),
    message: asString(raw.message, DEFAULT_SETTINGS.banner.message),
    messageAm: asString(raw.messageAm, DEFAULT_SETTINGS.banner.messageAm),
    linkLabel: asString(raw.linkLabel),
    linkLabelAm: asString(raw.linkLabelAm),
    linkUrl: asString(raw.linkUrl),
  };
}

function normaliseSocial(value: unknown): SocialSettings {
  const raw = isObject(value) ? value : {};
  const stored = Array.isArray(raw.links) ? raw.links : [];
  const links = SOCIAL_PLATFORMS.map((platform) => {
    const entry = stored.find((item) => isObject(item) && item.platform === platform);
    const record = isObject(entry) ? entry : {};
    return {
      platform,
      url: asString(record.url),
      enabled: asBoolean(record.enabled, true),
    };
  });
  return {
    enabled: asBoolean(raw.enabled, DEFAULT_SETTINGS.social.enabled),
    links,
  };
}

function normaliseVisitors(value: unknown): VisitorSettings {
  const raw = isObject(value) ? value : {};
  return {
    display: asBoolean(raw.display, DEFAULT_SETTINGS.visitors.display),
    measurementId: asString(raw.measurementId).trim(),
    propertyId: asString(raw.propertyId).trim(),
  };
}

/** Reads every public-site block, falling back to defaults for missing keys. */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [KEYS.banner, KEYS.social, KEYS.visitors] } },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    banner: normaliseBanner(byKey.get(KEYS.banner)),
    social: normaliseSocial(byKey.get(KEYS.social)),
    visitors: normaliseVisitors(byKey.get(KEYS.visitors)),
  };
}

async function saveSetting(key: string, value: unknown, updatedBy?: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value as any, updatedBy },
    update: { value: value as any, updatedBy },
  });
}

export async function savePublicSiteSettings(
  patch: Partial<{
    banner: unknown;
    social: unknown;
    visitors: unknown;
  }>,
  updatedBy?: string
): Promise<PublicSiteSettings> {
  const writes: Promise<void>[] = [];
  if (patch.banner !== undefined) {
    writes.push(saveSetting(KEYS.banner, normaliseBanner(patch.banner), updatedBy));
  }
  if (patch.social !== undefined) {
    writes.push(saveSetting(KEYS.social, normaliseSocial(patch.social), updatedBy));
  }
  if (patch.visitors !== undefined) {
    writes.push(saveSetting(KEYS.visitors, normaliseVisitors(patch.visitors), updatedBy));
  }
  await Promise.all(writes);
  return getPublicSiteSettings();
}

/** Public payload: never leaks server credentials, only public ids. */
export function toPublicPayload(settings: PublicSiteSettings) {
  const { measurementId } = settings.visitors;
  return {
    banner: settings.banner,
    social: {
      enabled: settings.social.enabled,
      links: settings.social.links.filter((link) => link.enabled && link.url.trim()),
    },
    visitors: {
      display: settings.visitors.display,
      measurementId,
      ga4Configured: Boolean(measurementId),
    },
  };
}
