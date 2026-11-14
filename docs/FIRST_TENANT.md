# First Tenant: Ethio-Biopharma

## Identity
- Tenant: **Ethio-Biopharma Enterprise**
- Slug: `ethio-biopharma` (reserved; alias `ethiobiopharma` normalized). ID: `tenant_default_ethio_biopharma` (preserved for compatibility).
- Status: `ACTIVE`, Type: `NON_PROFIT`, Plan: `ENTERPRISE`.
- Profile: industry `biopharma`, org size `large`, primary market `national`, fiscal year start `7` (July), currency `ETB`, languages `en,am`, timezone `Africa/Addis_Ababa`, onboardingComplete `true`.

## Seed
- Script: `backend/prisma/seed-first-tenant.ts` (`npm run seed:first-tenant` in backend).
- Idempotent: upserts tenant, links plan, promotes admin, and upserts onboarding/branding TenantSetting rows without destructive changes.
- Admin: `admin` set to `isTenantAdmin=true`, `isPlatformAdmin=true` (password unchanged by seed unless explicitly managed; local test env used `TestPass12345!` during S3/Cx verification).

## Protections & Behavior
- Treated as first/protected tenant in platform admin flows (cannot be suspended or deleted).
- Existing login/functionality preserved; tenant-scoped/branded login supported at `/org/ethio-biopharma/login`.
- Context-responsive UI and module gating apply; effective modules derive from tenant/plan config (allow-all fallback when unset, per architecture).

## Verification Notes
- Confirm seed idempotency by re-running without errors or unintended mutations.
- Validate login, dashboard, key modules, audit logging, and tenant isolation against other tenants (e.g. `tenant_b_test`).
