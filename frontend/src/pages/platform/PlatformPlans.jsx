import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { ALL_PLATFORM_MODULES, PLATFORM_MODULE_GROUPS } from "./platformModules";

const emptyPlan = () => ({ code: "", name: "", description: "", priceMonthly: 0, priceYearly: 0, currency: "USD", trialDays: 14, maxUsers: "", maxStorageGb: "", enabledModules: [], isActive: true });

export default function PlatformPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(emptyPlan());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true); setErr("");
    try { const res = await api.get("/portals/platform/plans"); setPlans(res.items || []); }
    catch (e) { setErr(e?.message || "Failed to load plans"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const toggleModule = (key) => setForm(f => ({ ...f, enabledModules: f.enabledModules.includes(key) ? f.enabledModules.filter(m => m !== key) : [...f.enabledModules, key] }));
  const setAllModules = (on) => setForm(f => ({ ...f, enabledModules: on ? [...ALL_PLATFORM_MODULES] : [] }));

  const startEdit = (p) => { setEditing(p); setForm({ code: p.code || "", name: p.name || "", description: p.description || "", priceMonthly: p.priceMonthly ?? 0, priceYearly: p.priceYearly ?? 0, currency: p.currency || "USD", trialDays: p.trialDays ?? 14, maxUsers: p.maxUsers ?? "", maxStorageGb: p.maxStorageGb ?? "", enabledModules: Array.isArray(p.enabledModules) ? p.enabledModules : [], isActive: p.isActive !== false }); };
  const cancel = () => { setEditing(null); setForm(emptyPlan()); };

  const save = async (e) => {
    e.preventDefault(); setErr("");
    const payload = { ...form, maxUsers: form.maxUsers === "" ? null : Number(form.maxUsers), maxStorageGb: form.maxStorageGb === "" ? null : Number(form.maxStorageGb), priceMonthly: Number(form.priceMonthly || 0), priceYearly: Number(form.priceYearly || 0), trialDays: Number(form.trialDays || 0) };
    try {
      if (editing) { await api.put(`/portals/platform/plans/${editing.id}`, payload); flash("Plan updated"); }
      else { await api.post("/portals/platform/plans", payload); flash("Plan created"); }
      cancel(); load();
    } catch (e2) { setErr(e2?.data?.message || e2?.message || "Failed to save plan"); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete/deactivate plan "${p.name}"?`)) return;
    try { const r = await api.delete(`/portals/platform/plans/${p.id}`); flash(r?.deactivated ? "Plan deactivated (in use)" : "Plan deleted"); load(); }
    catch (e) { setErr(e?.data?.message || e?.message || "Failed to delete plan"); }
  };

  const activeCount = useMemo(() => plans.filter(p => p.isActive).length, [plans]);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><h4 className="mb-0">Plans & Tier Management</h4><div className="text-secondary small">Create pricing tiers, define module bundles/limits, and manage subscription plans</div></div>
        <div className="d-flex gap-2"><span className="badge" style={{background:"#172554",color:"#93c5fd"}}>{plans.length} plans · {activeCount} active</span><button className="btn btn-sm btn-outline-light" onClick={load}>Refresh</button></div>
      </div>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <div className="row g-3">
        <div className="col-xl-4">
          <div className="card border-0 h-100" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <h6 className="mb-3">{editing ? `Edit Plan: ${editing.code}` : "Create New Plan / Tier"}</h6>
              <form onSubmit={save} className="d-grid gap-2">
                <div className="row g-2">
                  <div className="col-6"><label className="form-label small text-secondary">Code *</label><input className="form-control form-control-sm bg-dark text-light border-secondary" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="PRO" required /></div>
                  <div className="col-6"><label className="form-label small text-secondary">Name *</label><input className="form-control form-control-sm bg-dark text-light border-secondary" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Professional" required /></div>
                </div>
                <div><label className="form-label small text-secondary">Description</label><textarea rows={2} className="form-control form-control-sm bg-dark text-light border-secondary" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
                <div className="row g-2">
                  <div className="col-4"><label className="form-label small text-secondary">Monthly</label><input type="number" step="0.01" className="form-control form-control-sm bg-dark text-light border-secondary" value={form.priceMonthly} onChange={e=>setForm({...form,priceMonthly:e.target.value})} /></div>
                  <div className="col-4"><label className="form-label small text-secondary">Yearly</label><input type="number" step="0.01" className="form-control form-control-sm bg-dark text-light border-secondary" value={form.priceYearly} onChange={e=>setForm({...form,priceYearly:e.target.value})} /></div>
                  <div className="col-4"><label className="form-label small text-secondary">Currency</label><select className="form-select form-select-sm bg-dark text-light border-secondary" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option>USD</option><option>ETB</option><option>EUR</option></select></div>
                </div>
                <div className="row g-2">
                  <div className="col-4"><label className="form-label small text-secondary">Trial days</label><input type="number" className="form-control form-control-sm bg-dark text-light border-secondary" value={form.trialDays} onChange={e=>setForm({...form,trialDays:e.target.value})} /></div>
                  <div className="col-4"><label className="form-label small text-secondary">Max users</label><input type="number" className="form-control form-control-sm bg-dark text-light border-secondary" placeholder="∞" value={form.maxUsers} onChange={e=>setForm({...form,maxUsers:e.target.value})} /></div>
                  <div className="col-4"><label className="form-label small text-secondary">Max GB</label><input type="number" className="form-control form-control-sm bg-dark text-light border-secondary" placeholder="∞" value={form.maxStorageGb} onChange={e=>setForm({...form,maxStorageGb:e.target.value})} /></div>
                </div>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})} id="planActive" /><label className="form-check-label small" htmlFor="planActive">Active / available for assignment</label></div>
                <div className="border-top border-secondary pt-2 mt-1">
                  <div className="d-flex justify-content-between align-items-center mb-2"><span className="small fw-semibold">Included Modules ({form.enabledModules.length})</span><div className="d-flex gap-2"><button type="button" className="btn btn-link btn-sm text-info p-0" onClick={()=>setAllModules(true)}>All</button><button type="button" className="btn btn-link btn-sm text-secondary p-0" onClick={()=>setAllModules(false)}>None</button></div></div>
                  <div style={{maxHeight:260, overflow:"auto"}} className="pe-1">
                    {PLATFORM_MODULE_GROUPS.map(g => (
                      <div key={g.title} className="mb-2">
                        <div className="small text-secondary mb-1">{g.title}</div>
                        <div className="d-flex flex-wrap gap-1">
                          {g.modules.map(m => {
                            const on = form.enabledModules.includes(m.key);
                            return <button type="button" key={m.key} onClick={()=>toggleModule(m.key)} className={`btn btn-sm ${on?"btn-primary":"btn-outline-secondary"}`} style={{fontSize:11,padding:"2px 8px"}}>{m.label}</button>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="small text-secondary mt-1">Empty module list on a plan means "allow all" (legacy behavior). For strict tiering, select modules explicitly.</div>
                </div>
                <div className="d-flex gap-2 mt-1">
                  <button className="btn btn-primary flex-fill">{editing ? "Update Plan" : "Create Plan"}</button>
                  {editing && <button type="button" className="btn btn-outline-light" onClick={cancel}>Cancel</button>}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-xl-8">
          <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <h6 className="mb-3">Subscription Plans / Tiers</h6>
              {loading ? <div className="text-secondary">Loading plans...</div> : (
                <div className="row g-3">
                  {plans.map(p => (
                    <div key={p.id} className="col-md-6">
                      <div className="h-100 rounded p-3" style={{ background: "#0b1220", border: `1px solid ${p.isActive ? "#1e3a8a" : "#374151"}` }}>
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div><div className="fw-bold">{p.name} <span className="badge bg-secondary ms-1">{p.code}</span></div><div className="small text-secondary">{p.description || "No description"}</div></div>
                          <span className={`badge ${p.isActive?"bg-success":"bg-secondary"}`}>{p.isActive?"Active":"Inactive"}</span>
                        </div>
                        <div className="fs-5 fw-bold mt-1" style={{color:"#93c5fd"}}>{p.priceMonthly} {p.currency}<span className="fs-6 text-secondary fw-normal">/mo</span> <span className="fs-6 text-secondary fw-normal">· {p.priceYearly} /yr</span></div>
                        <div className="small text-secondary mb-2">Trial: {p.trialDays}d · Max users: {p.maxUsers ?? "∞"} · Storage: {p.maxStorageGb ?? "∞"} GB · Tenants: {p._count?.tenants ?? 0}</div>
                        <div className="small mb-2"><span className="text-secondary">Modules:</span> {(p.enabledModules||[]).length ? <span>{(p.enabledModules||[]).slice(0,8).join(", ")}{(p.enabledModules||[]).length>8?` +${(p.enabledModules||[]).length-8} more`:""}</span> : <span className="text-warning">Allow all (unset)</span>}</div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-light" onClick={()=>startEdit(p)}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>remove(p)}>Delete/Deactivate</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!plans.length && <div className="text-secondary">No plans configured yet. Create your first tier to start managing subscriptions.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
