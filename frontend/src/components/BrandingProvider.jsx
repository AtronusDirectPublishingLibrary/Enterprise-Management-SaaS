import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const DEFAULTS = {
  "branding.primaryColor": "#0B2545",
  "branding.secondaryColor": "#C9A227",
  "branding.logoUrl": "",
  "branding.faviconUrl": "",
  "branding.orgName": "",
  "branding.orgNameAm": "",
  "branding.timezone": "Africa/Addis_Ababa",
  "branding.dateFormat": "DD/MM/YYYY",
};

const BrandingContext = createContext({
  settings: DEFAULTS,
  loading: false,
  refresh: async () => {},
});

function isHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim());
}

export function applyBranding(settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = settings?.["branding.primaryColor"];
  const secondary = settings?.["branding.secondaryColor"];
  if (isHex(primary)) {
    root.style.setProperty("--brand-primary", primary.toUpperCase());
    root.style.setProperty("--brand-primary-dark", primary.toUpperCase());
  }
  if (isHex(secondary)) {
    root.style.setProperty("--brand-secondary", secondary.toUpperCase());
  }
  const favicon = settings?.["branding.faviconUrl"];
  if (favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }
  const org = settings?.["branding.orgName"];
  if (org) document.title = `${org} | BEMS`;
}

export function BrandingProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!user) {
      setSettings(DEFAULTS);
      applyBranding(DEFAULTS);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/tenant/settings");
      const next = { ...DEFAULTS, ...(res?.settings || {}) };
      setSettings(next);
      applyBranding(next);
    } catch {
      // keep defaults on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.tenantId, user?.username]);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
