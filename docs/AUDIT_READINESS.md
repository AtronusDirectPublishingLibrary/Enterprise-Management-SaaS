# Audit readiness and access hardening

This document records the controls now in the platform and the remaining
operational decisions. It is written for system administrators and auditors.

## Tamper-evident audit chain

`audit_log` is append-only at the application and database level.

- Each new row carries a random `nonce`, a `chain_version`, the previous row's
  `event_hash` as `prev_hash`, and its own SHA-256 `event_hash`.
- The hash covers a canonical JSON document (sorted object keys), so a row
  cannot be altered without changing its hash.
- Appends are serialized with a PostgreSQL transaction advisory lock. This
  prevents two simultaneous requests from building on the same predecessor.
- `app.audit_maintenance = 'on'` is set only inside the retention transaction.
  A database trigger rejects all ordinary `UPDATE`, `DELETE` and `TRUNCATE`
  operations on `audit_log`.

### Verification

- `GET /api/audit/verify` requires an administrator or executive session,
  recalculates the chain, stores the result in `audit_verification`, and returns
  `valid`, `checkedCount`, `legacyCount`, `brokenAt`, `headHash` and
  `truncated`.
- A verification job runs shortly after boot and then daily. Disable it with
  `AUDIT_VERIFY_AUTORUN=false`.
- `truncated` is true when retention has removed the oldest rows or when the
  request starts from a later row. The first surviving hash becomes the anchor;
  a deletion in the middle of the chain is still detected.

### One-time backfill

Existing rows were null before the chain foundation. Run:

```bash
cd backend
npx ts-node scripts/backfill-audit-chain.ts
```

The command reports the number of rows updated, the new head hash, and a full
verification result. It is safe to rerun without `--force`; already-hashed rows
are skipped. `--force` rewrites existing hashes and is only valid before the
append-only trigger is installed (the current database already has the trigger).

## Signed evidence export

`GET /api/audit/export?from=...&to=...&limit=...` returns a JSON evidence file
with the records, range, head hash, generation metadata and an HMAC-SHA256
signature. The response is sent as a download and is not cached.

Required configuration:

```dotenv
AUDIT_EXPORT_SIGNING_KEY="<long random secret>"
AUDIT_EXPORT_KEY_ID="2026-primary"
```

Keep the signing key in the server secret store, not in source control. Rotate it
by adding a new key ID and retaining the old public verification procedure. An
export is capped at 20,000 rows; use a date range for larger periods. Requesting
a limit returns that many rows and sets `truncated` when more remain.

## Ed25519 checkpoints

When `AUDIT_CHECKPOINT_PRIVATE_KEY` is configured, the API creates a signed
checkpoint over the chain head. Before signing it re-verifies the complete
chain; a broken chain is refused with `409` rather than anchored.

- `POST /api/audit/checkpoints` creates one (administrator or executive only).
- `GET /api/audit/checkpoints` returns the latest 50 with a live signature
  verification flag, the public key and its SHA-256 fingerprint.
- The scheduled job runs daily when `AUDIT_CHECKPOINT_AUTORUN` is not `false`.
  Disable it by removing the key or setting the flag to `false`.
- The payload binds the version, UTC generation time, head id/hash and checked
  count. `previousHash` chains checkpoints together.
- Keep the private key outside the database and repository. Published public
  keys let an auditor verify an old checkpoint without server access.

## Session revocation

New tokens contain `tokenVersion`. Password changes and `POST
/api/auth/logout-all` increment it, so previously issued cookies stop working
on the next request. Tokens issued before this control was deployed have no
version and remain valid until expiry; a global sign-out or password change
revokes them as well.

## Login protection

- A login IP limiter allows five failed attempts per 15 minutes and twenty per
  hour. Successful logins do not count against the short window.
- An account locks for 15 minutes after five failed password or MFA attempts.
  The response is `423` with the lock time; the sixth request may also receive
  `429` from the IP limiter.
- Failed attempts, lockouts, CAPTCHA failures and successful logins are written
  to `audit_log` with IP, user agent and a reason. Passwords and tokens are
  never logged.
- MFA remains available. A valid MFA continuation does not need a second CAPTCHA
  token; the password stage is already gated.

### CAPTCHA configuration

```dotenv
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY="<Cloudflare Turnstile site key>"
TURNSTILE_SECRET_KEY="<Cloudflare Turnstile secret>"
TURNSTILE_ALLOWED_HOSTNAMES="ems.example.org"
TURNSTILE_ACTION=login
```

The frontend can use `VITE_TURNSTILE_SITE_KEY` at build time, or read the public
key from `GET /api/auth/login-config`. Production is fail-closed: the API refuses
to start without `TURNSTILE_SECRET_KEY` unless `TURNSTILE_ENABLED=false` is an
explicit, documented exception. Tokens are checked for the configured action,
allowed hostname and freshness in addition to Cloudflare's `success` flag. The
widget is hidden when no site key is available; a required-but-unconfigured
deployment shows a configuration error and disables sign-in rather than bypassing
the check.

## CSRF

Authenticated mutations require a double-submit token:

- `GET /api/auth/csrf` sets a readable `ep_csrf` cookie and returns the token.
- The browser sends the same value in `X-CSRF-Token`.
- The API compares the cookie and header in constant time. Requests without a
  session cookie are unaffected, so public application forms continue to work.
- The frontend fetches a fresh token and retries once when the session predates
  the cookie or another tab rotated it.

## Private file delivery

Public static delivery is limited to `avatars`, `brand`, `hero`, `media` and
`news`. Everything else is served by `GET /api/files/<path>`:

| File type | Rule |
| --- | --- |
| Public archive document | Public when it is active, public and not project-scoped |
| Internal archive/project document | Archive/document/PMS access, project manager or administrator |
| QMS controlled document | Owner, reviewer, approver or QMS workspace access |
| Staff document | The employee, HR, or an administrator |
| Applicant CV | Recruitment access, executive or administrator |
| Signature/initials image | Any authenticated staff member |

Downloads of restricted files are written to the audit trail with the file,
entity type and entity ID. Direct requests to `/uploads/staff-documents`,
`/uploads/signatures`, `/uploads/resumes`, `/uploads/documents` and `/uploads/qms`
return 404.

New uploads are written to `uploads/documents`, `uploads/qms` and
`uploads/news`. `scripts/migrate-private-files.ts` moves legacy root files and
updates their stored URLs.

## Error responses and headers

- Every response carries `X-Request-Id`; server errors return a generic
  `Internal server error` plus that ID in production. Development keeps the
  detailed message.
- Prisma unique/not-found/too-long errors are mapped to 409/404/400 without
  leaking SQL details.
- Helmet sets CSP, referrer, HSTS (production), frame and content-type
  protections. The CSP allows Turnstile and Cloudinary where required.
- `TRUST_PROXY=true` must be set only when a known reverse proxy sits in front
  of the API. It is required for correct IP-based rate limits and audit records.
- Production refuses to start without an explicit HTTPS `CORS_ORIGIN`, and
  rejects `*`.

## Remaining operational work

1. Decide the formal retention period and archival destination before running
   the retention job in production. The trigger permits deletes only through
   the maintenance transaction; it does not archive evidence.
2. Restrict the application database role so it cannot set
   `app.audit_maintenance` outside the retention transaction. The trigger is a
   defence-in-depth control, not a substitute for database permissions.
3. Have the auditor confirm the export key custody, signature verification
   procedure and whether WORM storage is required.
4. Extend atomic transactions and audit coupling to payroll import/approval,
   QMS create/approve/reject, and other multi-write workflows.
5. Add an outbox for external side effects (email, social publishing) where a
   database commit must not be followed by a lost message.
6. Provision an independent RFC 3161 timestamp authority if required by the
   Quality Unit, and store its token with each checkpoint.
7. Move private uploads to encrypted object storage with immutable retention
   where the record-retention policy requires WORM.
