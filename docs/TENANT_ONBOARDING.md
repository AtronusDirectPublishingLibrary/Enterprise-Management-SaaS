# Tenant Onboarding & Registration

## Registration Flow (`/register`, `/register/start`)
1. Organization: legal/display name, slug (availability checked via `/api/portals/check-slug`), type, country, contact email.
2. Industry & scale: industry type, org size, primary market, fiscal year start, currency (drives module/label/workflow defaults).
3. Structure: reporting levels and departments.
4. Modules: select enabled modules (defaults by industry).
5. Workflows: approval depth, primary language, leave types.
6. Admin account: first/last name, email, password.

Submission: `POST /api/portals/register` creates Tenant (TRIAL, onboardingComplete=false), admin User (tenant admin), and onboarding/branding TenantSetting rows from industry templates (`backend/src/lib/onboardingTemplates.ts`). Returns slug/login/onboarding URLs.

## Slug Rules
- Slugs normalized/slugified; reserved slugs blocked (`backend/src/lib/reservedSlugs.ts`, includes `ethio-biopharma`/`ethiobiopharma`).
- Availability endpoint: `GET /api/portals/check-slug?slug=...`.

## Onboarding Wizard (`/org/:slug/onboarding`)
- Steps: confirm structure/modules/workflows, branding (logo/colors/org name), optional invites, completion.
- APIs: `GET/POST /api/portals/onboarding/:tenantSlug`, `/step/:step`, `/complete` (persists to TenantSetting/tenant; marks `onboardingComplete=true`).
- App guard: authenticated users in a tenant with incomplete onboarding are redirected to onboarding until complete.

## Tenant Login
- Branded login: `/org/:slug/login` resolves context via `GET /api/portals/tenant-context?slug=...` (alias-aware).
- `POST /api/auth/login` accepts optional `slug`, validates tenant match (403 on mismatch, 404 unknown, 402 inactive subscription) and issues a tenant-scoped session.

## Industry Defaults
`backend/src/lib/onboardingTemplates.ts` provides departments, roles, suggested modules, workflow defaults (approval depth/leave types/language), and labels per industry (biopharma, manufacturing, healthcare, logistics, education, government, other) adjusted by org size.
