import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";
export default function ExternalPortalsPage(){
  const [type,setType]=useState("CUSTOMER"); const [items,setItems]=useState([]); const [summary,setSummary]=useState(null);
  const [loading,setLoading]=useState(true); const [err,setErr]=useState(""); const [msg,setMsg]=useState(""); const [q,setQ]=useState(""); const [status,setStatus]=useState("");
  const [f,setF]=useState({subject:"",requester:"",company:"",priority:"MEDIUM",description:""});
  const load=async()=>{setLoading(true);setErr("");try{const [r,s]=await Promise.all([api.get(`/external-portals/requests?type=${type}`),api.get("/external-portals/summary")]);setItems(r||[]);setSummary(s||null);}catch(e){setErr(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[type]);
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const filtered=useMemo(()=>items.filter(r=> (!status||r.status===status) && (!q||[r.requestNo,r.subject,r.requester,r.company].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase())))),[items,q,status]);
  const save=async(e)=>{e.preventDefault();try{await api.post("/external-portals/requests",{...f,portalType:type});flash("Request submitted");setF({subject:"",requester:"",company:"",priority:"MEDIUM",description:""});load();}catch(e){setErr(e.message);}};
  const upd=async(id,patch)=>{try{await api.put(`/external-portals/requests/${id}`,patch);load();}catch(e){setErr(e.message);}};
  const respond=async(id)=>{const resp=window.prompt("Response / resolution note:"); if(resp==null) return; upd(id,{response:resp,status:"IN_REVIEW"});};
  return <div className="container-fluid p-3 p-lg-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>Customer / Partner / Vendor Portals</h3><div className="text-muted small">External collaboration, requests and self-service intake</div></div><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/external-portals/export","portal-requests.csv").catch(e=>setErr(e.message))}>Export</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
    {msg&&<div className="alert alert-success py-2">{msg}</div>}{err&&<div className="alert alert-danger py-2">{err}</div>}
    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
      <ul className="nav nav-pills mb-0">{["CUSTOMER","PARTNER","VENDOR"].map(t=><li key={t} className="nav-item"><button className={`nav-link ${type===t?"active":""}`} onClick={()=>setType(t)}>{t} ({(summary?.byType||[]).find(x=>x.type===t)?.count||0})</button></li>)}</ul>
      <span className="text-muted small ms-auto">Open: {summary?.open||0} / {summary?.total||0}</span>
    </div>
    {loading?<div>Loading...</div>:<div className="row g-3">
      <div className="col-lg-4"><div className="card"><div className="card-body"><h6>New {type.toLowerCase()} request</h6><form className="d-grid gap-2" onSubmit={save}>
        <input className="form-control" placeholder="Subject *" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} required/>
        <div className="d-flex gap-2"><input className="form-control" placeholder="Requester" value={f.requester} onChange={e=>setF({...f,requester:e.target.value})}/><input className="form-control" placeholder="Company" value={f.company} onChange={e=>setF({...f,company:e.target.value})}/></div>
        <select className="form-select" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select>
        <textarea className="form-control" rows={3} placeholder="Description" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
        <button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Submit Request</button>
      </form></div></div></div>
      <div className="col-lg-8"><div className="card"><div className="card-body"><div className="d-flex gap-2 justify-content-between mb-2"><h6 className="mb-0">Requests ({filtered.length})</h6><div className="d-flex gap-2"><select className="form-select form-select-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option>{["OPEN","IN_REVIEW","APPROVED","REJECTED","CLOSED"].map(s=><option key={s}>{s}</option>)}</select><input className="form-control form-control-sm" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
        <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>#</th><th>Subject</th><th>From</th><th>Priority</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(r=><tr key={r.id}><td className="small">{r.requestNo}</td><td className="fw-semibold">{r.subject}{r.response&&<div className="small text-muted">Response: {String(r.response).slice(0,60)}</div>}</td><td className="small">{r.requester||r.company||"-"}</td><td>{r.priority}</td><td><select className="form-select form-select-sm" value={r.status} onChange={e=>upd(r.id,{status:e.target.value})}>{["OPEN","IN_REVIEW","APPROVED","REJECTED","CLOSED"].map(s=><option key={s}>{s}</option>)}</select></td><td><button className="btn btn-sm btn-link p-0" onClick={()=>respond(r.id)}>Respond</button></td></tr>)}{!filtered.length&&<tr><td colSpan={6} className="text-muted">No requests</td></tr>}</tbody></table></div>
      </div></div></div>
    </div>}
  </div>;
}
