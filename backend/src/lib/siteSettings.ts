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

export type BrandSettings = {
  /** Public path of the uploaded PNG logo, e.g. /uploads/brand/… */
  logoUrl: string;
  /** Optional dark/light note is not stored; the same PNG is used everywhere. */
  logoUpdatedAt: string;
};

export type ContactSettings = {
  email: string;
  phone: string;
};

/**
 * The single source of truth for the platform palette. Keys are stored, the
 * CSS variable names are applied by the front end. A colour must be a 6-digit
 * hex value; anything else falls back to the approved default so a bad value
 * can never leave the UI unstyled.
 */
export const THEME_COLORS = {
  primary: "#0B2545",
  primaryDark: "#081a30",
  secondary: "#C9A227",
  secondaryDeep: "#8a6a12",
  secondarySoft: "#e8c766",
  accent: "#6B2D2D",
  accentDeep: "#8a3a3a",
  background: "#F5F2EA",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  muted: "#6c757d",
  success: "#2ecc71",
  warning: "#f39c12",
  danger: "#e74c3c",
  info: "#3498db",
  canvas: "#418acf",
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS;
export type ThemeColors = Record<ThemeColorKey, string>;

export type ThemeSettings = {
  /** Working palette edited in Settings. */
  colors: ThemeColors;
  /** Palette currently served to the website and the workspace. */
  published: ThemeColors;
  updatedAt: string;
  publishedAt: string;
};

export type PublicSiteSettings = {
  brand: BrandSettings;
  contact: ContactSettings;
  banner: BannerSettings;
  social: SocialSettings;
  visitors: VisitorSettings;
  theme: ThemeSettings;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "x", "linkedin", "telegram", "youtube"];

export const DEFAULT_SETTINGS: PublicSiteSettings = {
  brand: {
    logoUrl: "",
    logoUpdatedAt: "",
  },
  contact: {
    email: "ebpe@ethiobiopharma.et",
    phone: "",
  },
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
  theme: {
    colors: { ...THEME_COLORS },
    published: { ...THEME_COLORS },
    updatedAt: "",
    publishedAt: "",
  },
};

const KEYS = {
  brand: "public.brand",
  contact: "public.contact",
  banner: "public.banner",
  social: "public.social",
  visitors: "public.visitors",
  theme: "public.theme",
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

function normaliseBrand(value: unknown): BrandSettings {
  const raw = isObject(value) ? value : {};
  return {
    logoUrl: asString(raw.logoUrl).trim(),
    logoUpdatedAt: asString(raw.logoUpdatedAt),
  };
}

function normaliseContact(value: unknown): ContactSettings {
  const raw = isObject(value) ? value : {};
  return {
    email: asString(raw.email, DEFAULT_SETTINGS.contact.email).trim(),
    phone: asString(raw.phone).trim(),
  };
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

const HEX = /^#[0-9a-fA-F]{6}$/;

function normaliseColors(value: unknown): ThemeColors {
  const raw = isObject(value) ? value : {};
  const colors = { ...THEME_COLORS } as ThemeColors;
  for (const key of Object.keys(THEME_COLORS) as ThemeColorKey[]) {
    const candidate = asString(raw[key]).trim();
    if (HEX.test(candidate)) colors[key] = candidate.toUpperCase();
  }
  return colors;
}

function normaliseTheme(value: unknown): ThemeSettings {
  const raw = isObject(value) ? value : {};
  return {
    colors: normaliseColors(raw.colors),
    published: normaliseColors(raw.published),
    updatedAt: asString(raw.updatedAt),
    publishedAt: asString(raw.publishedAt),
  };
}

/** Reads every public-site block, falling back to defaults for missing keys. */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: { in: [KEYS.brand, KEYS.contact, KEYS.banner, KEYS.social, KEYS.visitors, KEYS.theme] },
    },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    brand: normaliseBrand(byKey.get(KEYS.brand)),
    contact: normaliseContact(byKey.get(KEYS.contact)),
    banner: normaliseBanner(byKey.get(KEYS.banner)),
    social: normaliseSocial(byKey.get(KEYS.social)),
    visitors: normaliseVisitors(byKey.get(KEYS.visitors)),
    theme: normaliseTheme(byKey.get(KEYS.theme)),
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
    brand: unknown;
    contact: unknown;
    banner: unknown;
    social: unknown;
    visitors: unknown;
    theme: unknown;
  }>,
  updatedBy?: string
): Promise<PublicSiteSettings> {
  const current = await getPublicSiteSettings();
  const writes: Promise<void>[] = [];
  if (patch.brand !== undefined) {
    writes.push(saveSetting(KEYS.brand, normaliseBrand({ ...current.brand, ...(isObject(patch.brand) ? patch.brand : {}) }), updatedBy));
  }
  if (patch.contact !== undefined) {
    writes.push(saveSetting(KEYS.contact, normaliseContact({ ...current.contact, ...(isObject(patch.contact) ? patch.contact : {}) }), updatedBy));
  }
  if (patch.banner !== undefined) {
    writes.push(saveSetting(KEYS.banner, normaliseBanner(patch.banner), updatedBy));
  }
  if (patch.social !== undefined) {
    writes.push(saveSetting(KEYS.social, normaliseSocial(patch.social), updatedBy));
  }
  if (patch.visitors !== undefined) {
    writes.push(saveSetting(KEYS.visitors, normaliseVisitors(patch.visitors), updatedBy));
  }
  if (patch.theme !== undefined) {
    const incoming = isObject(patch.theme) ? patch.theme : {};
    writes.push(
      saveSetting(
        KEYS.theme,
        normaliseTheme({
          ...current.theme,
          ...incoming,
          // Only the draft palette can be edited here; publishing is explicit.
          published: current.theme.published,
          publishedAt: current.theme.publishedAt,
          updatedAt: new Date().toISOString(),
        }),
        updatedBy
      )
    );
  }
  await Promise.all(writes);
  return getPublicSiteSettings();
}

/** Public payload: never leaks server credentials, only public ids. */
export function toPublicPayload(settings: PublicSiteSettings) {
  const { measurementId } = settings.visitors;
  return {
    brand: settings.brand,
    contact: settings.contact,
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
    // Only the published palette reaches the website and the workspace.
    theme: {
      colors: settings.theme.published,
      publishedAt: settings.theme.publishedAt,
    },
  };
}

/** Copy the working palette to the live palette and return the fresh settings. */
export async function publishTheme(updatedBy?: string) {
  const current = await getPublicSiteSettings();
  const publishedAt = new Date().toISOString();
  await saveSetting(
    KEYS.theme,
    { ...current.theme, published: current.theme.colors, publishedAt, updatedAt: publishedAt },
    updatedBy
  );
  return getPublicSiteSettings();
}
