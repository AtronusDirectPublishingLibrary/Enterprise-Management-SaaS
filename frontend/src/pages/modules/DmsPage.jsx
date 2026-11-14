import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";
export default function DmsPage(){
  const [items,setItems]=useState([]); const [summary,setSummary]=useState(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState(""); const [msg,setMsg]=useState("");
  const [q,setQ]=useState(""); const [status,setStatus]=useState("");
  const [f,setF]=useState({title:"",category:"",folder:"",status:"ACTIVE",version:"1.0",fileName:"",fileUrl:"",tags:"",notes:""}); const [edit,setEdit]=useState(null);
  const load=async()=>{setLoading(true);try{const [r,s]=await Promise.all([api.get("/dms/records"),api.get("/dms/summary")]);setItems(r||[]);setSummary(s||null);}catch(e){setErr(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const filtered=useMemo(()=>items.filter(r=> (!status||r.status===status) && (!q||[r.recordNo,r.title,r.category,r.folder,r.owner,r.fileName,(r.tags||[]).join(" ")].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase())))),[items,q,status]);
  const save=async(e)=>{e.preventDefault();try{const payload={...f,tags:f.tags}; if(edit){await api.put(`/dms/records/${edit.id}`,payload);flash("Record updated");}else{await api.post("/dms/records",payload);flash("Record added");} setF({title:"",category:"",folder:"",status:"ACTIVE",version:"1.0",fileName:"",fileUrl:"",tags:"",notes:""}); setEdit(null); load();}catch(e){setErr(e.message);}};
  const del=async(id)=>{if(!window.confirm("Delete record?"))return;try{await api.delete(`/dms/records/${id}`);flash("Deleted");load();}catch(e){setErr(e.message);}};
  const upd=async(id,patch)=>{try{await api.put(`/dms/records/${id}`,patch);load();}catch(e){setErr(e.message);}};
  return <div className="container-fluid p-3 p-lg-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>Enterprise Document & Records Management (DMS)</h3><div className="text-muted small">Controlled documents, versions, metadata, retention and records lifecycle</div></div><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/dms/export","dms-records.csv").catch(e=>setErr(e.message))}>Export</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
    {msg&&<div className="alert alert-success py-2">{msg}</div>}{err&&<div className="alert alert-danger py-2">{err}</div>}
    {loading?<div>Loading...</div>:<>
      <div className="row g-3 mb-3">{[["Total Records",summary?.total||0],["Active",summary?.active||0],["Archived",summary?.archived||0],["Categories",summary?.categories||0]].map(([l,v])=><div key={l} className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-4 fw-bold" style={{color:"#0B2545"}}>{v}</div></div></div></div>)}</div>
      <div className="row g-3"><div className="col-lg-4"><div className="card"><div className="card-body"><h6>{edit?"Edit Record":"New Record"}</h6><form className="d-grid gap-2" onSubmit={save}>
        <input className="form-control" placeholder="Title *" value={f.title} onChange={e=>setF({...f,title:e.target.value})} required/>
        <div className="d-flex gap-2"><input className="form-control" placeholder="Category" value={f.category} onChange={e=>setF({...f,category:e.target.value})}/><input className="form-control" placeholder="Folder" value={f.folder} onChange={e=>setF({...f,folder:e.target.value})}/></div>
        <div className="d-flex gap-2"><input className="form-control" placeholder="Version" value={f.version} onChange={e=>setF({...f,version:e.target.value})}/><select className="form-select" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option><option>DISPOSED</option></select></div>
        <input className="form-control" placeholder="File name" value={f.fileName} onChange={e=>setF({...f,fileName:e.target.value})}/>
        <input className="form-control" placeholder="File URL / path" value={f.fileUrl} onChange={e=>setF({...f,fileUrl:e.target.value})}/>
        <input className="form-control" placeholder="Tags (comma separated)" value={f.tags} onChange={e=>setF({...f,tags:e.target.value})}/>
        <textarea className="form-control" rows={2} placeholder="Notes / retention info" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/>
        <div className="d-flex gap-2"><button className="btn btn-primary flex-fill" style={{background:"#0B2545",borderColor:"#0B2545"}}>{edit?"Update":"Add Record"}</button>{edit&&<button type="button" className="btn btn-outline-secondary" onClick={()=>{setEdit(null);setF({title:"",category:"",folder:"",status:"ACTIVE",version:"1.0",fileName:"",fileUrl:"",tags:"",notes:""});}}>Cancel</button>}</div>
      </form></div></div></div>
      <div className="col-lg-8"><div className="card"><div className="card-body"><div className="d-flex gap-2 justify-content-between mb-2"><h6 className="mb-0">Records ({filtered.length})</h6><div className="d-flex gap-2"><select className="form-select form-select-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option><option>DISPOSED</option></select><input className="form-control form-control-sm" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
        <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>#</th><th>Title</th><th>Category/Folder</th><th>Ver</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(r=><tr key={r.id}><td className="small">{r.recordNo}</td><td className="fw-semibold">{r.title}{r.fileName&&<div className="small text-muted">{r.fileName}</div>}</td><td className="small">{r.category||"-"}{r.folder?` / ${r.folder}`:""}</td><td>{r.version}</td><td><select className="form-select form-select-sm" value={r.status} onChange={e=>upd(r.id,{status:e.target.value})}><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option><option>DISPOSED</option></select></td><td className="text-nowrap"><button className="btn btn-sm btn-link p-0 me-2" onClick={()=>{setEdit(r);setF({title:r.title||"",category:r.category||"",folder:r.folder||"",status:r.status||"ACTIVE",version:r.version||"1.0",fileName:r.fileName||"",fileUrl:r.fileUrl||"",tags:(r.tags||[]).join(", "),notes:r.notes||""});}}>Edit</button><button className="btn btn-sm btn-link text-danger p-0" onClick={()=>del(r.id)}>Del</button></td></tr>)}{!filtered.length&&<tr><td colSpan={6} className="text-muted">No records</td></tr>}</tbody></table></div>
      </div></div></div></div>
    </>}
  </div>;
}
