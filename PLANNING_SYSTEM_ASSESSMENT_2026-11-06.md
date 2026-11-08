# EBPE Planning System — Assessment, Gap Analysis and Recommendations

**Date:** 6 November 2026
**Scope:** the application in this repository (`C:\Ethio-bioharma-main`)
**Reference material:** EBPE Annual Plan 2019 EFY (v1.2, Aug 2026), Consolidated Detailed Activities Annex (xlsx), Strategic Plan 2026–2030, Strategic Roadmap 2026–2035, RFQ for Corporate Website Development (4 Nov 2026)

---

## 1. Verdict at a glance

| Dimension | Status | Summary |
|---|---|---|
| Planning hierarchy (Roadmap → Strategic → Annual) | **Built** | Parent/child plan linkage, roll-up completion, alignment links exist |
| Governance workflow (review, approve, publish, revision) | **Built** | Draft → In Review → Approved → Active → Closed, immutable revision snapshots |
| KPI / actuals / alerts / reporting deadlines | **Built (thin data)** | Engine works; almost no data behind it |
| **Perpetual period management (your core ask)** | **Not built** | Periods are free-text labels. Nothing creates, activates, closes or hands over a period automatically |
| Fidelity to the attached plans | **~20–25%** | 49 plan items in the database vs. several hundred activities in the Annex; no sub-activities, no monthly phasing, no funding split, no KPI readings |
| RFQ §5 website requirements | **~45%** | Public site exists but misses bilingual URLs, SEO infrastructure, real analytics, scheduled publishing, 2FA, offsite backups, Core Web Vitals evidence |
| Security posture | **2 critical defects** | Hard-coded login bypass; JWT also returned in the response body |
| Broken write paths | **2 confirmed** | Bilingual news cannot be saved; item budget edited in the UI is silently discarded |

**Bottom line:** as a *planning system* the app is architecturally ahead of anything the RFQ asks for — the RFQ only procures a CMS website and says nothing about planning, KPIs, approvals or roll-ups. As *the website the RFQ describes*, it is roughly halfway there. And on the specific capability you want — a system that keeps generating and retiring Roadmap / Strategic Plan / Annual Plan periods forever — the current design cannot do it without manual re-entry each cycle, and it will silently serve stale plans as "current".

No code was changed for this assessment.

---

## 2. What the app already does that the RFQ does not even require

These are genuine differentiators; worth keeping and hardening rather than rebuilding.

1. **Three-level planning hierarchy** with a declared constraint (AOP → Strategic → Roadmap) and per-plan completion that rolls up from children (`backend/src/lib/planProgress.ts`).
2. **Cross-plan alignment**: a child item can be linked to a parent item, and its delivery blends into the parent's completion (`computeForPlan` → `linkedContributions`).
3. **Approval workflow with immutable revisions**: approve/publish writes a JSON snapshot (`snapshotPlan`, `plan_revision`), downloadable from the History tab.
4. **Bulk actuals entry** for a whole period in one call (`POST /plans/:planId/actuals`).
5. **Alert engine** with five rules — TARGET_MISSED, BEHIND_PACE, OVERDUE, DUE_SOON, REPORT_DUE — a 6-hour scheduler, dedupe keys and an email attempt ledger (`plan_alert_mail`).
6. **Reporting obligations** generated per cadence window (`reportWindows`, `POST /plans/:planId/reports/generate`).
7. **Share links**: tokenised read-only plan view, guest comments with unread counts, and an `.ics` feed of reporting deadlines.
8. **Board pack print view and CSV export.**

For a bid response, items 1–6 are strong evidence of "information architecture that can grow with EBPE" (RFQ objective 3) — but they belong to the PMS, not to the website being procured.

---

## 3. RFQ compliance — the corporate website requirements

The RFQ is a procurement document for a public website. Judged against it, section by section:

| RFQ | Requirement | Verdict | Evidence / gap |
|---|---|---|---|
| 4.2 | Sitemap, navigation, URL scheme | **Partial** | Routes exist (`App.jsx`); no published sitemap document, URLs are flat (`/about`, `/products`), no `/en/`, `/am/` |
| 5.1 | Modular pages, content/design separation, staging vs production | **Partial** | React components are modular; content is partly hard-coded in JSX (About, Products, Partners, Investors) rather than CMS-driven; one environment only |
| 5.2 | Responsive, intuitive nav, search on every page | **Partial** | Bootstrap responsive layout is fine; the search icon in `PublicLayout.jsx` has **no handler** — it is decorative |
| 5.3 | CMS: staff publish without developers, editor/administrator roles, **scheduled publishing**, media library with metadata/editing, visual editing with per-page SEO fields | **Partial** | News and Documents have CRUD; roles are admin / project_manager / viewer; **no scheduled publishing**, no media metadata/editing, no page builder, no per-page SEO fields, no draft preview |
| 5.4 | English + Amharic, independent per-language content, `/en/` `/am/` prefixes, tested script rendering | **Partial, currently broken** | Language is a client-side `localStorage` toggle (`lib/language.jsx`) with a hand-maintained `DB_DICT`; no URL prefixes, no `hreflang`, no Amharic fields on Plan/Hero/Document; **news bilingual save fails** (see §6) |
| 5.5 | HTTPS everywhere, strong passwords + **2FA**, patched stack, upload restriction **and malware scan**, CSP / X-Frame-Options / X-Content-Type-Options | **Partial** | Cookie is `httpOnly`+`sameSite=lax`+`secure` in production (good); helmet is applied to the API only, so the site itself has no CSP; uploads are extension-filtered, not scanned; no 2FA; no HTTP→HTTPS enforcement in app code |
| 5.6 | Editable meta titles/descriptions, XML sitemap, robots.txt, readable URLs, alt text, schema.org, canonical, Core Web Vitals "Good" | **Gap** | `react-helmet-async` sets titles client-side only; `frontend/public/` is **empty** (no robots.txt, no sitemap.xml); no structured data, no canonical, no alt-text field; SPA rendering means link previews and crawling are weak |
| 5.7 | GA4 with events for forms, downloads, video, outbound links; reporting view; user guide | **Gap** | `index.html` loads GA4 with the placeholder `G-XXXXXXXXXX`; `api.js` calls `window.gtag` opportunistically but no property is configured. Only the self-hosted visitor counter works |
| 5.8 | PageSpeed ≥80 mobile / ≥90 desktop, WebP, minified+cached assets, CDN | **Unverified** | Vite minifies, but there is no image pipeline, no measured baseline, no CDN config |
| 5.9 | Daily automated backups of files **and** database, stored off the primary server, restore documented and tested | **Partial** | `backup-db.ps1` dumps the DB only, to `C:\Ethiobiopharma-Backups` (same machine), with a hard-coded source path pointing at `C:\Ethiobiopharma-FullStack` — not this repository; no scheduler, no restore test, no file backup |
| 5.10 | Scale content, users, languages; scale hosting | **Partial** | Stateless API + Postgres scale horizontally, but uploads go to local disk (`backend/uploads`), which breaks on multi-instance hosting |
| 5.11 | Homepage, About (mandate/leadership/organogram), Products & Capabilities, News, Partners & Stakeholders, **Social media links**, Contact & inquiries, Document library | **Partial** | All routes exist; social links are absent (no Facebook/LinkedIn/YouTube/Telegram anywhere); leadership/organogram pages are static; live database currently holds **0 news items and 0 documents** |
| 4.8 / 6 | Documentation, CMS guide, two training sessions, full handover | **Gap** | README covers developer setup only; no CMS user guide, no analytics guide, no training material |
| 6 | Version-controlled code, staging environment, test reports, UAT record | **Partial** | Git repository and README exist; no staging environment, no test suite, no test/UAT reports |

**Interpretation:** if this repository is the deliverable against the RFQ, the bid would score well on technical approach and poorly on §5.4, §5.6, §5.7, §5.9 and the documentation deliverables. If it is an internal system to run EBPE's planning (the more likely intent, given the data), the RFQ is the wrong yardstick — use it instead as the specification for the *public* half and keep the planning engine as the differentiator.

---

## 4. Data fidelity against the attached documents

Live database snapshot (queried directly, 6 Nov 2026):

| Plan | Period label | Status | Items | Notes |
|---|---|---|---|---|
| Roadmap | `2026-2035` | Active, published | 19 | 5 phase nodes encoded as `MILESTONE`, 14 KPIs with **no targets** |
| Strategic | `2026-2030` | Active, published | 12 | 5 official pillars (correct names), 7 KPIs with 2 readings each, **no objectives/strategies under the pillars** |
| Annual | `2026/27 EFY` | Active, published | 18 | 7 objectives (MA.4.1–4.7) with correct budget totals, 7 KPIs with **0 readings**, 4 milestones |
| Totals | | | **49 items, 28 KPIs, 14 KPI readings, 0 alignment links, 0 reporting deadlines, 0 revisions** | |

### 4.1 Roadmap 2026–2035

Present: the five phases; the headline KPIs (groundbreaking, 16M doses, 55M doses, 40%→ market share, WHO PQ, 1000 jobs, export share).

Missing:
- **Phase → business unit → milestone structure.** In the source, each phase carries unit-level detail (Diagnostics/PPE construction Q1 2028, commercial launch Q4 2028, ShieldVax IQ/OQ Q1–Q3 2028, capacity 20%/30%/40%). In the app each phase is a single leaf `MILESTONE`.
- **Target years.** Roadmap KPIs have no `PlanKpiTarget` rows at all, so 2030/2032/2035 trajectories cannot be charted or reported.
- Workforce trajectory (200–250 by 2028, 400+ by 2030, 600+ by 2032, 1000+ by 2035) is not modelled as phased targets.
- Risk framework, funding model by phase, and the "critical success factors" are absent.

### 4.2 Strategic Plan 2026–2030

Present: the five pillars with their official names; seven headline KPIs with two readings each.

Missing:
- **SO1–SO5 strategic objectives** and their implementation schedule (the plan's §8). The pillars have no children, so no progress can roll up.
- The Monitoring & Evaluation KPI set from §15 (the source has many more than seven indicators).
- Financing architecture: USD 207M envelope, USD 81M secured, USD 126.04M gap, the cross-subsidisation rule, blended-finance instruments.
- Phase 1/Phase 2 phasing and the alignment map to AU Agenda 2063 / PAVMA.

### 4.3 Annual Plan 2019 EFY — the biggest fidelity gap

Present: seven major activities with correct ETB figures (7,067,531,108 / 2,565,634 / 5,920,049,523 / 49,154,260 / 4,503,000 / 4,376,200 / 67,478,000), seven KPIs, four milestones.

Missing, in order of reporting impact:

1. **The four-level cascade.** Source: Strategic Objective → Major Activity → Sub-Activity → Detailed Activity (Annex, `Gantt_Chart_detailed`). App: two levels (Objective → KPI/Milestone). The Annex's hundreds of activity rows are not represented.
2. **Funding source per line (EIH vs World Bank HEPRR).** This is the single most important reporting dimension in the workbook — the 54% / 45% split of ETB 13.12bn. `PlanItem` has one `budget` float and no source, so no funding report is possible.
3. **CAPEX / OPEX classification** (13.04bn vs 83.67M) — not modelled.
4. **Monthly phasing.** The Annex places each activity on a Jul-2026 → Jun-2027 month grid. The app only has `startDate`/`endDate`, so cash-flow curves and "what is due this month" cannot be derived.
5. **Responsible party as an organisational unit.** The plan assigns owners such as "Engineering Team", "HR manager", "PMO & CEO". The app stores a free-text username, with no department/organogram entity and no users other than `admin`.
6. **The KPI milestone ladder.** Source: each KPI has 3–8 rungs (e.g. Phase II preparation at 15% Sep-26, 35% Nov-26, 55% Dec-26, 65% Jan-27, 80% Feb-27, 90% Apr-27, 100% Jun-27), each with a due date and an owner. The app models a KPI as a target per period label — the rungs become unstructured strings, and `BEHIND_PACE` cannot align to them.
7. **Risk register** (8 risks, likelihood/impact, mitigation, owner) — no model.
8. **Stakeholder engagement framework** (11 stakeholders in 4 categories, mechanism per stakeholder) — no model.
9. **Leadership support requirements / assumptions / dependencies** — no model.
10. **Dual calendar labelling.** Source uses "FY 2019 E.C. (July 2026 – June 2027)"; the database stores `2026/27 EFY`. There is no EFY↔Gregorian conversion service, so Ethiopian fiscal year labels, quarter labels and board reporting dates cannot be generated reliably.
11. **Reporting obligations.** The plan commits to monthly senior-management and quarterly BoD/EIH reporting, yet there are **zero** `plan_report` rows and therefore zero REPORT_DUE alerts.

### 4.4 Consolidated Activities Annex (xlsx)

The workbook is the real system of record for activity, budget and schedule (sheets: `Gantt_Chart_detailed`, `Activity_Budget`, `Budget_Summary`, `CAPEX_Summary`, departmental `D_*` sheets, `Salary_Summary`).

The app has **no importer**, so every cycle the Organisation will either retype hundreds of rows or (as now) keep a reduced skeleton in the app and the real plan in Excel. That guarantees divergence. An importer is the highest-value data feature in the whole system — see §7, item B1.

---

## 5. Perpetual periods: how it works today and where it breaks

### 5.1 Current mechanics

- A "period" is **not an entity**. It is the string `Plan.periodLabel`, unique per `(type, periodLabel)` (`schema.prisma`, `@@unique([type, periodLabel])`).
- `GET /plans/periods` derives the period list from those strings.
- The only "current" logic is `pickCurrent()` in `routes/plans.ts`: a plan with `status = "Active"` whose dates contain today; otherwise **any** Active plan; otherwise the newest by start date.
- Becoming Active is manual (`PUT /plans/:id {status:"Active"}` or `POST /:planId/transition {action:"publish"}`), and doing so force-closes every other Active plan **of the same type** — including a different, legitimately parallel plan.
- `POST /:planId/duplicate` exists: it copies the item tree into a new label, but defaults to `keepDates:false` (all activity dates dropped), `copyActuals:false`, does **not** relabel KPI targets to the new period, does not carry the last actual into the baseline, does not link children, and does not record any predecessor/successor relationship.
- `POST /:planId/auto-align` links child items to parent items by matching `code` with `/^P\d+/`. Current strategic codes are `Pillar 1`…`Pillar 5`, AOP codes are `MA.4.x`. Nothing matches — the database confirms **0 alignment links**.

### 5.2 What happens at each boundary

| Date | Expected behaviour | Actual behaviour |
|---|---|---|
| 1 Jul 2027 (end of 2019 EFY) | Close AOP 2026/27; carry unfinished activities and re-based KPI targets into a FY 2027/28 draft | Nothing happens. AOP stays Active and published |
| Jul 2027 – Jun 2030 | Each year generates its successor | Manual creation only, with re-keyed targets |
| 1 Jan 2031 (end of Strategic Plan) | Close 2026–2030; create 2031–2035 successor, re-baselined from the last actuals | Strategic plan stays "Active" and keeps being served as current |
| 1 Jan 2036 (end of Roadmap) | Close 2026–2035; create 2036–2045 successor | Roadmap stays "Active" and is still shown as current |

Because of `pickCurrent`'s fallback to "newest Active", an expired plan is **never** demoted. The public home page will keep presenting a plan that ended years earlier as the current one. There is no archival label, no "superseded by", no warning.

### 5.3 Structural limits

1. One plan per `(type, label)` — you cannot run parallel annual plans (e.g. one per business unit, or a corporate AOP plus a ShieldVax project AOP).
2. No `supersedes` / `supersededBy` chain, so period history is a flat list of unrelated rows.
3. No parent-period containment check: an AOP can be linked to a strategic plan whose dates do not cover the AOP's fiscal year. This is exactly the mistake that will be made by hand at 2030.
4. No period state machine (`Planned → Preparing → Active → Closing → Closed → Archived`), so "Active" is being used to mean both "current" and "published".
5. No scheduler other than the alert job — nothing in `index.ts` touches plan dates.
6. No period-scoped KPI targets: readings are keyed by free-text label and sorted with `localeCompare`, which mis-orders "Q10" against "Q2" and "FY 2026/27" against "2027".
7. Closing a plan freezes nothing: items stay editable after `Closed`, and revisions are only taken on approve/publish.

---

## 6. Concrete defects found (fix before adding features)

| # | Severity | Defect | Location |
|---|---|---|---|
| 1 | **Critical** | Hard-coded login bypass: any account authenticates with `devbypass123!` | `backend/src/routes/auth.ts:35-39` |
| 2 | **High** | Login also returns the JWT in the response body, defeating the `httpOnly` cookie and exposing the session to any XSS | `backend/src/routes/auth.ts:52` |
| 3 | **High** | News create/update fail whenever the Amharic fields are sent (form always sends them): `titleAm`/`contentAm` are accepted by the route but do not exist in the `News` model | `routes/news.ts:18-31`, `schema.prisma` `model News` |
| 4 | **High** | Item **Budget** entered in the modal is never sent: `budget` is in form state, absent from `payload` | `frontend/src/components/PlanItemModal.jsx:33-95` |
| 5 | **High** | Auto-align can never match: regex expects `P1`, data holds `Pillar 1` / `MA.4.x` | `routes/plans.ts:1000-1006` |
| 6 | Medium | `pickCurrent` serves expired Active plans as current | `routes/plans.ts:48-60` |
| 7 | Medium | Duplicate loses schedule dates and keeps old KPI target labels | `routes/plans.ts:1012-1125` |
| 8 | Medium | GA4 is a placeholder (`G-XXXXXXXXXX`) — analytics silently collect nothing | `frontend/index.html:8-14` |
| 9 | Medium | Backup script points at a different checkout path and backs up the DB only | `backup-db.ps1:8` |
| 10 | Medium | No robots.txt / sitemap.xml; empty `frontend/public` | `frontend/public/` |
| 11 | Low | Navigation search icon has no handler | `layouts/PublicLayout.jsx` |
| 12 | Low | `_bak_colors`, `LandingPage_backup*.jsx`, encoding-damaged comment block in `schema.prisma` — clutter that will confuse handover | repo |

---

## 7. Recommended design: periods that renew themselves forever

### 7.1 Make the period a first-class entity

```prisma
model PlanningCycle {
  id             String  @id @default(cuid())
  name           String            // "EBPE corporate planning cycle"
  type           String            // ROADMAP | STRATEGIC | AOP
  cadenceMonths  Int               // 120 | 60 | 12
  anchorMonth    Int               // 7 (EFY starts in July)
  leadDays       Int               // days before end to prepare the successor
  carryForward   Json              // per-item-kind rollover policy
  isActive       Boolean @default(true)
  periods        PlanPeriod[]
}

model PlanPeriod {
  id             String  @id @default(cuid())
  cycleId        String
  type           String
  sequence       Int                 // 1, 2, 3 ... never reused
  label          String              // "2019 EFY"  (display)
  labelAlt       String?             // "2026/27"
  startDate      DateTime
  endDate        DateTime
  state          String @default("Planned") // Planned|Preparing|Active|Closing|Closed|Archived
  parentPeriodId String?             // AOP period -> strategic period -> roadmap period
  planId         String? @unique     // the plan materialised for this period
  preparedAt     DateTime?
  activatedAt    DateTime?
  closedAt       DateTime?
  @@unique([cycleId, sequence])
  @@unique([type, label])
}
```

`Plan` gains `periodId`, `supersedesPlanId`, `closedAt`, `frozenAt`; `PlanItem` gains `stableKey`, `fundingSources Json`, `costType`, `currency`, `responsibleUnit`, `carryForward Boolean`, `monthlyPhasing Json`; `PlanKpiTarget` gains `periodId` and `dueDate` (a foreign key, not a string).

### 7.2 Rules the engine must enforce

- **Cadence and nesting:** Roadmap = 120 months, contains two 60-month Strategic periods, each containing five 12-month AOP periods (EFY, July–June). Validate containment on every create/link; reject an AOP whose dates fall outside its strategic period.
- **One live plan per type and scope.** A partial unique index (`WHERE state='Active'`) replaces the current "close all others" behaviour, and scoping allows parallel AOPs (corporate / business unit) if EBPE ever needs them.
- **Successor chain.** Every period except the newest has a `successorId`; the chain is what makes "the current plan" a deterministic query rather than a heuristic.
- **Lead-time preparation.** 120 days before an AOP ends (180 for Strategic, 365 for Roadmap) the engine creates the successor as `Preparing`, from the template + carry-forward, and notifies the owner. Humans edit it; the engine only scaffolds.

### 7.3 Carry-forward matrix (the part that saves the work)

| Item kind | Copied | Reset | Carried forward |
|---|---|---|---|
| PILLAR / GOAL / OBJECTIVE / STRATEGY | Yes, full structure | progress, status | `stableKey`, owner, alignment link |
| ACTIVITY | Only if `status != Completed` (configurable) | dates → shifted by one period keeping month-of-year | `progress`, owner, `budget × indexation`, funding split |
| MILESTONE | Only pending ones | date shifted | owner, dependency |
| KPI | Yes, definition | `actual`/`currentValue` | **new baseline = last actual**; next rung of the strategic ladder becomes the annual target; labels re-keyed to the new period id |
| Reporting obligation | Regenerated | status | cadence, owner |

Plus: `POST /plans/:planId/rollover?dryRun=true` returns a diff (added / dropped / carried / re-based) for human approval before commit — never an unattended rewrite of an approved plan.

### 7.4 Scheduler

A daily `runPeriodLifecycle()` job next to the existing alert job in `index.ts`:

1. `Planned → Preparing` at `endDate − leadDays` (idempotent via a `PeriodTransition` ledger with a unique key).
2. `Preparing → Active` on `startDate` (or on approval), snapshotting the predecessor and marking it `Closing`.
3. `Closing → Closed` on `endDate`; freeze plan items; write a final revision; carry forward into the successor.
4. `Closed → Archived` when a successor is Active.
5. Notify owner + admins at every transition; surface a "period decision" card in the app (extend / shorten / replace), because reality does change — a strategic plan can be extended by a year or replaced early, and the model must record that as an explicit amendment rather than an edit.

### 7.5 UI

A **Planning Calendar** page (one screen): timeline of all periods across the three types, colour-coded by state, with the current period highlighted; a "Prepare next period" button on the period that is due; a successor/superseded-by badge in the plan header; and a Period section in the plan Settings tab (dates, cadence, parent period, carry-forward policy).

### 7.6 Acceptance tests for "perpetual"

- Freeze the clock at 2030-06-30, 2031-01-01, 2036-01-01 and 2045-12-31: exactly one Active plan per type, with a valid parent chain and a populated successor.
- Property test: for any date from 2026 to 2050, `GET /plans/public` returns the plan whose period contains that date — never an expired one.
- Rollover is idempotent (run twice → no duplicates), dry-run diff matches the committed diff, and a closed period is read-only.
- Nothing in the chain depends on a human remembering a fiscal year.

---

## 8. Recommendations to make the system state-of-the-art and dynamic

Ordered by value per unit of effort. P0 = correctness/security; P1 = the period engine and plan fidelity; P2 = intelligence and workflow; P3 = platform and public website.

### P0 — fix now (days)

1. Remove the `devbypass123!` login bypass and stop returning the JWT in the body.
2. Fix the News bilingual fields (add `titleAm`/`contentAm` columns, or drop them from UI and route) and re-test create/update.
3. Persist `budget` from the item modal; add a validation test that an entered budget survives a save.
4. Repair alignment (codes `P1…P5`, `SO1…SO5`, and a stable `stableKey` for code paths; align by key, not regex).
5. Make `pickCurrent` treat expired plans as expired, and label them "ended <date> — superseded" on the public page.
6. Generate the reporting calendar for the existing AOP (quarterly BoD/EIH, monthly management) — currently zero obligations.
7. Replace the GA4 placeholder with a real property, or remove it so nobody believes data is being collected.

### P1 — the period engine and plan fidelity (2–4 weeks)

8. Introduce `PlanningCycle` / `PlanPeriod` as above, backfill from the three existing plans (`2026/27 EFY` ↔ `2019 E.C.`), and switch KPI readings to `periodId`.
9. Implement the rollover engine + dry-run + transition ledger + daily scheduler (§7.3–7.4).
10. Add funding-source, CAPEX/OPEX, currency, responsible unit and monthly phasing to plan items; recompute the Annex totals as a regression test (13,118,732,359 ETB; EIH 7,189,400,368; WB 5,929,331,991).
11. Build the **Annex importer**: workbook → items + budgets + monthly phasing + funding split, with a mapping preview and an idempotent re-import (match on `stableKey`). This is what makes each new period cheap and keeps the app the system of record.
12. Model the KPI milestone ladder (threshold, due date, owner, evidence) so `BEHIND_PACE` is measured against the next rung rather than a pro-rata guess.
13. Add EFY↔Gregorian conversion (service + label generator) and use it everywhere a period label or quarter appears.

### P2 — dynamic intelligence and governance (1–2 quarters)

14. **Forecast-aware status**: linear/velocity projection of each KPI to period end; RAG (red/amber/green) with reasons, not just a percentage; confidence band once enough readings exist.
15. **Scenario planning**: clone a plan as a what-if, adjust targets/budgets, compare side by side; promote a scenario to the live plan with a revision record.
16. **Auto-narrative board pack**: the print view already renders; add generated commentary ("2 of 7 MAs behind pace; Phase II procurement is the critical path") driven by the alert engine's data.
17. **Risk register, stakeholder framework, assumptions/dependencies** as first-class models attached to plan items, so the Annual Plan's §7–§9 stop living in Word.
18. **Governance hardening**: role matrix (editor / approver / publisher / board reader), period freeze, digital sign-off with timestamp and reason, audit trail on every plan mutation (`audit_log` exists but is not used by plans), resolved-comment workflow.
19. **Target cascade assist**: when a new AOP is prepared, suggest each KPI's annual target from the strategic trajectory (pro-rata by phase weight) and show the strategic impact of accepting it.

### P3 — platform and public website (parallel track)

20. **Public site rendering**: prerender/SSG (or SSR) for the public routes so meta tags, Open Graph, Amharic pages and Core Web Vitals are real. A Vite SPA with client-side Helmet cannot satisfy RFQ §5.6 credibly.
21. **Bilingual by URL**: `/en/...` and `/am/...`, `hreflang`, per-content Amharic fields on News/Plan/Hero/Document, Amharic font bundled, and a translation status column so untranslated pages are visible.
22. **SEO infrastructure**: `sitemap.xml` generated from routes and content, `robots.txt`, canonical URLs, schema.org (`Organization`, `NewsArticle`, `JobPosting` if relevant), per-page editable meta fields in the CMS.
23. **CMS completion**: scheduled publishing (`publishAt`), draft preview, media library with metadata/alt text, replace the `DB_DICT` hack with real content translation.
24. **Security**: CSP and security headers on the site, 2FA for admins, malware scanning on uploads, object storage instead of local disk, rate limiting on public forms, dependency scanning in CI.
25. **Operations**: offsite daily backups (DB + uploads) with a tested restore, uptime/error monitoring, structured logs, staging environment, and a CI pipeline running type-check, unit tests and a Playwright smoke suite.
26. **Performance**: image pipeline (WebP/AVIF, responsive sizes), CDN, measured Lighthouse budgets checked in CI.

---

## 9. Suggested 90-day sequence

| Weeks | Focus | Outcome |
|---|---|---|
| 1 | P0 defects, security | Safe to demo; data entry trustworthy |
| 2–3 | Period model + backfill + scheduler | No more manual period resets; deterministic "current" |
| 3–5 | Rollover + Annex importer + funding fields | FY 2027/28 AOP prepared from the real data in one click |
| 5–7 | KPI ladder, EFY calendar, reporting calendar | Board reporting works out of the box |
| 7–10 | Public site rendering, bilingual URLs, SEO, real GA4 | RFQ §5.4/§5.6/§5.7 defensible |
| 10–13 | CMS completion, backups/monitoring, tests, docs | Handover-ready with evidence |

---

## 10. Appendix — what was inspected

- Documents: all five attachments, read in full (RFQ through §9 scoring table).
- Code: `backend/prisma/schema.prisma`; `backend/src/routes/plans.ts` (all 1,687 lines reviewed at the section level), `auth.ts`, `news.ts`, `forms.ts`, `upload.ts`, `lib/planProgress.ts`, `lib/planSettings.ts`, `lib/planAlerts.ts`, `lib/aopTemplate.ts`, `index.ts`; `frontend/src/App.jsx`, `layouts/PublicLayout.jsx`, `lib/language.jsx`, `pages/PlansPage.jsx`, `components/PlanItemModal.jsx`, `components/PlanEditor.jsx`, `index.html`, `backup-db.ps1`, `prisma/seed-plans.ts`.
- Live data: direct Prisma queries against the configured Postgres database (plan/item/KPI/report/alert/revision/share counts, item trees, code formats, news/documents counts). Read-only probes only.
