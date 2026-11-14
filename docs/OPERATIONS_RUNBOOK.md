# Operations runbook

## Service layout

- API: `backend/` (Express + Prisma), default `http://localhost:5000`
- Web: `frontend/` (Vite/React), default `http://localhost:5173`
- Database: PostgreSQL, database `ethiobiopharma_pms` in local development
- Readiness: `GET /api/ready` (executes `SELECT 1`)
- Liveness: `GET /api/health`

A load balancer must use `/api/ready`, not `/api/health`. A process that cannot
reach PostgreSQL is alive but not ready and must be removed from rotation.

## Deploy procedure

1. Back up the database and record the current application commit.
2. Install dependencies with the lockfile (`npm ci`).
3. Run `npx prisma generate`.
4. Run `npx prisma migrate deploy` (never `db push` in production).
5. Build: `npm run build` in `backend/`; `npm run build` in `frontend/`.
6. Start the API under a process supervisor. Send `SIGTERM` for a zero-downtime
   replacement; the server stops accepting connections, drains for up to 15
   seconds, disconnects Prisma and exits.
7. Verify `/api/ready` returns `200` and `/api/health` returns `200`.
8. Run the smoke check in `GXP_VALIDATION.md` (login, one read, one audited
   write, audit verify).

## Background jobs and multiple instances

All scheduled jobs claim a row in `job_lock` using `runExclusiveJob`. This makes
reminders, report delivery, retention, verification, checkpoints and social
queue processing safe when more than one API instance is running. A crashed
instance releases its claim when the lease expires (30 minutes by default, two
hours for slow jobs). Inspect the table during an incident:

```sql
SELECT name, locked_by, locked_until, updated_at FROM job_lock ORDER BY name;
```

To intentionally stop a job, set its `*_AUTORUN=false` variable and restart.
Do not delete a live lock unless the owning process is confirmed dead.

## Backup and restore

- `npm run backup` writes a `pg_dump` (or JSON fallback) under `BACKUP_DIR` and
  prunes files older than `BACKUP_RETENTION_DAYS`.
- Back up PostgreSQL **and** the uploads/storage directory. A database restore
  without files leaves broken document links.
- Encrypt backups at rest, restrict access to the backup account, and test a
  restore quarterly in a non-production environment.
- Restore order: database first, then files, then start the API and run
  `/api/ready` and `/api/audit/verify`.
- Audit retention is controlled by `AUDIT_RETENTION_DAYS` (0 keeps everything).
  Retention runs through the controlled maintenance function and is audited.

## Audit checkpoints and keys

Generate an Ed25519 key outside the application host where possible:

```bash
openssl genpkey -algorithm ED25519 -out audit-checkpoint.pem
openssl pkey -in audit-checkpoint.pem -pubout -out audit-checkpoint.pub.pem
```

Set `AUDIT_CHECKPOINT_PRIVATE_KEY` to the PEM contents in the secret store,
plus `AUDIT_CHECKPOINT_KEY_ID`. The public key is embedded in every checkpoint
so an auditor can verify it without access to the server. Rotate keys by
changing the key ID and private key; old checkpoints retain their public keys.
Keep the private key out of source control, database backups and logs.

## Two-factor and passkey support

- Production enforces MFA for privileged roles/positions by default. Set
  `MFA_ENFORCEMENT=optional` only with a documented exception.
- Users who lose an authenticator use a one-time recovery code. If they have
  none, an administrator uses **Users → key icon → reset**. This clears the
  authenticator, recovery codes and passkeys, increments the token version and
  ends existing sessions. Verify the person's identity before resetting.
- Passkeys require `WEBAUTHN_RP_ID` and an exact HTTPS
  `WEBAUTHN_ORIGIN`; the RP ID must be the site's hostname. Test on the real
  origin because localhost credentials do not transfer to production.
- Keep password + authenticator as the fallback even when passkeys are enabled.

## Login CAPTCHA (Cloudflare Turnstile)

Production startup fails if `TURNSTILE_SECRET_KEY` is missing. Confirm the
public site key is also available through `TURNSTILE_SITE_KEY` or the frontend
build's `VITE_TURNSTILE_SITE_KEY`. Set `TURNSTILE_ALLOWED_HOSTNAMES` to the exact
production hostname and keep `TURNSTILE_ACTION=login`. Test a missing token,
an invalid token and a valid token after deployment. Use
`TURNSTILE_ENABLED=false` only as a documented emergency exception; it removes
bot protection and should trigger a security review.

## Incident response

1. Record the request ID, UTC time and affected account from the response/log.
2. Preserve evidence before changing anything: database snapshot, API logs,
   audit range and relevant uploaded files.
3. If an account is compromised: disable it, increment its token version by
   using "sign out all sessions" / resetting the password, rotate any API keys
   the account could read, and review audit events.
4. If the audit chain fails verification: stop write traffic, preserve the
   database, identify the first broken id from `/api/audit/verify`, and follow
   the GxP deviation procedure. Do not "repair" hashes in place.
5. If malware is suspected: isolate the storage host, preserve the quarantined
   file, rotate credentials, and run a full ClamAV scan.
6. Notify the security owner and, where personal data is involved, follow the
   applicable data-protection notification timeline.

## Routine checks

| Frequency | Check |
| --- | --- |
| Every deploy | readiness, login, audit verify, build/test results |
| Daily | failed-login/lockout review, job-lock table, disk space, backup success |
| Weekly | audit checkpoint created and signature valid, dependency audit |
| Monthly | restore sample, access review, retention/export evidence |
| Quarterly | restore drill, key rotation review, vulnerability review |
| Annually | penetration test, DR exercise, GxP periodic review |
