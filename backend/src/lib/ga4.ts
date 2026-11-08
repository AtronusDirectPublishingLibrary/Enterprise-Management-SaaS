import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Google Analytics 4 reader.
 *
 * The counters shown above the public footer come from the GA4 Data API when a
 * property id and a read-only service-account key are configured, and fall back
 * to the app's own visit log otherwise. Signing the service-account JWT by hand
 * keeps the backend free of the very large googleapis dependency.
 */

export type VisitorCounts = {
  today: number;
  month: number;
  year: number;
  allTime: number;
};

export type VisitorSummary = VisitorCounts & {
  source: "ga4" | "internal";
  measuredAt: string;
  measurementId?: string;
};

const CACHE_MS = 10 * 60 * 1000;
const GA4_ENDPOINT = "https://analyticsdata.googleapis.com/v1beta";

let summaryCache: { expires: number; value: VisitorSummary } | null = null;
let tokenCache: { expires: number; token: string } | null = null;

export function invalidateVisitorCache() {
  summaryCache = null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function readServiceAccount() {
  const clientEmail = (process.env.GA4_CLIENT_EMAIL || "").trim();
  const privateKey = (process.env.GA4_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

async function getAccessToken(): Promise<string | null> {
  const account = readServiceAccount();
  if (!account) return null;
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;

  const iat = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    })
  );

  let signature: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    signature = signer.sign(account.privateKey).toString("base64url");
  } catch (error) {
    console.error("[ga4] could not sign the service-account assertion", error);
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  if (!response.ok) {
    console.error("[ga4] token exchange failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) return null;

  tokenCache = {
    token: payload.access_token,
    expires: Date.now() + Math.max(60, (payload.expires_in || 3600) - 60) * 1000,
  };
  return tokenCache.token;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Splits GA4 rows across the ordered date ranges in the report request. */
function parseRangeValues(rows: any[], count: number): number[] {
  const values = new Array(count).fill(0);
  rows.forEach((row, index) => {
    const rangeDimension = (row?.dimensionValues || []).find((dimension: any) =>
      String(dimension?.value || "").startsWith("date_range_")
    );
    const rangeIndex = rangeDimension
      ? Number(String(rangeDimension.value).replace("date_range_", ""))
      : index;
    const value = Number(row?.metricValues?.[0]?.value || 0);
    if (Number.isFinite(rangeIndex) && rangeIndex >= 0 && rangeIndex < count) {
      values[rangeIndex] += Number.isFinite(value) ? value : 0;
    }
  });
  return values;
}

async function fetchGa4Counts(propertyId: string): Promise<VisitorSummary | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const response = await fetch(`${GA4_ENDPOINT}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [
        { startDate: "today", endDate: "today" },
        { startDate: isoDate(monthStart), endDate: "today" },
        { startDate: isoDate(yearStart), endDate: "today" },
        { startDate: "2015-01-01", endDate: "today" },
      ],
      metrics: [{ name: "totalUsers" }],
      keepEmptyRows: true,
    }),
  });

  if (!response.ok) {
    console.error("[ga4] runReport failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as { rows?: any[] };
  const [today, month, year, allTime] = parseRangeValues(payload.rows || [], 4);

  return {
    today,
    month,
    year,
    allTime,
    source: "ga4",
    measuredAt: new Date().toISOString(),
  };
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(): Date {
  const date = startOfToday();
  date.setDate(1);
  return date;
}

function startOfYear(): Date {
  const date = startOfToday();
  date.setMonth(0, 1);
  return date;
}

/**
 * Fallback used before GA4 credentials exist: the app's own visit log, one row
 * per visitor per day, so the totals stay meaningful.
 */
async function fetchInternalCounts(): Promise<VisitorSummary> {
  const [today, month, year, allTime] = await Promise.all([
    prisma.visitorLog.count({ where: { visitedAt: { gte: startOfToday() } } }),
    prisma.visitorLog.count({ where: { visitedAt: { gte: startOfMonth() } } }),
    prisma.visitorLog.count({ where: { visitedAt: { gte: startOfYear() } } }),
    prisma.visitorLog.count(),
  ]);

  return {
    today,
    month,
    year,
    allTime,
    source: "internal",
    measuredAt: new Date().toISOString(),
  };
}

export async function getVisitorSummary(settings: {
  propertyId: string;
  measurementId: string;
}): Promise<VisitorSummary> {
  if (summaryCache && summaryCache.expires > Date.now()) {
    return { ...summaryCache.value, measurementId: settings.measurementId || undefined };
  }

  let value: VisitorSummary | null = null;
  if (settings.propertyId) {
    try {
      value = await fetchGa4Counts(settings.propertyId);
    } catch (error) {
      console.error("[ga4] report request failed", error);
      value = null;
    }
  }
  if (!value) value = await fetchInternalCounts();

  summaryCache = { expires: Date.now() + CACHE_MS, value };
  return { ...value, measurementId: settings.measurementId || undefined };
}
