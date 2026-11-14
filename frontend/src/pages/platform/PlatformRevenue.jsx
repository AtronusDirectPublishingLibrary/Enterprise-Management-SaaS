import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function PlatformRevenue() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get("/portals/platform/revenue").then(setData).catch(e=>setErr(e?.message||"Failed")); }, []);
  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!data) return <div className="text-secondary">Loading revenue...</div>;
  return (
    <div>
      <h4 className="mb-3">Revenue</h4>
      <div className="row g-3 mb-3">
        {[["MRR", `$${(data.mrr||0).toLocaleString()}`], ["ARPU", `$${(data.arpu||0).toFixed(2)}`], ["Churn rate", `${((data.churnRate||0)*100).toFixed(1)}%`]].map(([t,v]) => (
          <div className="col-md-4" key={t}><div className="card border-0" style={{background:"#111827",color:"#e5e7eb"}}><div className="card-body"><div className="small text-secondary">{t}</div><div className="fs-3 fw-bold">{v}</div></div></div></div>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-lg-6"><div className="card border-0 h-100" style={{background:"#111827",color:"#e5e7eb"}}><div className="card-body"><h6>Revenue by Plan</h6>
          <ul className="list-unstyled mb-0">{Object.entries(data.byPlan||{}).map(([k,v]) => <li key={k} className="d-flex justify-content-between border-bottom border-secondary py-1"><span>{k}</span><span>${v}</span></li>)}{!Object.keys(data.byPlan||{}).length && <li className="text-secondary">No data</li>}</ul>
        </div></div></div>
        <div className="col-lg-6"><div className="card border-0 h-100" style={{background:"#111827",color:"#e5e7eb"}}><div className="card-body"><h6>Top Tenants by MRR</h6>
          <ul className="list-unstyled mb-0">{(data.topTenants||[]).map(t => <li key={t.id} className="d-flex justify-content-between border-bottom border-secondary py-1"><span>{t.name}</span><span>${t.mrr}</span></li>)}{!(data.topTenants||[]).length && <li className="text-secondary">No data</li>}</ul>
        </div></div></div>
      </div>
    </div>
  );
}
