# External integrations and deployment hardening

The application is usable without these services. Each section states what is
implemented, what must be supplied by the deployment, and how to verify it.
Nothing here should be treated as configured until the verification passes.

## Virus scanning (ClamAV)

Implemented: `backend/src/lib/fileScan.ts` checks file signatures and streams
disk uploads to ClamAV. Configure:

```dotenv
CLAMAV_HOST=clamav.internal
CLAMAV_PORT=3310
UPLOAD_SCAN_REQUIRED=true
```

The ClamAV daemon must be reachable from the API and its signature database
must update automatically. Verify by uploading an EICAR test file through a
non-production account: the response must be HTTP 400 and the file must not
remain on disk. Also test with the daemon stopped; with
`UPLOAD_SCAN_REQUIRED=true`, uploads must fail closed.

## SSO / OIDC and SCIM

Current authentication is local username/password with optional TOTP, one-time
recovery codes and passkeys. To add corporate SSO, deploy an OIDC adapter with
these controls:

- Authorization Code + PKCE; no implicit flow.
- Validate issuer, audience, signature, expiry and nonce server-side.
- Map a stable IdP subject to a local user; do not auto-create privileged
  accounts from email claims.
- Keep local break-glass admin access, stored offline.
- SCIM provisioning must be authenticated, rate-limited and audited; deactivate
  users rather than deleting their historical records.
- Test: signed-out access, successful callback, session expiry, revoked IdP
  user, wrong issuer/audience, and two-account isolation.

No provider credentials are present in this repository, so no SSO endpoint is
advertised as working.

## Passkeys / WebAuthn

Passkeys are implemented with registration and authentication ceremonies,
server-side single-use challenges, credential counters, multiple devices,
removal and audit events. They are disabled until the deployment supplies:

```dotenv
PASSKEYS_ENABLED=true
WEBAUTHN_RP_ID=ems.example.org
WEBAUTHN_ORIGIN=https://ems.example.org
```

Production enables them automatically when the RP values are present. The
origin must exactly match the browser address, and the RP ID must be its
hostname (or a registrable parent). Test on the real HTTPS origin: add a device,
sign out, sign in with the passkey, remove it, then confirm password + TOTP still
works. Keep password authentication as the fallback; recovery codes are only
for authenticator-app login and should be stored separately.

## Redis-backed distributed limits and cache

The current rate limiter and job leases are process/database based. For a
multi-region deployment, put a shared limiter (for example Redis with a sliding
window) in front of authentication and public write endpoints. The database job
lease already prevents duplicate scheduled jobs and can remain the source of
truth. Test by sending concurrent login attempts from two instances and
confirming one shared threshold.

## Object storage (S3-compatible / R2)

Files currently live on the API host. For horizontal scaling:

- Store objects in a private bucket; keep only object keys in PostgreSQL.
- Use server-side encryption and a lifecycle/retention policy.
- Serve downloads through authenticated API routes or short-lived signed URLs.
- Keep the local-disk adapter as a development fallback only.
- Migrate existing files with a checksum manifest, then verify counts and
  hashes before deleting the source.
- Test: unauthorised key access, signed URL expiry, large upload, delete,
  restore from backup, and malware scanning before commit.

## SIEM, WAF and monitoring

Send structured API logs (request ID, user, route, status, latency) and audit
events to the organization's SIEM. Put a WAF in front of the public origin with
managed OWASP rules, bot protection and rate limits. Alert on: repeated login
failures, audit verification failure, checkpoint failure, scanner unavailable,
database readiness failure, backup failure and unusual export volume.

## RFC 3161 external timestamps

HMAC exports and Ed25519 checkpoints are implemented. If the Quality Unit
requires a trusted timestamp authority, submit the checkpoint payload digest to
a TSA and store the returned token alongside the checkpoint. Verify the token
with the TSA certificate chain during audits. TSA credentials/endpoints are a
deployment decision and are not bundled.

## Email deliverability

Set SPF, DKIM and DMARC for the sending domain. Keep the SMTP account
least-privilege and rotate credentials. Verify that failed delivery is visible
to administrators and does not silently mark reminders as sent.

## Security testing

Commission an independent penetration test before first production use and
after material changes. Scope must include authentication, session revocation,
authorization bypass, file upload, CSRF/CORS, injection, audit tampering and
infrastructure configuration. Track findings to closure and retain the report
as validation evidence.
