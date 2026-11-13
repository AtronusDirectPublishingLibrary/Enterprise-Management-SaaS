import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadSiteSettings } from "./siteSettings";

/**
 * The platform palette lives in one place: these tokens. Every component reads
 * the CSS variables below, so publishing a palette in Settings updates the
 * public website, the workspace shell, tabs, forms, tables and print styles
 * without touching a component.
 */
export const THEME_TOKENS = [
  {
    key: "primary",
    cssVar: "--brand-primary",
    label: "Primary brand",
    group: "Brand",
    defaultValue: "#0B2545",
    usage: "Header, sidebar, table heads, primary buttons, headings and links.",
  },
  {
    key: "primaryDark",
    cssVar: "--brand-primary-dark",
    label: "Primary deep",
    group: "Brand",
    defaultValue: "#081a30",
    usage: "Gradients behind the header, buttons and the login screen.",
  },
  {
    key: "secondary",
    cssVar: "--brand-secondary",
    label: "Secondary (gold)",
    group: "Brand",
    defaultValue: "#C9A227",
    usage: "Accents, active pills, focus highlights and chart series.",
  },
  {
    key: "secondaryDeep",
    cssVar: "--brand-secondary-deep",
    label: "Secondary ink",
    group: "Brand",
    defaultValue: "#8a6a12",
    usage: "Gold text that must stay readable on white or cream.",
  },
  {
    key: "secondarySoft",
    cssVar: "--brand-secondary-soft",
    label: "Secondary soft",
    group: "Brand",
    defaultValue: "#e8c766",
    usage: "Icons and labels drawn on top of the primary colour.",
  },
  {
    key: "accent",
    cssVar: "--brand-accent",
    label: "Accent",
    group: "Brand",
    defaultValue: "#6B2D2D",
    usage: "Secondary call-to-action buttons and editorial highlights.",
  },
  {
    key: "accentDeep",
    cssVar: "--brand-accent-deep",
    label: "Accent deep",
    group: "Brand",
    defaultValue: "#8a3a3a",
    usage: "Accent button gradient and hover states.",
  },
  {
    key: "background",
    cssVar: "--brand-bg",
    label: "Workspace background",
    group: "Surfaces",
    defaultValue: "#F5F2EA",
    usage: "App canvas behind every page, table and card.",
  },
  {
    key: "surface",
    cssVar: "--brand-surface",
    label: "Surface",
    group: "Surfaces",
    defaultValue: "#FFFFFF",
    usage: "Cards, modals, inputs and table rows.",
  },
  {
    key: "canvas",
    cssVar: "--brand-canvas",
    label: "Public canvas",
    group: "Surfaces",
    defaultValue: "#418acf",
    usage: "Backdrop behind hero imagery on the public website.",
  },
  {
    key: "text",
    cssVar: "--brand-text",
    label: "Body text",
    group: "Text",
    defaultValue: "#1A1A1A",
    usage: "Default copy colour across the website and the workspace.",
  },
  {
    key: "muted",
    cssVar: "--brand-muted",
    label: "Muted text",
    group: "Text",
    defaultValue: "#6c757d",
    usage: "Secondary labels, helper text, timestamps and empty states.",
  },
  {
    key: "success",
    cssVar: "--brand-success",
    label: "Success",
    group: "Semantic",
    defaultValue: "#2ecc71",
    usage: "Completed statuses, positive deltas and success alerts.",
  },
  {
    key: "warning",
    cssVar: "--brand-warning",
    label: "Warning",
    group: "Semantic",
    defaultValue: "#f39c12",
    usage: "In-progress, at-risk and pending states.",
  },
  {
    key: "danger",
    cssVar: "--brand-danger",
    label: "Danger",
    group: "Semantic",
    defaultValue: "#e74c3c",
    usage: "Overdue, failed and destructive actions.",
  },
  {
    key: "info",
    cssVar: "--brand-info",
    label: "Info",
    group: "Semantic",
    defaultValue: "#3498db",
    usage: "Planning state, neutral notices and informational chips.",
  },
];

export const DEFAULT_COLORS = Object.fromEntries(THEME_TOKENS.map((token) => [token.key, token.defaultValue]));

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(value) {
  return HEX.test(String(value || "").trim());
}

/** Apply a palette to the document root; unknown or invalid values are ignored. */
export function applyThemeColors(colors, root = typeof document !== "undefined" ? document.documentElement : null) {
  if (!root) return;
  for (const token of THEME_TOKENS) {
    const value = colors?.[token.key];
    if (!isHex(value)) continue;
    root.style.setProperty(token.cssVar, value.trim().toUpperCase());
  }
}

function rgb(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return [0, 0, 0];
  return [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
}

export function relativeLuminance(hex) {
  const [r, g, b] = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function readableText(hex) {
  return relativeLuminance(hex) > 0.45 ? "#111111" : "#FFFFFF";
}

const ThemeContext = createContext({ colors: DEFAULT_COLORS, publishedAt: "", apply: () => undefined });

/**
 * Applies the published palette at boot and keeps it in sync with Settings.
 * A custom event lets the Settings screen preview colours live without writing
 * them to every visitor before the palette is approved and published.
 */
export function ThemeProvider({ children }) {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [publishedAt, setPublishedAt] = useState("");

  useEffect(() => {
    let alive = true;
    loadSiteSettings()
      .then((data) => {
        if (!alive) return;
        const next = { ...DEFAULT_COLORS, ...(data?.theme?.colors || {}) };
        setColors(next);
        setPublishedAt(data?.theme?.publishedAt || "");
        applyThemeColors(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback((next) => {
    if (!next) return;
    setColors((prev) => ({ ...prev, ...next }));
    applyThemeColors({ ...DEFAULT_COLORS, ...next });
  }, []);

  const value = useMemo(() => ({ colors, publishedAt, apply }), [colors, publishedAt, apply]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
