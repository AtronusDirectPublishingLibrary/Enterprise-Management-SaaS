import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ALL_PLATFORM_MODULES, PLATFORM_MODULE_GROUPS } from "./platformModules";

const STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"];

export default function PlatformTenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [plans, setPlans] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ status: "", subscriptionPlanId: "", enabledModules: [], trialEndsAt: "" });

  const load = async () => {
    setErr("");
    const [t, p] = await Promise.all([
      api.get(`/portals/platform/tenants/${id}`),
      api.get("/portals/platform/plans").catch(() => ({ items: [] })),
    ]);
    setTenant(t);
    setPlans(p.items || []);
    setForm({
      status: t.status || "TRIAL",
      subscriptionPlanId: t.subscriptionPlanId || t.subscriptionPlan?.id || "",
      enabledModules: Array.isArray(t.enabledModules) ? t.enabledModules : [],
      trialEndsAt: t.trialEndsAt ? String(t.trialEndsAt).slice(0, 10) : "",
    });
  };

  useEffect(() => { load().catch(e => setErr(e?.message || "Failed to load tenant")); }, [id]); // eslint-disable-line

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const act = async (label, fn) => {
    setBusy(label); setErr("");
    try { await fn(); await load(); } catch (e) { setErr(e?.data?.message || e?.message || "Action failed"); }
    finally { setBusy(""); }
  };

  const save = async () => {
    setBusy("save"); setErr("");
    try {
      await api.put(`/portals/platform/tenants/${id}`, {
        status: form.status,
        subscriptionPlanId: form.subscriptionPlanId || null,
        enabledModules: form.enabledModules,
        trialEndsAt: form.trialEndsAt || null,
      });
      flash("Tenant subscription/settings saved");
      await load();
    } catch (e) { setErr(e?.data?.message || e?.message || "Failed to save"); }
    finally { setBusy(""); }
  };

  const applyPlanModules = () => {
    const plan = plans.find(p => p.id === form.subscriptionPlanId);
    if (!plan) return;
    setForm(f => ({ ...f, enabledModules: Array.isArray(plan.enabledModules) ? plan.enabledModules : [] }));
  };

  const impersonate = async () => {
    setBusy("impersonate"); setErr("");
    try {
      await api.post(`/portals/platform/tenants/${id}/impersonate`, {});
      if (refreshSession) await refreshSession();
      navigate("/dashboard", { replace: true });
    } catch (e) { setErr(e?.data?.message || e?.message || "Failed to impersonate"); }
    finally { setBusy(""); }
  };

  const toggleModule = (key) => setForm(f => ({ ...f, enabledModules: f.enabledModules.includes(key) ? f.enabledModules.filter(m => m !== key) : [...f.enabledModules, key] }));
  const setAllModules = (on) => setForm(f => ({ ...f, enabledModules: on ? [...ALL_PLATFORM_MODULES] : [] }));

  const effectiveModules = useMemo(() => {
    if (form.enabledModules.length > 0) return form.enabledModules;
    const plan = plans.find(p => p.id === form.subscriptionPlanId);
    if (plan && Array.isArray(plan.enabledModules) && plan.enabledModules.length > 0) return plan.enabledModules;
    return null; // allow-all
  }, [form.enabledModules, form.subscriptionPlanId, plans]);

  if (err && !tenant) return <div className="alert alert-danger">{err}</div>;
  if (!tenant) return <div className="text-secondary">Loading tenant...</div>;

  const isFirst = tenant.isFirstTenant || tenant.slug === "ethio-biopharma";
  const selectedPlan = plans.find(p => p.id === form.subscriptionPlanId) || tenant.subscriptionPlan;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-0">{tenant.name} <small className="text-secondary">({tenant.slug})</small></h4>
          <div className="small text-secondary">Tenant management · plan/tier assignment · module access · lifecycle</div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {isFirst && <span className="badge bg-info">Ethio-Biopharma • protected first tenant</span>}
          <span className={`badge ${tenant.status === "ACTIVE" ? "bg-success" : tenant.status === "TRIAL" ? "bg-warning text-dark" : tenant.status === "SUSPENDED" ? "bg-danger" : "bg-secondary"}`}>{tenant.status}</span>
          <button className="btn btn-sm btn-outline-light" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <div className="card border-0 h-100" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <h6>Tenant Profile</h6>
              <div className="row g-1 small">
                <div className="col-5 text-secondary">Status</div><div className="col-7">{tenant.status}</div>
                <div className="col-5 text-secondary">Type</div><div className="col-7">{tenant.type || "-"}</div>
                <div className="col-5 text-secondary">Industry</div><div className="col-7">{tenant.industryType || "-"}</div>
                <div className="col-5 text-secondary">Org size</div><div className="col-7">{tenant.orgSize || "-"}</div>
                <div className="col-5 text-secondary">Users</div><div className="col-7">{tenant._count?.users ?? tenant.users?.length ?? 0}</div>
                <div className="col-5 text-secondary">Plan</div><div className="col-7">{tenant.subscriptionPlan?.name || tenant.subscriptionPlan?.code || "None"}</div>
                <div className="col-5 text-secondary">Onboarding</div><div className="col-7">{tenant.onboardingComplete ? "Complete" : "Incomplete"}</div>
                <div className="col-5 text-secondary">Created</div><div className="col-7">{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "-"}</div>
                <div className="col-5 text-secondary">Brand</div><div className="col-7">{tenant.branding?.orgName || tenant.name}</div>
              </div>
              <hr className="border-secondary" />
              <h6>Actions</h6>
              <div className="d-grid gap-2">
                <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={impersonate}>{busy === "impersonate" ? "Impersonating..." : "Impersonate (login as tenant)"}</button>
                <div className="d-flex gap-2">
                  <button className="btn btn-warning btn-sm flex-fill" disabled={!!busy || isFirst} onClick={() => act("suspend", () => api.post(`/portals/platform/tenants/${id}/suspend`, {}))}>Suspend</button>
                  <button className="btn btn-outline-success btn-sm flex-fill" disabled={!!busy} onClick={() => act("activate", () => api.put(`/portals/platform/tenants/${id}`, { status: "ACTIVE" }))}>Activate</button>
                </div>
                <button className="btn btn-danger btn-sm" disabled={!!busy || isFirst} onClick={() => { if (window.confirm("Soft-delete (cancel) this tenant?")) act("delete", () => api.delete(`/portals/platform/tenants/${id}`)); }}>Soft Delete (30d grace)</button>
                {isFirst && <div className="small text-warning">Protected: first tenant cannot be suspended or deleted.</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 h-100" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Subscription, Tier & Module Access</h6>
                <button className="btn btn-sm btn-success" disabled={!!busy} onClick={save}>{busy === "save" ? "Saving..." : "Save Changes"}</button>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <label className="form-label small text-secondary">Lifecycle Status</label>
                  <select className="form-select form-select-sm bg-dark text-light border-secondary" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={isFirst && ["SUSPENDED","CANCELLED"].includes(form.status)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-secondary">Subscription Plan / Tier</label>
                  <select className="form-select form-select-sm bg-dark text-light border-secondary" value={form.subscriptionPlanId} onChange={e => setForm({ ...form, subscriptionPlanId: e.target.value })}>
                    <option value="">(No plan)</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code}){p.isActive ? "" : " — inactive"}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-secondary">Trial ends</label>
                  <input type="date" className="form-control form-control-sm bg-dark text-light border-secondary" value={form.trialEndsAt} onChange={e => setForm({ ...form, trialEndsAt: e.target.value })} />
                </div>
              </div>
              {selectedPlan && (
                <div className="small mb-2 p-2 rounded" style={{ background: "#0b1220", border: "1px solid #1f2937" }}>
                  <b>{selectedPlan.name || selectedPlan.code}</b>: {selectedPlan.priceMonthly ?? 0} {selectedPlan.currency || "USD"}/mo · trial {selectedPlan.trialDays ?? 0}d · max users {selectedPlan.maxUsers ?? "∞"} · storage {selectedPlan.maxStorageGb ?? "∞"} GB
                  <div className="mt-1">Effective access: {effectiveModules ? `${effectiveModules.length} module(s) enabled` : <span className="text-warning">Allow-all (no explicit module list)</span>}</div>
                  <button type="button" className="btn btn-link btn-sm text-info p-0 mt-1" onClick={applyPlanModules}>Copy plan modules to tenant overrides</button>
                </div>
              )}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold">Tenant Module Overrides ({form.enabledModules.length})</span>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-link btn-sm text-info p-0" onClick={() => setAllModules(true)}>Enable all</button>
                  <button type="button" className="btn btn-link btn-sm text-warning p-0" onClick={() => setAllModules(false)}>Clear overrides (inherit/allow-all)</button>
                </div>
              </div>
              <div style={{ maxHeight: 240, overflow: "auto" }} className="pe-1">
                {PLATFORM_MODULE_GROUPS.map(g => (
                  <div key={g.title} className="mb-2">
                    <div className="small text-secondary mb-1">{g.title}</div>
                    <div className="d-flex flex-wrap gap-1">
                      {g.modules.map(m => {
                        const on = form.enabledModules.includes(m.key);
                        return <button type="button" key={m.key} onClick={() => toggleModule(m.key)} className={`btn btn-sm ${on ? "btn-primary" : "btn-outline-secondary"}`} style={{ fontSize: 11, padding: "2px 8px" }} title={m.key}>{m.label}</button>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="small text-secondary mt-1">Overrides take precedence over plan modules. If both overrides and plan modules are empty, access falls back to allow-all for backward compatibility.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <h6>Users ({(tenant.users || []).length})</h6>
              <div className="table-responsive"><table className="table table-sm table-dark table-borderless mb-0"><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Last login</th></tr></thead><tbody>
                {(tenant.users || []).map(u => (<tr key={u.id}><td>{u.username}{u.isTenantAdmin ? <span className="badge bg-secondary ms-1">admin</span> : null}</td><td>{u.email || "-"}</td><td>{u.role}</td><td className="text-secondary">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td></tr>))}
                {!(tenant.users || []).length && <tr><td colSpan={4} className="text-secondary">No users</td></tr>}
              </tbody></table></div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0" style={{ background: "#111827", color: "#e5e7eb" }}>
            <div className="card-body">
              <h6>Recent Audit</h6>
              <div className="table-responsive"><table className="table table-sm table-dark table-borderless mb-0"><thead><tr><th>Time</th><th>Action</th><th>User</th></tr></thead><tbody>
                {(tenant.recentAudit || []).map(a => (<tr key={a.id}><td className="text-secondary">{new Date(a.timestamp).toLocaleString()}</td><td>{a.action}</td><td>{a.user}</td></tr>))}
                {!(tenant.recentAudit || []).length && <tr><td colSpan={3} className="text-secondary">No audit entries</td></tr>}
              </tbody></table></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
