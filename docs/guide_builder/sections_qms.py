from .common import (
    h1, h2, p, bullet, numbered, callout, table, NAVY, MUTED,
)


def chapter_qms(doc):
    h1(doc, "12", "Quality Management System", "Control the document, the event and the correction")

    p(
        doc,
        "The Quality Management System (QMS) is the controlled quality workspace for Ethio-Biopharma. "
        "It covers the full WHO-aligned quality loop: controlled documents, deviations, corrective and "
        "preventive action (CAPA) and change control. Every record has a code, an owner, a status, a "
        "decision trail and an audit entry.",
        size=11.5,
        line=1.35,
    )
    p(
        doc,
        "The QMS is deliberately evidence-led. A document is not effective until it is approved, a deviation "
        "is not closed until the root cause and investigation are recorded, a CAPA is not closed until QA has "
        "verified effectiveness, and a change is not closed until implementation is confirmed. The overview "
        "page shows what is still open, overdue or waiting for a decision.",
    )

    callout(
        doc,
        "The quality rule",
        "Do not close a record to clear a dashboard. Close it only when the evidence is complete: approved "
        "document, investigated deviation, verified CAPA, or implemented and reviewed change. The audit trail "
        "preserves who decided what and when.",
        "gold",
    )

    h2(doc, "QMS workspaces")
    table(
        doc,
        ["Workspace", "What it is for", "Main actions"],
        [
            ["QMS Overview", "The quality control tower: open events, due reviews, overdue CAPA and recent activity.", "Read the signals; open the register that needs attention."],
            ["Document Register", "Controlled SOPs, specifications, protocols, records, policies, work instructions and forms.", "Create, submit, approve, reject, supersede, obsolete and download."],
            ["Deviations", "Any departure from an approved process, specification, document or supplier requirement.", "Report, contain, investigate, record root cause and close."],
            ["CAPA", "Corrective and preventive actions linked to a deviation, audit, complaint or change.", "Raise, assign, start, submit for verification and close with effectiveness evidence."],
            ["Change Control", "Planned changes to documents, processes, equipment, facilities, systems or suppliers.", "Draft, assess impact, submit, approve, implement and close."],
        ],
        widths=[3.7, 7.6, 5.8],
        size=8.3,
        first_bold=True,
    )

    h2(doc, "Who can do what")
    table(
        doc,
        ["Position / role", "Access", "Create", "Approve / close"],
        [
            ["Admin, Strategy and Planning Officer", "Full QMS", "Yes", "Yes"],
            ["Chief Executive Officer", "Full QMS", "Yes", "Yes"],
            ["QA and regulatory Affairs Officer", "Full QMS", "Yes", "Yes"],
            ["Human Resource and Administration Manager", "Read + create HR documents and quality records", "Yes", "No"],
            ["Operation Manager", "Read + create production documents and quality records", "Yes", "No"],
            ["Engineer, IT Officer, Executive", "Read-only", "No", "No"],
            ["Everyone else", "No QMS tab", "No", "No"],
        ],
        widths=[5.4, 6.1, 2.5, 3.1],
        size=8.2,
        first_bold=True,
    )
    p(
        doc,
        "Approval authority is held by the QA and Regulatory Affairs Officer, the Chief Executive Officer "
        "and administrators (including the Strategy and Planning Officer). Owners can edit and progress their "
        "own records. A person without the `qms` grant does not see the Quality (QMS) group in the sidebar and "
        "receives HTTP 403 from the API.",
        size=10.5,
        color=MUTED,
    )

    h2(doc, "Document control lifecycle")
    table(
        doc,
        ["Stage", "Who acts", "What must be true"],
        [
            ["DRAFT", "Owner or QMS approver", "Identification, category, owner and version are recorded; the controlled file is attached."],
            ["IN_REVIEW", "Owner submits", "The draft is complete and the approver is notified."],
            ["APPROVED", "QMS approver", "The approver records the decision; effective date and next review date are set."],
            ["SUPERSEDED", "Owner or QMS approver", "A new major version is created; the previous version is retained and read-only."],
            ["OBSOLETE", "QMS approver", "The approved document is withdrawn from use but kept for audit history."],
        ],
        widths=[3.2, 4.0, 9.9],
        size=8.3,
        first_bold=True,
    )
    numbered(doc, "Open **Quality (QMS) → Document Register** and choose **Add document**.")
    numbered(doc, "Complete the identification, version, people, file and lifecycle sections. Code format is `SOP-QA-001`; version format is `1.0` or `2.1`.")
    numbered(doc, "Choose **Create draft**, open the record, then choose **Submit for review**.")
    numbered(doc, "As a QMS approver, choose **Approve** or **Reject** with a reason. A rejected document returns to DRAFT and keeps the reason.")
    numbered(doc, "To revise an approved document, choose **Supersede**, record the change summary and attach the new file. The previous version becomes SUPERSEDED.")

    h2(doc, "Deviation management")
    p(
        doc,
        "Use a deviation for any unplanned departure: a skipped process step, out-of-specification result, "
        "document error, supplier failure, complaint or audit finding. Record what happened factually and "
        "separate it from the cause. Immediate containment is recorded before the investigation begins.",
    )
    numbered(doc, "Open **Quality (QMS) → Deviations** and choose **Report deviation**.")
    numbered(doc, "Record title, factual description, category, severity, source, department, owner and immediate containment.")
    numbered(doc, "The owner or a QMS approver chooses **Start investigation**. Status becomes UNDER_INVESTIGATION.")
    numbered(doc, "Record the root cause, investigation summary and closure decision. Only a QMS approver can close.")
    numbered(doc, "If corrective action is needed, choose **Create CAPA** from the deviation detail. The deviation code is carried into the CAPA source reference.")

    h2(doc, "CAPA lifecycle")
    p(
        doc,
        "CAPA converts an investigation into a controlled action. A corrective action removes the cause of an "
        "existing problem; a preventive action reduces the risk of a potential one. The action is not closed "
        "when the task is done — it is closed when QA verifies that it worked.",
    )
    table(
        doc,
        ["Status", "Meaning", "Next action"],
        [
            ["OPEN", "Action created and assigned.", "Owner starts the action."],
            ["IN_PROGRESS", "Action plan being implemented.", "Owner records the effectiveness check and submits."],
            ["PENDING_VERIFICATION", "QA review required.", "QMS approver verifies effectiveness."],
            ["CLOSED", "Effectiveness confirmed; action complete.", "No further transition."],
        ],
        widths=[3.2, 7.4, 6.5],
        size=8.3,
        first_bold=True,
    )
    numbered(doc, "Open **Quality (QMS) → CAPA** and choose **Raise CAPA**.")
    numbered(doc, "Record the title, description, type, source, linked deviation, owner, due date, root cause and action plan.")
    numbered(doc, "Choose **Start action**, then **Submit for verification** with the evidence that will be reviewed.")
    numbered(doc, "As a QMS approver, choose **Verify effectiveness**. Effective closes the CAPA; not effective returns it to IN_PROGRESS with the verification notes retained.")

    h2(doc, "Change control lifecycle")
    p(
        doc,
        "Change control protects the validated state. Any planned change to a document, process, equipment, "
        "facility, system or supplier should be assessed before implementation. The risk level and impact "
        "assessment determine how much evidence and approval the change needs.",
    )
    table(
        doc,
        ["Status", "Who acts", "Gate"],
        [
            ["DRAFT", "Owner or QMS approver", "Reason, description, risk and impact assessment recorded."],
            ["IN_REVIEW", "Owner submits", "QA approvers are notified."],
            ["APPROVED", "QMS approver", "Approval recorded; implementation may begin."],
            ["IMPLEMENTED", "Owner or QMS approver", "Implementation date recorded."],
            ["CLOSED", "QMS approver", "Closure notes confirm the outcome."],
            ["REJECTED / DRAFT", "QMS approver", "Reason recorded; owner corrects and resubmits."],
        ],
        widths=[3.2, 4.3, 9.6],
        size=8.3,
        first_bold=True,
    )
    numbered(doc, "Open **Quality (QMS) → Change Control** and choose **Request change**.")
    numbered(doc, "Record the title, what will change, reason, category, risk level, department, owner, related document and target effective date.")
    numbered(doc, "Complete the impact assessment and implementation plan, then choose **Create draft**.")
    numbered(doc, "The owner chooses **Submit for review**. A QMS approver chooses **Approve** or **Reject** with a reason.")
    numbered(doc, "After implementation, the owner records **Implementation**. A QMS approver reviews the evidence and chooses **Close change**.")

    h2(doc, "Reading the QMS overview")
    p(
        doc,
        "The overview is the daily quality stand-up. The four KPI cards show controlled documents, open "
        "deviations, open CAPA and change controls. **Quality signals** highlights documents due for review, "
        "critical deviations, overdue CAPA and CAPA awaiting verification. Select any signal to open the "
        "filtered register.",
    )
    bullet(doc, "**Documents due for review** — approved documents whose review date is inside the next 30 days. The daily reminder job also notifies the owner.")
    bullet(doc, "**Critical deviations** — critical events still OPEN or UNDER_INVESTIGATION. Escalate these first.")
    bullet(doc, "**Overdue CAPA** — open actions past their due date. Review the action plan and due date with the owner.")
    bullet(doc, "**CAPA awaiting verification** — actions ready for QA. Verify the evidence; do not close on the owner's assertion alone.")
    bullet(doc, "**Recent quality activity** — the latest document, deviation, CAPA and change records, with direct links.")

    h2(doc, "Audit and evidence")
    p(
        doc,
        "Every mutation writes to the audit log with the signed-in username, timestamp and a summary of the "
        "record. State transitions also create in-app notifications for the owner or approver. The following "
        "actions are recorded:",
    )
    table(
        doc,
        ["Area", "Audit actions"],
        [
            ["Documents", "QMS_DOC_CREATED, QMS_DOC_UPDATED, QMS_DOC_SUBMITTED, QMS_DOC_APPROVED, QMS_DOC_REJECTED, QMS_DOC_SUPERSEDED, QMS_DOC_OBSOLETED, QMS_DOC_DOWNLOADED"],
            ["Deviations", "QMS_DEVIATION_CREATED, QMS_DEVIATION_UPDATED, QMS_DEVIATION_INVESTIGATION_STARTED, QMS_DEVIATION_CLOSED"],
            ["CAPA", "QMS_CAPA_CREATED, QMS_CAPA_UPDATED, QMS_CAPA_STARTED, QMS_CAPA_SUBMITTED_FOR_VERIFICATION, QMS_CAPA_CLOSED, QMS_CAPA_RETURNED"],
            ["Changes", "QMS_CHANGE_CREATED, QMS_CHANGE_UPDATED, QMS_CHANGE_SUBMITTED, QMS_CHANGE_APPROVED, QMS_CHANGE_REJECTED, QMS_CHANGE_IMPLEMENTED, QMS_CHANGE_CLOSED"],
            ["Reminders", "QMS_REVIEW_REMINDER"],
        ],
        widths=[3.0, 14.1],
        size=7.8,
        first_bold=True,
    )

    h2(doc, "Common mistakes to avoid")
    bullet(doc, "**Do not report a deviation as a CAPA.** A deviation records the event and investigation; the CAPA records the correction and prevention. Link them.")
    bullet(doc, "**Do not close a CAPA without an effectiveness check.** The closure must state what evidence was reviewed and why recurrence is unlikely.")
    bullet(doc, "**Do not edit an approved document.** Use **Supersede** to create the next version; the previous version stays visible in the version history.")
    bullet(doc, "**Do not implement a change before approval.** Record the impact assessment and obtain QA approval first.")
    bullet(doc, "**Do not reuse a document code for a different document family.** The code identifies the family; the version distinguishes revisions.")

    callout(
        doc,
        "When in doubt, leave it open",
        "An open quality record is visible and actionable. A prematurely closed record hides the risk. If the "
        "evidence is incomplete, leave the record in progress and record what is still required.",
        "red",
    )
