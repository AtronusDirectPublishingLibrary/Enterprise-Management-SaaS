import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Database, LayoutDashboard, LogOut, Users as UsersIcon, Map, Target, CalendarDays, CalendarRange, Archive, Settings, ShieldAlert, TrendingUp, Globe, Newspaper, FileText, BellRing, CheckSquare, Film, Megaphone, Menu, X, ClipboardList, BarChart3, Wallet } from "lucide-react";
import { useAuth } from "../lib/auth";
import NotificationBell from "../components/NotificationBell";
import GlobalSearch from "../components/GlobalSearch";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { canAccess, canAccessPath } from "../lib/access";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  const isArchive = location.pathname === "/database/archive";
  const isSettings = location.pathname === "/database/hero-settings";
  const [navOpen, setNavOpen] = useState(false);

  // Close the drawer whenever the person moves to another page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Left Pane Tabs
    const dbTabs = [
    { key: "dashboard", path: "/dashboard", label: "Home", icon: <LayoutDashboard size={18} /> },
    { key: "pms", path: "/database/pms", label: "PMS (Projects)", icon: <Database size={18} /> },
    { key: "aop", path: "/database/aop", label: "Annual Plan", icon: <CalendarDays size={18} /> },
    { key: "strategic", path: "/database/strategic-plan", label: "Strategic Plan", icon: <Target size={18} /> },
    { key: "roadmap", path: "/database/roadmap", label: "Roadmap", icon: <Map size={18} /> },
    { key: "progress", path: "/progress-updates", label: "Progress Updates", icon: <ClipboardList size={18} /> },
    { key: "reports", path: "/reports", label: "Consolidated Reports", icon: <BarChart3 size={18} /> },
    { key: "calendar", path: "/planning-calendar", label: "Planning Calendar", icon: <CalendarRange size={18} /> },
    { key: "archive", path: "/database/archive", label: "Document Archive", icon: <Archive size={18} /> },
  ].filter((tab) => canAccess(user, tab.key));

    const hrTabs = [
      { key: "settings", path: "/database/hero-settings", label: "Settings", icon: <Settings size={18} /> },
      { key: "users", path: "/users", label: "Users", icon: <UsersIcon size={18} /> },
      { key: "hr", path: "/hr", label: "HR Suite", icon: <UsersIcon size={18} /> },
      { key: "hrAnalytics", path: "/hr-analytics", label: "Executive HR", icon: <TrendingUp size={18} /> },
      { key: "recruitment", path: "/recruitment", label: "Recruitment", icon: <UsersIcon size={18} /> },
      { key: "hrOps", path: "/hr-operations", label: "Induction & Appraisals", icon: <TrendingUp size={18} /> },
      { key: "payroll", path: "/payroll", label: "Payroll & Payslips", icon: <Wallet size={18} /> },
      { key: "languages", path: "/language-settings", label: "Language Settings", icon: <Globe size={18} /> },
      { key: "alerts", path: "/plan-alerts", label: "Plan Alerts", icon: <BellRing size={18} /> },
      { key: "news", path: "/manage-news", label: "Manage News", icon: <Newspaper size={18} /> },
      { key: "documents", path: "/manage-documents", label: "Manage Documents", icon: <FileText size={18} /> },
      { key: "publicSite", path: "/public-site", label: "Public Site", icon: <Megaphone size={18} /> },
      { key: "media", path: "/manage-media", label: "Manage Media", icon: <Film size={18} /> },
    ].filter((tab) => canAccess(user, tab.key));

    // A signed-in position may only open the tabs in its access proposal.
    if (!canAccessPath(user, location.pathname)) {
      return <Navigate to="/dashboard" replace />;
    }

    // Left Pane Tabs - Grouped
  

  

  

  const renderTab = (tab) => {
    const isTabActive = location.pathname === tab.path;

    return (
      <NavLink
        key={tab.path}
        to={tab.path}
        className="d-flex align-items-center gap-3 px-3 py-2 text-decoration-none rounded"
        style={{
          color: isTabActive ? "var(--brand-dark)" : "rgba(255,255,255,0.85)",
          background: isTabActive ? "var(--brand-secondary)" : "transparent",
          fontWeight: isTabActive ? 700 : 500,
          fontSize: "0.9rem",
          transition: "all 0.2s"
        }}
      >
        {tab.icon}
        {tab.label}
      </NavLink>
    );
  };

  return (
    <div className="app-shell d-flex flex-column vh-100">
      <header className="app-header d-flex align-items-center justify-content-between px-4 py-2" 
              style={{ background: "var(--brand-primary)", color: "white", borderBottom: "3px solid var(--brand-secondary)", zIndex: 10 }}>
        
        <div className="d-flex align-items-center">
          <button
            type="button"
            className="btn btn-sm d-lg-none me-2 p-1"
            style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "none" }}
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="app-brand">
            <h5 className="mb-0 fw-bold" style={{ color: "var(--brand-secondary)", letterSpacing: "1px" }}>
              Ethio-Biopharma
            </h5>
          </div>

          {/* Contextual page links; the PMS workspace tabs live on the Projects page. */}
          <nav className="d-none d-lg-flex gap-2 align-items-center">
            {/* Show Archive when on Archive */}
            {isArchive && (
              <NavLink to="/database/archive" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                style={{ color: "var(--brand-dark)", background: "var(--brand-secondary)", fontWeight: 700, fontSize: "0.85rem" }}>
                <Archive size={16} /><span>Document Archive</span>
              </NavLink>
            )}

            {/* Show Settings when on Settings */}
            {isSettings && (
              <NavLink to="/database/hero-settings" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                style={{ color: "var(--brand-dark)", background: "var(--brand-secondary)", fontWeight: 700, fontSize: "0.85rem" }}>
                <Settings size={16} /><span>Settings</span>
              </NavLink>
            )}
          </nav>
        </div>

        <div className="d-flex align-items-center gap-3 text-white">
          <div className="d-none d-md-block"><GlobalSearch /></div>
          <NotificationBell style={{ color: "white" }} />
          <span className="d-none d-sm-inline" style={{ fontSize: "0.8rem", opacity: 0.8 }}>{user?.username}</span>
          <button className="btn btn-sm d-flex align-items-center gap-1" style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none" }} onClick={logout}>
            <LogOut size={14} /><span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      
      </header>



      <div className="app-body d-flex flex-grow-1 overflow-hidden">
        {navOpen ? <div className="app-nav-backdrop d-lg-none" onClick={() => setNavOpen(false)} /> : null}
        <aside className={`app-sidebar ${navOpen ? "is-open" : ""}`}>
          
          <div className="d-flex flex-column gap-2 mb-4">
            {dbTabs.map(renderTab)}
            {canAccess(user, "myhr") && renderTab({ path: "/my-hr", label: "My Portal", icon: <UsersIcon size={18} /> })}
            {canAccess(user, "approvals") && renderTab({ path: "/my-approvals", label: "My Approvals", icon: <CheckSquare size={18} /> })}
          </div>

          {hrTabs.length > 0 && (
            <div className="mt-2">
              <div className="text-white px-3 mb-2 d-flex align-items-center gap-2" style={{ opacity: 0.6, fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>
                <ShieldAlert size={14} /> HR & Admin
              </div>
              <div className="d-flex flex-column gap-2">
                {hrTabs.map(renderTab)}
              </div>
            </div>
          )}
        </aside>

        <main className="app-main flex-grow-1 p-4" style={{ background: "var(--brand-bg)", overflowY: "auto", overflowX: "auto", minWidth: 0 }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <footer className="app-credit-bar">
        <span>© {new Date().getFullYear()} Ethio-Biopharma Enterprise. All rights reserved.</span>
        <span>
          Designed and developed by{" "}
          <a href="https://www.linkedin.com/in/dessalew-adane" target="_blank" rel="noreferrer">
            Dessalew Adane
          </a>
        </span>
      </footer>
    </div>
  );
}