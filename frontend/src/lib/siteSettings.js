import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * Public-site settings (welcome banner, social links, visitor counter) are read
 * once per page load and shared between the layout, footer and home page.
 */

let cached = null;
let pending = null;

export function loadSiteSettings(force = false) {
  if (!force && cached) return Promise.resolve(cached);
  if (!force && pending) return pending;

  pending = api
    .get("/site-settings")
    .then((data) => {
      cached = data;
      pending = null;
      return data;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });

  return pending;
}

export function invalidateSiteSettings() {
  cached = null;
  pending = null;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(cached);

  useEffect(() => {
    let alive = true;
    loadSiteSettings()
      .then((data) => {
        if (alive) setSettings(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return settings;
}

export function useVisitorSummary(enabled) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setSummary(null);
      return undefined;
    }
    let alive = true;
    api
      .get("/visitors/summary")
      .then((data) => {
        if (alive && data && data.display !== false) setSummary(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);

  return summary;
}
