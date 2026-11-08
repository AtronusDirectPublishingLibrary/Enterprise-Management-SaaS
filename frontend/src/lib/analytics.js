/**
 * Google Analytics 4 bootstrap for the public site.
 *
 * The measurement id is managed from the admin panel. When it is empty nothing
 * is loaded; when it is set, gtag.js loads once and each route change is sent as
 * a page_view so GA4 totals match what visitors actually browse.
 */

import { API_BASE } from "./api";

let loadedMeasurementId = null;

export function initAnalytics(measurementId) {
  if (!measurementId || typeof window === "undefined") return;
  if (loadedMeasurementId === measurementId) return;
  loadedMeasurementId = measurementId;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  // Page views are sent explicitly on each route change.
  window.gtag("config", measurementId, { send_page_view: false });

  const existing = document.querySelector(`script[data-ga4="${measurementId}"]`);
  if (existing) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.ga4 = measurementId;
  document.head.appendChild(script);
}

export function trackPageView(pathname) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (!loadedMeasurementId) return;
  window.gtag("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** One visit row per session, used by the counter until GA4 is configured. */
export function logVisitOnce() {
  if (typeof window === "undefined") return;
  const key = "ebpe_visit_logged";
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  fetch(`${API_BASE}/visitors/log`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}
