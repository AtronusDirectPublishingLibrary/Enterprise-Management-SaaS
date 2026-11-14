import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";

const money = (n)=> Number(n||0).toLocaleString();
export default function MaintenancePage() {
  const [tab, setTab] = useState("dashboard");
  const [assets, setAssets] = useState([]); const [wos, setWos] = useState([]); const [summary,setSummary]=useState(null);
  const [loading, setLoading] = useState(true); const [msg,setMsg]=useState(""); const [err,setErr]=useState("");
  const [q,setQ]=useState(""); const [woStatus,setWoStatus]=useState("");
  const [asset,setAsset]=useState({name:"",category:"",location:"",custodian:"",status:"ACTIVE",serialNo:"",purchaseCost:"",purchaseDate:"",warrantyExpiry:"",notes:""});
  const [editAsset,setEditAsset]=useState(null);
  const [wo,setWo]=useState({assetId:"",type:"CORRECTIVE",priority:"MEDIUM",status:"OPEN",description:"",assignedTo:"",scheduledAt:"",laborCost:0,partsCost:0,downtimeHours:0});

  const load=async()=>{ setLoading(true); setErr(""); try{ const [a,w,s]=await Promise.all([api.get("/maintenance/assets"),api.get("/maintenance/work-orders"),api.get("/maintenance/summary")]); setAssets(a||[]); setWos(w||[]); setSummary(s||null);}catch(e){setErr(e.message);}finally{setLoading(false);} };
  useEffect(()=>{load();},[]);
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};

  const filteredAssets = useMemo(()=> assets.filter(a=> !q || [a.name,a.assetTag,a.category,a.location,a.custodian].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase()))), [assets,q]);
  const filteredWos = useMemo(()=> wos.filter(w=> !woStatus || w.status===woStatus), [wos,woStatus]);

  const saveAsset=async(e)=>{e.preventDefault(); try{
    const payload={...asset, purchaseCost: asset.purchaseCost===""?null:Number(asset.purchaseCost), purchaseDate:asset.purchaseDate||null, warrantyExpiry:asset.warrantyExpiry||null};
    if(editAsset){ await api.put(`/maintenance/assets/${editAsset.id}`, payload); flash("Asset updated"); }
    else { await api.post("/maintenance/assets", payload); flash("Asset created"); }
    setAsset({name:"",category:"",location:"",custodian:"",status:"ACTIVE",serialNo:"",purchaseCost:"",purchaseDate:"",warrantyExpiry:"",notes:""}); setEditAsset(null); load();
  }catch(e){setErr(e.message);}};
  const startEditAsset=(a)=>{ setEditAsset(a); setAsset({name:a.name||"",category:a.category||"",location:a.location||"",custodian:a.custodian||"",status:a.status||"ACTIVE",serialNo:a.serialNo||"",purchaseCost:a.purchaseCost??"",purchaseDate:a.purchaseDate?String(a.purchaseDate).slice(0,10):"",warrantyExpiry:a.warrantyExpiry?String(a.warrantyExpiry).slice(0,10):"",notes:a.notes||""}); setTab("assets"); };

  const saveWo=async(e)=>{e.preventDefault(); try{ await api.post("/maintenance/work-orders",{...wo, laborCost:Number(wo.laborCost||0), partsCost:Number(wo.partsCost||0), downtimeHours:Number(wo.downtimeHours||0), scheduledAt:wo.scheduledAt||null}); flash("Work order created"); setWo({assetId:"",type:"CORRECTIVE",priority:"MEDIUM",status:"OPEN",description:"",assignedTo:"",scheduledAt:"",laborCost:0,partsCost:0,downtimeHours:0}); load(); }catch(e){setErr(e.message);}};
  const updWo=async(id,patch)=>{try{ await api.put(`/maintenance/work-orders/${id}`,patch); load(); }catch(e){setErr(e.message);}};

  const priBadge=(p)=>({CRITICAL:"danger",HIGH:"warning text-dark",MEDIUM:"info text-dark",LOW:"secondary"}[p]||"secondary");
  const stBadge=(s)=>({OPEN:"primary",IN_PROGRESS:"warning text-dark",ON_HOLD:"secondary",COMPLETED:"success",CANCELLED:"dark"}[s]||"secondary");

  return (
    <div className="container-fluid p-3 p-lg-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>Asset & Maintenance Management (EAM/CMMS)</h3><div className="text-muted small">Asset lifecycle, preventive/corrective maintenance, work orders and costs</div></div><div className="d-flex gap-2 flex-wrap"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/maintenance/assets/export","assets.csv").catch(e=>setErr(e.message))}>Export Assets</button><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/maintenance/work-orders/export","work-orders.csv").catch(e=>setErr(e.message))}>Export WOs</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <ul className="nav nav-tabs mb-3">{[["dashboard","Dashboard"],["assets","Assets"],["wos","Work Orders"],["schedule","New Work Order"]].map(([k,l])=> <li key={k} className="nav-item"><button className={`nav-link ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button></li>)}</ul>
      {loading? <div>Loading...</div> : tab==="dashboard" ? (
        <>
          <div className="row g-3 mb-3">{[["Assets",summary?.assets||0,"#0B2545"],["Active",summary?.activeAssets||0,"#198754"],["In Maintenance",summary?.inMaintenance||0,"#fd7e14"],["Open WOs",summary?.openWorkOrders||0,"#C9A227"],["Critical Open",summary?.overdueCritical||0,"#dc3545"],["Maint. Cost",money(summary?.totalMaintenanceCost||0),"#0B2545"]].map(([l,v,c])=> <div key={l} className="col-6 col-lg-2"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-5 fw-bold" style={{color:c}}>{v}</div></div></div></div>)}</div>
          <div className="row g-3"><div className="col-lg-6"><div className="card h-100"><div className="card-body"><h6>Open / Critical Work Orders</h6><div className="table-responsive"><table className="table table-sm align-middle mb-0"><thead><tr><th>WO</th><th>Asset</th><th>Priority</th><th>Status</th></tr></thead><tbody>{wos.filter(w=>!["COMPLETED","CANCELLED"].includes(w.status)).slice(0,8).map(w=> <tr key={w.id}><td className="small">{w.workOrderNo}</td><td>{w.asset?.name||w.assetName||"-"}</td><td><span className={`badge bg-${priBadge(w.priority)}`}>{w.priority}</span></td><td><span className={`badge bg-${stBadge(w.status)}`}>{w.status}</span></td></tr>)}{!wos.some(w=>!["COMPLETED","CANCELLED"].includes(w.status))&&<tr><td colSpan={4} className="text-muted">No open work orders</td></tr>}</tbody></table></div></div></div></div>
          <div className="col-lg-6"><div className="card h-100"><div className="card-body"><h6>Assets by Status</h6>{[["ACTIVE","success"],["IN_MAINTENANCE","warning"],["RETIRED","secondary"],["DISPOSED","dark"]].map(([s,c])=> { const n=assets.filter(a=>a.status===s).length; return <div key={s} className="d-flex justify-content-between align-items-center border-bottom py-2"><span>{s.replace("_"," ")}</span><span className={`badge bg-${c}`}>{n}</span></div>; })}<div className="mt-3 small text-muted">Total downtime recorded: <strong>{money(summary?.totalDowntimeHours||0)} hrs</strong></div></div></div></div></div>
        </>
      ) : tab==="assets" ? (
        <div className="row g-3">
          <div className="col-lg-4"><div className="card"><div className="card-body"><h6>{editAsset?"Edit Asset":"New Asset"}</h6><form onSubmit={saveAsset} className="d-grid gap-2">
            <input className="form-control" placeholder="Asset name *" value={asset.name} onChange={e=>setAsset({...asset,name:e.target.value})} required/>
            <div className="d-flex gap-2"><input className="form-control" placeholder="Category" value={asset.category} onChange={e=>setAsset({...asset,category:e.target.value})}/><input className="form-control" placeholder="Serial no" value={asset.serialNo} onChange={e=>setAsset({...asset,serialNo:e.target.value})}/></div>
            <div className="d-flex gap-2"><input className="form-control" placeholder="Location" value={asset.location} onChange={e=>setAsset({...asset,location:e.target.value})}/><input className="form-control" placeholder="Custodian" value={asset.custodian} onChange={e=>setAsset({...asset,custodian:e.target.value})}/></div>
            <div className="d-flex gap-2"><input className="form-control" type="date" value={asset.purchaseDate} onChange={e=>setAsset({...asset,purchaseDate:e.target.value})} title="Purchase date"/><input className="form-control" type="number" step="0.01" placeholder="Cost" value={asset.purchaseCost} onChange={e=>setAsset({...asset,purchaseCost:e.target.value})}/></div>
            <input className="form-control" type="date" value={asset.warrantyExpiry} onChange={e=>setAsset({...asset,warrantyExpiry:e.target.value})} title="Warranty expiry"/>
            <select className="form-select" value={asset.status} onChange={e=>setAsset({...asset,status:e.target.value})}><option>ACTIVE</option><option>IN_MAINTENANCE</option><option>RETIRED</option><option>DISPOSED</option></select>
            <div className="d-flex gap-2"><button className="btn btn-primary flex-fill" style={{background:"#0B2545",borderColor:"#0B2545"}}>{editAsset?"Update":"Add Asset"}</button>{editAsset && <button type="button" className="btn btn-outline-secondary" onClick={()=>{setEditAsset(null);setAsset({name:"",category:"",location:"",custodian:"",status:"ACTIVE",serialNo:"",purchaseCost:"",purchaseDate:"",warrantyExpiry:"",notes:""});}}>Cancel</button>}</div>
          </form></div></div></div>
          <div className="col-lg-8"><div className="card"><div className="card-body"><div className="d-flex justify-content-between mb-2"><h6 className="mb-0">Assets ({filteredAssets.length})</h6><input className="form-control form-control-sm" style={{maxWidth:220}} placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
            <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Tag</th><th>Name</th><th>Category</th><th>Location</th><th>WOs</th><th>Status</th><th></th></tr></thead><tbody>{filteredAssets.map(a=> <tr key={a.id}><td className="small">{a.assetTag}</td><td className="fw-semibold">{a.name}<div className="small text-muted">{a.custodian||a.serialNo||""}</div></td><td>{a.category||"-"}</td><td>{a.location||"-"}</td><td>{a._count?.workOrders||0}</td><td><span className={`badge bg-${a.status==="ACTIVE"?"success":a.status==="IN_MAINTENANCE"?"warning text-dark":"secondary"}`}>{a.status}</span></td><td><button className="btn btn-sm btn-link p-0" onClick={()=>startEditAsset(a)}>Edit</button></td></tr>)}{!filteredAssets.length&&<tr><td colSpan={7} className="text-muted">No assets</td></tr>}</tbody></table></div>
          </div></div></div>
        </div>
      ) : tab==="wos" ? (
        <div className="card"><div className="card-body"><div className="d-flex flex-wrap gap-2 justify-content-between mb-2"><h6 className="mb-0">Work Orders ({filteredWos.length})</h6><select className="form-select form-select-sm" style={{maxWidth:200}} value={woStatus} onChange={e=>setWoStatus(e.target.value)}><option value="">All statuses</option>{["OPEN","IN_PROGRESS","ON_HOLD","COMPLETED","CANCELLED"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>WO #</th><th>Asset</th><th>Type</th><th>Priority</th><th>Assigned</th><th>Scheduled</th><th>Cost</th><th>Status</th></tr></thead><tbody>{filteredWos.map(w=> <tr key={w.id}><td className="small fw-semibold">{w.workOrderNo}<div className="text-muted">{w.description?String(w.description).slice(0,40):""}</div></td><td>{w.asset?.name||w.assetName||"-"}</td><td>{w.type}</td><td><span className={`badge bg-${priBadge(w.priority)}`}>{w.priority}</span></td><td className="small">{w.assignedTo||"-"}</td><td className="small">{w.scheduledAt?new Date(w.scheduledAt).toLocaleDateString():"-"}</td><td className="small">{money(Number(w.laborCost||0)+Number(w.partsCost||0))}</td><td><select className="form-select form-select-sm" value={w.status} onChange={e=>updWo(w.id,{status:e.target.value})}>{["OPEN","IN_PROGRESS","ON_HOLD","COMPLETED","CANCELLED"].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}{!filteredWos.length&&<tr><td colSpan={8} className="text-muted">No work orders</td></tr>}</tbody></table></div>
        </div></div>
      ) : (
        <div className="card"><div className="card-body" style={{maxWidth:760}}><h6>Create Work Order</h6>
          <form onSubmit={saveWo} className="row g-2">
            <div className="col-md-6"><label className="form-label small">Asset</label><select className="form-select" value={wo.assetId} onChange={e=>setWo({...wo,assetId:e.target.value})}><option value="">(No linked asset)</option>{assets.filter(a=>a.status!=="DISPOSED").map(a=> <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>)}</select></div>
            <div className="col-md-3"><label className="form-label small">Type</label><select className="form-select" value={wo.type} onChange={e=>setWo({...wo,type:e.target.value})}><option>PREVENTIVE</option><option>CORRECTIVE</option><option>INSPECTION</option><option>EMERGENCY</option></select></div>
            <div className="col-md-3"><label className="form-label small">Priority</label><select className="form-select" value={wo.priority} onChange={e=>setWo({...wo,priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></div>
            <div className="col-md-6"><label className="form-label small">Assigned to</label><input className="form-control" value={wo.assignedTo} onChange={e=>setWo({...wo,assignedTo:e.target.value})} placeholder="Technician / team"/></div>
            <div className="col-md-3"><label className="form-label small">Scheduled</label><input type="datetime-local" className="form-control" value={wo.scheduledAt} onChange={e=>setWo({...wo,scheduledAt:e.target.value})}/></div>
            <div className="col-md-3"><label className="form-label small">Status</label><select className="form-select" value={wo.status} onChange={e=>setWo({...wo,status:e.target.value})}><option>OPEN</option><option>IN_PROGRESS</option><option>ON_HOLD</option></select></div>
            <div className="col-md-4"><label className="form-label small">Labor cost</label><input type="number" step="0.01" className="form-control" value={wo.laborCost} onChange={e=>setWo({...wo,laborCost:e.target.value})}/></div>
            <div className="col-md-4"><label className="form-label small">Parts cost</label><input type="number" step="0.01" className="form-control" value={wo.partsCost} onChange={e=>setWo({...wo,partsCost:e.target.value})}/></div>
            <div className="col-md-4"><label className="form-label small">Downtime (hrs)</label><input type="number" step="0.1" className="form-control" value={wo.downtimeHours} onChange={e=>setWo({...wo,downtimeHours:e.target.value})}/></div>
            <div className="col-12"><label className="form-label small">Description</label><textarea className="form-control" rows={3} value={wo.description} onChange={e=>setWo({...wo,description:e.target.value})} placeholder="Issue, scope, checklist..."/></div>
            <div className="col-12"><button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Create Work Order</button></div>
          </form>
        </div></div>
      )}
    </div>
  );
}
