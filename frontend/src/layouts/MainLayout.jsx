import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Database, LayoutDashboard, LogOut, Users as UsersIcon, Map, Target, CalendarDays, CalendarRange, Archive, Settings, ChevronLeft, ShieldAlert, TrendingUp, Briefcase, Globe, Newspaper, FileText, BellRing, CheckSquare, Film, Megaphone, Menu, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import NotificationBell from "../components/NotificationBell";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  const isDashboard = location.pathname === "/dashboard";
  const pmsRoutes = ["/database/pms", "/goals", "/portfolios", "/executive"];
  const isPms = pmsRoutes.includes(location.pathname);
  const isArchive = location.pathname === "/database/archive";
  const isSettings = location.pathname === "/database/hero-settings";
  const [navOpen, setNavOpen] = useState(false);

  // Close the drawer whenever the person moves to another page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Left Pane Tabs
    const dbTabs = [
    { path: "/database/pms", label: "PMS (Projects)", icon: <Database size={18} /> },
    { path: "/database/aop", label: "Annual Plan", icon: <CalendarDays size={18} /> },
    { path: "/database/strategic-plan", label: "Strategic Plan", icon: <Target size={18} /> },
    { path: "/database/roadmap", label: "Roadmap", icon: <Map size={18} /> },
    { path: "/planning-calendar", label: "Planning Calendar", icon: <CalendarRange size={18} /> },
    { path: "/database/archive", label: "Document Archive", icon: <Archive size={18} /> },
  ];

    // Left Pane Tabs - Grouped
  

  

  

  const renderTab = (tab) => {
    const isTabActive = tab.path === "/database/pms" && location.pathname === "/dashboard" 
                        ? true 
                        : location.pathname === tab.path;

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
    <div className="d-flex flex-column vh-100">
      <header className="d-flex align-items-center justify-content-between px-4 py-2" 
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

          {/* TOP NAVIGATION TABS - Contextual Rendering */}
          <nav className="d-none d-lg-flex gap-2 align-items-center">
            
            {/* Show Dashboard & PMS when on Dashboard or PMS */}
            {(isDashboard || isPms) && (
              <>
                <NavLink to="/dashboard" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                  style={({ isActive }) => ({ 
                    color: isActive ? "var(--brand-dark)" : "rgba(255,255,255,0.8)", 
                    background: isActive ? "var(--brand-secondary)" : "transparent", 
                    fontWeight: isActive ? 700 : 500, 
                    fontSize: "0.85rem" 
                  })}>
                  <LayoutDashboard size={16} /><span>Dashboard</span>
                </NavLink>

                <NavLink to="/database/pms" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                  style={({ isActive }) => ({ 
                    color: isActive ? "var(--brand-dark)" : "rgba(255,255,255,0.8)", 
                    background: isActive ? "var(--brand-secondary)" : "transparent", 
                    fontWeight: isActive ? 700 : 500, 
                    fontSize: "0.85rem" 
                  })}>
                  <Database size={16} /><span>Project Details (PMS)</span>
                </NavLink>
              </>
            )}

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

            {/* PMS Sub-Modules */}
            {isPms && (
              <>
                <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.2)", margin: "0 8px" }}></div>
                <NavLink to="/goals" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                  style={({ isActive }) => ({
                    color: isActive ? "var(--brand-dark)" : "rgba(255,255,255,0.85)",
                    background: isActive ? "var(--brand-secondary)" : "transparent",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.85rem"
                  })}>
                  <Target size={16} /><span>Goals</span>
                </NavLink>
                <NavLink to="/portfolios" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                  style={({ isActive }) => ({
                    color: isActive ? "var(--brand-dark)" : "rgba(255,255,255,0.85)",
                    background: isActive ? "var(--brand-secondary)" : "transparent",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.85rem"
                  })}>
                  <Briefcase size={16} /><span>Portfolios</span>
                </NavLink>
                <NavLink to="/executive" className="nav-item px-3 py-1 rounded text-decoration-none d-flex align-items-center gap-2"
                  style={({ isActive }) => ({
                    color: isActive ? "var(--brand-dark)" : "rgba(255,255,255,0.85)",
                    background: isActive ? "var(--brand-secondary)" : "transparent",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.85rem"
                  })}>
                  <TrendingUp size={16} /><span>Executive</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        <div className="d-flex align-items-center gap-3 text-white">
          <NotificationBell style={{ color: "white" }} />
          <span className="d-none d-sm-inline" style={{ fontSize: "0.8rem", opacity: 0.8 }}>{user?.username}</span>
          <button className="btn btn-sm d-flex align-items-center gap-1" style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none" }} onClick={logout}>
            <LogOut size={14} /><span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      
      </header>



      <div className="d-flex flex-grow-1 overflow-hidden">
        {navOpen ? <div className="app-nav-backdrop d-lg-none" onClick={() => setNavOpen(false)} /> : null}
        <aside className={`app-sidebar ${navOpen ? "is-open" : ""}`}>
          
          <div className="d-flex flex-column gap-2 mb-4">
            {dbTabs.map(renderTab)}
            {renderTab({ path: "/my-hr", label: "My HR Portal", icon: <UsersIcon size={18} /> })}
            {renderTab({ path: "/my-approvals", label: "My Approvals", icon: <CheckSquare size={18} /> })}
          </div>



          {["admin","executive"].includes(user?.role) && (
            <div className="mt-2">
              <div className="text-white px-3 mb-2 d-flex align-items-center gap-2" style={{ opacity: 0.6, fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>
                <ShieldAlert size={14} /> HR & Admin
              </div>
              <div className="d-flex flex-column gap-2">
                {user?.role === "admin" && renderTab({ path: "/database/hero-settings", label: "Settings", icon: <Settings size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/users", label: "Users", icon: <UsersIcon size={18} /> })}
                {renderTab({ path: "/hr", label: "HR Suite", icon: <UsersIcon size={18} /> })}
                {renderTab({ path: "/hr-analytics", label: "Executive HR", icon: <TrendingUp size={18} /> })}
                {renderTab({ path: "/recruitment", label: "Recruitment", icon: <UsersIcon size={18} /> })}
                {renderTab({ path: "/hr-operations", label: "Induction & Appraisals", icon: <TrendingUp size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/payroll", label: "Payroll", icon: <Briefcase size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/language-settings", label: "Language Settings", icon: <Globe size={18} /> })}
                {renderTab({ path: "/plan-alerts", label: "Plan Alerts", icon: <BellRing size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/manage-news", label: "Manage News", icon: <Newspaper size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/manage-documents", label: "Manage Documents", icon: <FileText size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/public-site", label: "Public Site", icon: <Megaphone size={18} /> })}
                {user?.role === "admin" && renderTab({ path: "/manage-media", label: "Manage Media", icon: <Film size={18} /> })}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-grow-1 p-4" style={{ background: "var(--brand-bg)", overflowY: "auto", overflowX: "hidden", minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}