# Ethio-Biopharma - Project Management System (PMS)

Full-stack PMS built with Express + TypeScript + Prisma + PostgreSQL on the backend,
Vite + React + Bootstrap on the frontend.

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Quick start

### Backend
```powershell
cd backend
npm install
copy .env.example .env   # then edit DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate deploy   # create/upgrade tables
npm run seed                # bootstrap admin user + demo data
npm run seed:ebpe           # rebuild Roadmap, Strategic Plan and Annual Plan from the source documents
npm run dev                 # starts on http://localhost:5000
```

> **Migration history.** `prisma/migrations` holds a single, verified baseline
> (`20261107000000_baseline`) that builds the complete current schema on an empty database.
> The earlier incremental migrations never reproduced the full schema (for example, `news` was
> created by `db push`, not by a migration), so they are preserved for reference in
> `prisma/migrations_legacy/` and are no longer applied. An existing database built from that old
> history should either be recreated, or marked as already baselined with
> `npx prisma migrate resolve --applied 20261107000000_baseline` before deploying.
>
> **One database per version.** This app and the earlier `Ethiobiopharma-FullStack`
> checkout use different schemas. Give each its own database name in `DATABASE_URL`
> (this app uses `ethiobiopharma_pms`); if they share one, a `prisma db push` from the
> other checkout will drop this schema's tables.

### Importing the Annex workbook

`npm run import:annex` attaches the consolidated Annex rows to MA.4.1–MA.4.7 as line
activities grouped by sub-activity, with owner, budget and the scheduled months from the
Gantt. It reads both the sectioned Gantt sheet (Objective → Major Activity → Sub-Activity →
cost lines, one column per month) and flat sheets with an explicit MA column, and reconciles
the workbook totals before writing anything:

```powershell
cd backend
npm run import:annex -- --file ..\docs\annex.xlsx --dry-run               # reconcile only
npm run import:annex -- --file ..\docs\annex.xlsx --replace-activities    # write the rows
```

If no `--sheet` is given it uses the worksheet with the most activity rows. The import is
idempotent: rows already present are skipped, so a re-run only adds what is missing.
`--replace-activities` first removes the narrative activities sitting directly under the seven
objectives (so the Annex becomes the single activity layer); the removed rows are written to
`prisma/backups/` first. Objective budgets, KPIs and milestones are never touched.

It refuses to write while the workbook total differs from ETB 13,118,732,359, or while any
MA's line total differs from that objective's budget beyond `--tolerance` (default 1 ETB, to
absorb the workbook's cents). `--allow-mismatch` overrides the guard, `--sheet <name>` picks a
specific worksheet and `--plan <periodLabel>` another annual period.

### Frontend (in a second terminal)
```powershell
cd frontend
npm install
npm run dev              # starts on http://localhost:5173
```

Open http://localhost:5173. See backend/prisma/seed.ts for the default admin credentials.

## Project layout
- backend/ - Express API (TypeScript)
- frontend/ - Vite + React SPA
- backend/prisma/schema.prisma - database schema
- backend/src/routes/ - API route modules
- frontend/src/pages/ - page-level React components

## Environment variables
See backend/.env.example and frontend/.env.example.

## Planning module (AOP, Strategic Plan, Roadmap)

- Sidebar → **Annual Plan / Strategic Plan / Roadmap**. Each level is linked to the one above it
  (AOP → Strategic → Roadmap) and completion rolls up from child plans, activities, milestones and KPI actuals.
- **Period filters** at the top of each list switch between fiscal years / plan periods.
- **Periods renew themselves.** Every plan is linked to a `PlanPeriod` (state `Planned` → `Preparing` →
  `Active` → `Closing` → `Closed` → `Archived`). A daily job prepares the next period ahead of the
  end date, activates approved periods on their start date, closes ended ones and archives superseded
  ones. `POST /api/plans/:planId/rollover` returns the carry-forward diff as a dry run; send
  `{ "dryRun": false }` to commit it: structure, unfinished activities, budgets and KPI definitions
  carry over, each KPI is re-based on its last actual and every reading is re-dated into the new period.
  `GET /api/plans/periods/calendar` lists the calendar, and `POST /api/plans/periods/lifecycle/run`
  runs the watch on demand. Link existing plans to periods with `npm run periods:backfill`.
  Automatic runs are disabled with `PERIOD_LIFECYCLE_AUTORUN=false`.
- **Plan editor tabs**: Structure, KPIs & targets, Actuals entry, Reporting deadlines, Alerts,
  Share & feedback, History, Settings.
- **Approval workflow**: Draft → Submit for review → Approve → Publish. Approving or publishing stores a
  revision snapshot that can be downloaded from the History tab. Only administrators approve/publish/reopen.
- **Actuals entry** saves the reported value for every KPI in one period in a single call.
- **Export CSV** and **Board pack (print/PDF)** produce a shareable flat extract or a printable board pack.
- **Share & feedback** creates restricted read-only links (`/share/<token>`) with expiring/revocable tokens;
  visitors can comment without an account and owners see unread counts. Each link also exposes an `.ics`
  calendar feed of that plan's reporting deadlines.
- **Plan Alerts** (sidebar) configures KPI pace, missed-target, overdue-activity and reporting-deadline alerts
  and their email delivery. Alerts run on a 6-hour scheduler and can be previewed/run on demand.

Seed sample plans and apply the schema with:

``powershell
cd backend
npx prisma migrate deploy
npm run seed:plans
npm run alerts:run    # optional: evaluate alerts immediately
``

Email delivery uses SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). When SMTP is not
configured, alerts are still generated in the app and email sends are marked as skipped.

## Public website
- `frontend/src/styles/public.css` holds the public design tokens (palette, type scale, spacing, motion) and the
  header/footer shell used by every public page.
- Typefaces are bundled with Fontsource: Fraunces (display), Inter (body) and Noto Sans Ethiopic (Amharic).
- Homepage figures come from `GET /api/public/at-a-glance`, which derives them from the approved plans
  (AOP budget, major activities, roadmap targets and published plans) so public numbers cannot drift from the data.
- Campus imagery lives in `frontend/public/media` as optimised WebP; the hero can still be overridden by a
  locally uploaded image (`/uploads/...`). The legacy hero text slideshow no longer drives the homepage.

### Public site content (admin)
- **Admin → Public Site** (`/public-site`, admin only) edits the gold welcome banner above the home page
  header (on/off, copy in English and Amharic, optional link), the five footer social links
  (Facebook, X, LinkedIn, Telegram, YouTube — platform URL plus visibility) and the visitor counter
  (display on/off, GA4 measurement id and property id). Settings are stored in `app_setting` under
  the `public.*` keys.
- **Admin → Manage Media** (`/manage-media`, admin only) uploads the videos shown in the home page
  Media section. Each clip takes a video file (MP4/WebM/OGG, up to 512 MB) or URL, a poster image,
  a WebVTT/SRT captions file, bilingual title/caption, display order and a published switch.
  Files land in `backend/uploads/media/` and are served from `/uploads/media/...`.
- The visitor counter reads today / this month / this year / all time from the GA4 Data API when
  `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` are set in `backend/.env` and a property id is configured.
  Otherwise it falls back to the site's own visit log (one row per visitor per day). The GA4
  measurement id also loads gtag.js and sends a `page_view` on each public route change.
- `AnimatedNumber` counts KPI/figures up when they scroll into view, and `FlyInObserver` fades the
  home and inner page cards and text blocks in.

## Fleet cost control

- **Fleet → Cost control** (`/fleet/cost-control`) is the workshop and total-cost-of-ownership ledger.
  It records fuel, scheduled and corrective maintenance, spare parts and tyre replacement with quantity,
  unit cost, total cost, odometer, supplier/vendor, invoice and notes.
- The overview reconciles spend by category, monthly trend and vehicle, with cost per kilometre,
  km per litre, next maintenance exposure and tyre positions. The analytics API is
  `GET /api/fleet/cost-control/analytics?year=YYYY`; CRUD lives under the same path for `fuel`,
  `maintenance`, `parts` and `tyres`.
- Logging an odometer reading above the vehicle's current value advances the vehicle odometer, so
  utilisation and cost-per-km stay current. No external credentials are required.

## Social distribution of news

- **News studio** saves an article first, then queues one post per enabled destination: Facebook Page,
  LinkedIn, X, Telegram or a generic automation webhook.
- Enable distribution and auto-posting in the Social distribution panel. Credentials are read from
  `backend/.env`; a missing credential is recorded as `SKIPPED` with a clear reason instead of retrying
  forever. Failed posts retry three times, with a 15-minute backoff, and can be retried manually.
- Delivery receipts are available at `/api/social/queue`; manual runs use `POST /api/social/run`.

## Timesheet reporting gate and appraisals

- Before a timesheet can be signed and submitted, `GET /api/timesheets/compliance` checks the staff
  member's pending reports past their due date and overdue plan activities/milestones without a
  verified progress update. `POST /api/timesheets/:id/submit` returns HTTP 409 with the exact blockers
  and deep links when the gate is not clear.
- Reminders go out at 5 days, 2 days, on the due date and after the due date, including the prior
  month's outstanding sheet. The gate card in **My HR** shows the same reasons to each staff member.
- **HR Suite → Induction / Appraisals → Framework** manages evaluation criteria dynamically: title,
  description, category, weight, scoring scale, evaluator guidance, department and active state. New and
  draft appraisals take the current framework; signed historical appraisals keep their snapshot.
- **HR Suite → Training** is a per-staff training history with category, provider, completion and expiry
  dates, hours, result, certificate link, notes, filtering, edit and delete.

## Executive BI, AI brief and QR

- **Executive Dashboard** and **Consolidated reports** share one analytics model. The dashboard supports
  cross-filtering by department, status, fund and manager, a 12-month trend, portfolio health, risk
  tables and a filtered CSV dataset for Power BI import (`/api/reporting/executive-bi/export`).
- The AI decision brief is deterministic by default. Set `AI_PROVIDER=openai`, `OPENAI_API_KEY` and
  optionally `AI_MODEL` to refine the wording; no planning data is sent to a third party unless you opt
  in. The same brief appears on the dashboard and in each consolidated report and its exports.
- The public footer shows a branded QR with the EBPE mark in the centre, linking to `PUBLIC_SITE_URL`.
  `GET /api/public/qr` returns the SVG; add `?download=1` for a print-ready attachment.

## Documents

- Corporate documents use one registry table. The internal archive lists every corporate record; the
  public library lists the same records only when `isPublic` is true and the status is `Active`. The
  visibility switch in the internal archive is the single source of truth, so publishing never creates
  a duplicate record.
- Project files are attached to `projectId` and listed from the same `Document` table under
  **PMS → Project → Documents**; they never appear in the public website library.

## Development notes
- The frontend Vite dev server proxies /api/* to http://localhost:5000 (see frontend/vite.config.js).
- Uploads land in backend/uploads/ (gitignored). Public assets live under `avatars/`,
  `brand/`, `hero/`, `media/` and `news/`; archive, QMS, HR, CV and signature files are
  delivered through authenticated `/api/files/...` routes. See `docs/AUDIT_READINESS.md`.
- Auth uses HttpOnly cookies; JWT secret must be set in backend/.env. Authenticated
  mutations also use the double-submit `ep_csrf` cookie, and login supports optional
  Cloudflare Turnstile plus account lockout. See `docs/AUDIT_READINESS.md`.
