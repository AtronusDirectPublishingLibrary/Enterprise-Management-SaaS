import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";
export default function BiPage(){
  const [items,setItems]=useState([]); const [summary,setSummary]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState(""); const [msg,setMsg]=useState("");
  const [q,setQ]=useState(""); const [cat,setCat]=useState("");
  const [f,setF]=useState({name:"",category:"",description:"",dataset:"",status:"ACTIVE"}); const [edit,setEdit]=useState(null);
  const load=async()=>{setLoading(true);try{const [r,s]=await Promise.all([api.get("/bi/reports"),api.get("/bi/summary")]);setItems(r||[]);setSummary(s||null);}catch(e){setErr(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const cats=useMemo(()=>Array.from(new Set(items.map(i=>i.category).filter(Boolean))),[items]);
  const filtered=useMemo(()=>items.filter(r=> (!cat||r.category===cat) && (!q||[r.code,r.name,r.category,r.description,r.dataset].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase())))),[items,q,cat]);
  const save=async(e)=>{e.preventDefault();try{if(edit){await api.put(`/bi/reports/${edit.id}`,f);flash("Report updated");}else{await api.post("/bi/reports",f);flash("Report saved");} setF({name:"",category:"",description:"",dataset:"",status:"ACTIVE"}); setEdit(null); load();}catch(e){setErr(e.message);}};
  const del=async(id)=>{if(!window.confirm("Delete report?"))return;try{await api.delete(`/bi/reports/${id}`);flash("Deleted");load();}catch(e){setErr(e.message);}};
  return <div className="container-fluid p-3 p-lg-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>BI & Advanced Analytics</h3><div className="text-muted small">Analytics catalog, KPI reports, datasets and executive insights</div></div><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/bi/export","bi-reports.csv").catch(e=>setErr(e.message))}>Export</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
    {msg&&<div className="alert alert-success py-2">{msg}</div>}{err&&<div className="alert alert-danger py-2">{err}</div>}
    {loading?<div>Loading...</div>:<>
      <div className="row g-3 mb-3">{[["Reports",summary?.total||0],["Active",summary?.active||0],["Categories",(summary?.categories||[]).length]].map(([l,v])=><div key={l} className="col-6 col-lg-4"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-4 fw-bold" style={{color:"#0B2545"}}>{v}</div></div></div></div>)}</div>
      <div className="row g-3"><div className="col-lg-4"><div className="card"><div className="card-body"><h6>{edit?"Edit Report":"New Report / KPI View"}</h6><form className="d-grid gap-2" onSubmit={save}>
        <input className="form-control" placeholder="Report name *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/>
        <input className="form-control" placeholder="Category (Finance, HR, Ops, Sales...)" value={f.category} onChange={e=>setF({...f,category:e.target.value})}/>
        <input className="form-control" placeholder="Dataset / source" value={f.dataset} onChange={e=>setF({...f,dataset:e.target.value})}/>
        <select className="form-select" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>ACTIVE</option><option>DRAFT</option><option>ARCHIVED</option></select>
        <textarea className="form-control" rows={3} placeholder="Description / metrics / KPIs" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
        <div className="d-flex gap-2"><button className="btn btn-primary flex-fill" style={{background:"#0B2545",borderColor:"#0B2545"}}>{edit?"Update":"Save"}</button>{edit&&<button type="button" className="btn btn-outline-secondary" onClick={()=>{setEdit(null);setF({name:"",category:"",description:"",dataset:"",status:"ACTIVE"});}}>Cancel</button>}</div>
      </form></div></div></div>
      <div className="col-lg-8"><div className="card"><div className="card-body"><div className="d-flex gap-2 justify-content-between mb-2"><h6 className="mb-0">Reports & Dashboards ({filtered.length})</h6><div className="d-flex gap-2"><select className="form-select form-select-sm" value={cat} onChange={e=>setCat(e.target.value)}><option value="">All categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select><input className="form-control form-control-sm" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
        <div className="row g-2">{filtered.map(r=><div key={r.id} className="col-md-6"><div className="border rounded p-3 h-100"><div className="d-flex justify-content-between align-items-start"><div><div className="fw-semibold">{r.name}</div><div className="small text-muted">{r.code} · {r.category||"General"}</div></div><span className={`badge ${r.status==="ACTIVE"?"bg-success":"bg-secondary"}`}>{r.status}</span></div><div className="small mt-2">{r.description||"No description"}</div>{r.dataset&&<div className="small mt-1"><strong>Dataset:</strong> {r.dataset}</div>}<div className="mt-2 d-flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={()=>{setEdit(r);setF({name:r.name||"",category:r.category||"",description:r.description||"",dataset:r.dataset||"",status:r.status||"ACTIVE"});}}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={()=>del(r.id)}>Delete</button></div></div></div>)}{!filtered.length&&<div className="text-muted">No reports</div>}</div>
      </div></div></div></div>
    </>}
  </div>;
}
