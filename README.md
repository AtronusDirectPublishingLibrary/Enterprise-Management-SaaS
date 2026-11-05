# Ethio-Biopharma - Project Management System (PMS)

Full-stack PMS built with Express + TypeScript + Prisma + PostgreSQL on the backend,
Vite + React + Bootstrap on the frontend.

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Quick start

### Backend
``powershell
cd backend
npm install
copy .env.example .env   # then edit DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma db push       # create tables
npm run seed             # bootstrap admin user + demo data
npm run dev              # starts on http://localhost:5000
``

### Frontend (in a second terminal)
``powershell
cd frontend
npm install
npm run dev              # starts on http://localhost:5173
``

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

## Development notes
- The frontend Vite dev server proxies /api/* to http://localhost:5000 (see frontend/vite.config.js).
- Uploads land in backend/uploads/ (gitignored).
- Auth uses HttpOnly cookies; JWT secret must be set in backend/.env.
