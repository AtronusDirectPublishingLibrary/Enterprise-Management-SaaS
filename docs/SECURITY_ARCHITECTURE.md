# Security architecture

This document describes the controls implemented in the application. It is a
living design record; deployment-specific infrastructure (identity provider,
reverse proxy, scanner, SIEM) is listed in `EXTERNAL_INTEGRATIONS.md`.

## Trust boundaries

1. **Browser** — untrusted. React escapes rendered text; the API still treats
   every query, body, path and uploaded file as hostile.
2. **API process** — Express/TypeScript. It owns authorization, validation,
   audit appends and file screening.
3. **PostgreSQL** — authoritative system of record. It is reachable only from
   the API network; it must not be exposed to the public internet.
4. **Object/file storage** — currently local disk behind authenticated API
   routes. Files are never served by a guessable public URL.
5. **External services** — SMTP, Turnstile, ClamAV, social APIs, GA4. Each is
   optional and fails closed or degrades explicitly.

## Identity and sessions

- Passwords are hashed with bcrypt (cost 12). Login is rate-limited and locks
  an account after repeated failures.
- JWTs are signed with `JWT_SECRET` and carried in an `HttpOnly`, `SameSite`
  cookie. `JWT_SECRET` must be at least 48 random bytes in production.
- Every new token carries `tokenVersion`. `requireAuth` compares it with the
  user row on each request. Password changes and `POST /api/auth/logout-all`
  increment the version, revoking every device immediately.
- Legacy tokens issued before token versioning remain valid until natural
  expiry; after the first global sign-out or password change they are rejected.
- Changing a password requires 12 characters and clears the current cookie so
  the client must authenticate again.
- TOTP MFA is available per user. MFA secrets are stored server-side and are
  never returned after enrolment. Enrolment issues ten one-time recovery codes,
  stored only as SHA-256 digests; a successful recovery-code login consumes the
  code and is audited.
- Production enforces MFA by default for privileged roles and positions
  (`MFA_ENFORCEMENT`). An unenrolled user is limited to the account-security and
  enrollment endpoints until they register an authenticator app. Passkeys are
  optional convenience and do not replace the authenticator/password fallback
  for enforced roles.
- Passkeys/WebAuthn are optional and enabled in production when
  `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` are configured. Registration and login
  require user verification, origin/RP checks and single-use server-side
  challenges. Passwords remain available as the fallback.
- Administrators can reset a user's authenticator, recovery codes and passkeys
  from Users. The reset increments the token version, ends existing sessions and
  is written to the audit trail.
- CSRF uses a double-submit cookie for state-changing requests. CORS accepts
  only configured origins (plus loopback in development).

## Authorization

`backend/src/lib/access.ts` is the single access matrix. Routes call
`requireAuth` and `requireAccess`/`requireRole`; the client-side matrix mirrors
this for navigation but is never trusted. Audit access is limited to admins,
executives, the Internal Audit Officer and the HR and Administration Manager.
Plan governance remains a two-office control (CEO and Strategy and Planning
Officer) with a documented technical-admin override.

## Input, transport and browser controls

- Zod validates request bodies; Prisma parameterises SQL. Raw SQL is limited to
  fixed statements such as the advisory lock and job-lock claim.
- Helmet sets CSP, HSTS in production, frame restrictions, referrer policy and
  `nosniff`. `x-powered-by` is disabled.
- JSON bodies are capped at 1 MB; upload limits are per route (2–512 MB for
  video). Request, header and keep-alive timeouts are configurable.
- A global 200 requests/minute limiter protects the API; authentication and
  public write routes have narrower limits.
- Cloudflare Turnstile protects the login password stage. Production requires
  the server secret at startup, validates the token's action, hostname and
  freshness, and fails closed if Cloudflare is unavailable. A missing secret
  cannot silently disable the check; `TURNSTILE_ENABLED=false` is an explicit
  deployment exception.
- `TRUST_PROXY` is off unless a known reverse proxy terminates TLS. This keeps
  client IPs trustworthy for rate limits and audit records.

## Audit trail

- Audit entries are appended inside a PostgreSQL transaction that holds an
  advisory lock. Each row commits the previous hash, a canonical JSON payload,
  a timestamp, a nonce and a SHA-256 event hash.
- `GET /api/audit/verify` recomputes the chain. Legacy rows (pre-chain) are
  reported separately instead of being silently accepted.
- A database trigger rejects updates and deletes on `audit_log`; retention uses
  the controlled maintenance function and is logged.
- Signed HMAC exports are available when `AUDIT_EXPORT_SIGNING_KEY` is set.
- Ed25519 checkpoints are available when
  `AUDIT_CHECKPOINT_PRIVATE_KEY` is set. `POST /api/audit/checkpoints` verifies
  the whole chain before signing its head; `GET /api/audit/checkpoints`
  verifies each signature and returns the public key and fingerprint. The
  private key never enters the database or the repository.
- Sensitive field changes (leave and payroll) are recorded in `FieldChange`
  with before/after values, actor, reason and timestamp.

## File uploads and delivery

- Uploads use random server-side names; the client filename is retained only
  as metadata.
- Allowlists restrict extensions (PDF/Word/images/CSV/video as appropriate).
- Every disk upload passes through `scanUploadedFile`, which checks the file
  signature against the extension and, when `CLAMAV_HOST` is configured,
  streams the file to ClamAV using INSTREAM. Infected or mismatched files are
  deleted and rejected.
- `UPLOAD_SCAN_REQUIRED=true` makes the scanner mandatory in production: if it
  is unavailable, uploads are refused rather than accepted unscreened.
- Downloads go through authenticated API routes with ownership/role checks.
  The public allowlist is limited to intentionally public assets.
- Uploaded files should live on encrypted storage with antivirus and backup
  policies; see the operations runbook.

## Error handling and logging

- Production responses do not expose stack traces or database errors.
- Every response has a request ID (`X-Request-Id`) for correlation.
- Security events (login success/failure, lockout, revocation, password change,
  MFA changes, file rejection) are written to the audit trail or server logs.
- Secrets are read from environment variables and are never returned by the API
  or committed. `.env` is ignored; `.env.example` contains placeholders only.

## Known deployment dependencies

The following are deliberately not simulated in code: SSO/OIDC and SCIM,
Redis-backed distributed rate limits, S3/R2 object storage, SIEM/WAF, external
RFC 3161 timestamping and independent penetration testing. Their integration
points and acceptance criteria are in `EXTERNAL_INTEGRATIONS.md`.
