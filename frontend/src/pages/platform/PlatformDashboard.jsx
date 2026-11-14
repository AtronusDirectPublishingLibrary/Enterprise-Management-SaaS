import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

function Card({ title, value, sub, accent = "#60a5fa" }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card h-100 border-0" style={{ background: "#111827", color: "#e5e7eb", borderLeft: `3px solid ${accent}` }}>
        <div className="card-body">
          <div className="small text-secondary">{title}</div>
          <div className="fs-3 fw-bold">{value}</div>
          {sub ? <div className="small text-secondary">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function PlatformDashboard() {
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/portals/platform/metrics").then(setData).catch(e => setErr(e?.message || "Failed to load metrics"));
    api.get("/portals/platform/plans").then(r => setPlans(r.items || [])).catch(() => {});
  }, []);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!data) return <div className="text-secondary">Loading platform metrics...</div>;

  const t = data.totals || {};
  const activePlans = plans.filter(p => p.isActive).length;
  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><h4 className="mb-0">Platform Dashboard</h4><div className="small text-secondary">Overview of tenants, subscriptions, revenue and operations</div></div>
        <div className="d-flex gap-2">
          <Link to="/platform/plans" className="btn btn-sm btn-outline-info">Manage Plans</Link>
          <Link to="/platform/tenants" className="btn btn-sm btn-primary">Manage Tenants</Link>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <Card title="Total Tenants" value={t.tenants ?? 0} sub={`30d signups: ${t.signups30d ?? 0}`} accent="#60a5fa" />
        <Card title="Active / Trials" value={`${t.active ?? 0} / ${t.trials ?? 0}`} sub={`Churn (30d): ${t.churn30d ?? 0}`} accent="#34d399" />
        <Card title="MRR" value={`$${(t.mrr || 0).toLocaleString()}`} sub="Active subscriptions" accent="#fbbf24" />
        <Card title="Plans / Tiers" value={`${activePlans} active`} sub={`${plans.length} total configured`} accent="#a78bfa" />
      </div>
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card border-0 h-100" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <h6>Tenants by Industry</h6>
              <ul className="list-unstyled mb-0">
                {Object.entries(data.charts?.tenantsByIndustry || {}).map(([k, v]) => (
                  <li key={k} className="d-flex justify-content-between border-bottom border-secondary py-1"><span>{k}</span><span className="badge bg-secondary">{v}</span></li>
                ))}
                {!Object.keys(data.charts?.tenantsByIndustry || {}).length && <li className="text-secondary">No data</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 h-100" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center"><h6 className="mb-0">Tenants by Plan</h6><Link to="/platform/plans" className="small">Plans</Link></div>
              <ul className="list-unstyled mb-0 mt-2">
                {Object.entries(data.charts?.tenantsByPlan || {}).map(([k, v]) => (
                  <li key={k} className="d-flex justify-content-between border-bottom border-secondary py-1"><span>{k}</span><span className="badge bg-primary">{v}</span></li>
                ))}
                {!Object.keys(data.charts?.tenantsByPlan || {}).length && <li className="text-secondary">No data</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 h-100" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center"><h6 className="mb-0">Support & Health</h6><Link to="/platform/support" className="small">Support</Link></div>
              <div className="mt-2 small text-secondary">Monitor trials, onboarding, billing health and inactive tenants from Support and Tenants views. Manage tier bundles and module access from Plans & Tiers.</div>
              <div className="d-grid gap-2 mt-3">
                <Link to="/platform/tenants" className="btn btn-sm btn-outline-light">Tenant Directory</Link>
                <Link to="/platform/revenue" className="btn btn-sm btn-outline-light">Revenue & Subscriptions</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2"><h6 className="mb-0">Recent Activity</h6><Link to="/platform/activity" className="small">View all</Link></div>
              <div className="table-responsive">
                <table className="table table-sm table-dark table-borderless align-middle mb-0">
                  <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Tenant</th></tr></thead>
                  <tbody>
                    {(data.recentActivity || []).map(a => (
                      <tr key={a.id}><td className="text-secondary">{new Date(a.timestamp).toLocaleString()}</td><td>{a.action}</td><td>{a.user}</td><td className="text-truncate" style={{ maxWidth: 220 }}>{a.tenantId || "-"}</td></tr>
                    ))}
                    {!(data.recentActivity || []).length && <tr><td colSpan={4} className="text-secondary">No activity</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
