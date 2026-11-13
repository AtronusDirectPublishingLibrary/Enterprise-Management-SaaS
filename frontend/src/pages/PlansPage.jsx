import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { api, buildQuery, API_BASE } from "../lib/api";
import { useAuth } from "../lib/auth";
import PlanEditor from "../components/PlanEditor";
import StaffAssigneeSelect from "../components/StaffAssigneeSelect";
import { canGovernPlans } from "../lib/access";

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
    accent: "var(--brand-primary)",
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
  const { user } = useAuth();
  const canWrite = ["admin", "executive", "project_manager"].includes(user?.role);
  const canGovern = canGovernPlans(user);
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
  const [importOpen, setImportOpen] = useState(false);
  const [importPlanId, setImportPlanId] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [importBusy, setImportBusy] = useState(false);
  const importInput = useRef(null);

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

  const loadImportHistory = async (planId) => {
    if (!planId) return setImportHistory([]);
    try {
      const data = await api.get(`/plans/${planId}/imports`);
      setImportHistory(Array.isArray(data) ? data : []);
    } catch { setImportHistory([]); }
  };

  const openImport = () => {
    const firstPlan = plans[0]?.id || "";
    setImportPlanId(firstPlan);
    setImportFile(null);
    setImportResult(null);
    setImportPreview(null);
    setImportOpen(true);
    loadImportHistory(firstPlan);
  };

  const sendPlanCsv = async (suffix) => {
    const body = new FormData();
    body.append("file", importFile);
    const response = await fetch(`${API_BASE}/plans/${importPlanId}/${suffix}`, {
      method: "POST",
      body,
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  };

  const previewPlanItems = async (event) => {
    event.preventDefault();
    if (!importPlanId) return setError("Choose the plan that should receive the CSV rows.");
    if (!importFile) return setError("Choose a CSV file first.");
    setImportBusy(true);
    setError("");
    setImportResult(null);
    setImportPreview(null);
    try {
      setImportPreview(await sendPlanCsv("import/preview"));
    } catch (e) {
      setError(e.message || "Could not preview the plan CSV.");
    } finally {
      setImportBusy(false);
    }
  };

  const uploadPlanItems = async () => {
    if (!importPlanId) return setError("Choose the plan that should receive the CSV rows.");
    if (!importFile) return setError("Choose a CSV file first.");
    setImportBusy(true);
    setError("");
    try {
      const data = await sendPlanCsv("import");
      setImportResult(data);
      setImportPreview(null);
      setImportFile(null);
      if (importInput.current) importInput.current.value = "";
      await Promise.all([load(), loadImportHistory(importPlanId)]);
    } catch (e) {
      setError(e.message || "Could not import the plan CSV.");
    } finally {
      setImportBusy(false);
    }
  };

  const rollbackImport = async (batchId) => {
    if (!window.confirm("Undo this import? Items it created are removed and items it updated are restored to their previous values.")) return;
    setImportBusy(true);
    setError("");
    try {
      await api.post(`/plans/imports/${batchId}/rollback`, {});
      await Promise.all([load(), loadImportHistory(importPlanId)]);
    } catch (e) {
      setError(e.message || "Could not roll back this import.");
    } finally {
      setImportBusy(false);
    }
  };

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
        <div className="d-flex flex-wrap gap-2">
          {canWrite && (
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={openImport}>
              <Upload size={14} className="me-1" /> CSV import
            </button>
          )}
          <button className="btn-brand btn-sm d-flex align-items-center" onClick={() => setCreating(true)}>
            <Plus size={14} className="me-1" />
            {type === "AOP" ? "New annual plan" : `New ${meta.label.toLowerCase()}`}
          </button>
        </div>
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
                    {plan.owner ? ` · ${plan.owner}` : ""}
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
                          <span className="text-truncate me-2">{child.periodLabel} · {child.title}</span>
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
                          <option key={parent.id} value={parent.id}>{parent.periodLabel} · {parent.title}</option>
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
          canGovern={canGovern}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            load();
            if (id) openPlan(id);
          }}
        />
      )}

      {importOpen && (
        <div className="modal d-block" style={{ background: "rgba(15,23,42,0.5)", zIndex: 1050 }} onClick={() => setImportOpen(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold mb-0">Import {meta.label.toLowerCase()} items</h5>
                  <div className="small text-muted">Upload a CSV into one of the plans listed below.</div>
                </div>
                <button className="btn-close" onClick={() => setImportOpen(false)} aria-label="Close" />
              </div>
              <form onSubmit={previewPlanItems}>
                <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  {plans.length === 0 ? (
                    <div className="alert alert-warning small mb-3">Create a plan first, then import its items.</div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Destination plan</label>
                      <select
                        className="form-select"
                        value={importPlanId}
                        onChange={(e) => {
                          setImportPlanId(e.target.value);
                          setImportPreview(null);
                          setImportResult(null);
                          loadImportHistory(e.target.value);
                        }}
                        required
                      >
                        <option value="">Select a plan…</option>
                        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.periodLabel} · {plan.title}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 p-2 rounded bg-light">
                    <div className="d-flex align-items-center gap-2 small">
                      <FileSpreadsheet size={17} className="text-success" />
                      <span>Use the template so codes, parent codes and target periods stay aligned.</span>
                    </div>
                    <a className="btn btn-outline-secondary btn-sm" href={`${API_BASE}/plans/template/items`}>
                      <Download size={14} /> Download template
                    </a>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">CSV file</label>
                    <input
                      ref={importInput}
                      type="file"
                      accept=".csv,text/csv"
                      className="form-control"
                      onChange={(e) => {
                        setImportFile(e.target.files?.[0] || null);
                        setImportPreview(null);
                        setImportResult(null);
                      }}
                      required
                    />
                  </div>
                  <div className="form-text">
                    Rows are matched by <code>code</code> (preferred) or title. Re-uploading a corrected sheet updates existing items.
                    Parent rows are resolved by <code>parentCode</code>; optional target columns create KPI readings.
                    Nothing is saved until you confirm the preview.
                  </div>
                  {importPreview && !importResult && (
                    <div className={`alert ${importPreview.skipped || importPreview.errors?.length ? "alert-warning" : "alert-info"} border-0 small mt-3 mb-0`}>
                      <div className="fw-semibold mb-1">
                        Preview for {importPreview.planTitle}: {importPreview.created} to add, {importPreview.updated} to update, {importPreview.skipped} to skip.
                      </div>
                      {importPreview.errors?.length > 0 && (
                        <ul className="mb-1 ps-3">
                          {importPreview.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      )}
                      <div className="table-responsive mt-2" style={{ maxHeight: 180 }}>
                        <table className="table table-sm mb-0" style={{ fontSize: "0.78rem" }}>
                          <thead><tr><th>Row</th><th>Action</th><th>Kind</th><th>Title</th></tr></thead>
                          <tbody>
                            {importPreview.rows?.map((row) => (
                              <tr key={row.line}>
                                <td>{row.line}</td>
                                <td>
                                  <span className={`badge ${row.action === "create" ? "bg-success" : row.action === "update" ? "bg-primary" : "bg-secondary"}`}>
                                    {row.action}
                                  </span>
                                </td>
                                <td>{row.kind}</td>
                                <td>{row.title}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {importResult && (
                    <div className={`alert ${importResult.skipped || importResult.errors?.length ? "alert-warning" : "alert-success"} border-0 small mt-3 mb-0`}>
                      <div className="fw-semibold">
                        {importResult.planTitle}: {importResult.created} added, {importResult.updated} updated, {importResult.skipped} skipped, {importResult.targets} target row(s).
                      </div>
                      {importResult.errors?.length > 0 && (
                        <ul className="mb-0 mt-1 ps-3">
                          {importResult.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-bold small text-uppercase text-muted">Import history for this plan</div>
                      <button type="button" className="btn btn-link btn-sm p-0" onClick={() => loadImportHistory(importPlanId)}>Refresh</button>
                    </div>
                    {importHistory.length === 0 ? (
                      <div className="small text-muted">No imports have been recorded for this plan yet.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0" style={{ fontSize: "0.8rem" }}>
                          <thead><tr><th>When</th><th>File</th><th>By</th><th>Result</th><th /></tr></thead>
                          <tbody>
                            {importHistory.map((batch) => (
                              <tr key={batch.id}>
                                <td>{new Date(batch.createdAt).toLocaleString("en-GB")}</td>
                                <td>{batch.fileName || "—"}</td>
                                <td>{batch.userName || "—"}</td>
                                <td>
                                  {batch.rolledBackAt ? (
                                    <span className="badge bg-secondary">rolled back</span>
                                  ) : (
                                    <span>
                                      {batch.summary?.created ?? 0} added, {batch.summary?.updated ?? 0} updated, {batch.summary?.skipped ?? 0} skipped
                                    </span>
                                  )}
                                </td>
                                <td className="text-end">
                                  {!batch.rolledBackAt && (
                                    <button type="button" className="btn btn-outline-danger btn-sm" disabled={importBusy} onClick={() => rollbackImport(batch.id)}>
                                      Undo
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setImportOpen(false)}>Close</button>
                  <button type="submit" className="btn btn-outline-primary" disabled={importBusy || !importPlanId || !importFile}>
                    <Upload size={15} /> {importBusy ? "Checking…" : "Preview changes"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-brand"
                    disabled={importBusy || !importPlanId || !importFile || !importPreview || Boolean(importResult)}
                    onClick={uploadPlanItems}
                  >
                    <Upload size={15} /> {importBusy ? "Importing…" : `Import ${importPreview ? importPreview.created + importPreview.updated : ""} row(s)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePlanModal({ type, meta, parentOptions, canGovern, onClose, onCreated }) {
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
          ...(canGovern ? { owner: form.owner || null } : {}),
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
          ...(canGovern ? { owner: form.owner || null } : {}),
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
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Fiscal year starts</label>
                    <select className="form-select form-select-sm" value={fyYear} onChange={(e) => setFyYear(Number(e.target.value))}>
                      {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((year) => (
                        <option key={year} value={year}>July {year} – June {year + 1}</option>
                      ))}
                    </select>
                    <div className="form-text">
                      Period label: <strong>{template?.fyLabel || fyYear} EFY</strong>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Status</label>
                    <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option>Draft</option>
                      <option>Active</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Link to strategic plan</label>
                    <select className="form-select form-select-sm" value={form.parentPlanId} onChange={(e) => setForm({ ...form, parentPlanId: e.target.value })}>
                      <option value="">Not linked</option>
                      {parentOptions.map((parent) => (
                        <option key={parent.id} value={parent.id}>{parent.periodLabel} · {parent.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold" htmlFor="template-plan-owner">Owner</label>
                    <StaffAssigneeSelect
                      id="template-plan-owner"
                      value={form.owner}
                      onChange={(owner) => setForm({ ...form, owner })}
                      disabled={!canGovern}
                      hint={canGovern ? undefined : "CEO and Strategy and Planning Officer only."}
                    />
                  </div>

                  <div className="col-12">
                    <div className="border rounded p-3 bg-light">
                      {templateError && <div className="text-danger small">{templateError}</div>}
                      {!template && !templateError && <div className="small text-muted">Building template preview…</div>}
                      {template && (
                        <>
                          <div className="d-flex flex-wrap gap-3 small mb-2">
                            <span className="fw-semibold">{template.pillars} pillars</span>
                            <span>{template.objectives} objectives</span>
                            <span>{template.activities} quarterly activities</span>
                            <span>{template.kpis} KPIs with quarterly targets</span>
                            <span className="text-muted">
                              {new Date(template.startDate).toLocaleDateString()} – {new Date(template.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="small" style={{ maxHeight: 180, overflowY: "auto" }}>
                            {template.outline.map((pillar) => (
                              <div className="mb-1" key={pillar.code}>
                                <span className="badge bg-secondary me-1">{pillar.code}</span>
                                <strong>{pillar.title}</strong>
                                <div className="text-muted ps-4">{pillar.objectives.join(" · ")}</div>
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
                    <label className="form-label small fw-semibold" htmlFor="new-plan-owner">Owner</label>
                    <StaffAssigneeSelect
                      id="new-plan-owner"
                      value={form.owner}
                      onChange={(owner) => setForm({ ...form, owner })}
                      disabled={!canGovern}
                      hint={canGovern ? undefined : "CEO and Strategy and Planning Officer only."}
                    />
                  </div>
                  {meta.parentType && (
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Link to {TYPE_META[meta.parentType].label.toLowerCase()}</label>
                      <select className="form-select form-select-sm" value={form.parentPlanId} onChange={(e) => setForm({ ...form, parentPlanId: e.target.value })}>
                        <option value="">Not linked</option>
                        {parentOptions.map((parent) => (
                          <option key={parent.id} value={parent.id}>{parent.periodLabel} · {parent.title}</option>
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
                  Template items and KPI targets are editable after creation — nothing here is hard-coded.
                </div>
              )}
              {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-brand btn-sm" disabled={saving}>
                {saving ? "Creating…" : mode === "template" ? "Create from template" : "Create plan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
