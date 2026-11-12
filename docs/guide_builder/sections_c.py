from .common import h1, h2, h3, p, bullet, numbered, figure, callout, table, NAVY, GOLD, MUTED


def chapter_hr(doc):
    h1(doc, "7", "HR administration", "People records that hold together")
    p(
        doc,
        "The HR suite is the operational home for the staff record: position, supervisor, employment type, contract dates, leave, training, appraisals, recruitment, induction, payroll and offboarding. It is also the source of the position that drives access across EB-EMS.",
    )
    figure(doc, "12-hr-suite.jpg", "HR Suite — the staff directory and the HR tabs. Every staff edit should use the existing person record.", 16.2)

    h2(doc, "Staff directory")
    numbered(doc, "Open **HR Suite → Staff directory**.")
    numbered(doc, "Search by name, username, department or position before adding a person. Duplicate accounts split leave, timesheets, appraisals and audit history.")
    numbered(doc, "Choose **Add staff** or open an existing row to edit. Complete position, department, supervisor, employment type, hire date and contract end.")
    numbered(doc, "Set the role only when the technical role is genuinely different from the position. The position controls workspace access; the role is a legacy fallback.")
    numbered(doc, "Save and ask the person to sign in. If the temporary password must change, the system prompts on first use.")
    bullet(doc, "**Bulk CSV** imports staff. Download the template first, keep the header names, and review the added/skipped counts before trying again.")
    bullet(doc, "**Leave types**, **Leave balances** and **Holidays** define entitlements and the working calendar used by timesheets and leave requests.")
    bullet(doc, "**Access matrix** shows which tabs each position receives. Change the position, not the matrix, for an individual.")

    h2(doc, "Training history")
    p(doc, "Every staff member has a training history. The record is used for compliance evidence, expiry alerts, promotion readiness and appraisal conversations. A certificate link keeps the evidence with the record rather than in a personal folder.")
    numbered(doc, "Open **HR Suite → Training**.")
    numbered(doc, "Choose **+ Add Training Record** and select the staff member.")
    numbered(doc, "Enter the course or certification, provider, category, completed date, expiry date (if any), hours and result.")
    numbered(doc, "Add the certificate link and a short note. Do not upload personal medical records here; use the staff document category instead.")
    numbered(doc, "Save. Use the filter to review a person's history or a provider, and use edit/delete only for a genuine correction.")
    table(
        doc,
        ["Field", "Purpose", "Example"],
        [
            ["Category", "Groups the course for reporting and competence review.", "GMP, Compliance, Safety, Technical, Leadership, Soft skills, Other"],
            ["Completed", "The date the course was completed or the certificate issued.", "10 Nov 2026"],
            ["Expires", "Triggers expiry and renewal alerts; leave blank for non-expiring learning.", "09 Nov 2028"],
            ["Hours", "Supports annual training-hour reporting.", "3.5"],
            ["Result", "Records completion, pass, distinction or attendance.", "Pass"],
            ["Certificate link", "Points to the evidence file or URL.", "https://… or /uploads/…"],
            ["Notes", "Short context for the record; never a substitute for the certificate.", "Internal QA refresher"],
        ],
        widths=[3.0, 8.1, 5.9],
        size=8.3,
        first_bold=True,
    )

    h2(doc, "Dynamic appraisal framework")
    p(doc, "HR owns the evaluation framework. Criteria, descriptions, categories, weights, scoring scales, guidance and department scope are editable in the UI. New and draft appraisals take the current framework; completed appraisals keep the criteria and scores they were signed with, so history never moves.")
    figure(doc, "20-appraisal-framework.jpg", "Induction & Appraisals → Framework — add, edit and retire evaluation criteria; the weight total is shown at the top.", 16.2)
    numbered(doc, "Open **Induction & Appraisals → Framework**.")
    numbered(doc, "Choose **Add criterion**. Enter the title, what it measures, evaluator guidance and category.")
    numbered(doc, "Set the weight and scoring scale. Weights should total 100%; the chip turns to a warning when they do not.")
    numbered(doc, "Optionally scope the criterion to a department. Leave the field blank to apply it to everyone.")
    numbered(doc, "Keep **Active for new and draft appraisals** on, then save.")
    numbered(doc, "Use the pencil to edit or the bin to retire a criterion. Review the framework before opening a new cycle.")
    bullet(doc, "**Open cycle** in the Appraisals tab creates the cycle's appraisal records from the active criteria.")
    bullet(doc, "The staff member completes the self-assessment; the supervisor scores the same criteria and writes the manager summary.")
    bullet(doc, "The final rating is weighted by the criteria and recorded in the staff file. Do not change a completed appraisal to reflect a later framework; open a new cycle instead.")

    callout(
        doc,
        "Framework governance",
        "A framework change can move every draft score. Agree the criteria with the CEO or delegated committee before opening a cycle, then lock the framework for the cycle. The guide recommends one review per fiscal year, before the first cycle opens.",
        "gold",
    )

    h2(doc, "Leave, balances and holidays")
    bullet(doc, "Leave requests follow supervisor approval and, where required, HR verification. Rejections require a reason, which is visible to the requester.")
    bullet(doc, "Balances are maintained by leave type and year. Use the CSV export for reconciliation; do not edit a balance in two places.")
    bullet(doc, "Public holidays feed the working-day calculation. Add the official holiday calendar before opening the leave year.")

    h2(doc, "Recruitment, induction and offboarding")
    bullet(doc, "**Recruitment** manages vacancies, applicants and the pipeline. Keep the job description, interview record and decision together.")
    bullet(doc, "**Induction & Appraisals** opens the onboarding checklist and the appraisal cycle. A new staff member should see the induction checklist in My HR on the first day.")
    bullet(doc, "**Offboarding** manages clearance, final documentation and access removal. Remove access on the last working day; the audit log retains the work history.")

    h2(doc, "Payroll and payslips")
    figure(doc, "13-payroll.jpg", "Payroll — monthly preparation, approval and payslip issue. Payroll is restricted to authorised finance and HR positions.", 16.2)
    p(doc, "Payroll calculates from the approved salary record and the month's attendance, leave and allowances. Finance prepares; the authorised manager approves; payslips are issued to each staff member's private record.")
    numbered(doc, "Confirm the payroll month and the staff included. Resolve missing salary records before calculation.")
    numbered(doc, "Review gross pay, allowances, deductions and any one-off adjustment. Record the reason for every manual change.")
    numbered(doc, "Submit for approval. The approver checks the control totals and approves the run.")
    numbered(doc, "Issue payslips. Each person sees only their own payslip; finance retains the payroll report.")
    numbered(doc, "Export the payment file or report required by the bank and retain the reconciliation with the payroll run.")
    callout(doc, "Payroll is sensitive", "Do not send payroll files by ordinary email or store them in a shared folder. Use the payroll workspace and the approved secure channel. The audit log records who prepared, approved and issued a run.", "red")


def chapter_fleet(doc):
    h1(doc, "8", "Fleet and transport", "Safe, accountable mobility")
    p(
        doc,
        "The Fleet & Transport module manages vehicles, drivers, trip requests and ride-service fallbacks. Every request has a requester, a supervisor decision, a fleet decision, an assigned vehicle or provider, a gate pass and a completion record. No one can approve their own request.",
    )
    figure(doc, "14-fleet-dashboard.jpg", "Fleet dashboard — active requests, vehicle availability and the entry points for requests, approvals, vehicles and cost control.", 16.2)

    h2(doc, "Request lifecycle")
    table(
        doc,
        ["State", "Meaning", "Who moves it forward"],
        [
            ["PENDING", "Submitted and waiting for the supervisor.", "Supervisor approves or rejects; requester may cancel."],
            ["SUPERVISOR_APPROVED", "Supervisor approved; waiting for fleet assignment.", "Fleet manager approves/rejects; requester may cancel."],
            ["ASSIGNED", "Vehicle and driver, or ride provider, assigned; gate pass issued.", "Requester or fleet starts the trip."],
            ["IN_PROGRESS", "The trip has started.", "Requester or fleet completes it."],
            ["COMPLETED", "Trip finished and vehicle returned to Available.", "Terminal."],
            ["REJECTED / CANCELLED / EXPIRED", "Closed without a completed trip.", "Terminal; the reason is retained."],
        ],
        widths=[4.2, 8.0, 4.8],
        size=8.4,
        first_bold=True,
    )

    h2(doc, "Submit a vehicle request")
    figure(doc, "15-fleet-request.jpg", "New fleet request — purpose, dates, times, pickup, destination and passengers. The supervisor is resolved from the staff record.", 16.2)
    numbered(doc, "Open **Fleet → New request**.")
    numbered(doc, "Enter the trip purpose, departure and return dates, times, pickup location and destination.")
    numbered(doc, "Add passengers and any special requirement. Check the vehicle type and expected duration.")
    numbered(doc, "Submit. The request becomes **PENDING** and your immediate supervisor is notified.")
    numbered(doc, "Track it in **My requests**. You may cancel while it is PENDING or SUPERVISOR_APPROVED.")
    bullet(doc, "If no supervisor is assigned to your staff record, the request is rejected with a clear message. Ask HR to set your supervisor.")
    bullet(doc, "A **ride request** follows the same approval path but uses an approved ride provider. Complete it with the actual fare and receipt for finance.")
    bullet(doc, "A gate pass is issued automatically when a vehicle request is fleet-approved. It shows the gate pass number, driver, vehicle, requester, destination and a verification QR code.")

    h2(doc, "Approve and assign")
    numbered(doc, "As supervisor, open **My Approvals** or **Fleet → Approvals** and review the purpose, dates and destination.")
    numbered(doc, "Approve or reject with a reason. You cannot approve your own request.")
    numbered(doc, "As fleet manager, choose an available vehicle and driver. Confirm the vehicle is not already in use.")
    numbered(doc, "Approve the assignment. The vehicle becomes **In Use**, the gate pass is generated and the requester and driver are notified.")
    numbered(doc, "After the trip, start and complete the request so the vehicle returns to **Available**.")
    callout(doc, "Close the loop", "An unclosed trip keeps a vehicle out of the available pool. Complete the request on the day the vehicle returns, and record the actual fare or odometer reading where requested.", "gold")

    h2(doc, "Vehicles, drivers and settings")
    bullet(doc, "**Vehicles** holds the fleet inventory: type, plate, capacity, fuel type, odometer, maintenance dates and status.")
    bullet(doc, "**Drivers** holds the roster and availability. A driver can be linked to a staff account.")
    bullet(doc, "**Ride Services** holds approved providers and their contact and fare basis.")
    bullet(doc, "**Settings** controls auto-cleanup days, approval levels, reminder timing and whether an odometer reading is required.")
    bullet(doc, "The fleet manager is the position **Human Resource and Administration Manager**; administrators also have fleet access.")
