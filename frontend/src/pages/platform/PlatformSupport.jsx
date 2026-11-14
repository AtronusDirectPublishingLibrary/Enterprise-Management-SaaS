import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const COLORS = { high: "danger", medium: "warning", low: "secondary" };

export default function PlatformSupport() {
  const [data, setData] = useState({ items: [] });
  const [err, setErr] = useState("");
  useEffect(() => { api.get("/portals/platform/support/flags").then(setData).catch(e=>setErr(e?.message||"Failed")); }, []);
  if (err) return <div className="alert alert-danger">{err}</div>;
  return (
    <div>
      <h4 className="mb-3">Support Flags</h4>
      <p className="text-secondary">Tenants requiring attention (past-due, trial ending, onboarding incomplete, no recent login).</p>
      <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead><tr><th>Tenant</th><th>Slug</th><th>Reason</th><th>Severity</th></tr></thead>
            <tbody>
              {data.items.map((f, i) => (
                <tr key={i}><td>{f.name}</td><td><code>{f.slug}</code></td><td>{f.reason}</td><td><span className={`badge bg-${COLORS[f.severity] || "secondary"}`}>{f.severity}</span></td></tr>
              ))}
              {!data.items.length && <tr><td colSpan={4} className="text-secondary">No flags 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
