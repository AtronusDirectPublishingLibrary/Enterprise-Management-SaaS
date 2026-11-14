import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";
export default function ResourcesPage(){
  const [items,setItems]=useState([]); const [summary,setSummary]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState(""); const [msg,setMsg]=useState("");
  const [q,setQ]=useState(""); const [status,setStatus]=useState("");
  const [f,setF]=useState({resource:"",role:"",project:"",allocation:100,status:"PLANNED",startDate:"",endDate:"",notes:""}); const [edit,setEdit]=useState(null);
  const load=async()=>{setLoading(true);try{const [r,s]=await Promise.all([api.get("/resources/allocations"),api.get("/resources/summary")]);setItems(r||[]);setSummary(s||null);}catch(e){setErr(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const filtered=useMemo(()=>items.filter(r=> (!status||r.status===status) && (!q||[r.resource,r.role,r.project,r.notes].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase())))),[items,q,status]);
  const save=async(e)=>{e.preventDefault();try{const p={...f,allocation:Number(f.allocation),startDate:f.startDate||null,endDate:f.endDate||null}; if(edit){await api.put(`/resources/allocations/${edit.id}`,p);flash("Updated");}else{await api.post("/resources/allocations",p);flash("Allocation saved");} setF({resource:"",role:"",project:"",allocation:100,status:"PLANNED",startDate:"",endDate:"",notes:""}); setEdit(null); load();}catch(e){setErr(e.message);}};
  const del=async(id)=>{if(!window.confirm("Delete allocation?"))return;try{await api.delete(`/resources/allocations/${id}`);flash("Deleted");load();}catch(e){setErr(e.message);}};
  return <div className="container-fluid p-3 p-lg-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>Resource & Capacity Management</h3><div className="text-muted small">Resource planning, allocations, utilization and capacity visibility</div></div><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/resources/export","resource-allocations.csv").catch(e=>setErr(e.message))}>Export</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
    {msg&&<div className="alert alert-success py-2">{msg}</div>}{err&&<div className="alert alert-danger py-2">{err}</div>}
    {loading?<div>Loading...</div>:<>
      <div className="row g-3 mb-3">{[["Allocations",summary?.total||0],["Active",summary?.active||0],["Planned",summary?.planned||0],["Avg Allocation",`${summary?.avgAllocation||0}%`],["Resources",summary?.resources||0],["Projects",summary?.projects||0]].map(([l,v])=><div key={l} className="col-6 col-lg-2"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-5 fw-bold" style={{color:"#0B2545"}}>{v}</div></div></div></div>)}</div>
      <div className="row g-3"><div className="col-lg-4"><div className="card"><div className="card-body"><h6>{edit?"Edit Allocation":"New Allocation"}</h6><form className="d-grid gap-2" onSubmit={save}>
        <input className="form-control" placeholder="Resource / person *" value={f.resource} onChange={e=>setF({...f,resource:e.target.value})} required/>
        <input className="form-control" placeholder="Role" value={f.role} onChange={e=>setF({...f,role:e.target.value})}/>
        <input className="form-control" placeholder="Project" value={f.project} onChange={e=>setF({...f,project:e.target.value})}/>
        <input className="form-control" type="number" min="0" max="200" placeholder="Allocation %" value={f.allocation} onChange={e=>setF({...f,allocation:e.target.value})}/>
        <div className="d-flex gap-2"><input className="form-control" type="date" value={f.startDate} onChange={e=>setF({...f,startDate:e.target.value})}/><input className="form-control" type="date" value={f.endDate} onChange={e=>setF({...f,endDate:e.target.value})}/></div>
        <select className="form-select" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>PLANNED</option><option>ACTIVE</option><option>COMPLETED</option></select>
        <div className="d-flex gap-2"><button className="btn btn-primary flex-fill" style={{background:"#0B2545",borderColor:"#0B2545"}}>{edit?"Update":"Save"}</button>{edit&&<button type="button" className="btn btn-outline-secondary" onClick={()=>{setEdit(null);setF({resource:"",role:"",project:"",allocation:100,status:"PLANNED",startDate:"",endDate:"",notes:""});}}>Cancel</button>}</div>
      </form></div></div></div>
      <div className="col-lg-8"><div className="card"><div className="card-body"><div className="d-flex gap-2 justify-content-between mb-2"><h6 className="mb-0">Allocations ({filtered.length})</h6><div className="d-flex gap-2"><select className="form-select form-select-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option><option>PLANNED</option><option>ACTIVE</option><option>COMPLETED</option></select><input className="form-control form-control-sm" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
        <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Resource</th><th>Role</th><th>Project</th><th>Allocation</th><th>Period</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(r=><tr key={r.id}><td className="fw-semibold">{r.resource}</td><td>{r.role||"-"}</td><td>{r.project||"-"}</td><td><div className="progress" style={{height:8,minWidth:70}}><div className="progress-bar" style={{width:`${Math.min(100,r.allocation||0)}%`,background:r.allocation>100?"#dc3545":"#C9A227"}}></div></div><span className="small">{r.allocation}%</span></td><td className="small">{r.startDate?new Date(r.startDate).toLocaleDateString():"-"} → {r.endDate?new Date(r.endDate).toLocaleDateString():"-"}</td><td><span className="badge bg-info text-dark">{r.status}</span></td><td className="text-nowrap"><button className="btn btn-sm btn-link p-0 me-2" onClick={()=>{setEdit(r);setF({resource:r.resource||"",role:r.role||"",project:r.project||"",allocation:r.allocation??100,status:r.status||"PLANNED",startDate:r.startDate?String(r.startDate).slice(0,10):"",endDate:r.endDate?String(r.endDate).slice(0,10):"",notes:r.notes||""});}}>Edit</button><button className="btn btn-sm btn-link text-danger p-0" onClick={()=>del(r.id)}>Del</button></td></tr>)}{!filtered.length&&<tr><td colSpan={7} className="text-muted">None</td></tr>}</tbody></table></div>
      </div></div></div></div>
    </>}
  </div>;
}
