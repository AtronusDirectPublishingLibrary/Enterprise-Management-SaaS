/**
 * WebAuthn relying-party configuration. Passkeys stay disabled unless both an
 * RP ID and browser origin can be determined, so a misconfigured deployment
 * cannot accidentally accept credentials for the wrong origin.
 */
export function webauthnConfig() {
  const configuredOrigin = process.env.WEBAUTHN_ORIGIN || process.env.APP_PUBLIC_URL || process.env.CORS_ORIGIN || "";
  const origins = configuredOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try { return new URL(origin).origin; } catch { return ""; }
    })
    .filter(Boolean);
  let rpID = (process.env.WEBAUTHN_RP_ID || "").trim();
  if (!rpID && origins[0]) {
    try { rpID = new URL(origins[0]).hostname; } catch { /* invalid origin */ }
  }
  const configured = Boolean(rpID && origins.length);
  const enabled = configured && (
    process.env.PASSKEYS_ENABLED === "true" ||
    (process.env.NODE_ENV === "production" && process.env.PASSKEYS_ENABLED !== "false")
  );
  return {
    enabled,
    configured,
    rpID,
    origins,
    rpName: process.env.WEBAUTHN_RP_NAME || "Beshilo Enterprise Management System (BEMS)",
  };
}
