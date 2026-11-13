# QMS — Quality Management System

**Last updated:** 2026-11-12
**Version:** 2.0
**Owner:** QA and Regulatory Affairs Officer
**Scope:** Controlled documents, deviations, CAPA, change control and the QMS overview

Ethio-Biopharma's Quality Management System module implements the core
requirements of a WHO-aligned GMP quality system. Every controlled document has a
unique code, an explicit owner, a version chain, an approval record, a periodic
review date and a complete audit trail. Deviations, CAPA and change control extend
the same controlled-record model so the quality loop is closed with evidence, not
with an unchecked status change. Superseded documents and closed records are
retained, never deleted.

Training acknowledgement, an external auditor portal and electronic signature
images remain future work.

## Overview

The module exposes five workspaces, all protected by the `qms` tab grant on both
the API and the sidebar:

| Workspace | Route | API |
|---|---|---|
| QMS Overview | `/qms/overview` | `/api/qms/overview` |
| Document Register | `/qms/documents` | `/api/qms/documents` |
| Deviations | `/qms/deviations` | `/api/qms/deviations` |
| CAPA | `/qms/capa` | `/api/qms/capa` |
| Change Control | `/qms/changes` | `/api/qms/changes` |

`/qms` now redirects to `/qms/overview`. The document editor remains at
`/qms/documents/new` and `/qms/documents/:id`.

WHO controls implemented across the loop:

1. Unique document, deviation, CAPA and change codes.
2. Version control with an immutable history chain for controlled documents.
3. No status change without an authenticated owner or authorised approver.
4. Superseded, obsolete and closed records preserved for audit.
5. Periodic document review dates and automatic dashboard/notification reminders.
6. Deviation investigation, CAPA effectiveness verification and change approval gates.
7. Audit logging of every create, edit and lifecycle transition.
8. Access controlled by position through the existing RBAC matrix.
9. A single overview that surfaces due reviews, critical deviations, overdue CAPA and pending verification.

## Access & Roles

The `qms` grant is added to `backend/src/lib/access.ts` and
`frontend/src/lib/access.js`. Both files must stay in sync.

| Position / role | `qms` grant | Create | Edit own draft | Submit | Approve / reject | Supersede | Obsolete |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Admin role | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Strategy and Planning Officer | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Chief Executive Officer | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| QA and regulatory Affairs Officer | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Human Resource and Administration Manager | Yes | Yes | Yes | Yes | No | If owner | No |
| Operation Manager | Yes | Yes | Yes | Yes | No | If owner | No |
| Engineer | Yes | No | No | No | No | No | No |
| IT Officer | Yes | No | No | No | No | No | No |
| Executive role | Yes | No | No | No | No | No | No |
| Everyone else | No | No | No | No | No | No | No |

**Approver helper.** `isQmsApprover(user)` returns true for an admin,
the Strategy and Planning Officer (admin-equivalent), the Chief Executive
Officer and the QA and Regulatory Affairs Officer. The same helper guards
deviation closure, CAPA verification and closure, and change approval/closure.

**Create helper.** `canCreateQmsDocument(user)` adds the HR and Administration
Manager and the Operation Manager. Engineers, IT and executives are read-only.
The deviation, CAPA and change endpoints use the same create/approve split.

**Ownership.** Submit is restricted to the document owner. Editing is allowed
for the owner, the assigned approver or a QMS approver. Supersede is allowed for
the owner or a QMS approver. Obsolete is restricted to a QMS approver.

## Document Lifecycle

```
                         ┌──────────────────────────────┐
                         │            DRAFT             │
                         │ owner creates / edits        │
                         └──────────────┬───────────────┘
                                        │ owner submits
                                        ▼
                         ┌──────────────────────────────┐
                         │          IN_REVIEW           │
                         │ owner may still correct      │
                         └───────┬──────────────┬───────┘
                    approve      │              │  reject + reason
                                 ▼              ▼
                         ┌──────────────┐   back to DRAFT
                         │   APPROVED   │
                         │ effective    │
                         └───┬──────┬───┘
                 supersede   │      │   obsolete
                             ▼      ▼
                    new DRAFT     OBSOLETE
                    (version+1)   (retained)
                             │
                             ▼
                    previous version
                       SUPERSEDED
```

### States

| State | Meaning | Who transitions out |
|---|---|---|
| DRAFT | Being authored; editable | Owner submits; owner/approver edits |
| IN_REVIEW | Awaiting QA decision | QMS approver approves or rejects |
| APPROVED | Authorised for use; effective | QMS approver obsoletes; owner/approver supersedes |
| SUPERSEDED | Replaced by a newer version; read-only | Terminal |
| OBSOLETE | Withdrawn from use; retained for audit | Terminal |

There is no delete endpoint. Records leave active use only through SUPERSEDED or
OBSOLETE.

## Version Chain

Each version is a separate `qms_document` row. The family is identified by
`code`, and `version` distinguishes the rows. The database enforces
`@@unique([code, version])` and an index on `code`.

- The approved current version becomes `SUPERSEDED`, receives `supersededAt`,
  and points `supersededById` at the replacement draft.
- The replacement is `DRAFT` with the next major version (`1.4` → `2.0`) and a
  required `changeSummary`.
- The detail endpoint returns `versionChain`, ordered oldest to newest, so the
  editor can render the full history without a second request.
- Creating a fresh document with an existing code is rejected with `409`; new
  versions must go through `POST /:id/supersede`.

**Deliberate schema deviation.** The original design note specified
`code String @unique`. A globally unique code would make it impossible to store
the previous and new version as separate rows under the same WHO document code.
The implemented model keeps the code required and indexed but makes uniqueness
`@@unique([code, version])`. This is the minimum change needed for a real
version chain; no other model was modified.

## Schema Deployment

Per the project convention for recent modules, the `qms_document` table was
applied with:

```bash
cd backend
npx prisma db push
npx prisma generate
```

No Prisma migration file was created. A fresh environment or deployment must run
the same `db push`/`generate` pair before starting the API; `prisma migrate
deploy` alone does not create this table.

## API Reference

All routes require an authenticated session and the `qms` grant. Errors are JSON
with `{ "error": "..." }`, or `{ "error": "Invalid input", "details": ... }` for
zod validation failures.

### `GET /api/qms/documents`

List the register. Query parameters:

| Parameter | Values | Notes |
|---|---|---|
| `status` | DRAFT, IN_REVIEW, APPROVED, SUPERSEDED, OBSOLETE | Exact match |
| `category` | SOP, Specification, Protocol, Record, Policy, Work Instruction, Form | Exact match |
| `department` | QA, Production, QC, Warehouse, Engineering, Regulatory, HR, IT | Exact match |
| `search` | free text | Code, title, Amharic title or description |
| `filter` | `due` | Approved documents due within 30 days |

Response:

```json
{
  "items": [
    {
      "id": "clx...",
      "code": "SOP-QA-001",
      "title": "Document control procedure",
      "category": "SOP",
      "version": "1.0",
      "status": "DRAFT",
      "department": "QA",
      "owner": { "id": "...", "firstName": "...", "lastName": "...", "username": "..." },
      "reviewer": null,
      "approver": null,
      "effectiveDate": null,
      "reviewDueAt": "2028-11-12T00:00:00.000Z"
    }
  ],
  "summary": { "total": 1, "approved": 0, "inReview": 0, "dueForReview": 0 }
}
```

`summary` is computed across the whole register, not the filtered page, so the
KPI strip remains stable while filters change.

### `GET /api/qms/documents/:id`

Returns the document with populated owner, reviewer and approver, plus
`versionChain`:

```json
{
  "id": "clx...",
  "code": "SOP-QA-001",
  "version": "2.0",
  "status": "DRAFT",
  "owner": { "...": "..." },
  "versionChain": [
    { "id": "old...", "version": "1.0", "status": "SUPERSEDED", "approvedAt": "..." },
    { "id": "new...", "version": "2.0", "status": "DRAFT", "approvedAt": null }
  ]
}
```

### `GET /api/qms/documents/people`

Assignee options for the editor. Returns up to 1,000 users with `id`,
`firstName`, `lastName`, `username`, `position` and `department`. This endpoint
exists because `/api/users` is admin-only and QMS owners/reviewers are not
necessarily administrators.

### `GET /api/qms/documents/due-for-review?days=30`

Approved documents whose `reviewDueAt` falls inside the window. Returns
`{ items, days, cutoff }`, ordered by the earliest review date. Used by the
dashboard card and available to the reminder job's logic.

### `POST /api/qms/documents`

Multipart form-data. Fields:

| Field | Required | Validation |
|---|---|---|
| `code` | Yes | `/^[A-Z]{2,5}-[A-Z]{2,5}-\d{3,5}$/`, uppercased |
| `title` | Yes | Minimum 5 characters |
| `titleAm` | No | Maximum 300 characters |
| `description` | No | Maximum 5,000 characters |
| `category` | Yes | One of the seven categories |
| `department` | No | One of the eight departments |
| `version` | No | `/^\d+\.\d+(\.\d+)?$/`, default `1.0` |
| `ownerId` | No | Defaults to the signed-in user |
| `reviewerId`, `approverId` | No | Must reference existing users |
| `file` | No | PDF/DOC/DOCX/XLS/XLSX, maximum 50 MB |
| `fileUrl` | No | External URL when no file is uploaded |
| `changeSummary` | Above 1.0 | Required when version is not `1.0` |
| `effectiveDate`, `reviewDueAt` | No | Dates; review due defaults to +2 years |

Responds `201` with the created DRAFT. A duplicate code returns `409`.

### `PUT /api/qms/documents/:id`

Same fields, partial updates allowed. Only DRAFT or IN_REVIEW documents may be
edited. The caller must be the owner, the assigned approver or a QMS approver.
When a new file is uploaded the previous stored file is retained on disk; the
record points at the new one.

### `POST /api/qms/documents/:id/submit`

Owner only. Requires `DRAFT`. Sets `IN_REVIEW` and notifies the assigned
approver, or all QMS approvers when none is assigned. Audit action:
`QMS_DOC_SUBMITTED`.

### `POST /api/qms/documents/:id/approve`

QMS approver only. Requires `IN_REVIEW`. Sets `APPROVED`, records the approver,
`approvedAt`, a default effective date of now and a review date two years out if
none was set. Clears any previous rejection reason. Notifies the owner.

### `POST /api/qms/documents/:id/reject`

QMS approver only. Requires `IN_REVIEW`. Body:

```json
{ "reason": "Update section 4.2 and reattach the approved form." }
```

Returns the document to `DRAFT` with `rejectionReason` stored, clears
`approvedAt`, and notifies the owner.

### `POST /api/qms/documents/:id/supersede`

Owner or QMS approver. Requires `APPROVED`. Body:

```json
{ "changeSummary": "Added the 2026 supplier qualification requirements." }
```

Creates the next-major DRAFT, links the old record with `supersededById`, and
marks the old record `SUPERSEDED` in one transaction. Responds `201` with the new
draft. The editor redirects to it.

### `POST /api/qms/documents/:id/obsolete`

QMS approver only. Requires `APPROVED`. Sets `OBSOLETE`. The record and its file
remain available for inspection and audit.

### `GET /api/qms/documents/:id/download`

Streams the stored attachment as a download, or redirects to an external
`fileUrl`. Emits `QMS_DOC_DOWNLOADED`. The route is behind the same `qms` grant
as the register.

## File Constraints

- Allowed extensions: `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`
- Maximum size: **50 MB**
- Storage: `backend/uploads/qms/`, using a unique timestamp-random prefix
- Stored path: `/uploads/qms/<generated-name>`; delivery is authorized through
  `GET /api/files/qms/<generated-name>` or the QMS download route.
- Download requires authentication and the `qms` grant

The QMS router owns a dedicated multer instance. The shared uploader in
`middleware/upload.ts` keeps its existing 20 MB limit for every other module and
was not modified.

## Audit Actions

All actions use `logAudit("QMS", action, username, details)` and therefore land
in the existing `audit_log` table.

| Action | Trigger | Details include |
|---|---|---|
| `QMS_DOC_CREATED` | New DRAFT created | id, code, version, category, title |
| `QMS_DOC_UPDATED` | DRAFT/IN_REVIEW edited | id, code, version, changed fields, file replaced |
| `QMS_DOC_SUBMITTED` | Owner submits | id, code, version, reviewer/approver |
| `QMS_DOC_APPROVED` | Approver approves | id, code, version, effective/review dates |
| `QMS_DOC_REJECTED` | Approver returns | id, code, version, reason |
| `QMS_DOC_SUPERSEDED` | New version created | old/new ids, old/new versions, change summary |
| `QMS_DOC_OBSOLETED` | Approved document withdrawn | id, code, version, previous status |
| `QMS_DOC_DOWNLOADED` | File streamed | id, code, version |
| `QMS_REVIEW_REMINDER` | Reminder notification delivered | id, code, version, review date, recipient |
| `QMS_DEVIATION_CREATED` | Deviation reported | deviation id, code, severity, category, title |
| `QMS_DEVIATION_UPDATED` | Open deviation edited | deviation id, code, changed fields |
| `QMS_DEVIATION_INVESTIGATION_STARTED` | Investigation opened | deviation id, code |
| `QMS_DEVIATION_CLOSED` | Approver closes | deviation id, code, severity |
| `QMS_CAPA_CREATED` | CAPA raised | capa id, code, type, source, title |
| `QMS_CAPA_UPDATED` | CAPA edited | capa id, code, changed fields |
| `QMS_CAPA_STARTED` | Action started | capa id, code |
| `QMS_CAPA_SUBMITTED_FOR_VERIFICATION` | Effectiveness evidence submitted | capa id, code |
| `QMS_CAPA_CLOSED` | Effectiveness verified | capa id, code, effective, notes |
| `QMS_CAPA_RETURNED` | Verification failed | capa id, code, notes |
| `QMS_CHANGE_CREATED` | Change drafted | change id, code, category, risk, title |
| `QMS_CHANGE_UPDATED` | Draft change edited | change id, code, changed fields |
| `QMS_CHANGE_SUBMITTED` | Change submitted | change id, code |
| `QMS_CHANGE_APPROVED` | Approver approves | change id, code, risk |
| `QMS_CHANGE_REJECTED` | Approver returns | change id, code, reason |
| `QMS_CHANGE_IMPLEMENTED` | Implementation recorded | change id, code |
| `QMS_CHANGE_CLOSED` | Closure approved | change id, code |

Notification rows use type `QMS_WORKFLOW` for approvals and `QMS_REVIEW_DUE` for
periodic review reminders.

## Review Reminders

`backend/src/lib/qmsReminders.ts` runs from `backend/src/index.ts`:

- first run 45 seconds after boot;
- then every 24 hours (`setInterval(...).unref()`);
- selects `APPROVED` documents with `reviewDueAt <= now + 30 days`;
- notifies the owner in-app;
- suppresses a repeat for the same document for seven days;
- writes `QMS_REVIEW_REMINDER` to the audit log.

The same window powers the dashboard card and the register's "Due in 30 days"
filter. The job is safe to re-run: it only creates missing reminders.

## Dashboard Integration

`frontend/src/pages/HomePage.jsx` shows a "QMS Documents Due for Review" card
when the signed-in user has the `qms` grant. It calls
`/qms/documents/due-for-review?days=30` and links to
`/qms/documents?filter=due`. The register reads the `filter=due` query parameter
on first load and shows only approved documents inside the review window.

## Deviations

`QmsDeviation` records an unplanned departure from an approved process,
specification, document or supplier requirement. The reporter records the factual
event and immediate containment; the owner or a QMS approver investigates and a
QMS approver closes.

**Statuses:** `OPEN` → `UNDER_INVESTIGATION` → `CLOSED`.

| Field | Purpose |
|---|---|
| `code` | Auto-generated `DEV-<DEPT>-001` |
| `title`, `description` | Factual event and scope |
| `category` | Product, Process, Equipment, Document, Supplier, Other |
| `severity` | Critical, Major, Minor |
| `source` | Internal, Audit, Complaint, Supplier, Regulatory, Customer |
| `department` | QA, Production, QC, Warehouse, Engineering, Regulatory, HR, IT |
| `detectedAt`, `dueAt` | Detection and target closure dates |
| `reportedById`, `ownerId` | Reporter and accountable owner |
| `immediateAction` | Containment performed before investigation |
| `rootCause`, `investigation` | Required before closure |
| `closureNotes`, `closedById`, `closedAt` | Closure decision and evidence |

**API:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/qms/deviations` | List with search and status/severity/department filters; returns summary counts |
| GET | `/api/qms/deviations/:id` | Detail with owner, reporter, closer and linked CAPA |
| POST | `/api/qms/deviations` | Report a deviation; critical events notify QMS approvers |
| PUT | `/api/qms/deviations/:id` | Edit an open record (owner or approver) |
| POST | `/api/qms/deviations/:id/investigate` | Move `OPEN` → `UNDER_INVESTIGATION` |
| POST | `/api/qms/deviations/:id/close` | Record root cause, investigation and closure notes; approver only |

A closed deviation is read-only. `POST /:id/close` requires non-empty
`rootCause`, `investigation` and `closureNotes` and returns `409` if the record
is not `UNDER_INVESTIGATION`.

## CAPA

`QmsCapa` records the corrective or preventive action that follows a deviation,
audit, complaint or change. A CAPA is closed only after QA verifies effectiveness;
completing the action plan alone moves it to `PENDING_VERIFICATION`.

**Statuses:** `OPEN` → `IN_PROGRESS` → `PENDING_VERIFICATION` → `CLOSED`; a failed
verification returns the record to `IN_PROGRESS` with the verification notes kept.

| Field | Purpose |
|---|---|
| `code` | Auto-generated `CAPA-<DEPT>-001` |
| `title`, `description` | Action and the problem it addresses |
| `type` | Corrective or Preventive |
| `sourceType`, `sourceRef` | Deviation, Change, Audit, Complaint or Other; the linked deviation code is copied when `deviationId` is supplied |
| `deviationId` | Optional relation to `QmsDeviation` |
| `rootCause`, `actionPlan` | Cause and planned correction/prevention |
| `department`, `ownerId`, `dueAt` | Accountability and deadline |
| `effectivenessCheck` | Required when submitting for verification |
| `verifiedById`, `verifiedAt`, `verificationNotes` | QA effectiveness decision |

**API:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/qms/capa` | List with search and status/type/department filters; summary includes overdue |
| GET | `/api/qms/capa/:id` | Detail with owner, verifier and linked deviation |
| POST | `/api/qms/capa` | Create and notify the owner |
| PUT | `/api/qms/capa/:id` | Edit while `OPEN` or `IN_PROGRESS` |
| POST | `/api/qms/capa/:id/start` | Move `OPEN` → `IN_PROGRESS` |
| POST | `/api/qms/capa/:id/submit` | Require `effectivenessCheck` and move to `PENDING_VERIFICATION` |
| POST | `/api/qms/capa/:id/verify` | Approver-only; `{ effective: true }` closes, `{ effective: false }` returns to `IN_PROGRESS` |

## Change Control

`QmsChangeControl` is the approval gate for planned changes to documents,
processes, equipment, facilities, systems or suppliers. The change is assessed
before implementation and closed only after the outcome is reviewed.

**Statuses:** `DRAFT` → `IN_REVIEW` → `APPROVED` → `IMPLEMENTED` → `CLOSED`.
A rejected change returns to `DRAFT` with the rejection reason retained.

| Field | Purpose |
|---|---|
| `code` | Auto-generated `CHG-<DEPT>-001` |
| `title`, `description`, `reason` | What changes and why |
| `category` | Document, Process, Equipment, Facility, System, Supplier, Other |
| `riskLevel` | Low, Medium, High, Critical |
| `department`, `ownerId` | Accountability |
| `impactAssessment`, `implementationPlan` | Pre-approval assessment and plan |
| `targetEffectiveAt` | Planned effective date |
| `approvedById`, `approvedAt` | Approval evidence |
| `implementedAt` | Implementation evidence |
| `closureNotes`, `closedById`, `closedAt` | Closure review |

**API:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/qms/changes` | List with search and status/risk/department filters; summary counts by state |
| GET | `/api/qms/changes/:id` | Detail with owner, approver, closer and linked document |
| POST | `/api/qms/changes` | Create a draft change |
| PUT | `/api/qms/changes/:id` | Edit a draft or returned change |
| POST | `/api/qms/changes/:id/submit` | Move `DRAFT` → `IN_REVIEW`; notify approvers |
| POST | `/api/qms/changes/:id/approve` | Approver-only; move to `APPROVED` |
| POST | `/api/qms/changes/:id/reject` | Approver-only; return to `DRAFT` with reason |
| POST | `/api/qms/changes/:id/implement` | Move `APPROVED` → `IMPLEMENTED`, stamp `implementedAt` |
| POST | `/api/qms/changes/:id/close` | Approver-only; require closure notes and close |

## QMS Overview

`GET /api/qms/overview` is a read-only aggregation across the four registers. It
returns:

- `documents`: total, approved, in review and due for review in the next 30 days;
- `deviations`: total, open, under investigation and critical open;
- `capas`: total, open (not closed), pending verification and overdue;
- `changes`: total, in review, approved and implemented;
- `recent`: up to eight records across all four registers, newest first, each
  with `type`, `status`, `updatedAt` and a frontend `path`.

The frontend overview at `/qms/overview` renders four KPI cards, the WHO quality
loop, the four quality-signal links and the recent-activity table. It is the
landing page for `/qms`.

## Shared Workflow Helpers

`backend/src/lib/qmsWorkflow.ts` centralises the rules shared by the four
registers:

- `QMS_DEPARTMENTS` — the single department allow-list;
- `qmsCodePrefix(prefix, department)` — normalises the department into the code
  (`DEV-QA-`, `CAPA-PROD-`, `CHG-ENGIN-`);
- `qmsNextCode(prefix, lastCode)` — allocates the next three-digit number;
- `qmsCleanBody(body)` — strips empty form values and normalises `"null"`;
- `qmsActor(user)` — the audit username;
- `notifyQmsUser` and `notifyQmsApprovers` — in-app notification helpers.

All new routes use the existing session middleware, the `qms` grant and
`logAudit("QMS", ...)`. They do not introduce a new authentication scheme or a
second audit store.

## Data Model

The three Phase 2 tables are additive and do not alter `qms_document`:

| Model | Table | Key relations |
|---|---|---|
| `QmsDeviation` | `qms_deviation` | `owner`, `reportedBy`, `closedBy`, `capas` |
| `QmsCapa` | `qms_capa` | `owner`, `verifiedBy`, `deviation` |
| `QmsChangeControl` | `qms_change_control` | `owner`, `approvedBy`, `closedBy`, `relatedDocument` |

`QmsCapa.deviationId` is optional and indexed. `QmsChangeControl.relatedDocumentId`
is optional and points at a `QmsDocument`; the relation does not cascade-delete
the document or the change. All models carry `createdAt` and `updatedAt`.

## Testing the Phase 2 Lifecycles

These checks were run against the local API with a QA and Regulatory Affairs
Officer session. Test records were removed afterwards.

1. **Deviation** — create `DEV-QA-001`, start the investigation, then close with
   a root cause, investigation summary and closure notes. Confirm
   `OPEN → UNDER_INVESTIGATION → CLOSED` and the three audit actions.
2. **CAPA** — create `CAPA-QA-001` linked to the deviation. Confirm `sourceRef`
   is copied from the deviation code, move `OPEN → IN_PROGRESS`, submit with an
   effectiveness check, verify as effective, and confirm `CLOSED`. Verify a
   second CAPA with `effective: false` and confirm it returns to `IN_PROGRESS`.
3. **Change control** — create `CHG-QA-001`, submit, approve, implement and close.
   Confirm the five states and audit actions. Submit another change, reject it,
   and confirm it returns to `DRAFT` with the reason.
4. **Overview** — after the lifecycles, `GET /api/qms/overview` returns the
   correct totals, critical/open/overdue counts and recent activity.
5. **Authorization** — without the `qms` grant the API returns `403` and the
   sidebar group is absent. A non-approver owner cannot close a deviation, verify
   a CAPA or approve/close a change.
6. **UI** — sign in as QA, open all five links under **Quality (QMS)**, and
   confirm each page loads its register, KPI cards, filters and create action.

## Testing the Document-Control Workflow End-to-End

Use a QA and Regulatory Affairs Officer account, or an admin.

1. **Register** — open `/qms/documents`, click **Add Document**, fill the
   identification and version sections, attach a PDF, and save. The new record is
   `DRAFT` and appears in the register.
2. **Submit** — open the record and click **Submit for review**. Status becomes
   `IN_REVIEW`; the approver receives a notification.
3. **Approve** — as a QMS approver, open the same record and click **Approve**.
   Status becomes `APPROVED`, `approvedAt` is set, and the audit log contains
   `QMS_DOC_APPROVED`.
4. **Reject path** — submit another draft, click **Reject**, enter a reason, and
   confirm the record returns to `DRAFT` with the reason displayed.
5. **Supersede** — on the approved record click **Supersede**, enter a change
   summary, and confirm a new DRAFT opens at the next major version. The previous
   version is `SUPERSEDED` and visible in the version-history panel.
6. **Obsolete** — as a QMS approver, click **Obsolete** on an approved record and
   confirm it becomes `OBSOLETE`.
7. **Download** — click **Download** and confirm the file is served with the
   original filename.
8. **Access** — sign in as an Engineer: the register is read-only, there is no
   Add Document button, and workflow buttons are hidden. Sign in as a staff user
   without the grant: the Quality section is absent and `/qms/documents`
   redirects to the dashboard.
9. **Dashboard** — confirm the due-for-review card shows the current count and
   opens the filtered register.
10. **Audit** — inspect `audit_log` for `QMS_DOC_CREATED`,
    `QMS_DOC_SUBMITTED`, `QMS_DOC_APPROVED` and `QMS_DOC_SUPERSEDED`.

Anonymous API check:

```bash
curl -i http://localhost:5000/api/qms/documents
# HTTP/1.1 401 Unauthorized
```

A signed-in user without the grant receives `403` with a message naming the
missing `qms` workspace.

## Files

| File | Purpose |
|---|---|
| `backend/prisma/schema.prisma` | `QmsDocument`, `QmsDeviation`, `QmsCapa`, `QmsChangeControl` and User back-relations |
| `backend/src/lib/access.ts` | `qms` grant, `isQmsApprover` |
| `backend/src/lib/qmsReminders.ts` | Daily review-due notifications |
| `backend/src/lib/qmsWorkflow.ts` | Shared codes, body cleaning and notifications |
| `backend/src/routes/qmsDocuments.ts` | Register, workflow, upload and download API |
| `backend/src/routes/qmsDeviations.ts` | Deviation register and lifecycle |
| `backend/src/routes/qmsCapa.ts` | CAPA register and effectiveness verification |
| `backend/src/routes/qmsChanges.ts` | Change-control register and approval gate |
| `backend/src/routes/qmsOverview.ts` | Cross-register KPI and recent activity |
| `backend/src/index.ts` | Mount and daily scheduler |
| `frontend/src/lib/access.js` | `qms` grant, path guard, approver/create helpers |
| `frontend/src/layouts/MainLayout.jsx` | "Quality (QMS)" sidebar section with all five links |
| `frontend/src/App.jsx` | `/qms` routes and `/qms` → `/qms/overview` redirect |
| `frontend/src/pages/qms/QmsShell.jsx` | Shared QMS hero and section rail |
| `frontend/src/pages/qms/qmsUi.jsx` | Shared badges, modals, fields and dates |
| `frontend/src/pages/qms/QmsOverview.jsx` | Quality control tower |
| `frontend/src/pages/qms/QmsDocuments.jsx` | Register, KPIs, filters and modals |
| `frontend/src/pages/qms/QmsDocumentEditor.jsx` | Create/edit/detail, workflow and history |
| `frontend/src/pages/qms/QmsDeviations.jsx` | Deviation register and forms |
| `frontend/src/pages/qms/QmsCapa.jsx` | CAPA register and forms |
| `frontend/src/pages/qms/QmsChanges.jsx` | Change-control register and forms |
| `frontend/src/styles/qms.css` | Branded QMS layout system |
| `frontend/src/pages/HomePage.jsx` | Due-for-review dashboard card |
| `docs/QMS_MODULE.md` | This document |

## Known Limitations / Future Work

- No per-user document acknowledgement or training linkage. HR e-signatures were
  deliberately left untouched.
- No automated escalation for overdue CAPA or unapproved changes; the overview
  surfaces them, but a scheduler only sends document review reminders.
- No separate quality-event log for complaints, recalls or supplier audits beyond
  the deviation source field. A future phase can add those registers.
- CAPA effectiveness is a text record, not a measured metric. A future phase can
  link a KPI or monitoring result to the verification.
- No external auditor portal. Access is internal only.
- Superseded files stay on disk and are not garbage-collected. This is
  intentional for GMP retention; a formal retention policy should define when
  physical files may be archived.
- No electronic signature image is stamped on the document record. Approval is
  captured as user, timestamp and audit entry.
- The next major version is generated automatically (`1.4` → `2.0`). A future
  phase may allow a controlled minor-version choice for editorial corrections.
- Reviewer assignment is informational; the approval guard is based on the QMS
  approver positions, not on the reviewer field.
- File preview is by download only. No in-browser PDF viewer was added, to avoid
  a new dependency.
