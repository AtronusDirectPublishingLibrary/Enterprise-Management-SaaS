import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";
export default function HelpdeskPage(){
  const [items,setItems]=useState([]); const [summary,setSummary]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState(""); const [msg,setMsg]=useState("");
  const [q,setQ]=useState(""); const [status,setStatus]=useState("");
  const [f,setF]=useState({subject:"",category:"",priority:"MEDIUM",description:"",assignee:"",requester:""});
  const load=async()=>{setLoading(true);try{const [t,s]=await Promise.all([api.get("/helpdesk/tickets"),api.get("/helpdesk/summary")]);setItems(t||[]);setSummary(s||null);}catch(e){setErr(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const filtered=useMemo(()=>items.filter(t=> (!status||t.status===status) && (!q||[t.ticketNo,t.subject,t.requester,t.category,t.assignee].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase())))),[items,q,status]);
  const save=async(e)=>{e.preventDefault();try{await api.post("/helpdesk/tickets",f);flash("Ticket created");setF({subject:"",category:"",priority:"MEDIUM",description:"",assignee:"",requester:""});load();}catch(e){setErr(e.message);}};
  const upd=async(id,patch)=>{try{await api.put(`/helpdesk/tickets/${id}`,patch);load();}catch(e){setErr(e.message);}};
  const del=async(id)=>{if(!window.confirm("Delete ticket?"))return;try{await api.delete(`/helpdesk/tickets/${id}`);flash("Deleted");load();}catch(e){setErr(e.message);}};
  const pri=(p)=>({URGENT:"danger",HIGH:"warning text-dark",MEDIUM:"info text-dark",LOW:"secondary"}[p]||"secondary");
  return <div className="container-fluid p-3 p-lg-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>Helpdesk & Service Management (ITSM)</h3><div className="text-muted small">Service requests, incidents, ticketing and resolution tracking</div></div><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/helpdesk/export","helpdesk-tickets.csv").catch(e=>setErr(e.message))}>Export</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
    {msg&&<div className="alert alert-success py-2">{msg}</div>}{err&&<div className="alert alert-danger py-2">{err}</div>}
    {loading?<div>Loading...</div>:<>
      <div className="row g-3 mb-3">{[["Total",summary?.total||0,"#0B2545"],["Open",summary?.open||0,"#C9A227"],["Urgent/High",summary?.urgent||0,"#dc3545"],["Resolved",summary?.resolved||0,"#198754"]].map(([l,v,c])=><div key={l} className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-4 fw-bold" style={{color:c}}>{v}</div></div></div></div>)}</div>
      <div className="row g-3"><div className="col-lg-4"><div className="card"><div className="card-body"><h6>New Ticket</h6><form className="d-grid gap-2" onSubmit={save}>
        <input className="form-control" placeholder="Subject *" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} required/>
        <div className="d-flex gap-2"><input className="form-control" placeholder="Category" value={f.category} onChange={e=>setF({...f,category:e.target.value})}/><select className="form-select" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></div>
        <div className="d-flex gap-2"><input className="form-control" placeholder="Requester" value={f.requester} onChange={e=>setF({...f,requester:e.target.value})}/><input className="form-control" placeholder="Assignee" value={f.assignee} onChange={e=>setF({...f,assignee:e.target.value})}/></div>
        <textarea className="form-control" rows={3} placeholder="Description" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
        <button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Create Ticket</button>
      </form></div></div></div>
      <div className="col-lg-8"><div className="card"><div className="card-body"><div className="d-flex flex-wrap gap-2 justify-content-between mb-2"><h6 className="mb-0">Tickets ({filtered.length})</h6><div className="d-flex gap-2"><select className="form-select form-select-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].map(s=><option key={s}>{s}</option>)}</select><input className="form-control form-control-sm" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
        <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>#</th><th>Subject</th><th>Category</th><th>Priority</th><th>Assignee</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(t=><tr key={t.id}><td className="small">{t.ticketNo}</td><td className="fw-semibold">{t.subject}<div className="small text-muted">{t.requester||""} · {new Date(t.createdAt).toLocaleDateString()}</div></td><td>{t.category||"-"}</td><td><span className={`badge bg-${pri(t.priority)}`}>{t.priority}</span></td><td className="small">{t.assignee||"-"}</td><td><select className="form-select form-select-sm" value={t.status} onChange={e=>upd(t.id,{status:e.target.value})}>{["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].map(s=><option key={s}>{s}</option>)}</select></td><td><button className="btn btn-sm btn-link text-danger p-0" onClick={()=>del(t.id)}>Del</button></td></tr>)}{!filtered.length&&<tr><td colSpan={7} className="text-muted">No tickets</td></tr>}</tbody></table></div>
      </div></div></div></div>
    </>}
  </div>;
}
