import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  CalendarRange,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Target,
  UserRoundCheck,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { accessSummary, canAccess } from "../lib/access";
import MfaCard from "../components/MfaCard";

const MODULES = {
  myhr: { label: "My Portal", path: "/my-hr", icon: UserRoundCheck, note: "Your profile, tasks, leave and documents" },
  approvals: { label: "My Approvals", path: "/my-approvals", icon: CheckSquare, note: "Leave and requests waiting for you" },
  progress: { label: "Progress Updates", path: "/progress-updates", icon: ClipboardList, note: "Report and verify period delivery" },
  reports: { label: "Consolidated Reports", path: "/reports", icon: BarChart3, note: "Annual, strategic and roadmap narratives" },
  pms: { label: "PMS (Projects)", path: "/database/pms", icon: Database, note: "Projects, work packages and milestones" },
  aop: { label: "Annual Plan", path: "/database/aop", icon: ClipboardCheck, note: "Current annual operating plan" },
  strategic: { label: "Strategic Plan", path: "/database/strategic-plan", icon: Target, note: "Multi-year strategic commitments" },
  roadmap: { label: "Roadmap", path: "/database/roadmap", icon: Landmark, note: "Long-range phases and outcomes" },
  calendar: { label: "Planning Calendar", path: "/planning-calendar", icon: CalendarRange, note: "Periods, rollovers and deadlines" },
  payroll: { label: "Payroll & Payslips", path: "/payroll", icon: Wallet, note: "Monthly pay and your payslips" },
  hr: { label: "HR Suite", path: "/hr", icon: Users, note: "Staff records and HR operations" },
  hrOps: { label: "Induction & Appraisals", path: "/hr-operations", icon: Briefcase, note: "Onboarding and performance cycles" },
  users: { label: "Users & Access", path: "/users", icon: ShieldCheck, note: "Accounts, positions and permissions" },
  languages: { label: "Language Settings", path: "/language-settings", icon: BookOpenCheck, note: "Manage labels and translations" },
};

const ACCESS_LABELS = {
  archive: "Document Archive",
  documents: "Manage Documents",
  news: "Manage News",
  alerts: "Plan Alerts",
  recruitment: "Recruitment",
  hrAnalytics: "Executive HR",
  settings: "Settings",
  publicSite: "Public Site",
  media: "Manage Media",
};

const RESPONSIBLE_USE = [
  {
    icon: LockKeyhole,
    title: "Protect every account",
    text: "Sign in with your own account, keep your password private and lock your device when you step away. Do not share a session or ask a colleague to enter data under your name.",
  },
  {
    icon: FileSpreadsheet,
    title: "Use the approved templates",
    text: "For bulk updates, always start from the CSV template on the PMS, Plan or Payroll page. Keep the column names unchanged, check the preview/result, and correct rows instead of creating duplicates.",
  },
  {
    icon: ClipboardCheck,
    title: "Record evidence, not guesses",
    text: "Enter actual delivery, dates and financial figures from approved sources. Progress updates become report evidence only after Strategy and Planning verification, so submit complete and accurate narratives.",
  },
  {
    icon: ShieldCheck,
    title: "Respect confidential data",
    text: "Payroll, HR files and personal records are private. Do not download, forward or screenshot them outside an approved business need. Share consolidated information only through the official report or export.",
  },
  {
    icon: BookOpenCheck,
    title: "Keep one source of truth",
    text: "Update the existing plan item, project or salary record when correcting information. Avoid duplicate records, blank required fields or unexplained status changes that distort dashboards and reports.",
  },
  {
    icon: Landmark,
    title: "Close the loop responsibly",
    text: "Check your approvals, deadlines and verification queue regularly. If you find an error, report it to the data owner or administrator promptly; do not delete or overwrite records to hide a mistake.",
  },
];

function profileFor(user) {
  const position = (user?.position || "").trim();
  const role = user?.role || "staff";

  if (role === "admin") {
    return {
      label: "System administrator",
      briefing:
        "You are the custodian of the database. Keep accounts, positions and master data accurate; protect the audit trail; and make sure each team can work in the modules they own without seeing data they do not need.",
      focus: ["Review new accounts and positions", "Check imports and data quality", "Keep periods and reports current"],
      modules: ["users", "reports", "calendar", "payroll", "aop", "pms"],
    };
  }
  if (role === "executive" || position === "Chief Executive Officer") {
    return {
      label: "Executive leadership",
      briefing:
        "You have an enterprise-wide view. Begin with the consolidated reports and exceptions, then use progress verification and plan delivery to decide where leadership attention is needed. Your payroll view is organisation-wide and confidential.",
      focus: ["Read the latest consolidated report", "Review delivery risks and pending approvals", "Keep executive data decisions documented"],
      modules: ["reports", "progress", "pms", "calendar", "payroll", "strategic"],
    };
  }
  if (position === "Strategy and Planning Officer") {
    return {
      label: "Strategy and planning",
      briefing:
        "You are the guardian of plan quality. Keep annual, strategic and roadmap items aligned, verify task-owner progress before it feeds reports, and use the planning calendar to keep periods and reporting deadlines moving.",
      focus: ["Verify submitted progress updates", "Reconcile plans with current period content", "Publish reports only from verified updates"],
      modules: ["progress", "reports", "aop", "strategic", "roadmap", "calendar", "payroll"],
    };
  }
  if (position === "Finance Manager" || position === "Finance Officer") {
    return {
      label: "Finance",
      briefing:
        "Finance owns the monthly payroll cycle and financial data quality. Set the pay month, import the approved CSV, review occasional earnings and other deductions, then generate and issue payslips through the approved channel.",
      focus: ["Complete the monthly payroll import", "Reconcile gross, PAYE, deductions and net", "Check plan budgets and financial reports"],
      modules: ["payroll", "reports", "aop", "pms", "myhr", "approvals"],
    };
  }
  if (position === "Human Resource and Administration Manager") {
    return {
      label: "Human resources",
      briefing:
        "You manage confidential people data and the employee lifecycle. Keep staff records and approvals current, support onboarding and appraisals, and use payroll only for authorised HR administration. Personal data must never be shared casually.",
      focus: ["Review HR records and approvals", "Support inductions and appraisal cycles", "Check the monthly payroll register"],
      modules: ["hr", "hrOps", "payroll", "myhr", "approvals", "pms"],
    };
  }
  if (position === "QA and regulatory Affairs Officer") {
    return {
      label: "Quality and regulatory affairs",
      briefing:
        "Your evidence should be traceable to approved regulatory and quality sources. Keep milestones, documents and corrective actions current, and use the plan structure to show how regulatory readiness is progressing.",
      focus: ["Update quality and regulatory milestones", "Keep supporting evidence in the archive", "Flag compliance risks early"],
      modules: ["pms", "progress", "strategic", "roadmap", "myhr", "approvals", "payroll"],
    };
  }
  if (role === "project_manager" || ["Operation Manager", "Engineer", "Property Management Officer", "Procurement Officer"].includes(position)) {
    return {
      label: "Delivery and operations",
      briefing:
        "You keep delivery data real. Update project status, milestones and activity progress as work moves, report only what can be evidenced, and escalate dependencies or risks before they become reporting surprises.",
      focus: ["Refresh project and activity progress", "Resolve overdue milestones", "Submit your period update"],
      modules: ["pms", "progress", "aop", "myhr", "approvals", "payroll", "reports"],
    };
  }
  return {
    label: position || "Staff member",
    briefing:
      "Your workspace starts with you: keep your profile and documents current, respond to approvals and submit honest progress updates for the tasks you own. You can always view your own pay and payslips; the full payroll register stays with Finance, HR and executives.",
    focus: ["Check your tasks and approvals", "Update your own progress evidence", "Open your latest payslip"],
    modules: ["myhr", "approvals", "progress", "payroll", "aop", "pms"],
  };
}

function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState(null);
  const now = new Date();
  const profile = profileFor(user);
  // Address people by first name on their home page; full names stay for
  // signatures, timesheets and formal documents.
  const name = user?.firstName || user?.username || "colleague";
  const modules = profile.modules
    .map((key) => ({ key, ...MODULES[key] }))
    .filter((module) => module.label && canAccess(user, module.key));
  const access = accessSummary(user).map((key) => MODULES[key]?.label || ACCESS_LABELS[key] || key);

  useEffect(() => {
    api.get("/home/briefing").then(setBriefing).catch(() => setBriefing(null));
  }, []);

  return (
    <div className="container-fluid py-4 home-page">
      <Helmet><title>Home | EBPE Database</title></Helmet>

      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow">Ethio-Biopharma · integrated performance database</div>
          <h1>{greeting(now)}, {name}.</h1>
          <p>
            Welcome to your workspace. This is the shared source of truth for plans, projects, performance and people.
            Use it carefully: what you record here informs reports, decisions and payroll.
          </p>
          <div className="home-hero-meta">
            <span>{now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span>
            <span>{profile.label}</span>
            {user?.username ? <span>Signed in as {user.username}</span> : null}
          </div>
        </div>
        <div className="home-hero-mark" aria-hidden="true">
          <Landmark size={48} />
          <span>One database.<br />One version of the truth.</span>
        </div>
      </section>

      {briefing?.actions?.length > 0 && (
        <section className="home-actions" aria-label="Your live priorities">
          {briefing.actions.map((action) => (
            <Link to={action.path} key={action.key} className={`home-action home-action--${action.tone}`}>
              <span className="home-action-count">{action.count}</span>
              <span>{action.label}</span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </section>
      )}

      <div className="row g-4 mt-1">
        <div className="col-xl-7">
          <section className="home-card home-briefing">
            <div className="home-card-head">
              <div>
                <div className="home-eyebrow">Your briefing note</div>
                <h2>What matters in your role</h2>
              </div>
              <span className="badge bg-light text-dark border">{profile.label}</span>
            </div>
            <p className="home-briefing-text">{profile.briefing}</p>
            <div className="home-focus-list">
              {profile.focus.map((item, index) => (
                <div className="home-focus" key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="col-xl-5">
          <section className="home-card h-100">
            <div className="home-card-head">
              <div>
                <div className="home-eyebrow">Start here</div>
                <h2>Your quick access</h2>
              </div>
            </div>
            <div className="home-quick-links">
              {modules.map(({ key, label, path, icon: Icon, note }) => (
                <Link to={path} className="home-quick-link" key={key}>
                  <span className="home-quick-icon"><Icon size={17} /></span>
                  <span>
                    <strong>{label}</strong>
                    <small>{note}</small>
                  </span>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
            <div className="home-access-note">
              <ShieldCheck size={15} />
              <span>Your access: {access.length ? access.join(", ") : "Personal workspace"}</span>
            </div>
          </section>
        </div>
      </div>

      <section className="home-section">
        <div className="row g-4">
          <div className="col-xl-7">
            <MfaCard />
          </div>
          <div className="col-xl-5">
            <div className="home-card h-100">
              <div className="home-card-head">
                <div>
                  <div className="home-eyebrow">Governance</div>
                  <h2>How this database is protected</h2>
                </div>
              </div>
              <ul className="small text-muted mb-0 ps-3 d-flex flex-column gap-2">
                <li>Every sign-in and change is written to the audit trail.</li>
                <li>Payroll changes need a second approver before payslips use them.</li>
                <li>Bulk imports are previewed first and can be rolled back from the import history.</li>
                <li>Payroll, HR files and personal records are visible only to the roles that need them.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <div>
            <div className="home-eyebrow">Data stewardship</div>
            <h2>How to use the database responsibly</h2>
          </div>
          <p>Six habits that protect the integrity, privacy and usefulness of every record.</p>
        </div>
        <div className="home-rules">
          {RESPONSIBLE_USE.map(({ icon: Icon, title, text }) => (
            <article className="home-rule" key={title}>
              <span className="home-rule-icon"><Icon size={18} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-footer-note">
        <div>
          <strong>Need something changed or see a data error?</strong>
          <span>Contact the data owner or system administrator. Do not overwrite another team's record or share your sign-in.</span>
        </div>
        <Link to="/my-hr" className="btn btn-sm btn-brand">
          Open My Portal <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
