# Platform Admin Runbook

## Access
- Portal: `/platform/login` → `/platform/*` (Dashboard, Tenants, Tenant detail, Revenue, Activity, Support).
- Access control: user must have `isPlatformAdmin=true`. Backend enforced by `requirePlatformAdmin` on `/api/portals/platform/*`.
- UI is intentionally distinct (dark theme) from tenant app.

## Capabilities
- **Dashboard/Metrics:** totals (tenants, active, trials, MRR, 30d signups/churn), charts by industry/plan, recent activity.
- **Tenants:** list/search/filter by status/plan/industry; detail shows profile, onboarding/config, branding, users, recent audit.
- **Actions:** activate, suspend, soft-delete (CANCELLED, 30-day grace noted), impersonate tenant.
- **Impersonation:** `POST /api/portals/platform/tenants/:id/impersonate` issues tenant-scoped session (cookie/JWT) marked `impersonatingTenantId/impersonatedBy`, audited as `PLATFORM_IMPERSONATION`. UI shows banner with “Return to Platform”.
- **Revenue:** MRR/ARPU/churn summary and breakdowns.
- **Activity:** cross-tenant audit feed.
- **Support flags:** past-due, trials ending, onboarding incomplete (>7d), no login in 30d.

## Protections
- First tenant (`ethio-biopharma`) is protected: cannot be suspended or deleted (API rejects; UI disables).
- Destructive actions require confirmation in UI; soft-delete preferred over hard delete.

## Operational Notes
- Ensure platform admin users are explicitly flagged (`isPlatformAdmin=true`); initial seed promotes Ethio-Biopharma admin.
- Background jobs run under platform context (`runAsPlatform`) and may need tenant attribution follow-ups (see architecture notes).
- All platform actions should be audited; verify via Activity view and audit log.
