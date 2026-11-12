from docx.shared import Pt
from .common import (
    h1, h2, h3, p, bullet, numbered, figure, callout, table, NAVY, GOLD, MUTED,
)


def chapter_welcome(doc):
    h1(doc, "1", "Welcome to EB-EMS", "The operating model")
    p(
        doc,
        "EB-EMS is Ethio-Biopharma Enterprise's single workspace for planning, project delivery, people operations, payroll, fleet, corporate documents and public communication. It replaces parallel spreadsheets and disconnected registers with one governed record for every plan, project, person, vehicle, payment and file.",
        size=11.5,
        line=1.35,
    )
    p(
        doc,
        "The system is built around a simple idea: **enter the evidence once, where the work happens**. Reports, dashboards, public pages and exports then read that same evidence. This is why a consolidated report agrees with the plan it summarises, why a fleet cost appears in both the vehicle ledger and the executive dataset, and why publishing a document never creates a second copy.",
    )

    h2(doc, "The workspaces at a glance")
    table(
        doc,
        ["Workspace", "What it is for", "Typical users"],
        [
            ["Workspace", "Home, PMS projects, My HR, my approvals and team tasks. The daily starting point.", "Everyone"],
            ["Planning and reporting", "Annual Plan, Strategic Plan, Roadmap, Progress Updates, Consolidated Reports, Planning Calendar, Plan Alerts, Goals and Portfolios.", "Planners, project managers, executives, auditors"],
            ["HR and administration", "HR Suite, Executive HR, Recruitment, Induction and Appraisals, Payroll and Payslips, Languages, Document archive, Public Library, Manage News, Manage Media.", "HR, finance, executives, communications, system administrators"],
            ["Quality (QMS)", "QMS Overview, Document Register, Deviations, CAPA and Change Control — the WHO-aligned quality loop.", "QA, executives, operations, HR, administrators"],
            ["Fleet and transport", "Fleet dashboard, requests and approvals, vehicles, drivers, ride services, analytics and **Cost control**.", "Fleet managers, requesters, approvers, finance"],
            ["Public site", "The public homepage, about pages, newsroom, document library and contact pages. Same database, public visibility only.", "Communications, administrators, the public"],
        ],
        widths=[4.0, 9.5, 3.8],
        size=8.4,
        first_bold=True,
    )

    h2(doc, "The single-record principle")
    p(doc, "Four rules protect the integrity of the system. They apply to every role, including administrators.")
    bullet(doc, "**Plans own delivery evidence.** Actuals, milestones, activities and progress updates belong to the plan structure. Do not repeat them in a report document.")
    bullet(doc, "**Projects own project files.** A project contract, approval or report is attached to the project workspace. It is not re-uploaded into the corporate registry.")
    bullet(doc, "**The corporate registry owns corporate documents.** Public visibility is a switch on the same record. It is not a second public upload.")
    bullet(doc, "**News is published once.** The website article, social captions and delivery receipts point to the same news record.")

    h2(doc, "What this release adds")
    table(
        doc,
        ["Capability", "Where to find it", "Outcome"],
        [
            ["Fleet cost ledger", "Fleet → Cost control", "Fuel, maintenance, spare parts and tyres with cost per vehicle, cost per km, fuel efficiency and maintenance exposure."],
            ["Automatic social posting", "Manage News → Social distribution", "One article can queue Facebook, LinkedIn, X, Telegram and an automation webhook, with a delivery receipt per channel."],
            ["Timesheet reporting gate", "My HR → Timesheet reporting gate", "Overdue reports and missing verified updates must be cleared before a signed timesheet can be submitted."],
            ["Dynamic appraisal framework", "Induction & Appraisals → Framework", "HR manages criteria, weights, descriptions, guidance and scoring scales through the UI."],
            ["Training history", "HR Suite → Training", "A per-staff record of courses, providers, hours, results, expiry dates and certificates."],
            ["Branded footer QR", "Public site footer", "A downloadable EBPE QR that opens the homepage, with the EB mark at its centre."],
            ["Executive BI and AI brief", "PMS → Executive", "Cross-filtered portfolio analytics, a deterministic decision brief and a Power BI-ready CSV dataset."],
            ["Consolidated document registry", "Internal Archive / Public Library", "One record, one file, one visibility switch — public pages read only records marked public and active."],
            ["WHO-aligned QMS", "Quality (QMS)", "Controlled documents, deviations, CAPA and change control with approval gates, effectiveness checks and a full audit trail."],
        ],
        widths=[4.2, 4.8, 8.3],
        size=8.2,
        first_bold=True,
    )

    callout(
        doc,
        "If you remember one thing",
        "A dashboard is not a separate source of truth. If a number looks wrong, open the record that produced it and correct the evidence there. The dashboard, report and export will follow.",
        "green",
    )


def chapter_start(doc):
    h1(doc, "2", "Getting started", "Your first ten minutes")
    p(doc, "EB-EMS runs in a web browser. Sign in with the username and password issued by HR or the system administrator. The session uses a secure HTTP-only cookie; closing the browser does not delete your work, because saved records live on the server.")
    figure(doc, "01-login.png", "The EB-EMS sign-in screen. Use your own account; do not share credentials or leave a signed-in browser unattended.", 13.8)

    h2(doc, "Sign in")
    numbered(doc, "Open the EB-EMS address provided by your administrator, for example `http://localhost:5173` in a development environment or the organisation's published address in production.")
    numbered(doc, "Enter your **Username** and **Password**, then choose **Sign in**.")
    numbered(doc, "If this is your first sign-in, change the temporary password when prompted and store the new one in the organisation's approved password manager.")
    numbered(doc, "The system opens on **Home**. The left navigation shows only the workspaces your position is allowed to use.")

    h2(doc, "Demonstration accounts")
    p(doc, "The demo seed creates one person per position, all with the password **Demo12345!**. Use them to see how the workspace changes by role. Never use demo credentials on the production site.")
    table(
        doc,
        ["Position", "Username", "Good first screen"],
        [
            ["Chief Executive Officer", "ceo", "PMS → Executive"],
            ["Strategy and Planning Officer", "strategy.officer", "Annual Plan and Consolidated Reports"],
            ["Human Resource and Administration Manager", "hr.manager", "HR Suite, Induction & Appraisals, Payroll"],
            ["Finance Manager", "finance.manager", "Payroll and Financial reports"],
            ["Operation Manager", "operations.manager", "PMS projects and Progress Updates"],
            ["Engineer", "engineer", "PMS project workspace and My HR"],
            ["IT Officer", "it.officer", "Documents, Media and Languages"],
            ["QA and regulatory Affairs Officer", "qa.officer", "Reports, progress updates and Document archive"],
        ],
        widths=[7.0, 3.6, 6.4],
        size=8.5,
        first_bold=True,
    )

    h2(doc, "Find anything quickly")
    bullet(doc, "Use the **global search** in the top bar for a project, plan, person or page. Results respect your access rights.")
    bullet(doc, "The **bell** shows notifications for approvals, deadlines, comments and system events. Open a notification to jump to the record.")
    bullet(doc, "The **language menu** switches the public site and shared labels between English and Amharic where translations are available.")
    bullet(doc, "Use the browser's print command on print-ready pages (board packs, payslips, gate passes, timesheets) to produce a clean PDF.")

    h2(doc, "Your first ten minutes")
    table(
        doc,
        ["Step", "Action", "Why it matters"],
        [
            ["1", "Open **My HR** and confirm your position, supervisor, contract dates and personal documents.", "The reporting gate, approvals and appraisal cycle depend on this record."],
            ["2", "Open **Home** and note the cards that are waiting for you: approvals, tasks, timesheets and documents.", "The dashboard is an action list, not only a report."],
            ["3", "Open the plan or project you own and check the current period and due dates.", "Most overdue-report problems are visible before the deadline."],
            ["4", "If you approve people or work, open **My Approvals** and clear the oldest item first.", "Approvals block other people's work."],
            ["5", "If you manage a workspace, verify your team's positions and access before granting extra tabs.", "Access is position-based; avoid one-off role changes."],
        ],
        widths=[1.1, 8.7, 7.5],
        size=8.4,
    )

    callout(
        doc,
        "Access problems",
        "If a menu is missing, your position does not grant that workspace. Do not ask for an administrator role unless the work genuinely requires system administration. Ask HR to correct your **position**; navigation, route guards and API permissions will update together.",
        "blue",
    )

    h2(doc, "Signing out and safe use")
    bullet(doc, "Choose **Logout** from the top-right menu when you finish, especially on a shared computer.")
    bullet(doc, "Do not send passwords, signatures, payroll files or client documents through chat or personal email.")
    bullet(doc, "If you suspect your account was used by someone else, change your password and tell the system administrator immediately. The audit log records who changed what and when.")


def chapter_roles(doc):
    h1(doc, "3", "Your role-based workspace", "Position, not hierarchy")
    p(
        doc,
        "EB-EMS uses an **operational** access model. Each position receives the workspaces its daily work requires. Sensitive areas — payroll, staff records, system administration — stay with the positions accountable for them. The model is enforced in three places: the left navigation, protected routes and the API. Hiding a button is never the only protection.",
    )

    h2(doc, "The three access layers")
    table(
        doc,
        ["Layer", "What it does", "What you see"],
        [
            ["Navigation", "Renders only the tabs your position may open.", "A shorter, clearer left menu."],
            ["Route guard", "Blocks a typed URL for a forbidden workspace.", "A redirect to the dashboard."],
            ["API", "Returns HTTP 403 for a forbidden request, even outside the UI.", "A clear error instead of silent data loss."],
        ],
        widths=[3.0, 8.2, 5.5],
        size=8.6,
        first_bold=True,
    )

    h2(doc, "Key positions and their primary workspaces")
    table(
        doc,
        ["Position", "Primary workspaces", "Sensitive areas"],
        [
            ["Chief Executive Officer", "PMS, all plans, progress, reports, executive BI, HR suite, payroll, news, documents", "Full oversight; user administration remains with system administrators"],
            ["Strategy and Planning Officer", "Every planning and delivery workspace, HR and payroll, communications, system administration", "System administrator rights for configuration and access"],
            ["Board Secretary / Internal Audit", "Plans, projects, progress, reports, calendar, archive, alerts", "Read-oriented assurance; no operational edits or payroll"],
            ["Operation Manager / Engineer", "PMS, annual plan, progress updates, archive, self-service", "Delivery records for their work; no HR or payroll administration"],
            ["HR and Administration Manager", "HR suite, executive HR, recruitment, induction, payroll preparation, documents", "Staff records and payroll; no system administration"],
            ["Finance Manager / Finance Officer", "Planning and delivery read access, payroll", "Payroll and financial evidence; no HR records or recruitment"],
            ["IT Officer", "Delivery, languages, media, documents", "Digital stewardship; no payroll or HR records"],
            ["QA / Legal / Procurement / Property", "Plans, projects, progress, reports, archive as required by the role", "Read or contribute evidence; no unrelated administration"],
        ],
        widths=[4.3, 9.0, 4.2],
        size=8.1,
        first_bold=True,
    )

    p(doc, "The full position matrix — including every tab and the reason each position receives it — is maintained in `docs/ROLE_ACCESS_MATRIX.md`. When a position changes, update the matrix in both the frontend and backend access files; the two lists are intentionally identical.", size=10.2, color=MUTED)

    h2(doc, "Administrators and fallback roles")
    bullet(doc, "A user with the **admin** role has full access. The Strategy and Planning Officer position also receives system-administrator rights so the planning owner can configure periods, users and communications.")
    bullet(doc, "A user with no position falls back to the legacy role mapping (executive, project manager, PI, viewer or staff). This keeps older accounts working while positions are rolled out.")
    bullet(doc, "A custom **Other (specify)** position also uses the fallback until the position is added to the access matrix.")
    bullet(doc, "Do not use a generic admin account for daily work. Named accounts keep the audit trail meaningful.")

    callout(
        doc,
        "The right way to grant access",
        "Change the person's **position** in HR, not their role. Position changes flow through navigation, route guards and the API immediately. A role change is a broader technical decision and should be approved by the system administrator.",
        "gold",
    )
