from .common import h1, h2, h3, p, bullet, numbered, figure, callout, table, NAVY, GOLD, MUTED


def chapter_documents(doc):
    h1(doc, "13", "Documents and archives", "One record, two audiences")
    p(
        doc,
        "EB-EMS keeps corporate documents in a single registry. The internal archive shows every corporate record; the public library shows the same records only when they are explicitly marked public and still active. A project document is attached to its project and never appears in the public library. There is no second upload and no duplicate archive.",
    )
    figure(doc, "23-internal-archive.jpg", "Internal Document Archive — the complete corporate record. The website column is the visibility control that releases the same file to the public library.", 16.2)

    h2(doc, "The registry rule")
    table(
        doc,
        ["Field or rule", "Behaviour"],
        [
            ["One table", "Every corporate document is a `Document` row. Public and internal libraries read the same rows."],
            ["Public visibility", "`isPublic = true` releases the record. `isPublic = false` keeps it internal. The switch does not copy the file."],
            ["Status", "Only `Active` public records appear on the public website. Draft, Under Review, Superseded and Expired records stay internal."],
            ["Project scope", "A record with `projectId` belongs to that project and is excluded from the corporate public library."],
            ["Numbering", "Each upload receives a unique document number (for example EB-POL-2026-0001). Manual numbers are checked across the whole registry."],
            ["File", "The file is stored once and served from `/uploads/...`; the metadata carries title, type, thematic area, language, version, dates and notes."],
        ],
        widths=[4.0, 13.0],
        size=8.4,
        first_bold=True,
    )

    h2(doc, "Upload a corporate document")
    numbered(doc, "Open **Internal Archive** from the HR and administration group.")
    numbered(doc, "Choose **+ Add document**. Search first if the document may already exist; update the existing record instead of creating a duplicate.")
    numbered(doc, "Enter the title, type, thematic area, language, version and status. Add the owner unit, endorsement and renewal dates where relevant.")
    numbered(doc, "Attach the file. PDF is preferred for final documents; Word and Excel are accepted for working records.")
    numbered(doc, "Leave **Release to the public website** off for an internal document. Turn it on only when the document is approved for public release and the status is Active.")
    numbered(doc, "Save. Use the search and status filters to confirm the record and its website state.")

    h2(doc, "Publish or unpublish without duplicating")
    numbered(doc, "Find the record in **Internal Archive**.")
    numbered(doc, "Use the **Website** control to publish or unpublish. The confirmation message names the document and the action.")
    numbered(doc, "Open the public **Documents** page and confirm the record appears or disappears. The public page filters to public, active corporate records only.")
    numbered(doc, "If the document is superseded, change the status to **Superseded** as well as unpublishing. The public library will no longer show it, while the internal history remains.")

    callout(
        doc,
        "The public library is not a separate filing cabinet",
        "Do not upload a public copy of a document that already exists internally. Open the internal record, set **Release to the public website**, and let the same file serve both audiences. Unpublishing later removes it from the website without deleting the internal record.",
        "gold",
    )

    h2(doc, "Project document upload")
    p(doc, "Project contracts, approvals, reports and supporting files belong to the project workspace. The project document form carries the project ID, so the file is scoped to that project and cannot leak into the corporate public library.")
    numbered(doc, "Open **PMS → Projects**, choose the project and open the **Documents** tab.")
    numbered(doc, "Choose **Add document** and enter the title, document number, type, status and notes.")
    numbered(doc, "Attach the file and save. It appears in the project's document table with uploader and date.")
    numbered(doc, "Use **Open** to download or view, **Edit** to replace the file or metadata, and **Delete** only for a genuine correction.")
    bullet(doc, "The project document API is `GET /api/documents/project/:projectId`; the upload uses `POST /api/documents` with `projectId`.")
    bullet(doc, "A project document is never returned by `GET /api/documents/public`, even if a client sends `isPublic=true`. The public endpoint requires `projectId: null`.")
    bullet(doc, "Deleting a project removes its document rows through the database relation; retain the official file in the corporate registry if it must survive the project.")

    h2(doc, "Verification performed for this release")
    table(
        doc,
        ["Check", "Result"],
        [
            ["Corporate document upload with file, metadata and generated number", "Passed — record created, file stored, unique number returned."],
            ["Internal archive returns the new record", "Passed — same document ID visible to staff with archive access."],
            ["Public library before release", "Passed — record absent because `isPublic` was false."],
            ["Publish the same record", "Passed — same ID appeared on the public endpoint; no duplicate was created."],
            ["Unpublish the same record", "Passed — same ID disappeared from the public endpoint; internal record remained."],
            ["Project document upload", "Passed — file attached to the project and listed by the project endpoint."],
            ["Project file in public library", "Passed — absent, because the public query excludes any record with a project ID."],
        ],
        widths=[9.7, 7.3],
        size=8.3,
    )


def chapter_public(doc):
    h1(doc, "14", "Public website and QR", "The same story, facing outward")
    p(
        doc,
        "The public website is the outward face of EB-EMS: homepage, about pages, capabilities, roadmap, partners, newsroom, document library, careers and contact. It reads approved plans, public news, public active documents and site settings from the same database as the internal workspace.",
    )

    h2(doc, "Public content rules")
    bullet(doc, "**News** is published from the news studio. The public newsroom reads the article immediately; social delivery is independent.")
    bullet(doc, "**Documents** are public only when the corporate record is public and Active. Project files are never public.")
    bullet(doc, "**Homepage figures** come from approved plans (AOP budget, major activities, roadmap targets and published plans), so public numbers cannot drift from the internal record.")
    bullet(doc, "**Public Site settings** control the welcome banner, footer social links, visitor counter and enterprise logo. Only administrators edit them.")

    h2(doc, "Branded footer QR")
    p(doc, "The footer carries a labelled, downloadable QR that opens the homepage. The code is generated by the server with error-correction level H, so the EBPE mark can sit in the centre without breaking the scan. The link target comes from the server environment, never from the request host header.")
    figure(doc, "22-public-footer-qr.jpg", "Public footer — the labelled QR card with the EBPE mark, a scan instruction and a print-ready SVG download.", 16.2)
    numbered(doc, "Scroll to the public footer. The card reads **Scan to visit our homepage** and explains that the EBPE mark is in the centre.")
    numbered(doc, "Scan the code with any phone camera. It opens the public homepage configured in `PUBLIC_SITE_URL`.")
    numbered(doc, "Choose **Download print-ready QR** to download the SVG. Use it on a poster, badge, vehicle, gate pass or printed report without re-drawing it.")
    bullet(doc, "`GET /api/public/qr` returns the SVG inline. Add `?download=1` for an attachment with the filename `EBPE-homepage-qr.svg`.")
    bullet(doc, "Set `PUBLIC_SITE_URL` in `backend/.env` to the public homepage. The fallback order is `PUBLIC_SITE_URL`, then `APP_ORIGIN`, then the local development address.")
    bullet(doc, "The code is cached for one hour. If the homepage domain changes, update the environment and restart the API; the next request generates the new code.")

    h2(doc, "Public release checks")
    numbered(doc, "Open the public homepage in a private browser window. Confirm the header, banner, news and footer render without requiring a sign-in.")
    numbered(doc, "Open **News** and confirm the article you just published. Check the image, Amharic version and video link.")
    numbered(doc, "Open **Documents** and confirm only public, active records appear. Open one record and download the file.")
    numbered(doc, "Scroll to the footer and scan the QR. Confirm it opens the homepage, not an internal page.")
    numbered(doc, "Check the social links and contact details. Update **Public Site** settings if a link is stale.")
    bullet(doc, "The visitor counter shows today, this month, this year and all time from GA4 when configured; otherwise it uses the site's own visit log.")
    bullet(doc, "The public site is bilingual where translations exist. The language menu is in the header.")


def chapter_security(doc):
    h1(doc, "15", "Security, audit and support", "Trust is a feature")
    p(
        doc,
        "EB-EMS holds sensitive people, payroll, procurement, fleet and planning information. Security is enforced in the application and must also be practised by every user. The audit log is the record of who changed what, when and from where.",
    )
    figure(doc, "17-audit-log.jpg", "Audit log — filterable record of user actions across plans, HR, payroll, fleet, news and documents.", 16.2)

    h2(doc, "Account and session safety")
    bullet(doc, "Use a named account. Never share a password, signature image or session.")
    bullet(doc, "Sign out on shared devices. The session uses an HTTP-only cookie; closing a tab is not the same as signing out.")
    bullet(doc, "Use the organisation's password manager. Do not store passwords in a browser on a shared computer.")
    bullet(doc, "Report a suspected compromise immediately: change the password, tell the system administrator and preserve the audit evidence.")

    h2(doc, "What the audit log records")
    bullet(doc, "Plan creation, submission, approval, publication, reopen and exports.")
    bullet(doc, "HR staff changes, leave decisions, appraisals, training records and payroll runs.")
    bullet(doc, "Fleet requests, approvals, assignments, gate passes and cost ledger changes.")
    bullet(doc, "News publication, social queue runs and retries, document visibility changes and user administration.")
    p(doc, "Use **Audit log** filters by user, action, module and date. Export the filtered view for an investigation; do not edit the log. Retention is controlled by `AUDIT_RETENTION_DAYS`.", size=10.2, color=MUTED)

    h2(doc, "Users and access")
    figure(doc, "16-users.jpg", "Users — create named accounts, set position and role, and manage activation. Use positions for workspace access.", 16.2)
    bullet(doc, "Create a user only when HR has approved the appointment. Set the correct position and supervisor.")
    bullet(doc, "Deactivate access on the last working day. Do not delete the account if the audit history must remain linked to a person.")
    bullet(doc, "Review administrator accounts quarterly. Keep the number of full administrators small and named.")
    bullet(doc, "Never grant a generic role to solve a one-off access request. Fix the position or the record ownership instead.")

    h2(doc, "Data protection in daily work")
    table(
        doc,
        ["Data", "Safe practice"],
        [
            ["Payroll and salary", "Restricted positions only. Do not email payroll files or store them in shared folders."],
            ["Staff records", "Use the HR workspace. Do not copy identity, medical or contract documents into chat or personal drives."],
            ["Signatures", "The signature image is personal. Do not reuse another person's signature or leave a signing screen unattended."],
            ["Fleet receipts", "Store the reference or link in the ledger; do not attach a photo of a personal card or unrelated document."],
            ["Public documents", "Confirm approval and status before publishing. Unpublish immediately if a release was mistaken."],
        ],
        widths=[3.8, 13.2],
        size=8.5,
        first_bold=True,
    )

    h2(doc, "Backups and recovery")
    bullet(doc, "The server runs a backup job (`npm run backup`) and prunes backups after `BACKUP_RETENTION_DAYS`.")
    bullet(doc, "A full PostgreSQL backup requires the PostgreSQL client tools. Without them, the job writes a JSON table export.")
    bullet(doc, "Test a restore on a non-production database before relying on a backup. A backup that has never been restored is only a hope.")
    bullet(doc, "Keep database credentials and backup files outside the project repository and outside public upload folders.")

    h2(doc, "When something goes wrong")
    table(
        doc,
        ["Symptom", "First check", "Escalate when"],
        [
            ["A menu is missing", "Your position in My HR; the access matrix.", "The position is correct but the workspace is still missing."],
            ["Timesheet will not submit", "The reporting gate card and each **Resolve** link.", "A blocker is wrong or already completed."],
            ["A report number disagrees", "The source plan, project or ledger record.", "The source is correct and the report still differs."],
            ["Social post is SKIPPED", "The channel's credentials in backend/.env.", "Credentials are present but the platform still rejects the call."],
            ["A document is not public", "`isPublic` and status Active in the internal archive.", "Both are correct and the public page still omits it."],
            ["Login fails", "Caps Lock, username, password reset policy.", "The account is active and the password is correct."],
        ],
        widths=[4.2, 7.0, 5.8],
        size=8.2,
        first_bold=True,
    )


def chapter_reference(doc):
    h1(doc, "16", "Quick reference", "Find it, understand it, use it")
    h2(doc, "Key routes")
    table(
        doc,
        ["Task", "Route"],
        [
            ["Home", "/dashboard"],
            ["PMS projects", "/database/pms"],
            ["Annual / Strategic / Roadmap", "/database/aop · /database/strategic-plan · /database/roadmap"],
            ["Progress updates", "/progress-updates"],
            ["Consolidated reports", "/reports"],
            ["Planning calendar", "/planning-calendar"],
            ["QMS overview / registers", "/qms/overview · /qms/documents · /qms/deviations · /qms/capa · /qms/changes"],
            ["My HR", "/my-hr"],
            ["HR suite / Executive HR", "/hr · /hr-analytics"],
            ["Induction and appraisals", "/hr-operations"],
            ["Payroll", "/payroll"],
            ["Fleet dashboard", "/fleet"],
            ["Fleet cost control", "/fleet/cost-control"],
            ["News studio", "/manage-news"],
            ["Executive BI", "/executive"],
            ["Internal archive / Public library", "/database/archive · /manage-documents"],
            ["Public website", "/"],
        ],
        widths=[6.2, 10.8],
        size=8.2,
        first_bold=True,
    )

    h2(doc, "Glossary")
    table(
        doc,
        ["Term", "Meaning"],
        [
            ["AOP", "Annual Operational Plan — the current fiscal year's activities, owners, budgets and targets."],
            ["CAPA", "Corrective and Preventive Action — the controlled action that removes a cause or prevents recurrence, closed only after QA verifies effectiveness."],
            ["Change control", "The approval gate for a planned change to a document, process, equipment, facility, system or supplier."],
            ["Controlled document", "A document with a unique code, version, owner, approval state and review date, retained with its version history."],
            ["Deviation", "A recorded departure from an approved process, specification, document or supplier requirement, investigated before closure."],
            ["Consolidated report", "A report built from live plan, project and progress evidence across a plan period."],
            ["QMS", "Quality Management System — the WHO-aligned workspace for controlled documents, deviations, CAPA and change control."],
            ["Cost centre", "The project, vehicle or unit to which a cost is attributed."],
            ["Gate pass", "The fleet authorisation issued when a vehicle request is assigned; it carries a verification QR."],
            ["KPI", "Key Performance Indicator — a measured target with a baseline, target and actual."],
            ["PlanPeriod", "A governed planning period with a lifecycle state and successor."],
            ["Power BI dataset", "The flat CSV extract of the filtered executive portfolio, ready for Power BI import."],
            ["Reporting gate", "The rule that blocks timesheet submission until overdue reports and verified updates are cleared."],
            ["Roadmap", "The long-range direction that the Strategic Plan and AOP operationalise."],
            ["Verified update", "A progress update reviewed and accepted by the responsible reviewer; it counts toward the gate."],
        ],
        widths=[3.3, 13.7],
        size=8.3,
        first_bold=True,
    )

    h2(doc, "Release checklist for administrators")
    numbered(doc, "Run the migration (`npx prisma migrate deploy`) and confirm no pending migration remains.")
    numbered(doc, "Run the backend type check and frontend production build. Both must exit successfully.")
    numbered(doc, "Sign in as at least three positions and confirm the left navigation matches the matrix.")
    numbered(doc, "Create and remove a test fleet cost record; confirm the analytics totals change and return.")
    numbered(doc, "Run one QMS record through each lifecycle (document approval, deviation closure, CAPA verification and change closure), confirm the overview counts, then remove the test records.")
    numbered(doc, "Publish a test news article with one unconfigured channel; confirm the queue records SKIPPED with a reason, then remove the test article.")
    numbered(doc, "Upload a corporate document, publish it, confirm it on the public page, unpublish it, then confirm it remains internal.")
    numbered(doc, "Upload a project document and confirm it does not appear on the public page.")
    numbered(doc, "Scan the footer QR and confirm the homepage; download the SVG and confirm it opens.")
    numbered(doc, "Run a consolidated report and confirm the AI brief appears in JSON, Word and Excel outputs.")
    numbered(doc, "Review the audit log for the test actions and confirm the actors and timestamps.")


def appendix_config(doc):
    h1(doc, "A", "Configuration and environment", "What the server needs")
    p(doc, "These settings live in `backend/.env` on the server. Values are never committed to the repository or shown in the browser. After a change, restart the API so the process reads the new environment.")
    table(
        doc,
        ["Variable", "Required", "Purpose"],
        [
            ["DATABASE_URL", "Yes", "PostgreSQL connection string."],
            ["JWT_SECRET", "Yes", "Secret used to sign the HTTP-only session cookie."],
            ["APP_ORIGIN / APP_URL", "Yes", "Application origin used in links and callbacks."],
            ["PUBLIC_SITE_URL", "Recommended", "Homepage target embedded in the footer QR and social captions."],
            ["SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM", "Optional", "Email for reminders, alerts, gate passes and scheduled reports."],
            ["FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN", "Optional", "Facebook Page delivery."],
            ["LINKEDIN_ACCESS_TOKEN / LINKEDIN_AUTHOR_URN", "Optional", "LinkedIn organisation post delivery."],
            ["X_BEARER_TOKEN", "Optional", "X / Twitter delivery."],
            ["TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID", "Optional", "Telegram channel delivery."],
            ["SOCIAL_WEBHOOK_URL", "Optional", "Automation endpoint for Buffer, Make, Zapier or a custom gateway."],
            ["SOCIAL_AUTORUN", "Optional", "Set to `false` to stop the periodic social queue worker."],
            ["AI_PROVIDER / OPENAI_API_KEY / AI_MODEL / AI_API_URL", "Optional", "Optional language-model refinement of the AI brief. Leave unset for the deterministic engine."],
            ["AUDIT_RETENTION_DAYS", "Optional", "Audit-log retention; 0 keeps everything."],
            ["BACKUP_DIR / BACKUP_RETENTION_DAYS", "Optional", "Backup location and retention."],
            ["GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY", "Optional", "Read-only GA4 service account for the visitor counter."],
        ],
        widths=[6.3, 2.3, 8.4],
        size=7.9,
        first_bold=True,
    )

    h2(doc, "Operational commands")
    table(
        doc,
        ["Task", "Command"],
        [
            ["Install backend dependencies", "cd backend && npm install"],
            ["Apply database migrations", "npx prisma migrate deploy"],
            ["Seed baseline data", "npm run seed"],
            ["Seed HR demo users", "npm run seed:hr-suite"],
            ["Seed PMS demo projects", "npm run seed:pms-demo"],
            ["Start the API", "npm run dev"],
            ["Type-check the backend", "npx tsc --noEmit"],
            ["Start the frontend", "cd frontend && npm run dev"],
            ["Build the frontend", "npm run build"],
            ["Back up the database", "cd backend && npm run backup"],
        ],
        widths=[5.8, 11.2],
        size=8.3,
        first_bold=True,
    )

    callout(
        doc,
        "Production discipline",
        "Use a dedicated database per environment, a long random JWT secret, HTTPS, a restricted CORS origin and a tested backup. Do not run `prisma db push` against a shared production database; use the reviewed migration history.",
        "red",
    )


def appendix_verification(doc):
    h1(doc, "B", "Feature verification checklist", "What was checked for this release")
    p(doc, "Use this checklist when accepting a release or diagnosing a regression. It records the checks performed on the working local system on 12 November 2026. Repeat the relevant block after any change to the module.")
    table(
        doc,
        ["Area", "Check", "Expected result"],
        [
            ["Build", "Backend `npx tsc --noEmit`", "Exits 0 with no diagnostics."],
            ["Build", "Frontend `npm run build`", "Vite completes; only the known chunk-size warnings remain."],
            ["Fleet", "Create fuel, maintenance, parts and tyres for one vehicle", "All four rows appear; analytics totals equal the sum of the four costs."],
            ["Fleet", "Delete the four test rows", "Analytics totals return to the prior values."],
            ["Fleet", "Enter an odometer above the vehicle's current value", "Vehicle odometer advances; cost per km becomes calculable once two readings exist."],
            ["Timesheet gate", "Open compliance for a blocked staff member", "`canSubmit` is false and each blocker includes a reason and link."],
            ["Timesheet gate", "Submit a timesheet with blockers", "HTTP 409 with the blocker list; no status change."],
            ["Appraisals", "Create, edit and delete a criterion", "Framework list updates; weight total recalculates."],
            ["Training", "Create, edit and delete a training record", "History reflects every change; expiry date and result persist."],
            ["Social", "Publish an article with an unconfigured channel", "One queue row per enabled channel; missing credential records SKIPPED with a reason."],
            ["Social", "Retry a SKIPPED row after configuration", "Row returns to QUEUED and is processed on the next run."],
            ["Executive BI", "Apply a directorate filter and export", "Every chart and the CSV reflect the same filtered project set."],
            ["Consolidated report", "Open a report and export Word", "AI brief headings and recommendations appear in the export."],
            ["Documents", "Upload corporate document, publish, unpublish", "Same ID appears and disappears on the public endpoint; no duplicate."],
            ["Documents", "Upload a project document", "Visible on the project endpoint; absent from the public endpoint."],
            ["QMS access", "Sign in with and without the `qms` grant", "All five QMS links appear for QA and administrators; the group is absent and the API returns 403 without the grant."],
            ["QMS documents", "Create, submit, approve, supersede and obsolete a test document", "Each transition persists with the approver, reason, version history and audit rows."],
            ["QMS deviations", "Report a deviation, start investigation and close it", "Status follows OPEN → UNDER_INVESTIGATION → CLOSED; unresolved records stay in the open count."],
            ["QMS CAPA", "Raise a CAPA linked to a deviation, submit for verification and verify effectiveness", "Source reference is carried across; CLOSED requires effectiveness evidence; returned CAPA goes back to IN_PROGRESS."],
            ["QMS changes", "Create, submit, approve, implement and close a change", "Status follows DRAFT → IN_REVIEW → APPROVED → IMPLEMENTED → CLOSED; rejected changes return to DRAFT."],
            ["QMS overview", "Open `/api/qms/overview` after the lifecycle tests", "Counts and recent activity match the four registers."],
            ["QR", "Request `/api/public/qr`", "SVG with the EBPE mark, 200 response, image/svg+xml."],
            ["QR", "Request `/api/public/qr?download=1`", "Attachment with filename EBPE-homepage-qr.svg."],
        ],
        widths=[3.1, 6.6, 7.3],
        size=7.7,
        first_bold=True,
    )

    p(doc, "Limitations recorded for this release:", size=10.5, color=NAVY, bold=True)
    bullet(doc, "Live social delivery could not be verified without real platform credentials. The queue, credential detection, SKIPPED reason and retry path were verified with an unconfigured Telegram channel.")
    bullet(doc, "A native embedded Power BI tenant was not available. The release provides a Power BI-ready filtered CSV and an interactive BI-style dashboard; no tenant credentials are stored.")
    bullet(doc, "Word field updates may require a manual refresh in some desktop versions. The document content and tables are static and readable without updating a field.")
    bullet(doc, "Email delivery depends on SMTP configuration. Without SMTP, reminders and scheduled reports remain visible in the app and the send is marked skipped.")
