import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadFromApi } from "../../lib/download";

const money = (n)=> Number(n||0).toLocaleString();

export default function WarehousePage() {
  const [tab, setTab] = useState("dashboard");
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [moves, setMoves] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [q, setQ] = useState(""); const [lowOnly, setLowOnly] = useState(false); const [whFilter, setWhFilter] = useState("");
  const [wh, setWh] = useState({ code:"", name:"", location:"", type:"MAIN" });
  const [it, setIt] = useState({ warehouseId:"", sku:"", name:"", category:"", quantity:0, unit:"unit", minLevel:0, reorderPoint:0, unitCost:0 });
  const [mv, setMv] = useState({ warehouseId:"", itemId:"", type:"IN", quantity:1, reason:"", reference:"" });
  const [tr, setTr] = useState({ fromWarehouseId:"", toWarehouseId:"", itemSku:"", quantity:1, reason:"" });
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [w,i,m,s] = await Promise.all([api.get("/warehouse/warehouses"), api.get("/warehouse/items"), api.get("/warehouse/movements"), api.get("/warehouse/summary")]);
      setWarehouses(w||[]); setItems(i||[]); setMoves(m||[]); setSummary(s||null);
    } catch(e){ setErr(e.message); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); }, []);
  const flash = (m)=>{ setMsg(m); setTimeout(()=>setMsg(""),3000); };

  const filteredItems = useMemo(()=> items.filter(i => (!whFilter||i.warehouseId===whFilter) && (!lowOnly || Number(i.quantity)<=Number(i.reorderPoint||i.minLevel||0)) && (!q || [i.name,i.sku,i.category].some(x=>String(x||"").toLowerCase().includes(q.toLowerCase())))), [items,q,lowOnly,whFilter]);

  const saveWh = async (e)=>{ e.preventDefault(); setErr(""); try{ await api.post("/warehouse/warehouses", wh); flash("Warehouse created"); setWh({code:"",name:"",location:"",type:"MAIN"}); load(); }catch(e){setErr(e.message);} };
  const saveItem = async (e)=>{ e.preventDefault(); setErr(""); try{
    const payload = {...it, quantity:Number(it.quantity), minLevel:Number(it.minLevel), reorderPoint:Number(it.reorderPoint), unitCost:Number(it.unitCost)};
    if(editItem){ await api.put(`/warehouse/items/${editItem.id}`, payload); flash("Item updated"); }
    else { await api.post("/warehouse/items", payload); flash("Item created"); }
    setIt({ warehouseId: it.warehouseId, sku:"", name:"", category:"", quantity:0, unit:"unit", minLevel:0, reorderPoint:0, unitCost:0 }); setEditItem(null); load();
  }catch(e){setErr(e.message);} };
  const startEdit = (i)=>{ setEditItem(i); setIt({ warehouseId:i.warehouseId, sku:i.sku||"", name:i.name||"", category:i.category||"", quantity:i.quantity||0, unit:i.unit||"unit", minLevel:i.minLevel||0, reorderPoint:i.reorderPoint||0, unitCost:i.unitCost||0 }); setTab("items"); };
  const saveMove = async (e)=>{ e.preventDefault(); setErr(""); try{ await api.post("/warehouse/movements", {...mv, quantity:Number(mv.quantity)}); flash("Movement recorded"); setMv({...mv, quantity:1, reason:"", reference:""}); load(); }catch(e){setErr(e.message);} };
  const saveTransfer = async (e)=>{ e.preventDefault(); setErr(""); try{ await api.post("/warehouse/transfer", {...tr, quantity:Number(tr.quantity)}); flash("Transfer completed"); setTr({fromWarehouseId:"",toWarehouseId:"",itemSku:"",quantity:1,reason:""}); load(); }catch(e){setErr(e.message);} };

  const sourceItems = items.filter(i=>i.warehouseId===tr.fromWarehouseId);

  return (
    <div className="container-fluid p-3 p-lg-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2"><div><h3 className="mb-0" style={{color:"#0B2545"}}>Inventory & Warehouse Management (WMS)</h3><div className="text-muted small">Warehouses, stock control, movements, transfers and low-stock visibility</div></div><div className="d-flex gap-2 flex-wrap"><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/warehouse/items/export","inventory-items.csv").catch(e=>setErr(e.message))}>Export Items</button><button className="btn btn-outline-primary btn-sm" onClick={()=>downloadFromApi("/warehouse/movements/export","stock-movements.csv").catch(e=>setErr(e.message))}>Export Movements</button><button className="btn btn-outline-secondary btn-sm" onClick={load}>Refresh</button></div></div>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <ul className="nav nav-tabs mb-3">
        {[["dashboard","Dashboard"],["items","Stock Items"],["warehouses","Warehouses"],["movements","Movements"],["transfer","Transfer"]].map(([k,l])=> <li key={k} className="nav-item"><button className={`nav-link ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button></li>)}
      </ul>
      {loading ? <div>Loading...</div> : tab==="dashboard" ? (
        <>
          <div className="row g-3 mb-3">
            {[["Warehouses",summary?.warehouses||0,"#0B2545"],["Stock Items",summary?.items||0,"#0B2545"],["Low Stock",summary?.lowStock||0, summary?.lowStock?"#dc3545":"#198754"],["Movements",summary?.movements||0,"#6c757d"],["Stock Value",money(summary?.totalValue||0),"#198754"]].map(([l,v,c])=> <div key={l} className="col-6 col-lg"><div className="card h-100"><div className="card-body"><div className="text-muted small">{l}</div><div className="fs-4 fw-bold" style={{color:c}}>{v}</div></div></div></div>)}
          </div>
          <div className="card"><div className="card-body"><div className="d-flex justify-content-between"><h6>Low Stock / Reorder Alerts</h6><span className="badge bg-danger">{items.filter(i=>Number(i.quantity)<=Number(i.reorderPoint||i.minLevel||0)).length}</span></div>
            <div className="table-responsive"><table className="table table-sm align-middle mb-0"><thead><tr><th>Item</th><th>SKU</th><th>Warehouse</th><th>Qty</th><th>Reorder Pt</th><th>Status</th></tr></thead>
            <tbody>{items.filter(i=>Number(i.quantity)<=Number(i.reorderPoint||i.minLevel||0)).slice(0,12).map(i=> <tr key={i.id} className="table-warning"><td className="fw-semibold">{i.name}</td><td>{i.sku}</td><td>{i.warehouse?.name||"-"}</td><td>{i.quantity} {i.unit}</td><td>{i.reorderPoint||i.minLevel}</td><td><span className="badge bg-warning text-dark">Reorder</span></td></tr>)}{!items.some(i=>Number(i.quantity)<=Number(i.reorderPoint||i.minLevel||0)) && <tr><td colSpan={6} className="text-muted">No low-stock items</td></tr>}</tbody></table></div>
          </div></div>
        </>
      ) : tab==="items" ? (
        <div className="row g-3">
          <div className="col-lg-4"><div className="card"><div className="card-body"><h6>{editItem?"Edit Item":"New Inventory Item"}</h6>
            <form onSubmit={saveItem} className="d-grid gap-2">
              <select className="form-select" value={it.warehouseId} onChange={e=>setIt({...it,warehouseId:e.target.value})} required disabled={!!editItem}><option value="">Warehouse *</option>{warehouses.map(w=> <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select>
              <div className="d-flex gap-2"><input className="form-control" placeholder="SKU *" value={it.sku} onChange={e=>setIt({...it,sku:e.target.value})} required/><input className="form-control" placeholder="Category" value={it.category} onChange={e=>setIt({...it,category:e.target.value})}/></div>
              <input className="form-control" placeholder="Item name *" value={it.name} onChange={e=>setIt({...it,name:e.target.value})} required/>
              <div className="d-flex gap-2"><input className="form-control" type="number" placeholder="Qty" value={it.quantity} onChange={e=>setIt({...it,quantity:e.target.value})} disabled={!!editItem}/><input className="form-control" placeholder="Unit" value={it.unit} onChange={e=>setIt({...it,unit:e.target.value})}/></div>
              <div className="d-flex gap-2"><input className="form-control" type="number" placeholder="Min level" value={it.minLevel} onChange={e=>setIt({...it,minLevel:e.target.value})}/><input className="form-control" type="number" placeholder="Reorder point" value={it.reorderPoint} onChange={e=>setIt({...it,reorderPoint:e.target.value})}/></div>
              <input className="form-control" type="number" step="0.01" placeholder="Unit cost" value={it.unitCost} onChange={e=>setIt({...it,unitCost:e.target.value})}/>
              <div className="d-flex gap-2"><button className="btn btn-primary flex-fill" style={{background:"#0B2545",borderColor:"#0B2545"}}>{editItem?"Update":"Add Item"}</button>{editItem && <button type="button" className="btn btn-outline-secondary" onClick={()=>{setEditItem(null);setIt({warehouseId:"",sku:"",name:"",category:"",quantity:0,unit:"unit",minLevel:0,reorderPoint:0,unitCost:0});}}>Cancel</button>}</div>
            </form></div></div></div>
          <div className="col-lg-8"><div className="card"><div className="card-body">
            <div className="d-flex flex-wrap gap-2 justify-content-between mb-2"><h6 className="mb-0">Stock Items ({filteredItems.length})</h6><div className="d-flex gap-2 align-items-center"><select className="form-select form-select-sm" style={{maxWidth:180}} value={whFilter} onChange={e=>setWhFilter(e.target.value)}><option value="">All warehouses</option>{warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}</select><div className="form-check mb-0"><input className="form-check-input" type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} id="lowOnly"/><label className="form-check-label small" htmlFor="lowOnly">Low stock</label></div><input className="form-control form-control-sm" style={{maxWidth:180}} placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} /></div></div>
            <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>SKU</th><th>Name</th><th>Warehouse</th><th>Qty</th><th>Value</th><th></th></tr></thead>
            <tbody>{filteredItems.map(i=> { const low=Number(i.quantity)<=Number(i.reorderPoint||i.minLevel||0); return <tr key={i.id} className={low?"table-warning":""}><td>{i.sku}</td><td><div className="fw-semibold">{i.name}</div><div className="small text-muted">{i.category||"-"}</div></td><td>{i.warehouse?.name||"-"}</td><td><span className={low?"text-danger fw-bold":""}>{i.quantity} {i.unit}</span><div className="small text-muted">min {i.minLevel} / rop {i.reorderPoint}</div></td><td className="small">{money(Number(i.quantity)*Number(i.unitCost||0))}</td><td><button className="btn btn-sm btn-link p-0" onClick={()=>startEdit(i)}>Edit</button></td></tr>;})}{!filteredItems.length&&<tr><td colSpan={6} className="text-muted">No items</td></tr>}</tbody></table></div>
          </div></div></div>
        </div>
      ) : tab==="warehouses" ? (
        <div className="row g-3">
          <div className="col-lg-4"><div className="card"><div className="card-body"><h6>New Warehouse</h6>
            <form onSubmit={saveWh} className="d-grid gap-2">
              <input className="form-control" placeholder="Code *" value={wh.code} onChange={e=>setWh({...wh,code:e.target.value})} required/>
              <input className="form-control" placeholder="Name *" value={wh.name} onChange={e=>setWh({...wh,name:e.target.value})} required/>
              <input className="form-control" placeholder="Location" value={wh.location} onChange={e=>setWh({...wh,location:e.target.value})}/>
              <select className="form-select" value={wh.type} onChange={e=>setWh({...wh,type:e.target.value})}><option>MAIN</option><option>STORE</option><option>DISTRIBUTION</option><option>COLD</option></select>
              <button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Create</button>
            </form></div></div></div>
          <div className="col-lg-8"><div className="card"><div className="card-body"><h6>Warehouses ({warehouses.length})</h6>
            <table className="table table-sm align-middle"><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Location</th><th>Items</th><th>Status</th></tr></thead>
            <tbody>{warehouses.map(w=> <tr key={w.id}><td className="fw-semibold">{w.code}</td><td>{w.name}</td><td>{w.type}</td><td>{w.location||"-"}</td><td>{items.filter(i=>i.warehouseId===w.id).length}</td><td><span className="badge bg-success">{w.status}</span></td></tr>)}{!warehouses.length&&<tr><td colSpan={6} className="text-muted">None</td></tr>}</tbody></table>
          </div></div></div>
        </div>
      ) : tab==="movements" ? (
        <div className="row g-3">
          <div className="col-lg-4"><div className="card"><div className="card-body"><h6>Record Movement</h6>
            <form onSubmit={saveMove} className="d-grid gap-2">
              <select className="form-select" value={mv.warehouseId} onChange={e=>setMv({...mv,warehouseId:e.target.value,itemId:""})} required><option value="">Warehouse *</option>{warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              <select className="form-select" value={mv.itemId} onChange={e=>setMv({...mv,itemId:e.target.value})} required><option value="">Item *</option>{items.filter(i=>!mv.warehouseId||i.warehouseId===mv.warehouseId).map(i=> <option key={i.id} value={i.id}>{i.name} ({i.sku}) — {i.quantity} {i.unit}</option>)}</select>
              <select className="form-select" value={mv.type} onChange={e=>setMv({...mv,type:e.target.value})}><option value="IN">IN (receive)</option><option value="OUT">OUT (issue)</option><option value="RETURN">RETURN</option><option value="DAMAGE">DAMAGE/LOSS</option><option value="ADJUST">ADJUST (set absolute qty)</option></select>
              <div className="d-flex gap-2"><input className="form-control" type="number" min="0.001" step="0.001" placeholder="Quantity" value={mv.quantity} onChange={e=>setMv({...mv,quantity:e.target.value})} required/><input className="form-control" placeholder="Reference" value={mv.reference} onChange={e=>setMv({...mv,reference:e.target.value})}/></div>
              <input className="form-control" placeholder="Reason / notes" value={mv.reason} onChange={e=>setMv({...mv,reason:e.target.value})}/>
              <button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Record Movement</button>
            </form></div></div></div>
          <div className="col-lg-8"><div className="card"><div className="card-body"><h6>Movement History</h6>
            <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Time</th><th>Type</th><th>Item</th><th>Warehouse</th><th>Qty</th><th>Ref</th><th>By</th></tr></thead>
            <tbody>{moves.map(m=> <tr key={m.id}><td className="small text-muted">{new Date(m.createdAt).toLocaleString()}</td><td><span className={`badge ${m.type==="IN"||m.type==="TRANSFER_IN"||m.type==="RETURN"?"bg-success":"bg-secondary"}`}>{m.type}</span></td><td>{m.item?.name||"-"}<div className="small text-muted">{m.item?.sku||""}</div></td><td className="small">{m.warehouse?.name||"-"}</td><td className="fw-semibold">{m.quantity}</td><td className="small">{m.reference||m.reason||"-"}</td><td className="small">{m.performedBy||"-"}</td></tr>)}{!moves.length&&<tr><td colSpan={7} className="text-muted">No movements</td></tr>}</tbody></table></div>
          </div></div></div>
        </div>
      ) : (
        <div className="card"><div className="card-body" style={{maxWidth:720}}><h6>Inter-Warehouse Transfer</h6><p className="text-muted small">Moves stock by SKU between warehouses (creates destination item record if missing).</p>
          <form onSubmit={saveTransfer} className="row g-2">
            <div className="col-md-6"><label className="form-label small">From warehouse *</label><select className="form-select" value={tr.fromWarehouseId} onChange={e=>setTr({...tr,fromWarehouseId:e.target.value,itemSku:""})} required><option value="">Select</option>{warehouses.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div className="col-md-6"><label className="form-label small">To warehouse *</label><select className="form-select" value={tr.toWarehouseId} onChange={e=>setTr({...tr,toWarehouseId:e.target.value})} required><option value="">Select</option>{warehouses.filter(w=>w.id!==tr.fromWarehouseId).map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div className="col-md-6"><label className="form-label small">Item (SKU) *</label><select className="form-select" value={tr.itemSku} onChange={e=>setTr({...tr,itemSku:e.target.value})} required><option value="">Select item</option>{sourceItems.map(i=> <option key={i.id} value={i.sku}>{i.name} ({i.sku}) — avail {i.quantity}</option>)}</select></div>
            <div className="col-md-3"><label className="form-label small">Quantity *</label><input className="form-control" type="number" min="0.001" step="0.001" value={tr.quantity} onChange={e=>setTr({...tr,quantity:e.target.value})} required/></div>
            <div className="col-md-12"><label className="form-label small">Reason</label><input className="form-control" value={tr.reason} onChange={e=>setTr({...tr,reason:e.target.value})} placeholder="Transfer reason / reference"/></div>
            <div className="col-12"><button className="btn btn-primary" style={{background:"#0B2545",borderColor:"#0B2545"}}>Execute Transfer</button></div>
          </form>
        </div></div>
      )}
    </div>
  );
}
