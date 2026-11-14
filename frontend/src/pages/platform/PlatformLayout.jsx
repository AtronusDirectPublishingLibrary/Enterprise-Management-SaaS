import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, BarChart3, Building2, CreditCard, Headset, LayoutDashboard, LogOut, Menu, Shield, X } from "lucide-react";
import { useAuth } from "../../lib/auth";

const NAV = [
  { to: "/platform/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/platform/tenants", label: "Tenants", icon: Building2 },
  { to: "/platform/plans", label: "Plans & Tiers", icon: CreditCard },
  { to: "/platform/revenue", label: "Revenue", icon: BarChart3 },
  { to: "/platform/activity", label: "Activity", icon: Activity },
  { to: "/platform/support", label: "Support", icon: Headset },
];

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate("/platform/login", { replace: true });
  };

  return (
    <div className="d-flex vh-100" style={{ background: "#0b1220", color: "#e5e7eb" }}>
      {open ? <div className="d-lg-none position-fixed top-0 start-0 w-100 h-100" style={{ background: "rgba(0,0,0,.55)", zIndex: 20 }} onClick={() => setOpen(false)} /> : null}
      <aside className={`d-flex flex-column ${open ? "" : "d-none d-lg-flex"}`} style={{ width: 272, background: "linear-gradient(180deg,#0f172a 0%,#111827 100%)", borderRight: "1px solid #1f2937", zIndex: 21, position: open ? "fixed" : "relative", height: "100%" }}>
        <div className="p-3 pb-2 border-bottom border-secondary-subtle" style={{ borderColor: "#243044 !important" }}>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold fs-5">BEMS <span style={{ color: "#60a5fa" }}>Platform</span></div>
              <div className="small text-secondary">Control plane & subscriptions</div>
            </div>
            <button className="btn btn-sm btn-outline-light d-lg-none" onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
        </div>
        <nav className="nav nav-pills flex-column gap-1 p-2 flex-grow-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link d-flex align-items-center gap-2 px-3 py-2 ${isActive ? "active text-white" : "text-light"}`} style={({ isActive }) => isActive ? { background: "linear-gradient(90deg,#1d4ed8,#2563eb)", boxShadow: "0 6px 16px rgba(37,99,235,.25)" } : { opacity: 0.92 }}>
              <Icon size={16} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="m-2 p-3 rounded" style={{ background: "#0b1220", border: "1px solid #1f2937" }}>
          <div className="d-flex align-items-center gap-2 mb-1"><Shield size={14} className="text-info" /><span className="small text-secondary">Signed in</span></div>
          <div className="fw-semibold text-truncate">{user?.username || "platform admin"}</div>
          <div className="small text-secondary text-truncate">{user?.email || "Platform administrator"}</div>
          <button className="btn btn-sm btn-outline-light mt-2 w-100 d-flex align-items-center justify-content-center gap-2" onClick={onLogout}><LogOut size={14} /> Logout</button>
        </div>
      </aside>
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        <header className="d-flex align-items-center justify-content-between px-3 px-md-4 py-2" style={{ background: "#0f172a", borderBottom: "1px solid #1f2937" }}>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-light d-lg-none" onClick={() => setOpen(true)}><Menu size={16} /></button>
            <div>
              <div className="fw-semibold">Platform Administration</div>
              <div className="small text-secondary">Tenants, tiers, modules & operations</div>
            </div>
          </div>
          <span className="badge rounded-pill" style={{ background: "#172554", color: "#93c5fd", border: "1px solid #1e3a8a" }}>BEMS Control Plane</span>
        </header>
        <main className="flex-grow-1 overflow-auto p-3 p-md-4" style={{ background: "radial-gradient(1200px 400px at 10% -10%, rgba(37,99,235,.12), transparent), #0b1220" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
