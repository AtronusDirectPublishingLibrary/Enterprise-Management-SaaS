# State-of-the-Art Roadmap & Hardening Status (BEMS SaaS)

Tracks recommended hardening/maturity work.  
**Legend:** **Done (in-repo)** = implemented or scaffolded in code/config/docs here and verified where noted. **Partial** = meaningful progress but incomplete. **Requires infra/migration/decision** = needs external systems, staged DB rollout, product/billing choices, or environment provisioning to be production-complete.

## Implemented in-repo (this hardening pass)

### Enterprise modules (priority-order MVPs)
- **Status: implemented in-repo as MVPs (tenant-scoped + module-gated).** Added models/APIs/pages/routes/nav/access for recommended modules not previously present:
  - **Tier 1:** Procurement & Vendor Management (`/api/procurement`, `/procurement`) — vendors, purchase orders/items; Inventory & WMS (`/api/warehouse`, `/warehouse`) — warehouses, items, stock movements; Accounting GL/AP/AR (`/api/accounting`, `/accounting`) — accounts, journals, AP bills, AR invoices; Asset & Maintenance EAM/CMMS (`/api/maintenance`, `/maintenance`) — assets, work orders.
  - **Tier 2:** CRM & Sales/Orders (`/api/crm`, `/crm`) — accounts, contacts, deals, sales orders; External Portals (`/api/external-portals`, `/external-portals`) — customer/partner/vendor requests; Helpdesk & ITSM (`/api/helpdesk`, `/helpdesk`) — tickets; DMS & Records (`/api/dms`, `/dms`) — records/version/status/retention.
  - **Tier 3:** GRC/Risk & Audit (`/api/grc`, `/grc`) — risks, compliance controls, audit findings; BI & Advanced Analytics (`/api/bi`, `/bi`) — report catalog; Resource & Capacity (`/api/resources`, `/resources`) — allocations; Contracts & Legal (`/api/contracts`, `/contracts`) — contract records; EHS/Safety (`/api/ehs`, `/ehs`) — incidents/hazards.
- **Integration:** Prisma models synced (`db push`), centralized tenant middleware scoping, `requireAccess` module gating, module aliases/registration options, frontend routes/nav/PATH_ACCESS/position access updated. *MVP scope: core CRUD/workflow basics; extend with deeper domain workflows, integrations, approvals, and analytics as needed.*

### Security & isolation
- **Impersonation hardening:** 1-hour impersonation JWTs + matching 1h session cookie for platform impersonation and platform-admin cross-tenant switch; audited with tenant/slug/reason/via (`PLATFORM_IMPERSONATION`).  
  - `backend/src/lib/jwt.ts`, `backend/src/routes/portals.ts`, `backend/src/routes/auth.ts`
- **DB RLS artifacts (foundation):** generated RLS enable/policy SQL for tenant-scoped tables + generator script. Review and apply only with app-side `SET LOCAL app.tenant_id` / `app.bypass_rls` integration and staged validation.  
  - `docs/rls-tenant-policies.sql`, `backend/scripts/generate-rls.ts` (**not auto-applied**)
- **Existing protections retained:** centralized Prisma tenant scoping + fail-closed (`TENANT_SCOPE_REQUIRED`), tenant status enforcement (ACTIVE/TRIAL), backend+frontend module gating, reserved/normalized slugs, CSRF double-submit with client auto-retry, auth/registration rate limiting, audited auth/platform events, protected first tenant (`ethio-biopharma`).

### Tenant correctness & jobs
- **Tenant-aware job execution:** `runPerTenant` helper; plan-alerts job runs per active tenant.  
  - `backend/src/lib/tenantJobs.ts`, `backend/src/index.ts`
- **Tenant attribution:** `PlanAlert`/`Notification`/`PlanAlertMail` stamped with plan `tenantId` in `runPlanAlerts`.  
  - `backend/src/lib/planAlerts.ts`
- **Attribution backfill helper:** best-effort SQL backfill for inferable records (alerts/mails from plan).  
  - `backend/scripts/backfill-tenant-attribution.ts`

### Observability & ops foundations
- **Structured request logging:** JSON logs with requestId/tenantId/user/method/path/status/latency.  
  - `backend/src/middleware/requestLogger.ts` (wired in `backend/src/index.ts`)

### Data lifecycle & SaaS scaffolding
- **Tenant export (summary, audited):** tenant-scoped export endpoint, extendable for full/streaming/compliance exports.  
  - `backend/src/routes/tenantExport.ts` (`GET /api/tenant/export`)
- **Billing/subscription scaffolding:** subscription summary, platform admin subscription/status update hook (protects first tenant), provider-agnostic webhook stub.  
  - `backend/src/routes/billing.ts` (`/api/billing/*`)

### Testing & CI scaffolding
- **DB-backed isolation smoke test:** validates tenant-scoped reads, cross-tenant lookup blocking, and fail-closed behavior.  
  - `backend/scripts/test-tenant-isolation.ts` (`npx ts-node --transpile-only scripts/test-tenant-isolation.ts`)
- **CI workflow scaffold:** backend (install/generate/tsc/test/audit) + frontend (install/build), with commented DB-integration isolation job template.  
  - `.github/workflows/ci.yml`
- **E2E scaffold:** Playwright config + smoke specs for public/platform/register pages (expand to authenticated critical flows).  
  - `frontend/playwright.config.js`, `frontend/e2e/smoke.spec.js`

### Verification (this pass)
- `backend`: `npx tsc --noEmit` **PASS**
- `frontend`: `npx vite build` **PASS** (pre-existing chunk warnings)
- Isolation smoke test (live DB): **PASS** (`cross-tenant lookup must not resolve`, `fail closed without tenant context`)

## Status of remaining recommendations

| Recommendation | Status | Remaining work / dependency |
|---|---|---|
| DB-level RLS across all tenant data | Partial (artifacts ready) | Integrate app-side session vars for Prisma (per-request/tx), apply `docs/rls-tenant-policies.sql` in staged migrations with backups, validate all read/write/raw paths and platform bypass. **Schema-sensitive.** |
| Raw-query & job tenancy audit | Partial | Inventory/fix any raw SQL and refactor remaining jobs (HR/QMS/report schedules/period lifecycle/social/audit ops) for per-tenant context & attribution; add guardrails/tests. |
| Per-tenant audit-chain/verify/export integrity | Not complete | Partition/attribute audit hash-chain, checkpoints, verification, and exports per tenant; migrate/backfill carefully. **Domain/schema-sensitive.** |
| Session/auth hardening beyond impersonation TTL | Partial | Refresh/rotation, device/session revocation, require impersonation reason in UI, anomaly alerts, production CSP/CORS/cookie/abuse review. |
| Data model: DB↔Prisma alignment, uniqueness/sequences, `*Many` semantics, module-map coverage | Not complete | Targeted schema/app changes with migrations and tests; full module-mapping audit across UI/API. |
| Automated isolation/E2E/CI gates (production-grade) | Partial (scaffolded) | Expand unit/integration/E2E coverage, seed/test DB strategy, wire isolation+E2E into CI with services/env/secrets; enforce merge gates. **Requires CI env & test infra.** |
| Observability, SLOs, DR/ops | Partial (logging foundation) | Metrics/tracing/APM integration, dashboards/alerts, job idempotency/retries/DLQ, encrypted backups + PITR + restore drills, retention/export/erasure workflows. **Requires ops/monitoring infra.** |
| Billing, usage enforcement, tenant lifecycle | Partial (scaffolding) | Integrate provider (e.g. Stripe): checkout/portal, signed webhooks, plan/seat/storage enforcement, proration/past-due/suspension/reactivation; domains and governed offboarding/purge. **Requires billing provider, keys, webhooks, product decisions.** |
| Scale (schema/db-per-tenant, replicas, caching) | Not started | Driven by load/compliance; implement tenant-keyed caching, read replicas, or isolation tiering when needed. **Architecture/infra decision.** |

## Execution guidance
1. **Apply RLS safely:** backup → add Prisma/request hooks to set `app.tenant_id`/`app.bypass_rls` → apply policies in stages (high-risk tables first) → run isolation tests + regression checks.
2. **Close tenancy gaps:** per-tenant job refactors, raw-query audit, tenantId backfills, and audit-chain partitioning (with migration plan).
3. **Make CI real:** provision test DB/service, secrets, and Playwright deps; gate merges on tsc/build/tests/isolation/E2E.
4. **Ops maturity:** deploy logging to aggregator + metrics/alerts; automate backups and rehearse restore/DR.
5. **Commercial SaaS:** complete billing-provider integration and server-side entitlement enforcement before production monetization.

> External dependencies not provisioned in this workspace: payment provider accounts/keys/webhooks, CI runner secrets/services, APM/log/metrics backends, browser E2E runtime in CI, and production domain/DNS/TLS/secret management. These must be configured per environment.