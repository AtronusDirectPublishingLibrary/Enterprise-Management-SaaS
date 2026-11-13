from docx.shared import Pt
from .common import h1, h2, h3, p, bullet, numbered, figure, callout, table, NAVY, GOLD, MUTED


def chapter_navigation(doc):
    h1(doc, "4", "Navigation and shared tools", "The same map every day")
    p(doc, "The interface has three stable zones: the top bar for identity and global actions, the left navigation for workspaces, and the page area for the current task. Learning these three zones makes every screen easier to use.")
    figure(doc, "04-dashboard.jpg", "Home combines action cards, portfolio signals and the latest activity. The left navigation is shaped by your position.", 16.2)

    h2(doc, "Top bar")
    table(
        doc,
        ["Control", "What it does", "When to use it"],
        [
            ["Global search", "Finds projects, plans, people and pages across your permitted workspaces.", "When you know a name but not the menu path."],
            ["Bell", "Shows approvals, deadline alerts, comments and assignment notifications.", "At the start of each day and before a deadline."],
            ["Language menu", "Switches shared public labels between English and Amharic.", "Public-site work and bilingual communications."],
            ["Profile menu", "Opens your account, signature and logout controls.", "When your signature or contact details change."],
        ],
        widths=[3.4, 8.7, 4.9],
        size=8.5,
        first_bold=True,
    )

    h2(doc, "Left navigation groups")
    bullet(doc, "**Workspace** — Home, PMS (Projects), My Portal, My Approvals and Team Tasks.")
    bullet(doc, "**Planning and reporting** — Annual Plan, Strategic Plan, Roadmap, Progress Updates, Consolidated Reports, Planning Calendar, Plan Alerts, Goals and Portfolios.")
    bullet(doc, "**HR and administration** — HR Suite, Executive HR, Recruitment, Induction & Appraisals, Payroll & Payslips, Languages, Internal Archive, Public Library, Manage News and Manage Media.")
    bullet(doc, "**Fleet and transport** — Dashboard, Requests, New request, Approvals, Vehicles, Drivers, Ride Services, Analytics, Settings and Cost control.")
    bullet(doc, "**Quality (QMS)** — QMS Overview, Document Register, Deviations, CAPA and Change Control. Visible only with the `qms` grant.")

    h2(doc, "Common actions")
    table(
        doc,
        ["Action", "How it works"],
        [
            ["Filter a list", "Use the search box and the select filters at the top of the table. Filters apply to the visible list without changing the underlying record."],
            ["Open a record", "Choose the row, the title or the **Open** action. Use the browser back button to return to the same list."],
            ["Save a form", "Complete required fields marked with an asterisk and choose the primary action at the bottom. Wait for the success message before leaving."],
            ["Export", "Use **CSV**, **Excel**, **Word** or **Power BI dataset** where offered. Exports respect the filters shown on screen."],
            ["Print", "Use the print-ready page for board packs, gate passes, payslips and timesheets, then choose **Print → Save as PDF** in the browser."],
        ],
        widths=[3.6, 13.4],
        size=8.6,
        first_bold=True,
    )

    callout(
        doc,
        "Do not work from two tabs on the same form",
        "If two people edit the same record, the last save wins. Refresh before making a material change to a plan, appraisal or fleet cost record, especially near a reporting deadline.",
        "blue",
    )


def chapter_planning(doc):
    h1(doc, "5", "Planning, delivery and reporting", "From ambition to evidence")
    p(
        doc,
        "The planning workspace links the long-range Roadmap to the Strategic Plan and the Annual Operational Plan (AOP). Projects, activities, milestones, KPIs and progress updates sit underneath that structure, so delivery evidence rolls upward into consolidated reports.",
    )

    h2(doc, "The plan hierarchy")
    table(
        doc,
        ["Level", "Purpose", "Typical horizon", "What it contains"],
        [
            ["Roadmap", "The long-range direction for the enterprise.", "2026–2035", "Pillars, strategic goals, major outcomes and long-range targets."],
            ["Strategic Plan", "The multi-year strategy that operationalises the roadmap.", "Five years", "Objectives, strategies, KPIs, milestones and budget envelopes."],
            ["Annual Operational Plan", "The current-year commitments, owners, budgets and monthly delivery schedule.", "One fiscal year", "Activities, sub-activities, owners, budgets, monthly phasing, KPIs and milestones."],
            ["Project / work package", "The delivery vehicle for a defined scope, team and budget.", "Project-specific", "Work packages, activities, milestones, documents, risks and progress."],
        ],
        widths=[3.3, 5.7, 2.8, 5.3],
        size=8.2,
        first_bold=True,
    )

    h2(doc, "Plan periods renew themselves")
    p(doc, "Every plan is linked to a **PlanPeriod**. The lifecycle is **Planned → Preparing → Active → Closing → Closed → Archived**. A daily job prepares the next period ahead of the end date, activates approved periods on their start date, closes ended periods and archives superseded ones.")
    bullet(doc, "The period selector at the top of each plan list switches between fiscal years and plan periods.")
    bullet(doc, "**Planning Calendar** shows the full cycle, including preparation, activation, close and archive dates.")
    bullet(doc, "A rollover dry run shows the carry-forward diff before anything is committed. Structure, unfinished activities, budgets and KPI definitions carry over; each KPI is re-based on its last actual and readings are re-dated into the new period.")
    figure(doc, "10-planning-calendar.jpg", "Planning Calendar — the governed cycle of preparation, activation, closure and archive.", 16.2)

    h2(doc, "Open and work in a plan")
    figure(doc, "06-annual-plan.jpg", "Annual Plan list. Use the period selector to move between fiscal years before opening a plan.", 16.2)
    numbered(doc, "Choose **Annual Plan**, **Strategic Plan** or **Roadmap** from the left navigation.")
    numbered(doc, "Select the correct period at the top of the list. The current period is marked; historical periods remain available for audit.")
    numbered(doc, "Open the plan and use the tabs: **Structure**, **KPIs & targets**, **Actuals entry**, **Reporting deadlines**, **Alerts**, **Share & feedback**, **History** and **Settings**.")
    numbered(doc, "Edit the structure carefully. Use the item type that matches the evidence: activity, milestone, KPI or goal. Do not create a second item to represent the same deliverable.")
    numbered(doc, "Save, then review the roll-up. Completion is calculated from child items, milestones and KPI actuals.")

    h2(doc, "Approval and publication")
    p(doc, "Plans move through **Draft → Submit for review → Approve → Publish**. Approving or publishing stores a revision snapshot that can be downloaded from the History tab. Only administrators approve, publish or reopen a plan.")
    bullet(doc, "**Submit for review** asks the plan owner to confirm the structure, targets and budget.")
    bullet(doc, "**Approve** records the decision and creates a durable revision snapshot.")
    bullet(doc, "**Publish** makes the approved plan the current operating plan; public figures then read from it.")
    bullet(doc, "**Reopen** is an administrative action for a material correction. Record the reason in the change note so the audit trail explains why.")

    h2(doc, "Actuals and progress updates")
    p(doc, "The **Actuals entry** tab saves the reported value for every KPI in one period in a single call. The **Progress Updates** workspace captures narrative evidence, percentage progress, achievements, challenges, next steps and attachments.")
    figure(doc, "08-progress-updates.jpg", "Progress Updates — quarterly and monthly evidence, with owner notes and review status.", 16.2)
    numbered(doc, "Open **Progress Updates** and choose the plan and period.")
    numbered(doc, "Select the activity or milestone you own. Enter progress, a factual summary and any challenge or next step.")
    numbered(doc, "Attach evidence where it exists. Use the evidence to support the number; do not restate the whole plan.")
    numbered(doc, "Submit the update. A reviewer verifies it; only verified or reviewed updates count toward the monthly reporting gate.")
    numbered(doc, "If an item is complete, set the status and progress to 100%. Do not leave a completed deliverable at 90% simply because the final report is pending.")

    callout(
        doc,
        "The gate is evidence-based",
        "The monthly timesheet gate looks for **overdue reports** and **overdue activities or milestones with no verified progress update**. Entering a note without changing the status does not clear the obligation. Complete the evidence, then let the reviewer verify it.",
        "red",
    )

    h2(doc, "Consolidated reports")
    p(doc, "Consolidated Reports rebuild the annual, strategic or roadmap story from live plan evidence. Choose the report type, the plan (or latest current plan), then review the sections before downloading. The same report is available as PDF/print, Word, Excel and CSV.")
    figure(doc, "09-consolidated-reports.jpg", "Consolidated Reports — executive narrative, AI decision brief, matrices and accountability by task owner.", 16.2)
    table(
        doc,
        ["Section", "What it answers"],
        [
            ["Executive narrative", "What the plan delivered, the KPI story and the milestone story."],
            ["AI decision brief", "What the data signals, how confident the model is and which actions to take next."],
            ["Achievements / challenges / next steps", "The narrative evidence behind the numbers."],
            ["KPI, milestone and activity matrices", "Target, actual, progress, status and latest owner note for each item."],
            ["Accountability by task owner", "Who owns delivery, what is overdue and what evidence is missing."],
            ["Reporting obligations and roll-up", "Which reports are pending, submitted or approved, and how the period rolls up."],
        ],
        widths=[5.2, 11.8],
        size=8.4,
        first_bold=True,
    )

    h2(doc, "Share links, alerts and schedules")
    bullet(doc, "**Share & feedback** creates a restricted read-only link with an expiry date and optional revocation. Visitors can comment without an account; owners see unread counts.")
    bullet(doc, "Each share link exposes an `.ics` calendar feed of the plan's reporting deadlines.")
    bullet(doc, "**Plan Alerts** configures KPI pace, missed-target, overdue-activity and reporting-deadline alerts. The scheduler runs every six hours; email is optional.")
    bullet(doc, "**Report schedules** deliver consolidated reports weekly, monthly or quarterly. When SMTP is unavailable, the schedule is still recorded and the send is marked as skipped.")

    h2(doc, "Projects and delivery")
    figure(doc, "05-pms-projects.jpg", "PMS projects — portfolio status, budget, progress and the entry point to the project workspace.", 16.2)
    p(doc, "Each project has a workspace for work packages, activities, milestones, goals, risks, team, briefs, announcements, comments, timesheets and **documents**. The project workspace is the only place for project-specific files; those files never appear in the public library.")
    bullet(doc, "Use **Project → Documents** to attach contracts, approvals, reports and supporting files.")
    bullet(doc, "Use **Team** and **Comments** for collaboration. Critical decisions should also be recorded in the project brief or a formal document.")
    bullet(doc, "Use **Corporate Portfolios** for cross-project investment and delivery views, and **Project Portfolio** for PMS delivery; the project record remains the source of truth.")


def chapter_myhr(doc):
    h1(doc, "6", "My HR and the reporting gate", "Your obligations, in one place")
    p(
        doc,
        "My HR is the personal workspace for your induction, appraisal, timesheet, annual leave plan, pay record and document acknowledgements. It is also where the monthly reporting gate explains exactly what must be completed before a timesheet can be signed.",
    )
    figure(doc, "11-my-portal.jpg", "My HR — induction progress, performance appraisal, reporting gate, pay record and team signals.", 16.2)

    h2(doc, "The monthly timesheet gate")
    p(doc, "A timesheet is accepted only when the staff member has no overdue reporting obligations. The gate checks two things: pending plan reports past their due date, and overdue activities or milestones with no verified progress update. The same reasons are shown to the staff member, the supervisor and the HR reminder job.")
    table(
        doc,
        ["Gate state", "What it means", "What to do"],
        [
            ["Ready to submit", "No overdue reports or unverified overdue updates.", "Complete the month, sign and submit before the deadline."],
            ["Action required", "One or more blockers exist. The card lists each one with a **Resolve** link.", "Open the link, complete the report or update, then return to My HR and refresh."],
            ["Submitted", "The timesheet is already signed and submitted.", "Wait for supervisor approval. If a correction is genuinely required, contact HR; do not create a second sheet."],
            ["Past deadline", "The due date has passed and the sheet is still outstanding.", "Clear the blockers immediately and submit. The reminder trail records the delay."],
        ],
        widths=[3.4, 7.4, 6.2],
        size=8.4,
        first_bold=True,
    )

    h2(doc, "Complete and submit a timesheet")
    numbered(doc, "Open **My HR** and review the **Timesheet reporting gate** card. If it shows **Action required**, resolve every blocker first.")
    numbered(doc, "Enter hours against the correct project or regular work. Use the absence codes (for example AL, SL) instead of zero hours where the day was leave.")
    numbered(doc, "Choose **Save draft** at any time. Draft entries are private to you until submission.")
    numbered(doc, "When the gate is clear, choose **Sign & submit**. Enter the name that matches your signature record.")
    numbered(doc, "The timesheet moves to **Submitted** and the supervisor is notified. You cannot edit a submitted sheet; ask HR if a correction is required.")

    callout(
        doc,
        "Deadline and reminders",
        "The reporting day is configured by HR (normally the 25th). It is inclusive: you may submit throughout that day. Reminders are sent five days before, two days before, on the due date and after the due date, including a nudge about the previous month's outstanding sheet. Each reminder includes the actual blockers, not just a generic warning.",
        "gold",
    )

    h2(doc, "Induction")
    p(doc, "The induction checklist appears when HR opens it for you. Tick each task as it is completed; the ring shows the percentage complete. If a task is reopened by HR, the reason is shown with the task. Complete the checklist during the probation period and raise any missing item with your supervisor.")

    h2(doc, "Performance appraisal")
    p(doc, "Your appraisal uses the criteria currently set by HR. Each criterion has a description, weight, scoring scale and evaluator guidance. Two cycles normally run each fiscal year, July–December and January–July.")
    numbered(doc, "Open **My HR → Performance appraisal** while the status is **Self-assessment open**.")
    numbered(doc, "Score each criterion using the scale shown. The scale is dynamic; a criterion may use five points, a ten-point scale or another configured maximum.")
    numbered(doc, "Write a specific self-summary: what you delivered, what you learned and what support you need next.")
    numbered(doc, "Choose **Save draft** until you are ready, then **Submit self-assessment**.")
    numbered(doc, "Your supervisor scores the same criteria. Supervisor feedback appears on the card when the review is complete; the final rating is recorded in your file.")

    h2(doc, "Annual leave plan, pay and personal documents")
    bullet(doc, "**Annual leave plan** proposes your leave ranges for the year. Submit it for supervisor approval and HR verification. Use the leave request form for changes after the plan is approved.")
    bullet(doc, "**Pay record** shows your latest base salary, allowance, gross and history. Payslip PDFs are issued by payroll each month and filed to your documents.")
    bullet(doc, "**Personal documents** lists contracts, IDs, licences, certificates and medical records. Acknowledge or sign a document when requested; the signature record includes the name, time and file version.")
    bullet(doc, "**My tasks** shows personal actions from HR, planning and approvals. Clear them in date order; overdue items are highlighted.")
