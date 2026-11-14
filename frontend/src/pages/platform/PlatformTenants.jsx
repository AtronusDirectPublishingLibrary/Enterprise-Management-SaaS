import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export default function PlatformTenants() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (status && status !== "all") params.set("status", status);
    api.get(`/portals/platform/tenants?${params.toString()}`).then(setData).catch(e => setErr(e?.message || "Failed")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Tenants</h4>
        <div className="d-flex gap-2">
          <input className="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
          <select className="form-select form-select-sm bg-dark text-light border-secondary" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="all">All status</option><option value="ACTIVE">ACTIVE</option><option value="TRIAL">TRIAL</option><option value="SUSPENDED">SUSPENDED</option><option value="CANCELLED">CANCELLED</option>
          </select>
          <button className="btn btn-sm btn-primary" onClick={load}>Filter</button>
        </div>
      </div>
      {err ? <div className="alert alert-danger">{err}</div> : null}
      <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead><tr><th>Name</th><th>Slug</th><th>Industry</th><th>Status</th><th>Plan</th><th>MRR</th><th>Users</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="text-secondary">Loading...</td></tr> :
                data.items.map(t => (
                  <tr key={t.id}>
                    <td>{t.name} {t.isFirstTenant ? <span className="badge bg-info ms-1">first</span> : null}</td>
                    <td><code>{t.slug}</code></td>
                    <td>{t.industryType || "-"}</td>
                    <td><span className={`badge ${t.status==='ACTIVE'?'bg-success':t.status==='TRIAL'?'bg-warning text-dark':t.status==='SUSPENDED'?'bg-danger':'bg-secondary'}`}>{t.status}</span></td>
                    <td>{t.plan || "-"}</td>
                    <td>${t.mrr}</td>
                    <td>{t.users}</td>
                    <td className="text-secondary">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td><Link className="btn btn-sm btn-outline-light" to={`/platform/tenants/${t.id}`}>View</Link></td>
                  </tr>
                ))}
              {!loading && !data.items.length && <tr><td colSpan={9} className="text-secondary">No tenants</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="small text-secondary mt-2">Total: {data.total}</div>
    </div>
  );
}
