# Fleet & Transport Module

**Last updated:** 2026-11-10
**Version:** 1.0
**Owner:** Human Resource and Administration Manager

Ethio-Biopharma's Fleet & Transport module manages the vehicle inventory, driver roster, and trip requests, with a parallel **Ride Service** workflow for when the fleet isn't sufficient.

## Overview

The module supports two parallel request types that share the same two-stage approval workflow:

- **Vehicle Request** — a company vehicle + driver is assigned to the trip
- **Ride Request** — an approved ride-service provider (Ride, ZayRide, Feres, etc.) is used instead

Both request types go through the same lifecycle: submit → supervisor approval → fleet approval → assignment → completion.

## Access & Roles

| Role | CRUD Vehicles/Drivers/Providers | Submit Requests | Supervisor Approve | Fleet Approve | View Own | Gate Pass |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| HR & Admin Manager (fleet manager) | Yes | Yes | Yes | Yes | Yes | Yes |
| Executive | No | Yes | Yes | No | Yes | Yes |
| Project Manager | No | Yes | Yes | No | Yes | Yes |
| Staff / Viewer | No | Yes | If supervisor | No | Yes | Yes |

**Key rule:** No one can approve their own request. The backend enforces this via `requesterId !== req.user.sub`.

### Fleet manager identity

The fleet manager is any user with:

    user.position === "Human Resource and Administration Manager"

This is a **position**, not a role. If HR changes a user's position, fleet access follows automatically. Admins always have fleet access regardless of position.

## Request Lifecycle

    submit ──▶ PENDING ──supervisor approve──▶ SUPERVISOR_APPROVED
                  │                                  │
              reject                             fleet approve + assign
                  │                                  ▼
                  ▼                              ASSIGNED ──start──▶ IN_PROGRESS ──complete──▶ COMPLETED
              REJECTED                               │
                                                     │
              cancel (from PENDING or SUPERVISOR_APPROVED)
                                                     ▼
                                                 CANCELLED

After `autoCleanupDays` past return date, terminal requests become EXPIRED.

### States

| State | Meaning | Who transitions out |
|---|---|---|
| PENDING | Submitted, waiting for supervisor | Supervisor (approve/reject), requester (cancel) |
| SUPERVISOR_APPROVED | Approved, waiting for fleet | Fleet (approve/reject), requester (cancel) |
| ASSIGNED | Vehicle/driver or provider assigned; gate pass issued | Requester or fleet (start) |
| IN_PROGRESS | Trip started | Requester or fleet (complete) |
| COMPLETED | Trip finished, vehicle returned to Available | Terminal |
| REJECTED | Rejected at either stage | Terminal |
| CANCELLED | Cancelled pre-assignment | Terminal |
| EXPIRED | Auto-expired after autoCleanupDays | Terminal |

## Workflows

### Vehicle Request — full flow

1. **Submit** — `POST /api/fleet/requests`
   - Requires: tripPurpose, departureDate, returnDate, departureTime, pickupLocation, destination
   - Backend resolves supervisorId = user.immediateSupervisorId
   - If no supervisor assigned: 400 error, ask HR
   - Notification sent to supervisor

2. **Supervisor approves** — `POST /api/fleet/requests/:id/supervisor-approve`
   - Guard: user.sub === supervisorId OR admin
   - Cannot self-approve
   - Notification sent to all fleet managers

3. **Fleet manager assigns vehicle + driver** — `POST /api/fleet/requests/:id/fleet-approve`
   - Body: `{ vehicleId, driverId }`
   - TRANSACTION: request → ASSIGNED, vehicle → In Use
   - Gate pass email sent to requester + driver
   - Gate pass number: GP-YYYYMMDD-NNNN
   - Notification sent to requester

4. **Requester starts trip** — `POST /api/fleet/requests/:id/start`

5. **Requester completes trip** — `POST /api/fleet/requests/:id/complete`
   - TRANSACTION: request → COMPLETED, vehicle → Available

### Ride Request — full flow

Same as vehicle, but:
- Endpoint base: `/api/fleet/rides`
- Fleet approve body: `{ providerId, estimatedFare? }`
- No gate pass email
- Complete accepts `{ actualFare?, receiptUrl? }` for finance

## Auto-cleanup

Every 6 hours, `lib/fleetReminders.ts` runs:

1. Expires terminal requests older than `autoCleanupDays`
2. Nudges supervisors of PENDING requests older than `notifySupervisorAfterHours`
3. Nudges fleet managers of SUPERVISOR_APPROVED requests older than `notifyFleetAfterHours`

All notifications are de-duplicated per recipient per day.

## API Reference

All endpoints require authentication (cookie `ep_auth` or `Authorization: Bearer <token>`).

### Vehicles — /api/fleet/vehicles

| Method | Path | Body | Auth |
|---|---|---|---|
| GET | / | — | any auth |
| GET | /available | — | any auth |
| GET | /:id | — | any auth |
| POST | / | { type, licensePlate, capacity, fuelType?, odometer?, lastMaintenance?, nextMaintenance?, remarks? } | fleet |
| PUT | /:id | partial | fleet |
| PUT | /:id/status | { status } | fleet |
| DELETE | /:id | — | fleet (409 if active requests) |

### Drivers — /api/fleet/drivers

Same shape. Statuses: Available, On Leave, Suspended.

### Ride Providers — /api/fleet/ride-providers

| Method | Path | Auth |
|---|---|---|
| GET | / | fleet |
| GET | /active | any auth |
| POST | / | fleet |
| PUT | /:id | fleet |
| PUT | /:id/toggle | fleet |
| DELETE | /:id | fleet (409 if active requests) |

### Vehicle Requests — /api/fleet/requests

| Method | Path | Auth |
|---|---|---|
| GET | /my-requests | any auth (own) |
| GET | /pending | any auth (supervisor queue) |
| GET | /fleet-queue | fleet |
| GET | /all?status=&from=&to= | fleet |
| GET | /:id | owner/supervisor/fleet/admin |
| POST | / | any auth |
| POST | /:id/supervisor-approve | supervisor or admin |
| POST | /:id/fleet-approve | fleet |
| POST | /:id/reject | supervisor (PENDING) or fleet (SUPERVISOR_APPROVED) |
| POST | /:id/cancel | requester |
| POST | /:id/start | owner or fleet |
| POST | /:id/complete | owner or fleet |
| POST | /:id/resend-gate-pass | fleet |

### Ride Requests — /api/fleet/rides

Same endpoints. Fleet-approve body: `{ providerId, estimatedFare? }`.
Complete body: `{ actualFare?, receiptUrl? }`.

## Gate Pass

When a vehicle request is fleet-approved, a gate pass email is sent to requester + driver. Contains:

- Gate pass number (GP-YYYYMMDD-NNNN)
- Driver, vehicle code, license plate
- Requester name + department
- Destination, departure + return
- Approving fleet manager
- QR code linking to /fleet/gate-pass/:requestId/verify (public)

Also viewable at /fleet/gate-pass/:requestId (authenticated) with Print + Resend buttons.

### Email setup

Add to backend/.env:

    SMTP_HOST=smtp.example.com
    SMTP_PORT=587
    SMTP_USER=noreply@ethiobiopharma.et
    SMTP_PASS=...
    MAIL_FROM="Ethio-Biopharma Fleet <noreply@ethiobiopharma.et>"
    PUBLIC_APP_URL=https://app.ethiobiopharma.et

Without SMTP, gate passes are still generated (viewable at /fleet/gate-pass/:id) but emails are skipped.

## Settings

Fleet settings live in the `fleet_setting` table:

| Key | Default | Description |
|---|---|---|
| autoCleanupDays | 7 | Days after return date to expire terminal requests |
| approvalLevels | 2 | 1 = fleet only, 2 = supervisor then fleet |
| notifySupervisorAfterHours | 24 | Nudge supervisors about stale PENDING |
| notifyFleetAfterHours | 24 | Nudge fleet about stale SUPERVISOR_APPROVED |
| requireOdometer | true | Whether odometer reading is required |
| defaultVehicleType | Sedan | Default vehicle type for new requests |
| rideAutoApprove | false | If true, ride requests skip supervisor |
| maxInTownHours | 8 | Maximum hours for in-town trips |

## Data Model

Six tables in `prisma/schema.prisma`:

- `vehicle` — fleet inventory
- `driver` — driver roster (optionally linked to a User)
- `vehicle_request` — vehicle trip requests with full lifecycle
- `ride_provider` — ride service providers
- `ride_request` — ride trip requests
- `fleet_setting` — configuration key/value

## Seeding Demo Data

    cd backend
    npm run seed:fleet

Idempotent — safe to re-run. Adds:
- 3 vehicles (V001 Sedan, V002 4x4, V003 Minibus) — Available
- 3 drivers (Abebe, Tigist, Dawit) — Available
- 3 ride providers (Ride, ZayRide, Feres) — Active
- All 8 fleet_setting defaults

Does NOT seed demo requests — use /fleet/new to test the flow.

## Testing the Workflow End-to-End

Prerequisites:
- At least 1 user with position = "Human Resource and Administration Manager" (fleet manager)
- At least 1 user with a supervisor assigned (immediateSupervisorId set)
- At least 1 Available vehicle + 1 Available driver
- At least 1 Active ride provider

Walkthrough:

1. As requester → /fleet/new → submit vehicle request → PENDING
2. As supervisor → /fleet/approvals → approve → SUPERVISOR_APPROVED
3. As fleet manager → /fleet/approvals → assign vehicle + driver → ASSIGNED (gate pass emailed)
4. As requester → /fleet/requests → start → IN_PROGRESS → complete → COMPLETED
5. Any user → /fleet/gate-pass/<request-id> → view + print the gate pass

## Known Limitations / Future Work

- No analytics page yet — planned
- No settings UI yet — settings edited via DB
- No batch approval
- No driver mobile app
- Ride providers aren't emailed when assigned
- No push notifications (only email for gate passes + in-app bell)

## Files

Backend:
- backend/prisma/schema.prisma — 6 fleet models
- backend/src/lib/gatePass.ts — HTML gate pass + email
- backend/src/lib/fleetSettings.ts — typed settings
- backend/src/lib/fleetReminders.ts — auto-cleanup + nudges
- backend/src/lib/access.ts — isFleetManager, "fleet" grant
- backend/src/routes/fleetVehicles.ts
- backend/src/routes/fleetDrivers.ts
- backend/src/routes/fleetRequests.ts
- backend/src/routes/rideProviders.ts
- backend/src/routes/rideRequests.ts
- backend/prisma/seed-fleet-demo.ts

Frontend:
- frontend/src/pages/fleet/FleetDashboard.jsx
- frontend/src/pages/fleet/FleetVehicles.jsx
- frontend/src/pages/fleet/FleetDrivers.jsx
- frontend/src/pages/fleet/RideServices.jsx
- frontend/src/pages/fleet/NewFleetRequest.jsx
- frontend/src/pages/fleet/FleetRequests.jsx
- frontend/src/pages/fleet/FleetApprovals.jsx
- frontend/src/pages/fleet/GatePassPage.jsx
- frontend/src/pages/fleet/GatePassVerifyPage.jsx
- frontend/src/pages/fleet/_FleetPlaceholder.jsx
- frontend/src/lib/access.js
- frontend/src/layouts/MainLayout.jsx
- frontend/src/App.jsx

## Support

Contact the Human Resource and Administration Manager or the Ethio-Biopharma IT team.