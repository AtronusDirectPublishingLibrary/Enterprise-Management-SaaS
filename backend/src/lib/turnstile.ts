/**
 * Cloudflare Turnstile configuration and verification.
 *
 * Turnstile is optional in development. In production it is mandatory unless
 * TURNSTILE_ENABLED=false is set explicitly, so a missing secret cannot silently
 * remove the CAPTCHA from login.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function envFlag(value: string | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return null;
}

function allowedHostnames() {
  const direct = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (direct.length) return direct;

  const origins = [process.env.APP_PUBLIC_URL, process.env.CORS_ORIGIN]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const derived: string[] = [];
  for (const origin of origins) {
    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      if (hostname) derived.push(hostname);
    } catch { /* ignore malformed origins */ }
  }
  return [...new Set(derived)];
}

export function turnstileConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();
  const siteKey = (process.env.TURNSTILE_SITE_KEY || "").trim();
  const explicit = envFlag(process.env.TURNSTILE_ENABLED);
  // Production is secure-by-default. Development can opt in by supplying keys
  // or TURNSTILE_ENABLED=true.
  const enabled = explicit ?? (isProduction || Boolean(secret || siteKey));
  return {
    enabled,
    isProduction,
    secret,
    siteKey,
    hostnames: allowedHostnames(),
    action: (process.env.TURNSTILE_ACTION || "login").trim(),
    maxAgeSeconds: Math.max(60, Number(process.env.TURNSTILE_MAX_AGE_SECONDS) || 300),
  };
}

/** Called during startup; a production instance must not run half-configured. */
export function assertTurnstileProductionConfig() {
  const config = turnstileConfig();
  if (!config.enabled) return;
  if (!config.secret) {
    throw new Error(
      "TURNSTILE_SECRET_KEY is required in production. Set TURNSTILE_ENABLED=false only for an explicit, documented exception.",
    );
  }
  if (config.isProduction && !config.hostnames.length) {
    throw new Error(
      "TURNSTILE_ALLOWED_HOSTNAMES (or CORS_ORIGIN/APP_PUBLIC_URL) must identify the production site hostname.",
    );
  }
  if (!config.siteKey) {
    console.warn("[turnstile] TURNSTILE_SITE_KEY is empty; the frontend must provide VITE_TURNSTILE_SITE_KEY.");
  }
}

type SiteVerifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(token: string | undefined, ip: string) {
  const config = turnstileConfig();
  if (!config.enabled) return true;
  if (!config.secret || !token) return false;

  try {
    const body = new URLSearchParams({ secret: config.secret, response: token, remoteip: ip });
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5_000),
    });
    const payload = (await response.json()) as SiteVerifyResponse;
    if (!payload.success) {
      console.error("[turnstile] verification rejected", payload["error-codes"] || []);
      return false;
    }

    // Cloudflare returns the hostname and action for the widget. Reject a token
    // minted for another hostname or a different form.
    if (config.hostnames.length) {
      const hostname = String(payload.hostname || "").toLowerCase();
      if (!config.hostnames.includes(hostname)) {
        console.error(`[turnstile] rejected hostname ${hostname || "(missing)"}`);
        return false;
      }
    }
    if (config.action && payload.action !== config.action) {
      console.error(`[turnstile] rejected action ${payload.action || "(missing)"}`);
      return false;
    }
    if (payload.challenge_ts) {
      const issued = Date.parse(payload.challenge_ts);
      if (Number.isFinite(issued) && Date.now() - issued > (config.maxAgeSeconds + 60) * 1000) {
        console.error("[turnstile] rejected an expired challenge");
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("[turnstile] verification failed", error);
    return false;
  }
}
