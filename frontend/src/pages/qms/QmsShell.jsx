import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  FileText,
  GitPullRequest,
  LayoutDashboard,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const TABS = [
  { to: "/qms/overview", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/qms/documents", label: "Document Register", icon: FileText },
  { to: "/qms/deviations", label: "Deviations", icon: AlertTriangle },
  { to: "/qms/capa", label: "CAPA", icon: Wrench },
  { to: "/qms/changes", label: "Change Control", icon: GitPullRequest },
];

/**
 * One branded frame for every QMS workspace. The hero establishes the quality
 * system's authority; the tab rail keeps the four registers one click apart.
 */
export default function QmsShell({ title, description, actions, children }) {
  return (
    <div className="qms-page">
      <header className="qms-hero">
        <div className="qms-hero__copy">
          <div className="qms-hero__eyebrow">
            <ShieldCheck size={14} /> WHO-aligned quality management
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="qms-hero__meta">
            <span>Controlled workspace</span>
            <span>Full audit trail</span>
            <span>QA-owned lifecycle</span>
          </div>
        </div>
        {actions ? <div className="qms-hero__actions">{actions}</div> : null}
        <span className="qms-hero__mark" aria-hidden="true">QMS</span>
      </header>

      <nav className="qms-tabs" aria-label="Quality management sections">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `qms-tab ${isActive ? "is-active" : ""}`}
          >
            <Icon size={15} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="qms-content">{children}</div>
    </div>
  );
}
