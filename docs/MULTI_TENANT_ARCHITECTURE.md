# Multi-Tenant Architecture (BEMS)

## Overview
Beshilo Enterprise Management System (BEMS) is a multi-tenant SaaS on a single PostgreSQL database with shared schema and row-level tenant scoping enforced in application middleware (`backend/src/lib/tenantMiddleware.ts`) plus tenant context propagation (`backend/src/lib/tenantContext.ts`, AsyncLocalStorage). Ethio-Biopharma (EB-EMS) is retained as the first tenant.

## Tenant Model
- `Tenant`: identity (`id`, `slug`, `name`, `legalName`), type (`PROFIT|NON_PROFIT`), status (`ACTIVE|TRIAL|SUSPENDED|CANCELLED|PAST_DUE`), subscription plan, module/profile fields (`industryType`, `orgSize`, `primaryMarket`, `currency`, `fiscalYearStart`, `languages`, `defaultTimezone`, `onboardingComplete`, `enabledModules`, `profile`), branding/settings via `TenantSetting`.
- `SubscriptionPlan`: pricing/limits and `enabledModules`/`defaultIndustries`.
- `TenantSetting`: key/value store for branding and onboarding defaults (`branding.*`, `onboarding.*`).
- `User`: belongs to a tenant, with `isTenantAdmin` and `isPlatformAdmin` flags.

## Isolation & Enforcement
- Every request runs in tenant context set by `requireAuth`/`optionalAuth` (`req.user.tenantId`, `req.tenant`).
- Prisma tenant middleware injects `tenantId` filters and rewrites unsafe operations; cross-tenant access fails closed (scoped reads return empty/not-found behavior at route level; writes constrained).
- Platform/system operations must explicitly run with platform bypass (`runAsPlatform`) for jobs, bootstrapping, and cross-tenant admin APIs.
- JWT/session carry `tenantId`; platform impersonation issues a tenant-scoped session marked with `impersonatingTenantId/impersonatedBy`.

## Module Gating
- Effective modules: `tenant.enabledModules` (if set) else plan `enabledModules` else allow-all for backward compatibility.
- Backend: enforced in `requireAccess` via `backend/src/lib/moduleGate.ts` (403 `MODULE_DISABLED`).
- Frontend: `enabledModules` in session/auth and mirrored in `frontend/src/lib/access.js` (`moduleEnabled`) for nav/route guards.

## Context-Responsive App
- `GET /api/portals/tenant-context/current` returns tenant profile, branding, modules, departments/roles/workflows/labels.
- Frontend `TenantContextProvider` loads context, applies CSS brand variables, and exposes labels/modules to UI (MainLayout/HomePage).

## Platform Admin
- Separate portal at `/platform/*` (dark UI) protected by `isPlatformAdmin` + `requirePlatformAdmin`.
- Capabilities: metrics, tenant list/detail, suspend/activate/soft-delete (with protections for first tenant), impersonation (audited), revenue, activity, support flags.
- First tenant `ethio-biopharma` is protected from suspension/deletion.

## Key Files
- Backend: `src/lib/tenantContext.ts`, `tenantMiddleware.ts`, `moduleGate.ts`, `tenantProfile.ts`, `platformAdmin.ts`, `routes/portals.ts`, `routes/auth.ts`, `middleware/auth.ts`.
- Frontend: `src/lib/tenantContext.jsx`, `labels.js`, `access.js`, `auth.jsx`, platform pages under `pages/platform/`, registration/onboarding under `pages/register/`.
