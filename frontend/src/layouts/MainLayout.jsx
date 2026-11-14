import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  BellRing,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  Car,
  CarFront,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Database,
  FileText,
  Film,
  FolderKanban,
  GitPullRequest,
  Globe,
  LayoutDashboard,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Newspaper,
  PlusCircle,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Truck,
  Users as UsersIcon,
  Wallet,
  Wrench,
  X,
  ShoppingCart,
  Warehouse,
  Calculator,
  Handshake,
  Headphones,
  FolderOpen,
  Scale,
  PieChart,
  UsersRound,
  FileSignature,
  HardHat,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTenantContext } from "../lib/tenantContext";
import { api } from "../lib/api";
import NotificationBell from "../components/NotificationBell";
import Avatar from "../components/Avatar";
import GlobalSearch from "../components/GlobalSearch";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { canAccess, canAccessPath } from "../lib/access";

const GROUP_STORAGE_KEY = "ebems.sidebar.groups";

/**
 * The sidebar is deliberately organised by the work people do, not by the
 * database table a screen happens to use. Groups collapse, the active group
 * opens automatically, and every original destination keeps its own route.
 */
export default function MainLayout() {
  const { user, logout, refreshSession } = useAuth();
  const { tenant } = useTenantContext();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "";
  const orgName = tenant?.orgName || tenant?.name || "Ethio-Biopharma";

  const [navOpen, setNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) || "{}");
      return { workspace: true, planning: true, hr: true, fleet: true, qms: true, operations: true, admin: true, ...stored };
    } catch {
      return { workspace: true, planning: true, hr: true, fleet: true, qms: true, operations: true, admin: true };
    }
  });

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const groups = useMemo(
    () => [
      {
        key: "workspace",
        label: "Workspace",
        icon: LayoutDashboard,
        items: [
          { key: "dashboard", path: "/dashboard", label: "Home", icon: LayoutDashboard },
          { key: "pms", path: "/database/pms", label: "PMS (Projects)", icon: Database },
          { key: "pms", path: "/pms/goals", label: "Project Objectives", icon: ClipboardList },
          { key: "pms", path: "/pms/portfolio", label: "Project Portfolio", icon: FolderKanban },
          { key: "myhr", path: "/my-hr", label: "My Portal", icon: UsersIcon },
          { key: "approvals", path: "/my-approvals", label: "My Approvals", icon: CheckSquare },
          { key: null, path: "/team-tasks", label: "Team & Tasks", icon: ClipboardList },
        ],
      },
      {
        key: "planning",
        label: "Planning & Reporting",
        icon: Target,
        items: [
          { key: "aop", path: "/database/aop", label: "Annual Plan", icon: CalendarDays },
          { key: "strategic", path: "/database/strategic-plan", label: "Strategic Plan", icon: Target },
          { key: "roadmap", path: "/database/roadmap", label: "Roadmap", icon: Map },
          { key: "progress", path: "/progress-updates", label: "Progress Updates", icon: ClipboardList },
          { key: "reports", path: "/reports", label: "Consolidated Reports", icon: BarChart3 },
          { key: "calendar", path: "/planning-calendar", label: "Planning Calendar", icon: CalendarRange },
          { key: "alerts", path: "/plan-alerts", label: "Plan Alerts", icon: BellRing },
          { key: "pms", path: "/goals", label: "Corporate Objectives", icon: Target },
          { key: "pms", path: "/portfolios", label: "Corporate Portfolios", icon: Briefcase },
        ],
      },
      {
        key: "hr",
        label: "HR & Admin",
        icon: ShieldAlert,
        items: [
          { key: "hr", path: "/hr", label: "HR Suite", icon: UsersIcon },
          { key: "hrAnalytics", path: "/hr-analytics", label: "Executive HR", icon: TrendingUp },
          { key: "recruitment", path: "/recruitment", label: "Recruitment", icon: UsersIcon },
          { key: "hrOps", path: "/hr-operations", label: "Induction & Appraisals", icon: TrendingUp },
          { key: "payroll", path: "/payroll", label: "Payroll & Payslips", icon: Wallet },
        ],
      },
      {
        key: "fleet",
        label: "Fleet & Transport",
        icon: Truck,
        items: [
          { key: "fleet", path: "/fleet", label: "Fleet Dashboard", icon: Truck },
          { key: "fleet", path: "/fleet/requests", label: "Vehicle Requests", icon: ClipboardList },
          { key: "fleet", path: "/fleet/new", label: "New Request", icon: PlusCircle },
          { key: "fleet", path: "/fleet/approvals", label: "Fleet Approvals", icon: CheckSquare },
          { key: "fleet", path: "/fleet/vehicles", label: "Vehicles", icon: Car },
          { key: "fleet", path: "/fleet/drivers", label: "Drivers", icon: UsersIcon },
          { key: "fleet", path: "/fleet/rides", label: "Ride Services", icon: CarFront },
          { key: "fleet", path: "/fleet/cost-control", label: "Cost Control", icon: Wallet },
          { key: "fleet", path: "/fleet/analytics", label: "Fleet Analytics", icon: BarChart3 },
          { key: "fleet", path: "/fleet/settings", label: "Fleet Settings", icon: Settings },
        ],
      },
      {
        key: "qms",
        label: "Quality (QMS)",
        icon: ShieldCheck,
        items: [
          { key: "qms", path: "/qms/overview", label: "QMS Overview", icon: LayoutDashboard },
          { key: "qms", path: "/qms/documents", label: "Document Register", icon: FileText },
          { key: "qms", path: "/qms/deviations", label: "Deviations", icon: AlertTriangle },
          { key: "qms", path: "/qms/capa", label: "CAPA", icon: Wrench },
          { key: "qms", path: "/qms/changes", label: "Change Control", icon: GitPullRequest },
        ],
      },
      {
        key: "operations",
        label: "Operations & Enterprise Modules",
        icon: Briefcase,
        items: [
          { key: "procurement", path: "/procurement", label: "Procurement & Vendors", icon: ShoppingCart },
          { key: "warehouse", path: "/warehouse", label: "Inventory & WMS", icon: Warehouse },
          { key: "accounting", path: "/accounting", label: "Accounting (GL/AP/AR)", icon: Calculator },
          { key: "maintenance", path: "/maintenance", label: "Assets & Maintenance", icon: Wrench },
          { key: "crm", path: "/crm", label: "CRM & Sales", icon: Handshake },
          { key: "portals", path: "/external-portals", label: "External Portals", icon: UsersRound },
          { key: "helpdesk", path: "/helpdesk", label: "Helpdesk & ITSM", icon: Headphones },
          { key: "dms", path: "/dms", label: "DMS & Records", icon: FolderOpen },
          { key: "grc", path: "/grc", label: "GRC, Risk & Audit", icon: Scale },
          { key: "bi", path: "/bi", label: "BI & Advanced Analytics", icon: PieChart },
          { key: "resources", path: "/resources", label: "Resource & Capacity", icon: UsersIcon },
          { key: "contracts", path: "/contracts", label: "Contracts & Legal", icon: FileSignature },
          { key: "ehs", path: "/ehs", label: "EHS & Safety", icon: HardHat },
        ],
      },
      {
        key: "admin",
        label: "Content & Administration",
        icon: Settings,
        items: [
          { key: "settings", path: "/database/hero-settings", label: "Settings", icon: Settings },
          { key: "users", path: "/users", label: "Users", icon: UsersIcon },
          { key: "audit", path: "/audit-log", label: "Audit Trail", icon: ShieldAlert },
          { key: "languages", path: "/language-settings", label: "Language Settings", icon: Globe },
          { key: "publicSite", path: "/public-site", label: "Public Site", icon: Megaphone },
          { key: "archive", path: "/database/archive", label: "Internal Archive", icon: Archive },
          { key: "documents", path: "/manage-documents", label: "Public Library", icon: FileText },
          { key: "news", path: "/manage-news", label: "Manage News", icon: Newspaper },
          { key: "media", path: "/manage-media", label: "Manage Media", icon: Film },
        ],
      },
    ],
    [],
  );

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.key || canAccess(user, item.key)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, user],
  );

  useEffect(() => {
    const parent = visibleGroups.find((group) =>
      group.items.some((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)),
    );
    if (parent) {
      setOpenGroups((prev) => (prev[parent.key] ? prev : { ...prev, [parent.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private browsing: the menu still works for this session */
      }
      return next;
    });
  };

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isActive = (path) => location.pathname === path;

  const renderTab = (tab) => {
    const Icon = tab.icon;
    return (
      <NavLink
        key={`${tab.path}-${tab.label}`}
        to={tab.path}
        className={`app-nav-item d-flex align-items-center gap-2 ${isActive(tab.path) ? "is-active" : ""}`}
        title={tab.label}
      >
        <span className="app-nav-item__icon"><Icon size={16} /></span>
        <span className="app-nav-item__label">{tab.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="app-shell d-flex flex-column vh-100">
      <header
        className="app-header d-flex align-items-center justify-content-between px-4 py-2"
        style={{
          background: "var(--brand-primary)",
          color: "white",
          borderBottom: "3px solid var(--brand-secondary)",
          zIndex: 10,
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-sm d-lg-none p-1"
            style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "none" }}
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div
            className="app-brand"
            aria-label={`${orgName} Enterprise Management`}
          >
            {tenant?.logoUrl ? <img src={tenant.logoUrl} alt="" style={{ height: 28, marginRight: 8, borderRadius: 4 }} /> : null}
            <span className="app-brand__org">{orgName}</span>
            <span className="app-brand__system">Enterprise Management System</span>
            <span className="app-brand__badge" style={{ background: "var(--brand-secondary, #C9A227)", color: "#0B2545" }}>EMS</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3 text-white">
          <div className="d-none d-md-block">
            <GlobalSearch />
          </div>
          <NotificationBell style={{ color: "white" }} />
          {user?.isPlatformAdmin ? (
            <Link to="/platform/dashboard" className="btn btn-sm d-none d-md-inline-flex align-items-center gap-1" style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "none" }} title="Platform Admin">
              <Building2 size={14} /> Platform
            </Link>
          ) : null}
          <NavLink
            to="/my-hr"
            className="header-identity d-flex align-items-center gap-2 text-decoration-none"
            title="Open My Portal"
          >
            <Avatar name={displayName} src={user?.avatarUrl} size={34} ring />
            <span className="header-identity__text d-none d-md-flex">
              <strong>{displayName}</strong>
              <small>{user?.position || user?.role || "Staff"}</small>
            </span>
          </NavLink>
          <button
            className="btn btn-sm d-flex align-items-center gap-1"
            style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none" }}
            onClick={logout}
          >
            <LogOut size={14} />
            <span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="app-body d-flex flex-grow-1 overflow-hidden">
        {navOpen ? <div className="app-nav-backdrop d-lg-none" onClick={() => setNavOpen(false)} /> : null}
        <aside className={`app-sidebar ${navOpen ? "is-open" : ""}`}>
          <div className="app-sidebar__intro">
            <span className="app-sidebar__eyebrow">Workspace</span>
            <span className="app-sidebar__title" title={orgName}>{orgName.length > 18 ? orgName.slice(0,16) + "…" : orgName}</span>
          </div>

          {visibleGroups.map((group) => {
            const open = Boolean(openGroups[group.key]);
            const GroupIcon = group.icon;
            return (
              <nav className="app-nav-group" key={group.key} aria-label={group.label}>
                <button
                  type="button"
                  className={`app-nav-group__toggle ${open ? "is-open" : ""}`}
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={open}
                >
                  <GroupIcon size={15} />
                  <span>{group.label}</span>
                  <ChevronDown size={15} className="app-nav-group__chevron" />
                </button>
                {open ? (
                  <div className="app-nav-group__items">
                    {group.items.map(renderTab)}
                  </div>
                ) : null}
              </nav>
            );
          })}
        </aside>

        <main
          className="app-main flex-grow-1 p-4"
          style={{ background: "var(--brand-bg)", overflowY: "auto", overflowX: "auto", minWidth: 0 }}
        >
          {user?.impersonatingTenantId ? (
            <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <span><ShieldAlert size={16} className="me-1" /> Impersonation mode: viewing tenant <b>{tenant?.name || user.impersonatingTenantId}</b> as platform admin.</span>
              <button className="btn btn-sm btn-light" onClick={async () => { try { await api.post("/auth/switch-tenant", { tenantId: user.tenantId }); } catch {} try { if (refreshSession) await refreshSession(); } catch {} navigate("/platform/dashboard"); }}>Return to Platform</button>
            </div>
          ) : null}
          {user?.mfaEnrollmentRequired ? (
            <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <span>
                <ShieldAlert size={16} className="me-1" />
                Your role requires authenticator-app two-factor authentication. Enroll it to continue; passkeys are optional.
              </span>
              <NavLink className="btn btn-sm btn-dark" to="/account-security">Set up security</NavLink>
            </div>
          ) : null}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <footer className="app-credit-bar">
        <span>© {new Date().getFullYear()} {orgName}. All rights reserved.</span>
        <span>Powered by BEMS</span>
      </footer>
    </div>
  );
}
