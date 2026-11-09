import { NavLink } from "react-router-dom";
import { BarChart3, Briefcase, Database, Target, TrendingUp } from "lucide-react";
import { useAuth } from "../lib/auth";
import { canAccess } from "../lib/access";

/**
 * PMS workspace tabs, rendered inside the page instead of the global header.
 * The active pill uses the same gold-on-navy treatment as the sidebar.
 */
const TABS = [
  { key: "pms", path: "/pms-dashboard", label: "PMS Dashboard", icon: BarChart3 },
  { key: "pms", path: "/database/pms", label: "Project Details", icon: Database, end: true },
  { key: "pms", path: "/goals", label: "Goals", icon: Target },
  { key: "pms", path: "/portfolios", label: "Portfolios", icon: Briefcase },
  { key: "reports", path: "/executive", label: "Executive", icon: TrendingUp },
];

export default function PmsTabs() {
  const { user } = useAuth();
  const tabs = TABS.filter((tab) => canAccess(user, tab.key));
  if (tabs.length === 0) return null;

  return (
    <nav className="pms-tabs" aria-label="PMS workspace">
      {tabs.map(({ path, label, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) => `pms-tab${isActive ? " is-active" : ""}`}
        >
          <Icon size={16} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
