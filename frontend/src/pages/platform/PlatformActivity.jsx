import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function PlatformActivity() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [err, setErr] = useState("");
  useEffect(() => { api.get("/portals/platform/activity?pageSize=100").then(setData).catch(e=>setErr(e?.message||"Failed")); }, []);
  if (err) return <div className="alert alert-danger">{err}</div>;
  return (
    <div>
      <h4 className="mb-3">Activity Log</h4>
      <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
        <div className="table-responsive">
          <table className="table table-dark table-sm table-hover align-middle mb-0">
            <thead><tr><th>Timestamp</th><th>Action</th><th>User</th><th>Tenant</th><th>Details</th></tr></thead>
            <tbody>
              {data.items.map(a => (
                <tr key={a.id}>
                  <td className="text-secondary">{new Date(a.timestamp).toLocaleString()}</td>
                  <td>{a.action}</td>
                  <td>{a.user}</td>
                  <td className="text-truncate" style={{maxWidth:140}}>{a.tenantId || "-"}</td>
                  <td className="small text-secondary text-truncate" style={{maxWidth:320}}>{typeof a.details === "string" ? a.details : JSON.stringify(a.details || {})}</td>
                </tr>
              ))}
              {!data.items.length && <tr><td colSpan={5} className="text-secondary">No activity</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="small text-secondary mt-2">Showing {data.items.length} of {data.total}</div>
    </div>
  );
}
