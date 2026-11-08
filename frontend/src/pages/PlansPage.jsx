import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  CalendarRange,
  Target,
  Map as MapIcon,
  ClipboardList,
  Search,
  ChevronRight,
  Lock,
  Unlock,
  Trash2,
  Link2,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react";
import { api, buildQuery } from "../lib/api";
import PlanEditor from "../components/PlanEditor";

const TYPE_META = {
  ROADMAP: {
    label: "Roadmap",
    title: "Roadmap",
    subtitle: "Long-range phased plan. Delivery of strategic plans rolls up into roadmap phases.",
    icon: MapIcon,
    parentType: null,
    accent: "#7c3aed",
  },
  STRATEGIC: {
    label: "Strategic Plan",
    title: "Strategic Plan",
    subtitle: "Multi-year strategy. Each annual plan rolls up into its strategic plan.",
    icon: Target,
    parentType: "ROADMAP",
    accent: "var(--brand-primary)",
  },
  AOP: {
    label: "Annual Plan",
    title: "Annual Operational Plan",
    subtitle: "Fiscal-year operating plan. Generated from the standard template and linked to a strategic plan.",
    icon: ClipboardList,
    parentType: "STRATEGIC",
    accent: "#0B2545",
  },
};

const STATUS_STYLES = {
  Active: "bg-success",
  Draft: "bg-secondary",
  "In Review": "bg-info text-dark",
  Approved: "bg-primary",
  Closed: "bg-dark",
};

export default function PlansPage({ type }) {
  const meta = TYPE_META[type];
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("plan");

  const [plans, setPlans] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [filters, setFilters] = useState({ period: "All", status: "All", q: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [linkFor, setLinkFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, periodList] = await Promise.all([
        api.get(`/plans${buildQuery({ type, period: filters.period, status: filters.status, q: filters.q })}`),
        api.get(`/plans/periods?type=${type}`),
      ]);
      setPlans(Array.isArray(list) ? list : []);
      setPeriods(Array.isArray(periodList) ? periodList : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [type, filters.period, filters.status, filters.q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!meta.parentType) {
      setParentOptions([]);
      return;
    }
    api
      .get(`/plans${buildQuery({ type: meta.parentType })}`)
      .then((data) => setParentOptions(Array.isArray(data) ? data : []))
      .catch(() => setParentOptions([]));
  }, [meta.parentType, plans.length]);

  const openPlan = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("plan", id);
    setSearchParams(next);
  };

  const closePlan = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("plan");
    setSearchParams(next);
    load();
  };

  const setStatus = async (plan, status) => {
    try {
      await api.put(`/plans/${plan.id}`, { status });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const togglePublished = async (plan) => {
    try {
      await api.put(`/plans/${plan.id}`, { isPublished: !plan.isPublished });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const removePlan = async (plan) => {
    if (!confirm(`Delete "${plan.title}"? All of its items, alerts and reporting deadlines will be removed.`)) return;
    try {
      await api.del(`/plans/${plan.id}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const linkParent = async (plan) => {
    try {
      await api.put(`/plans/${plan.id}`, { parentPlanId: linkFor.parentId || null });
      setLinkFor(null);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const activePeriods = useMemo(
    () => periods.slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate)),
    [periods]
  );

  if (selectedId) {
    return <PlanEditor planId={selectedId} onBack={closePlan} />;
  }

  const Icon = meta.icon;

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            <Icon size={28} style={{ color: meta.accent }} /> {meta.title}
          </h2>
          <p className="text-muted mb-0 small" style={{ maxWidth: 720 }}>
            {meta.subtitle}
          </p>
        </div>
        <button className="btn-brand btn-sm d-flex align-items-center" onClick={() => setCreating(true)}>
          <Plus size={14} className="me-1" />
          {type === "AOP" ? "New annual plan" : `New ${meta.label.toLowerCase()}`}
        </button>
      </div>

      {/* Period + status filters */}
      <div className="card border-0 shadow-sm p-3 mb-4">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="small text-uppercase fw-bold text-muted me-1" style={{ letterSpacing: 1 }}>
            Period
          </span>
          <button
            className={`btn btn-sm ${filters.period === "All" ? "btn-brand" : "btn-outline-secondary"}`}
            onClick={() => setFilters((f) => ({ ...f, period: "All" }))}
          >
            All periods
          </button>
          {activePeriods.map((period) => (
            <button
              key={`${period.type}-${period.periodLabel}`}
              className={`btn btn-sm ${filters.period === period.periodLabel ? "btn-brand" : "btn-outline-secondary"}`}
              onClick={() => setFilters((f) => ({ ...f, period: period.periodLabel }))}
            >
              {period.periodLabel}
              {period.hasActive && <span className="ms-1 badge bg-success" style={{ fontSize: 9 }}>live</span>}
            </button>
          ))}
          <span className="ms-auto d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: 130 }}
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="All">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="In Review">In review</option>
              <option value="Approved">Approved</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
            </select>
            <form
              className="d-flex"
              onSubmit={(e) => {
                e.preventDefault();
                setFilters((f) => ({ ...f, q: search }));
              }}
            >
              <div className="input-group input-group-sm" style={{ width: 200 }}>
                <span className="input-group-text bg-white"><Search size={13} /></span>
                <input
                  className="form-control"
                  placeholder="Search plans"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </form>
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-success" /></div>
      ) : plans.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center">
          <Icon size={40} className="mx-auto mb-3" style={{ color: meta.accent, opacity: 0.4 }} />
          <h5 className="fw-bold">No {meta.label.toLowerCase()}s for this filter</h5>
          <p className="text-muted small mb-3">
            {type === "AOP"
              ? "Create an annual plan from the standard template, then tailor it to the year."
              : "Create a plan period to start capturing goals, objectives, KPIs and activities."}
          </p>
          <button className="btn-brand btn-sm mx-auto" onClick={() => setCreating(true)}>
            <Plus size={14} className="me-1" /> Create {meta.label.toLowerCase()}
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {plans.map((plan) => (
            <div className="col-xl-6" key={plan.id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${STATUS_STYLES[plan.status] || "bg-secondary"}`}>{plan.status}</span>
                      <span className="badge bg-light text-dark border"><CalendarRange size={11} className="me-1" />{plan.periodLabel}</span>
                      {plan.parent && (
                        <span className="badge bg-light text-muted border d-none d-md-inline">
                          <Link2 size={11} className="me-1" />{plan.parent.periodLabel}
                        </span>
                      )}
                    </div>
                    <button
                      className={`btn btn-sm ${plan.isPublished ? "btn-outline-success" : "btn-outline-secondary"}`}
                      title={plan.isPublished ? "Published on the home page" : "Not on the public home page"}
                      onClick={() => togglePublished(plan)}
                    >
                      {plan.isPublished ? <Unlock size={13} /> : <Lock size={13} />}
                    </button>
                  </div>

                  <h5 className="fw-bold mb-1" style={{ color: "var(--brand-primary)" }}>{plan.title}</h5>
                  <div className="text-muted small mb-3">
                    {new Date(plan.startDate).toLocaleDateString()} &ndash; {new Date(plan.endDate).toLocaleDateString()}
                    {plan.owner ? ` Â· ${plan.owner}` : ""}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Delivery completion</span>
                      <span className="fw-bold" style={{ color: meta.accent }}>{Math.round(plan.completion || 0)}%</span>
                    </div>
                    <div className="progress" style={{ height: 7 }}>
                      <div className="progress-bar" style={{ width: `${Math.min(100, plan.completion || 0)}%`, background: meta.accent }} />
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-3 small text-muted mb-3">
                    <span><strong className="text-dark">{plan._count?.items ?? 0}</strong> items</span>
                    <span><strong className="text-dark">{plan._count?.reports ?? 0}</strong> reports</span>
                    <span className={plan.openAlerts ? "text-danger fw-semibold" : ""}>
                      <strong className={plan.openAlerts ? "text-danger" : "text-dark"}>{plan.openAlerts}</strong> open alerts
                    </span>
                    {plan.unreadComments > 0 && (
                      <span className="badge bg-warning text-dark">
                        {plan.unreadComments} new comment{plan.unreadComments === 1 ? "" : "s"}
                      </span>
                    )}
                    {plan.childPlans?.length > 0 && (
                      <span><strong className="text-dark">{plan.childPlans.length}</strong> linked plans</span>
                    )}
                  </div>

                  {plan.childPlans?.length > 0 && (
                    <div className="mb-3 small">
                      {plan.childPlans.map((child) => (
                        <div className="d-flex justify-content-between border-bottom py-1" key={child.id}>
                          <span className="text-truncate me-2">{child.periodLabel} Â· {child.title}</span>
                          <span className="fw-semibold">{Math.round(child.completion)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto d-flex flex-wrap gap-2">
                    <button className="btn-brand btn-sm" onClick={() => openPlan(plan.id)}>
                      Open plan <ChevronRight size={13} className="ms-1" />
                    </button>
                    {plan.status !== "Active" && (
                      <button className="btn btn-sm btn-outline-success" onClick={() => setStatus(plan, "Active")}>Set active</button>
                    )}
                    {plan.status === "Active" && (
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setStatus(plan, "Closed")}>Close</button>
                    )}
                    {meta.parentType && (
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setLinkFor({ planId: plan.id, parentId: plan.parent?.id || "" })}>
                        <Link2 size={13} className="me-1" />Link
                      </button>
                    )}
                    {plan.period && !plan.period.successorId && (
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/planning-calendar?plan=${plan.id}`}
                        title="Review and prepare the next period"
                      >
                        <CalendarRange size={13} className="me-1" />Next period
                      </Link>
                    )}
                    <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => removePlan(plan)}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {linkFor?.planId === plan.id && (
                    <div className="mt-2 p-2 bg-light rounded d-flex gap-2">
                      <select
                        className="form-select form-select-sm"
                        value={linkFor.parentId}
                        onChange={(e) => setLinkFor({ ...linkFor, parentId: e.target.value })}
                      >
                        <option value="">Not linked</option>
                        {parentOptions.map((parent) => (
                          <option key={parent.id} value={parent.id}>{parent.periodLabel} Â· {parent.title}</option>
                        ))}
                      </select>
                      <button className="btn btn-sm btn-brand" onClick={() => linkParent(plan)}>Save</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setLinkFor(null)}><X size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreatePlanModal
          type={type}
          meta={meta}
          parentOptions={parentOptions}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            load();
            if (id) openPlan(id);
          }}
        />
      )}
    </div>
  );
}

function CreatePlanModal({ type, meta, parentOptions, onClose, onCreated }) {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState(type === "AOP" ? "template" : "blank");
  const [fyYear, setFyYear] = useState(currentYear);
  const [template, setTemplate] = useState(null);
  const [templateError, setTemplateError] = useState("");
  const [form, setForm] = useState({
    title: "",
    periodLabel: "",
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear + (type === "ROADMAP" ? 9 : type === "STRATEGIC" ? 4 : 0)}-12-31`,
    status: "Draft",
    owner: "",
    summary: "",
    parentPlanId: "",
    isPublished: false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "template") return;
    setTemplateError("");
    api
      .get(`/plans/template/aop?year=${fyYear}`)
      .then(setTemplate)
      .catch((e) => setTemplateError(e.message));
  }, [mode, fyYear]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "template") {
        const result = await api.post("/plans/from-template", {
          fyStartYear: Number(fyYear),
          title: form.title || undefined,
          owner: form.owner || null,
          parentPlanId: form.parentPlanId || null,
          status: form.status,
          isPublished: form.isPublished,
        });
        onCreated(result.plan.id);
      } else {
        const plan = await api.post("/plans", {
          type,
          title: form.title,
          periodLabel: form.periodLabel,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status,
          owner: form.owner || null,
          summary: form.summary || null,
          parentPlanId: form.parentPlanId || null,
          isPublished: form.isPublished,
        });
        onCreated(plan.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(15,23,42,0.5)" }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header">
            <div>
              <h5 className="modal-title fw-bold mb-0">
                {type === "AOP" ? "New annual operational plan" : `New ${meta.label.toLowerCase()}`}
              </h5>
              <div className="small text-muted">{meta.subtitle}</div>
            </div>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              {type === "AOP" && (
                <ul className="nav nav-pills nav-fill mb-3 small">
                  <li className="nav-item">
                    <button type="button" className={`nav-link ${mode === "template" ? "active btn-brand" : ""}`} onClick={() => setMode("template")}>
                      <Sparkles size={14} className="me-1" /> From standard template
                    </button>
                  </li>
                  <li className="nav-item">
                    <button type="button" className={`nav-link ${mode === "blank" ? "active btn-brand" : ""}`} onClick={() => setMode("blank")}>
                      Empty plan
                    </button>
                  </li>
                </ul>
              )}

              {mode === "template" ? (
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Fiscal year starts</label>
                    <select className="form-select form-select-sm" value={fyYear} onChange={(e) => setFyYear(Number(e.target.value))}>
                      {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((year) => (
                        <option key={year} value={year}>July {year} â€“ June {year + 1}</option>
                      ))}
                    </select>
                    <div className="form-text">
                      Period label: <strong>{template?.fyLabel || fyYear} EFY</strong>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Status</label>
                    <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option>Draft</option>
                      <option>Active</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Link to strategic plan</label>
                    <select className="form-select form-select-sm" value={form.parentPlanId} onChange={(e) => setForm({ ...form, parentPlanId: e.target.value })}>
                      <option value="">Not linked</option>
                      {parentOptions.map((parent) => (
                        <option key={parent.id} value={parent.id}>{parent.periodLabel} Â· {parent.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <div className="border rounded p-3 bg-light">
                      {templateError && <div className="text-danger small">{templateError}</div>}
                      {!template && !templateError && <div className="small text-muted">Building template previewâ€¦</div>}
                      {template && (
                        <>
                          <div className="d-flex flex-wrap gap-3 small mb-2">
                            <span className="fw-semibold">{template.pillars} pillars</span>
                            <span>{template.objectives} objectives</span>
                            <span>{template.activities} quarterly activities</span>
                            <span>{template.kpis} KPIs with quarterly targets</span>
                            <span className="text-muted">
                              {new Date(template.startDate).toLocaleDateString()} â€“ {new Date(template.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="small" style={{ maxHeight: 180, overflowY: "auto" }}>
                            {template.outline.map((pillar) => (
                              <div className="mb-1" key={pillar.code}>
                                <span className="badge bg-secondary me-1">{pillar.code}</span>
                                <strong>{pillar.title}</strong>
                                <div className="text-muted ps-4">{pillar.objectives.join(" Â· ")}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-7">
                    <label className="form-label small fw-semibold">Title</label>
                    <input required className="form-control form-control-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={`${meta.label} ${currentYear}-${currentYear + 4}`} />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">Period label</label>
                    <input required className="form-control form-control-sm" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} placeholder="2026-2030" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Start</label>
                    <input type="date" required className="form-control form-control-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">End</label>
                    <input type="date" required className="form-control form-control-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Status</label>
                    <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Closed</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Owner</label>
                    <input className="form-control form-control-sm" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="username" />
                  </div>
                  {meta.parentType && (
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Link to {TYPE_META[meta.parentType].label.toLowerCase()}</label>
                      <select className="form-select form-select-sm" value={form.parentPlanId} onChange={(e) => setForm({ ...form, parentPlanId: e.target.value })}>
                        <option value="">Not linked</option>
                        {parentOptions.map((parent) => (
                          <option key={parent.id} value={parent.id}>{parent.periodLabel} Â· {parent.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Summary</label>
                    <textarea className="form-control form-control-sm" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center gap-3 mt-3">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="publish-new" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                  <label className="form-check-label small" htmlFor="publish-new">Publish on the public home page</label>
                </div>
              </div>

              {mode === "template" && (
                <div className="mt-2 small text-muted">
                  <AlertTriangle size={13} className="me-1" />
                  Template items and KPI targets are editable after creation â€” nothing here is hard-coded.
                </div>
              )}
              {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-brand btn-sm" disabled={saving}>
                {saving ? "Creatingâ€¦" : mode === "template" ? "Create from template" : "Create plan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
