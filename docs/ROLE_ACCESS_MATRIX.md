# Position → left-pane access proposal

This is the access model implemented for the Ethio-Biopharma HR and planning workspace.
It is deliberately **operational rather than hierarchical**: each position receives the tabs its
daily work needs, and sensitive areas (payroll, HR records, system administration) stay with the
positions accountable for them.

The same matrix is enforced in three places:

| Layer | Where | What it does |
|---|---|---|
| Navigation | `frontend/src/lib/access.js` → `MainLayout` | Only renders left-pane tabs the signed-in position may open. |
| Route guard | `frontend/src/lib/access.js` → `MainLayout` | Typing a URL for a forbidden tab redirects to the dashboard. |
| API | `backend/src/lib/access.ts` → `requireAccess()` | Returns `403` when a request reaches a workspace the position cannot use, even outside the UI. |

Administrators always have full access. A user record with **no position** falls back to the legacy
role mapping (executive, project manager, PI, viewer, staff), so existing accounts keep working
while positions are rolled out. A custom **Other (specify)** position also uses the role fallback
until it is added to the matrix.

## Matrix

Legend: ✓ = available, — = not shown.

| Position | PMS | Annual | Strategic | Roadmap | Progress | Reports | Calendar | Archive | My HR | Approvals | HR Suite | Exec. HR | Recruitment | Induction | Payroll | Languages | Alerts | News | Docs | Media | Public Site | Users | Settings |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Board Secretary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| Internal Audit Officer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| Chief Executive Officer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| QA and regulatory Affairs Officer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| Strategy and Planning Officer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | ✓ | ✓ | — | — | — | — |
| Legal Counsel | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| Operation Manager | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| Engineer | ✓ | ✓ | — | — | ✓ | — | — | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| IT Officer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | ✓ | ✓ | — | — | — |
| Human Resource and Administration Manager | — | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| Property Management Officer | ✓ | ✓ | — | — | ✓ | — | — | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Procurement Officer | ✓ | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Finance Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | — | — | — |
| Finance Officer | ✓ | ✓ | — | — | ✓ | — | — | ✓ | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — | — | — |

`PMS` also governs Goals and Portfolios; `Reports` also governs the Executive dashboard.

## Why each position gets this

- **Board Secretary** — governs the board cycle and needs read access to every plan, report and
  archive for board packs, but should not alter delivery records or see payroll.
- **Internal Audit Officer** — independent assurance: read access to plans, progress, reports,
  calendar, archive and alerts, with no operational editing rights.
- **Chief Executive Officer** — full planning, HR, payroll and communications oversight. System
  administration (users, public site configuration, hero settings) stays with administrators.
- **QA and regulatory Affairs Officer** — owns quality gates, so activities, milestones, KPIs,
  progress updates, reports and the document archive; plus strategic/roadmap context.
- **Strategy and Planning Officer** — the planning owner: every plan level, progress, consolidated
  reports, calendar, alerts, news and documents. No HR or payroll.
- **Legal Counsel** — reads plans and reports for legal exposure, adds progress notes, works in the
  document archive, and has no operational or payroll access.
- **Operation Manager** — runs delivery: PMS, annual plan, roadmap context, progress, reports,
  calendar, alerts.
- **Engineer** — delivery-only: projects, annual plan, progress updates, archive, self-service.
- **IT Officer** — delivery plus digital stewardship: languages, media and documents in addition to
  the planning suite. No payroll or HR records.
- **HR & Administration Manager** — the HR suite, executive HR analytics, recruitment, induction,
  payroll preparation, languages and the document archive; annual plan and reports for workforce
  planning.
- **Property Management Officer** — campus projects and annual facilities work, progress, archive.
- **Procurement Officer** — projects, annual plan, progress, reports and archive for procurement
  planning and spend evidence.
- **Finance Manager** — planning and delivery read access plus payroll. Keeps financial oversight of
  every plan without HR administration.
- **Finance Officer** — prepares payroll and supports projects; no HR records, recruitment or system
  administration.

## Demonstration users

`npm run seed:hr-suite` creates one hypothetical person per position (all share the password
`Demo12345!`):

| Position | Username |
|---|---|
| Chief Executive Officer | `ceo` |
| Board Secretary | `board.secretary` |
| Internal Audit Officer | `audit.officer` |
| QA and regulatory Affairs Officer | `qa.officer` |
| Strategy and Planning Officer | `strategy.officer` |
| Legal Counsel | `legal.counsel` |
| Operation Manager | `operations.manager` |
| Engineer | `engineer` |
| IT Officer | `it.officer` |
| Human Resource and Administration Manager | `hr.manager` |
| Property Management Officer | `property.officer` |
| Procurement Officer | `procurement.officer` |
| Finance Manager | `finance.manager` |
| Finance Officer | `finance.officer` |

Sign in as two or three of them to see the left pane change. The same seed fills every HR screen
(leave, balances, training, holidays, recruitment pipeline, induction, appraisals, timesheets,
documents, tasks and payroll). `npm run seed:pms-demo` then adds four projects with work packages,
milestones, activities, goals, briefs, announcements, comments and timesheets for the same users.

## Changing the proposal

1. Edit `POSITION_ACCESS` in **both** `frontend/src/lib/access.js` and `backend/src/lib/access.ts`
   (they are intentionally identical).
2. Add the tab key to `TAB_KEYS` if it is a new left-pane tab.
3. No database migration is needed: positions live on `users.position`, and the position list is
   also seeded into the `DropdownOption` table under the `POSITION` category for the dropdowns.

New positions can be typed through **Other (specify)** in the staff or user form without a code
change; they inherit the role fallback until the matrix is updated.
