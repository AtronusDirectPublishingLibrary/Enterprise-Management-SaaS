# Ethiobiopharma - Project Management System (PMS)

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

## Development notes
- The frontend Vite dev server proxies /api/* to http://localhost:5000 (see frontend/vite.config.js).
- Uploads land in backend/uploads/ (gitignored).
- Auth uses HttpOnly cookies; JWT secret must be set in backend/.env.
