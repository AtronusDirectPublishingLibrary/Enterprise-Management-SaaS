import {
  BadgeCheck,
  Briefcase,
  ClipboardCheck,
  FileSignature,
  FileText,
  Megaphone,
  Search,
  UserCheck,
  Users,
} from "lucide-react";

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "1 · Identify the need",
    actor: "Hiring manager",
    timing: "Before the quarter starts",
    body: "Confirm the workload, establishment and budget. A new role needs an approved annual-plan line; a replacement needs the leaver's position and grade.",
  },
  {
    icon: FileSignature,
    title: "2 · Raise the requisition",
    actor: "Hiring manager",
    timing: "Day 0",
    body: "Complete the online recruitment request: position, department, grade, number of openings, reason, budget status, target start date, justification and key requirements.",
  },
  {
    icon: Users,
    title: "3 · HR review and signed approval",
    actor: "HR Manager / Executive",
    timing: "Within 2 working days",
    body: "HR checks the establishment, grade and budget, then approves or rejects with an electronic signature. Approval automatically opens a draft vacancy.",
  },
  {
    icon: FileText,
    title: "4 · Confirm the job description",
    actor: "HR + hiring manager",
    timing: "Before advertising",
    body: "Upload the current JD to the library, assign it to the role holder or candidates, and use it as the single source for the advert and interview questions.",
  },
  {
    icon: Megaphone,
    title: "5 · Advertise",
    actor: "HR",
    timing: "Minimum 10 calendar days",
    body: "Publish the vacancy to the Careers page and internal channels. State the closing date, location, employment type and application requirements.",
  },
  {
    icon: Search,
    title: "6 · Screen and shortlist",
    actor: "HR + panel",
    timing: "Within 5 days of closing",
    body: "Score applications against the JD. Record the shortlisting decision, keep the long list, and invite only candidates who meet the mandatory criteria.",
  },
  {
    icon: UserCheck,
    title: "7 · Interview and select",
    actor: "Panel",
    timing: "Within 10 days",
    body: "Use a structured scorecard with the same questions for every candidate. Record ratings and panel notes in the pipeline; declare conflicts of interest.",
  },
  {
    icon: BadgeCheck,
    title: "8 · Offer, sign and onboard",
    actor: "HR",
    timing: "Before the start date",
    body: "Complete reference and credential checks, issue the offer and contract for signature, then deploy the hire into the staff portal and induction checklist.",
  },
];

export default function RecruitmentProcedurePanel({ onStart }) {
  return (
    <div>
      <div className="hrx-card mb-4">
        <div className="hrx-card-head">
          <div>
            <h2 className="d-flex align-items-center gap-2"><Briefcase size={16} /> Recruitment procedure</h2>
            <div className="small text-muted">
              End-to-end standard for every hire: need → signed requisition → JD → advert → selection → signed offer → onboarding.
            </div>
          </div>
          {onStart ? (
            <button type="button" className="btn btn-sm btn-brand" onClick={onStart}>
              Start a requisition
            </button>
          ) : null}
        </div>
        <div className="hrx-card-body">
          <div className="row g-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div className="col-md-6" key={step.title}>
                  <div className="h-100 p-3 rounded" style={{ background: "#f8fafc", border: "1px solid var(--hrx-line)" }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 34, height: 34, background: "var(--brand-primary)", color: "var(--brand-secondary)" }}>
                        <Icon size={16} />
                      </span>
                      <div>
                        <div className="fw-bold small">{step.title}</div>
                        <div className="text-muted" style={{ fontSize: "0.72rem" }}>{step.actor} · {step.timing}</div>
                      </div>
                    </div>
                    <p className="small text-muted mb-0">{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="hrx-card h-100">
            <div className="hrx-card-head"><h2>Request form — required information</h2></div>
            <div className="hrx-card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle">
                  <thead className="table-light">
                    <tr><th>Field</th><th>Requirement</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="fw-semibold small">Position title & department</td><td className="small text-muted">Use the approved establishment title, not a working title.</td></tr>
                    <tr><td className="fw-semibold small">Number of positions</td><td className="small text-muted">One request may cover a maximum of 99 identical posts.</td></tr>
                    <tr><td className="fw-semibold small">Reason</td><td className="small text-muted">New position, replacement or temporary cover — attach the leaver's name for a replacement.</td></tr>
                    <tr><td className="fw-semibold small">Grade & budget status</td><td className="small text-muted">Must match the approved structure and cost centre.</td></tr>
                    <tr><td className="fw-semibold small">Target start date</td><td className="small text-muted">Allow at least 6–8 weeks for advertising, interviews and onboarding.</td></tr>
                    <tr><td className="fw-semibold small">Justification & requirements</td><td className="small text-muted">Link to workload/projects and list mandatory qualifications, licences and experience.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="hrx-card h-100">
            <div className="hrx-card-head"><h2>Controls</h2></div>
            <div className="hrx-card-body">
              <ul className="small text-muted mb-0 ps-3">
                <li className="mb-2"><strong className="text-dark">Segregation of duties.</strong> The requester cannot approve their own requisition.</li>
                <li className="mb-2"><strong className="text-dark">Signed decisions.</strong> Submission, approval and rejection are recorded with name, time and optional signature image.</li>
                <li className="mb-2"><strong className="text-dark">JD before advert.</strong> A vacancy should not be published until the job description is on file.</li>
                <li className="mb-2"><strong className="text-dark">Evidence retention.</strong> Requisitions, shortlists, interview scores and offers stay with the recruitment record.</li>
                <li className="mb-2"><strong className="text-dark">Equal opportunity.</strong> Adverts use objective criteria; every shortlisted candidate is scored against the same JD.</li>
                <li><strong className="text-dark">Privacy.</strong> Candidate CVs are visible to HR and the panel only; employee JDs are visible only to the assignee.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
