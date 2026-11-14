import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";

const PO_STATUSES = ["DRAFT","SUBMITTED","APPROVED","ORDERED","PARTIALLY_RECEIVED","RECEIVED","CLOSED","CANCELLED"];
const money = (n, c="ETB") => `${Number(n||0).toLocaleString()} ${c}`;

export default function ProcurementPage() {
  const [tab, setTab] = useState("dashboard");
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [vQ, setVQ] = useState(""); const [poQ, setPoQ] = useState(""); const [poStatus, setPoStatus] = useState("");
  const [vForm, setVForm] = useState({ name:"", code:"", email:"", phone:"", category:"", contactName:"", paymentTerms:"", status:"ACTIVE", notes:"" });
  const [editingVendor, setEditingVendor] = useState(null);
  const [poForm, setPoForm] = useState({ vendorId:"", currency:"ETB", status:"DRAFT", expectedAt:"", notes:"", items:[{description:"", sku:"", quantity:1, unit:"unit", unitPrice:0}] });
  const [receivePo, setReceivePo] = useState(null);
  const [receiveQty, setReceiveQty] = useState({});

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [v,p,s] = await Promise.all([api.get("/procurement/vendors"), api.get("/procurement/purchase-orders"), api.get("/procurement/summary")]);
      setVendors(v||[]); setPos(p||[]); setSummary(s||null);
    } catch(e){ setErr(e.message||"Failed to load"); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); }, []);
  const flash = (m)=>{ setMsg(m); setTimeout(()=>setMsg(""),3000); };

  const filteredVendors = useMemo(()=> vendors.filter(v => !vQ || [v.name,v.code,v.email,v.category].some(x=>String(x||"").toLowerCase().includes(vQ.toLowerCase()))), [vendors,vQ]);
  const filteredPOs = useMemo(()=> pos.filter(p => (!poStatus||p.status===poStatus) && (!poQ || [p.poNumber,p.vendor?.name,p.notes].some(x=>String(x||"").toLowerCase().includes(poQ.toLowerCase())))), [pos,poQ,poStatus]);

  const saveVendor = async (e)=>{ e.preventDefault(); setErr(""); try{
    if(editingVendor){ await api.put(`/procurement/vendors/${editingVendor.id}`, vForm); flash("Vendor updated"); }
    else { await api.post("/procurement/vendors", vForm); flash("Vendor created"); }
    setVForm({ name:"", code:"", email:"", phone:"", category:"", contactName:"", paymentTerms:"", status:"ACTIVE", notes:"" }); setEditingVendor(null); load();
  }catch(e){ setErr(e.message); } };
  const editVendor = (v)=>{ setEditingVendor(v); setVForm({ name:v.name||"", code:v.code||"", email:v.email||"", phone:v.phone||"", category:v.category||"", contactName:v.contactName||"", paymentTerms:v.paymentTerms||"", status:v.status||"ACTIVE", notes:v.notes||"" }); setTab("vendors"); };
  const delVendor = async (id)=>{ if(!window.confirm("Delete this vendor?")) return; try{ await api.delete(`/procurement/vendors/${id}`); flash("Vendor deleted"); load(); }catch(e){ setErr(e.message); } };

  const setPoItem = (i, patch)=> setPoForm(f=> ({...f, items: f.items.map((it,idx)=> idx===i?{...it,...patch}:it)}));
  const addPoItem = ()=> setPoForm(f=> ({...f, items:[...f.items,{description:"",sku:"",quantity:1,unit:"unit",unitPrice:0}]}));
  const removePoItem = (i)=> setPoForm(f=> ({...f, items: f.items.filter((_,idx)=>idx!==i)}));
  const poSubtotal = poForm.items.reduce((s,it)=> s + Number(it.quantity||0)*Number(it.unitPrice||0), 0);

  const savePO = async (e)=>{ e.preventDefault(); setErr(""); try{
    const items = poForm.items.filter(it=>String(it.description||"").trim()).map(it=>({...it, quantity:Number(it.quantity||1), unitPrice:Number(it.unitPrice||0)}));
    if(!items.length) return setErr("Add at least one line item");
    await api.post("/procurement/purchase-orders", {...poForm, items});
    flash("Purchase order created"); setPoForm({ vendorId:"", currency:"ETB", status:"DRAFT", expectedAt:"", notes:"", items:[{description:"", sku:"", quantity:1, unit:"unit", unitPrice:0}] }); setTab("pos"); load();
  }catch(e){ setErr(e.message); } };
  const updatePOStatus = async (id,status)=>{ try{ await api.put(`/procurement/purchase-orders/${id}`,{status}); flash("Status updated"); load(); }catch(e){ setErr(e.message); } };
  const openReceive = (po)=>{ setReceivePo(po); const q={}; (po.items||[]).forEach(i=> q[i.id]=Math.max(0, Number(i.quantity)-Number(i.receivedQty||0))); setReceiveQty(q); };
  const submitReceive = async ()=>{ if(!receivePo) return; try{
    const items = Object.entries(receiveQty).map(([itemId,qty])=>({itemId, qty:Number(qty||0)})).filter(x=>x.qty>0);
    await api.post(`/procurement/purchase-orders/${receivePo.id}/receive`, { items });
    flash("Receipt recorded"); setReceivePo(null); load();
  }catch(e){ setErr(e.message); } };

  const badge = (s)=>({DRAFT:"secondary",SUBMITTED:"info text-dark",APPROVED:"primary",ORDERED:"primary",PARTIALLY_RECEIVED:"warning text-dark",RECEIVED:"success",CLOSED:"dark",CANCELLED:"danger"}[s]||"secondary");

  return (
    <div className="container-fluid p-3 p-lg-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div><h3 className="mb-0" style={{color:"#0B2545"}}>Procurement & Vendor Management</h3><div className="text-muted small">Sourcing, vendors, purchase orders, approvals and receiving</div></div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/procurement/vendors/export","vendors.csv").catch(e=>setErr(e.message))}>Export Vendors</button>
          <button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/procurement/purchase-orders/export","purchase-orders.csv").catch(e=>setErr(e.message))}>Export POs</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button>
        </div>
      </div>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <ul className="nav nav-tabs mb-3">
        {[["dashboard","Dashboard"],["vendors","Vendors"],["pos","Purchase Orders"],["create","New PO"]].map(([k,l])=> <li key={k} className="nav-item"><button className={`nav-link ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button></li>)}
      </ul>
      {loading ? <div className="text-muted">Loading...</div> : tab==="dashboard" ? (
        <>
          <div className="row g-3 mb-3">
            {[["Vendors",summary?.vendors||0,"#0B2545"],["Total POs",summary?.totalPOs||0,"#0B2545"],["Open POs",summary?.openPOs||0,"#C9A227"],["Total Spend",money(summary?.totalSpend||0),"#198754"]].map(([l,v,c])=> (
              <div key={l} className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-4 fw-bold" style={{color:c}}>{v}</div></div></div></div>
            ))}
          </div>
          <div className="card"><div className="card-body"><h6>POs by Status</h6>
            <div className="row g-2">{(summary?.byStatus||[]).map(s=> <div key={s.status} className="col-6 col-md-3 col-lg-2"><div className="border rounded p-2 text-center"><div className="small text-muted">{s.status.replace("_"," ")}</div><div className="fw-bold">{s.count}</div></div></div>)}</div>
          </div></div>
          <div className="card mt-3"><div className="card-body"><h6>Recent Purchase Orders</h6>
            <div className="table-responsive"><table className="table table-sm align-middle mb-0"><thead><tr><th>PO #</th><th>Vendor</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{pos.slice(0,8).map(p=> <tr key={p.id}><td className="fw-semibold">{p.poNumber}</td><td>{p.vendor?.name||"-"}</td><td>{money(p.total,p.currency)}</td><td><span className={`badge bg-${badge(p.status)}`}>{p.status}</span></td><td className="small text-muted">{p.orderDate?new Date(p.orderDate).toLocaleDateString():"-"}</td></tr>)}{!pos.length&&<tr><td colSpan={5} className="text-muted">No purchase orders</td></tr>}</tbody></table></div>
          </div></div>
        </>
      ) : tab==="vendors" ? (
        <div className="row g-3">
          <div className="col-lg-4"><div className="card h-100"><div className="card-body">
            <h6>{editingVendor?"Edit Vendor":"Add Vendor"}</h6>
            <form onSubmit={saveVendor} className="d-grid gap-2">
              <input className="form-control" placeholder="Vendor name *" value={vForm.name} onChange={e=>setVForm({...vForm,name:e.target.value})} required />
              <div className="d-flex gap-2"><input className="form-control" placeholder="Code" value={vForm.code} onChange={e=>setVForm({...vForm,code:e.target.value})} /><input className="form-control" placeholder="Category" value={vForm.category} onChange={e=>setVForm({...vForm,category:e.target.value})} /></div>
              <input className="form-control" placeholder="Contact person" value={vForm.contactName} onChange={e=>setVForm({...vForm,contactName:e.target.value})} />
              <div className="d-flex gap-2"><input className="form-control" placeholder="Email" value={vForm.email} onChange={e=>setVForm({...vForm,email:e.target.value})} /><input className="form-control" placeholder="Phone" value={vForm.phone} onChange={e=>setVForm({...vForm,phone:e.target.value})} /></div>
              <input className="form-control" placeholder="Payment terms" value={vForm.paymentTerms} onChange={e=>setVForm({...vForm,paymentTerms:e.target.value})} />
              <select className="form-select" value={vForm.status} onChange={e=>setVForm({...vForm,status:e.target.value})}><option>ACTIVE</option><option>INACTIVE</option><option>BLACKLISTED</option></select>
              <textarea className="form-control" rows={2} placeholder="Notes" value={vForm.notes} onChange={e=>setVForm({...vForm,notes:e.target.value})} />
              <div className="d-flex gap-2"><button className="btn btn-primary flex-fill" style={{background:"#0B2545",borderColor:"#0B2545"}}>{editingVendor?"Update":"Save Vendor"}</button>{editingVendor && <button type="button" className="btn btn-outline-secondary" onClick={()=>{setEditingVendor(null);setVForm({name:"",code:"",email:"",phone:"",category:"",contactName:"",paymentTerms:"",status:"ACTIVE",notes:""});}}>Cancel</button>}</div>
            </form>
          </div></div></div>
          <div className="col-lg-8"><div className="card h-100"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2"><h6 className="mb-0">Vendors ({filteredVendors.length})</h6><input className="form-control form-control-sm" style={{maxWidth:220}} placeholder="Search vendors..." value={vQ} onChange={e=>setVQ(e.target.value)} /></div>
            <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Name</th><th>Contact</th><th>Category</th><th>POs/Spend</th><th>Status</th><th></th></tr></thead>
              <tbody>{filteredVendors.map(v=> <tr key={v.id}><td><div className="fw-semibold">{v.name}</div><div className="text-muted small">{v.code||"-"}</div></td><td className="small">{v.contactName||"-"}<br/>{v.email||v.phone||""}</td><td>{v.category||"-"}</td><td className="small">{v.poCount||0} / {money(v.spend||0)}</td><td><span className={`badge ${v.status==="ACTIVE"?"bg-success":v.status==="BLACKLISTED"?"bg-danger":"bg-secondary"}`}>{v.status}</span></td><td className="text-nowrap"><button className="btn btn-sm btn-link p-0 me-2" onClick={()=>editVendor(v)}>Edit</button><button className="btn btn-sm btn-link text-danger p-0" onClick={()=>delVendor(v.id)}>Delete</button></td></tr>)}
              {!filteredVendors.length && <tr><td colSpan={6} className="text-muted">No vendors found</td></tr>}</tbody></table></div>
          </div></div></div>
        </div>
      ) : tab==="pos" ? (
        <div className="card"><div className="card-body">
          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2"><h6 className="mb-0">Purchase Orders ({filteredPOs.length})</h6>
            <div className="d-flex gap-2"><select className="form-select form-select-sm" value={poStatus} onChange={e=>setPoStatus(e.target.value)}><option value="">All statuses</option>{PO_STATUSES.map(s=><option key={s}>{s}</option>)}</select><input className="form-control form-control-sm" placeholder="Search..." value={poQ} onChange={e=>setPoQ(e.target.value)} /></div>
          </div>
          <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>PO #</th><th>Vendor</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredPOs.map(p=> <tr key={p.id}><td className="fw-semibold">{p.poNumber}<div className="small text-muted">{p.orderDate?new Date(p.orderDate).toLocaleDateString():""}</div></td><td>{p.vendor?.name||"-"}</td><td className="small">{(p.items||[]).length} line(s)</td><td>{money(p.total,p.currency)}</td><td><span className={`badge bg-${badge(p.status)}`}>{p.status}</span></td>
              <td className="text-nowrap"><select className="form-select form-select-sm d-inline-block w-auto me-1" value={p.status} onChange={e=>updatePOStatus(p.id,e.target.value)}>{PO_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
                {["APPROVED","ORDERED","PARTIALLY_RECEIVED"].includes(p.status) && <button className="btn btn-sm btn-outline-success" onClick={()=>openReceive(p)}>Receive</button>}</td></tr>)}
            {!filteredPOs.length && <tr><td colSpan={6} className="text-muted">No purchase orders found</td></tr>}</tbody></table></div>
          {receivePo && <div className="border rounded p-3 mt-3 bg-light"><div className="d-flex justify-content-between"><h6 className="mb-2">Receive items — {receivePo.poNumber}</h6><button className="btn btn-sm btn-outline-secondary" onClick={()=>setReceivePo(null)}>Close</button></div>
            {(receivePo.items||[]).map(it=> <div key={it.id} className="d-flex align-items-center gap-2 mb-2"><div className="flex-fill"><div className="fw-semibold small">{it.description}</div><div className="text-muted small">Ordered {it.quantity} · Received {it.receivedQty||0}</div></div><input className="form-control form-control-sm" style={{width:120}} type="number" min="0" step="0.001" value={receiveQty[it.id]??0} onChange={e=>setReceiveQty(q=>({...q,[it.id]:e.target.value}))} /></div>)}
            <button className="btn btn-success btn-sm mt-1" onClick={submitReceive}>Confirm Receipt</button>
          </div>}
        </div></div>
      ) : (
        <div className="card"><div className="card-body"><h6>Create Purchase Order</h6>
          <form onSubmit={savePO}>
            <div className="row g-2 mb-3">
              <div className="col-md-4"><label className="form-label small">Vendor *</label><select className="form-select" value={poForm.vendorId} onChange={e=>setPoForm({...poForm,vendorId:e.target.value})} required><option value="">Select vendor</option>{vendors.filter(v=>v.status!=="BLACKLISTED").map(v=> <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
              <div className="col-md-2"><label className="form-label small">Currency</label><select className="form-select" value={poForm.currency} onChange={e=>setPoForm({...poForm,currency:e.target.value})}><option>ETB</option><option>USD</option><option>EUR</option></select></div>
              <div className="col-md-3"><label className="form-label small">Status</label><select className="form-select" value={poForm.status} onChange={e=>setPoForm({...poForm,status:e.target.value})}>{PO_STATUSES.slice(0,4).map(s=><option key={s}>{s}</option>)}</select></div>
              <div className="col-md-3"><label className="form-label small">Expected date</label><input type="date" className="form-control" value={poForm.expectedAt} onChange={e=>setPoForm({...poForm,expectedAt:e.target.value})} /></div>
            </div>
            <div className="table-responsive mb-2"><table className="table table-sm align-middle"><thead><tr><th>Description</th><th style={{width:120}}>SKU</th><th style={{width:90}}>Qty</th><th style={{width:90}}>Unit</th><th style={{width:130}}>Unit Price</th><th style={{width:120}}>Total</th><th></th></tr></thead>
              <tbody>{poForm.items.map((it,i)=> <tr key={i}><td><input className="form-control form-control-sm" value={it.description} onChange={e=>setPoItem(i,{description:e.target.value})} placeholder="Item / service" required /></td><td><input className="form-control form-control-sm" value={it.sku} onChange={e=>setPoItem(i,{sku:e.target.value})} /></td><td><input className="form-control form-control-sm" type="number" min="0.001" step="0.001" value={it.quantity} onChange={e=>setPoItem(i,{quantity:e.target.value})} /></td><td><input className="form-control form-control-sm" value={it.unit} onChange={e=>setPoItem(i,{unit:e.target.value})} /></td><td><input className="form-control form-control-sm" type="number" min="0" step="0.01" value={it.unitPrice} onChange={e=>setPoItem(i,{unitPrice:e.target.value})} /></td><td className="fw-semibold">{money(Number(it.quantity||0)*Number(it.unitPrice||0), poForm.currency)}</td><td>{poForm.items.length>1 && <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removePoItem(i)}>×</button>}</td></tr>)}</tbody></table></div>
            <div className="d-flex justify-content-between align-items-center mb-3"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={addPoItem}>+ Add line</button><div className="fw-bold">Subtotal: {money(poSubtotal, poForm.currency)}</div></div>
            <textarea className="form-control mb-3" rows={2} placeholder="Notes / terms" value={poForm.notes} onChange={e=>setPoForm({...poForm,notes:e.target.value})} />
            <button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Create Purchase Order</button>
          </form>
        </div></div>
      )}
    </div>
  );
}
