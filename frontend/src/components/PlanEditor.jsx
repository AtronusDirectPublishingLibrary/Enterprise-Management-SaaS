import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  BellRing,
  CalendarClock,
  Link2,
  Sparkles,
  ChevronRight,
  Unlock,
  Lock,
  Play,
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  Info,
  Target,
  ListTree,
  Mail,
  Share2,
  Copy,
  Check,
  MessageSquare,
  History,
  ListChecks,
  Download,
  Printer,
} from "lucide-react";
import { api, API_BASE } from "../lib/api";
import { useAuth } from "../lib/auth";
import PlanItemModal from "./PlanItemModal";

const TABS = [
  { id: "structure", label: "Structure", icon: ListTree },
  { id: "kpis", label: "KPIs & targets", icon: Target },
  { id: "actuals", label: "Actuals entry", icon: ListChecks },
  { id: "reports", label: "Reporting deadlines", icon: CalendarClock },
  { id: "alerts", label: "Alerts", icon: BellRing },
  { id: "share", label: "Share & feedback", icon: Share2 },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Sparkles },
];

const KIND_COLORS = {
  PILLAR: "#7c3aed",
  GOAL: "var(--brand-primary)",
  OBJECTIVE: "#0B2545",
  STRATEGY: "#0369a1",
  ACTIVITY: "#b45309",
  KPI: "#be123c",
  MILESTONE: "#4b5563",
};

const SEVERITY = {
  CRITICAL: { className: "text-danger", bg: "#fee2e2", icon: CircleAlert },
  WARNING: { className: "text-warning", bg: "#fef3c7", icon: AlertTriangle },
  INFO: { className: "text-primary", bg: "#dbeafe", icon: Info },
};

const TYPE_LABEL = { AOP: "Annual Operational Plan", STRATEGIC: "Strategic Plan", ROADMAP: "Roadmap" };

const percent = (value) => Math.round(Number(value) || 0);

export default function PlanEditor({ planId, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [plan, setPlan] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("structure");
  const [modal, setModal] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/plans/${planId}`);
      setPlan(data);
      const alertList = await api.get(`/plans/alerts?planId=${planId}`);
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpiItems = useMemo(
    () => (plan?.items || []).filter((item) => item.kind === "KPI"),
    [plan]
  );

  const transition = async (action) => {
    try {
      await api.post(`/plans/${plan.id}/transition`, { action });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const exportCsv = async () => {
    const response = await fetch(`${API_BASE}/plans/${plan.id}/export.csv`, { credentials: "include" });
    if (!response.ok) {
      alert("Export failed.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.type.toLowerCase()}-${plan.periodLabel.replace(/[^a-z0-9]+/gi, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runAlerts = async () => {
    setRunning(true);
    try {
      const summary = await api.post("/plans/alerts/run", { planId });
      setRunResult(summary);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setRunning(false);
    }
  };

  const updateAlert = async (id, status) => {
    try {
      await api.patch(`/plans/alerts/${id}`, { status });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const togglePublish = async () => {
    try {
      await api.put(`/plans/${plan.id}`, { isPublished: !plan.isPublished });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const saveItem = async (item, payload) => {
    try {
      await api.put(`/plans/items/${item.id}`, payload);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeItem = async (item) => {
    if (!confirm(`Delete "${item.title}" and all of its sub-items?`)) return;
    try {
      await api.del(`/plans/items/${item.id}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading || !plan) {
    return (
      <div className="p-4">
        <button className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
          <ArrowLeft size={14} className="me-1" /> Back
        </button>
        {error ? (
          <div className="alert alert-danger small">{error}</div>
        ) : (
          <div className="text-center py-5"><div className="spinner-border text-success" /></div>
        )}
      </div>
    );
  }

  const openAlerts = alerts.filter((alert) => alert.status !== "Resolved");

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
        <div>
          <button className="btn btn-sm btn-link text-muted p-0 mb-2 text-decoration-none" onClick={onBack}>
            <ArrowLeft size={14} className="me-1" /> All {TYPE_LABEL[plan.type]?.toLowerCase()} periods
          </button>
          <h2 className="page-title mb-1">{plan.title}</h2>
          <div className="d-flex flex-wrap align-items-center gap-2 small">
            <span className="badge bg-light text-dark border">{TYPE_LABEL[plan.type]}</span>
            <span className="badge bg-light text-dark border">{plan.periodLabel}</span>
            <span className={`badge ${plan.status === "Active" ? "bg-success" : "bg-secondary"}`}>{plan.status}</span>
            {plan.parent && (
              <span className="badge bg-light text-muted border">
                <Link2 size={11} className="me-1" />
                {plan.parent.periodLabel} Â· {plan.parent.title}
              </span>
            )}
            <span className="text-muted">
              {new Date(plan.startDate).toLocaleDateString()} â€“ {new Date(plan.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="text-end me-2">
            <div className="small text-muted">Delivery completion</div>
            <div className="fs-4 fw-bold" style={{ color: "var(--brand-primary)" }}>{percent(plan.completion)}%</div>
          </div>
          <button className={`btn btn-sm ${plan.isPublished ? "btn-outline-success" : "btn-outline-secondary"}`} onClick={togglePublish}>
            {plan.isPublished ? <Unlock size={14} className="me-1" /> : <Lock size={14} className="me-1" />}
            {plan.isPublished ? "Published" : "Not published"}
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={load}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {["Draft", "Closed"].includes(plan.status) && (
          <button className="btn btn-sm btn-outline-primary" onClick={() => transition("submit")}>
            Submit for review
          </button>
        )}
        {plan.status === "In Review" && isAdmin && (
          <button className="btn btn-sm btn-success" onClick={() => transition("approve")}>
            Approve plan
          </button>
        )}
        {plan.status === "Approved" && isAdmin && (
          <button className="btn btn-sm btn-success" onClick={() => transition("publish")}>
            Publish plan
          </button>
        )}
        {isAdmin && plan.status !== "Draft" && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => transition("reopen")}>
            Reopen as draft
          </button>
        )}
        <button className="btn btn-sm btn-outline-secondary" onClick={exportCsv}>
          <Download size={13} className="me-1" /> Export CSV
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/plans/${plan.id}/print`)}>
          <Printer size={13} className="me-1" /> Board pack (print/PDF)
        </button>
        {plan.approvedBy && (
          <span className="align-self-center small text-muted">
            Approved by {plan.approvedBy} on {new Date(plan.approvedAt).toLocaleDateString()}
            {plan.publishedAt ? ` Â· published ${new Date(plan.publishedAt).toLocaleDateString()}` : ""}
          </span>
        )}
      </div>

      {openAlerts.length > 0 && (
        <div className="alert d-flex align-items-center gap-2 py-2 small" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <BellRing size={15} className="text-danger" />
          <strong>{openAlerts.length}</strong> open alert{openAlerts.length === 1 ? "" : "s"} on this plan.
          <button className="btn btn-sm btn-outline-danger ms-auto py-0" onClick={() => setTab("alerts")}>Review</button>
        </div>
      )}

      <ul className="nav nav-pills gap-1 mb-3 small">
        {TABS.map((entry) => {
          const ItemIcon = entry.icon;
          return (
            <li className="nav-item" key={entry.id}>
              <button className={`nav-link ${tab === entry.id ? "active btn-brand" : "text-muted"}`} onClick={() => setTab(entry.id)}>
                <ItemIcon size={14} className="me-1" />
                {entry.label}
                {entry.id === "alerts" && openAlerts.length > 0 && (
                  <span className="badge bg-danger ms-1">{openAlerts.length}</span>
                )}
                {entry.id === "reports" && plan.reports.length > 0 && (
                  <span className="badge bg-secondary ms-1">{plan.reports.length}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {tab === "structure" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-0">Plan structure</h6>
                <div className="small text-muted">Pillars, objectives, strategies, activities and milestones. Completion rolls up automatically.</div>
              </div>
              <button className="btn-brand btn-sm" onClick={() => setModal({ mode: "create", parentId: null, defaultKind: plan.type === "ROADMAP" ? "GOAL" : "PILLAR" })}>
                <Plus size={14} className="me-1" /> Add top-level item
              </button>
            </div>

            {plan.items.filter((item) => !item.parentId).length === 0 ? (
              <div className="text-center text-muted py-5 small">No items yet. Add a pillar or objective to get started.</div>
            ) : (
              <div className="plan-tree">
                {plan.items
                  .filter((item) => !item.parentId)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => (
                    <PlanTreeNode
                      key={item.id}
                      item={item}
                      depth={0}
                      items={plan.items}
                      progress={plan.itemProgress}
                      onAdd={(parent) => setModal({ mode: "create", parentId: parent.id, defaultKind: nextKind(parent.kind) })}
                      onEdit={(target) => setModal({ mode: "edit", item: target })}
                      onDelete={removeItem}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "kpis" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-0">KPIs &amp; period targets</h6>
                <div className="small text-muted">Actuals against these targets drive the alert engine and the public home page.</div>
              </div>
              <button className="btn-brand btn-sm" onClick={() => setModal({ mode: "create", parentId: null, defaultKind: "KPI" })}>
                <Plus size={14} className="me-1" /> Add KPI
              </button>
            </div>

            {kpiItems.length === 0 ? (
              <div className="text-center text-muted py-5 small">No KPIs defined for this plan yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr className="small text-uppercase">
                      <th>KPI</th>
                      <th>Unit</th>
                      <th className="text-end">Target</th>
                      <th className="text-end">Current</th>
                      <th style={{ width: 150 }}>Completion</th>
                      <th>Latest reading</th>
                      <th>Featured</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {kpiItems.map((item) => {
                      const progress = plan.itemProgress[item.id]?.progress ?? 0;
                      const latest = [...(item.targets || [])].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)).pop();
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-semibold small">{item.title}</div>
                            {item.owner && <div className="text-muted" style={{ fontSize: 11 }}>Owner: {item.owner}</div>}
                          </td>
                          <td className="small text-muted">{item.unit || "â€”"}</td>
                          <td className="text-end small">{item.targetValue ?? "â€”"}</td>
                          <td className="text-end small">{item.currentValue ?? "â€”"}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6 }}>
                                <div className={`progress-bar ${progress >= 80 ? "bg-success" : progress >= 40 ? "bg-warning" : "bg-danger"}`} style={{ width: `${Math.min(100, progress)}%` }} />
                              </div>
                              <span className="small fw-semibold" style={{ minWidth: 34 }}>{percent(progress)}%</span>
                            </div>
                          </td>
                          <td className="small text-muted">
                            {latest ? `${latest.periodLabel}: ${latest.actual ?? "â€”"} / ${latest.target ?? "â€”"}` : "â€”"}
                          </td>
                          <td>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={Boolean(item.isFeatured)}
                              onChange={(e) => saveItem(item, { isFeatured: e.target.checked })}
                              title="Feature on the public home page"
                            />
                          </td>
                          <td className="text-end text-nowrap">
                            <button className="btn btn-sm btn-outline-secondary py-0 me-1" onClick={() => setModal({ mode: "edit", item })}>
                              <Pencil size={12} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger py-0" onClick={() => removeItem(item)}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "actuals" && <ActualsTab plan={plan} onChanged={load} />}

      {tab === "reports" && <ReportsTab plan={plan} onChanged={load} />}

      {tab === "alerts" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h6 className="fw-bold mb-0">Target &amp; deadline alerts</h6>
                <div className="small text-muted">
                  KPI pace, missed targets, overdue milestones and reporting deadlines.
                  {!plan.mailConfigured && (
                    <span className="text-warning ms-1"><Mail size={12} className="me-1" />Email is not configured â€” alerts are stored in-app.</span>
                  )}
                </div>
              </div>
              <button className="btn-brand btn-sm d-flex align-items-center" onClick={runAlerts} disabled={running}>
                <Play size={13} className="me-1" /> {running ? "Checkingâ€¦" : "Run check now"}
              </button>
            </div>

            {runResult && (
              <div className="alert alert-light border py-2 small">
                Checked {runResult.evaluated.plans} plan(s): {runResult.created} new, {runResult.updated} refreshed,{" "}
                {runResult.resolved} resolved. Email sent {runResult.emailsSent}, skipped {runResult.emailsSkipped}, failed{" "}
                {runResult.emailsFailed}.
              </div>
            )}

            {alerts.length === 0 ? (
              <div className="text-center text-muted py-5 small">
                <CheckCircle2 size={28} className="text-success mb-2" />
                <div>No alerts. All targets and deadlines are on track.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr className="small text-uppercase">
                      <th>Severity</th>
                      <th>Alert</th>
                      <th>Period</th>
                      <th>Rule</th>
                      <th>Raised</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => {
                      const style = SEVERITY[alert.severity] || SEVERITY.INFO;
                      const AlertIcon = style.icon;
                      return (
                        <tr key={alert.id}>
                          <td>
                            <span className="badge" style={{ background: style.bg, color: "#334155" }}>
                              <AlertIcon size={12} className={`me-1 ${style.className}`} />
                              {alert.severity}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold small">{alert.title}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>{alert.message}</div>
                          </td>
                          <td className="small text-muted">{alert.periodLabel || "â€”"}</td>
                          <td className="small text-muted">{alert.rule.replace(/_/g, " ").toLowerCase()}</td>
                          <td className="small text-muted">{new Date(alert.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${alert.status === "Open" ? "bg-danger" : alert.status === "Acknowledged" ? "bg-warning text-dark" : "bg-success"}`}>
                              {alert.status}
                            </span>
                          </td>
                          <td className="text-end text-nowrap">
                            {alert.status === "Open" && (
                              <button className="btn btn-sm btn-outline-secondary py-0 me-1" onClick={() => updateAlert(alert.id, "Acknowledged")}>Acknowledge</button>
                            )}
                            {alert.status !== "Resolved" && (
                              <button className="btn btn-sm btn-outline-success py-0" onClick={() => updateAlert(alert.id, "Resolved")}>Resolve</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "share" && <ShareTab plan={plan} />}

      {tab === "history" && <HistoryTab plan={plan} onChanged={load} />}

      {tab === "settings" && <SettingsTab plan={plan} onChanged={load} onBack={onBack} />}

      {modal && (
        <PlanItemModal
          plan={plan}
          item={modal.item}
          parentId={modal.parentId}
          defaultKind={modal.defaultKind}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      <style>{`
        .plan-tree .tree-row:hover { background: #f8fafc; }
        .plan-tree .tree-row { border-radius: 8px; }
      `}</style>
    </div>
  );
}

function nextKind(kind) {
  if (kind === "PILLAR" || kind === "GOAL") return "OBJECTIVE";
  if (kind === "OBJECTIVE") return "STRATEGY";
  if (kind === "STRATEGY") return "ACTIVITY";
  return "ACTIVITY";
}

function PlanTreeNode({ item, depth, items, progress, onAdd, onEdit, onDelete }) {
  const children = items.filter((child) => child.parentId === item.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const value = progress[item.id]?.progress ?? 0;
  const source = progress[item.id]?.source;

  return (
    <>
      <div className="tree-row d-flex align-items-center gap-2 py-2 px-1" style={{ paddingLeft: 8 + depth * 22 }}>
        <span className="badge flex-shrink-0" style={{ background: KIND_COLORS[item.kind] || "#64748b", fontSize: 10 }}>
          {item.code || item.kind}
        </span>
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold small text-truncate">{item.title}</span>
            {children.length > 0 && <ChevronRight size={12} className="text-muted flex-shrink-0" />}
            {children.length > 0 && <span className="text-muted" style={{ fontSize: 11 }}>{children.length}</span>}
            {item.status === "Completed" && <CheckCircle2 size={12} className="text-success" />}
            {item.status === "At Risk" && <AlertTriangle size={12} className="text-warning" />}
          </div>
          {item.description && <div className="text-muted text-truncate" style={{ fontSize: 11 }}>{item.description}</div>}
        </div>
        <div className="d-none d-md-flex align-items-center gap-2" style={{ width: 130 }}>
          <div className="progress flex-grow-1" style={{ height: 5 }}>
            <div className={`progress-bar ${value >= 80 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-danger"}`} style={{ width: `${Math.min(100, value)}%`, background: source === "linked" ? "#7c3aed" : undefined }} />
          </div>
          <span className="text-muted" style={{ fontSize: 11, minWidth: 30 }}>{percent(value)}%</span>
        </div>
        <div className="d-flex gap-1 flex-shrink-0">
          {item.kind !== "KPI" && (
            <button className="btn btn-sm btn-outline-secondary py-0 px-1" title="Add sub-item" onClick={() => onAdd(item)}>
              <Plus size={12} />
            </button>
          )}
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" title="Edit" onClick={() => onEdit(item)}>
            <Pencil size={12} />
          </button>
          <button className="btn btn-sm btn-outline-danger py-0 px-1" title="Delete" onClick={() => onDelete(item)}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {children.map((child) => (
        <PlanTreeNode
          key={child.id}
          item={child}
          depth={depth + 1}
          items={items}
          progress={progress}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function ActualsTab({ plan, onChanged }) {
  const kpis = plan.items.filter((item) => item.kind === "KPI");
  const periods = useMemo(() => {
    const labels = new Set();
    kpis.forEach((kpi) => (kpi.targets || []).forEach((target) => labels.add(target.periodLabel)));
    const startYear = new Date(plan.startDate).getFullYear();
    const endYear = new Date(plan.endDate).getFullYear();
    for (let year = startYear; year <= endYear; year += 1) labels.add(String(year));
    return [...labels].sort();
  }, [kpis, plan.startDate, plan.endDate]);

  const [period, setPeriod] = useState(
    periods.find((label) => label.includes(String(new Date().getFullYear()))) || periods[0] || ""
  );
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = {};
    kpis.forEach((kpi) => {
      const row = (kpi.targets || []).find((target) => target.periodLabel === period);
      next[kpi.id] = row?.actual ?? "";
    });
    setValues(next);
  }, [period, plan.id]);

  const save = async () => {
    const updates = kpis.map((kpi) => ({
      itemId: kpi.id,
      actual: values[kpi.id] === "" || values[kpi.id] == null ? null : Number(values[kpi.id]),
    }));
    setSaving(true);
    try {
      const result = await api.post(`/plans/${plan.id}/actuals`, { periodLabel: period, updates });
      alert(`${result.saved} actual${result.saved === 1 ? "" : "s"} saved for ${period}.`);
      onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h6 className="fw-bold mb-0">Bulk actuals entry</h6>
            <div className="small text-muted">Enter the reported value for every KPI in one period, then save once.</div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm" style={{ width: 170 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
            <button className="btn-brand btn-sm" onClick={save} disabled={saving || !kpis.length}>
              {saving ? "Savingâ€¦" : "Save all actuals"}
            </button>
          </div>
        </div>

        {kpis.length === 0 ? (
          <div className="text-muted small py-4">Add KPIs first, then record actuals here.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr className="small text-uppercase">
                  <th>KPI</th>
                  <th>Unit</th>
                  <th className="text-end">{period} target</th>
                  <th style={{ width: 170 }}>Actual</th>
                  <th className="text-end">Achieved</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => {
                  const row = (kpi.targets || []).find((target) => target.periodLabel === period);
                  const target = row?.target ?? kpi.targetValue;
                  const actual = values[kpi.id] === "" || values[kpi.id] == null ? null : Number(values[kpi.id]);
                  const achieved = target && actual != null ? Math.round((actual / target) * 100) : null;
                  return (
                    <tr key={kpi.id}>
                      <td className="small fw-semibold">{kpi.title}</td>
                      <td className="small text-muted">{kpi.unit || "â€”"}</td>
                      <td className="text-end small">{target ?? "â€”"}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          value={values[kpi.id] ?? ""}
                          onChange={(e) => setValues({ ...values, [kpi.id]: e.target.value })}
                        />
                      </td>
                      <td className="text-end small">
                        {achieved == null ? "â€”" : (
                          <span className={achieved >= 80 ? "text-success" : achieved >= 40 ? "text-warning" : "text-danger"}>
                            {achieved}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ plan, onChanged }) {
  const [revisions, setRevisions] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await api.get(`/plans/${plan.id}/revisions`);
    setRevisions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [plan.id]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const snapshot = async () => {
    try {
      await api.post(`/plans/${plan.id}/revisions`, { note: note || "Manual snapshot" });
      setNote("");
      await load();
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const download = async (revision) => {
    try {
      const detail = await api.get(`/plans/${plan.id}/revisions/${revision.id}`);
      const blob = new Blob([JSON.stringify(detail.snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${plan.type.toLowerCase()}-${plan.periodLabel.replace(/[^a-z0-9]+/gi, "-")}-r${revision.revision}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <h6 className="fw-bold mb-1">Revision history</h6>
            <p className="small text-muted mb-3">
              A snapshot is captured automatically when a plan is approved or published, and whenever you save one below.
            </p>
            {loading ? (
              <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-success" /></div>
            ) : revisions.length === 0 ? (
              <div className="text-muted small">No revisions yet. Current revision is {plan.revision}.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr className="small text-uppercase">
                      <th>Rev</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>By</th>
                      <th>Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((revision) => (
                      <tr key={revision.id}>
                        <td className="fw-semibold small">r{revision.revision}</td>
                        <td className="small">{revision.status}</td>
                        <td className="small text-muted">{revision.note || "â€”"}</td>
                        <td className="small">{revision.createdBy}</td>
                        <td className="small text-muted">{new Date(revision.createdAt).toLocaleString()}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => download(revision)} title="Download snapshot">
                            <Download size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold mb-2">Workflow</h6>
            <div className="small mb-1">Status: <strong>{plan.status}</strong></div>
            <div className="small text-muted mb-1">Submitted by: {plan.reviewedBy || "â€”"}</div>
            <div className="small text-muted mb-1">Approved by: {plan.approvedBy || "â€”"}</div>
            <div className="small text-muted mb-3">
              Published: {plan.publishedAt ? new Date(plan.publishedAt).toLocaleString() : "â€”"}
            </div>
            <label className="form-label small fw-semibold">Snapshot note</label>
            <input
              className="form-control form-control-sm mb-2"
              placeholder="e.g. Board-approved baseline"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn btn-sm btn-outline-secondary w-100" onClick={snapshot}>
              Save snapshot now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareTab({ plan }) {
  const [shares, setShares] = useState([]);
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ label: "", expiresInDays: 0 });
  const [copiedToken, setCopiedToken] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [shareList, commentList] = await Promise.all([
      api.get(`/plans/${plan.id}/shares`),
      api.get(`/plans/${plan.id}/comments`),
    ]);
    setShares(Array.isArray(shareList) ? shareList : []);
    setComments(Array.isArray(commentList) ? commentList : []);
    setLoading(false);
  }, [plan.id]);

  useEffect(() => {
    load().catch((e) => setLoading(false));
  }, [load]);

  const linkFor = (token) => `${window.location.origin}/share/${token}`;

  const copy = async (token) => {
    const link = linkFor(token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(""), 2200);
    } catch {
      window.prompt("Copy this read-only link", link);
    }
  };

  const create = async (event) => {
    event.preventDefault();
    try {
      const share = await api.post(`/plans/${plan.id}/shares`, {
        label: form.label || null,
        expiresInDays: Number(form.expiresInDays) || 0,
      });
      setForm({ label: "", expiresInDays: 0 });
      await load();
      copy(share.token);
    } catch (e) {
      alert(e.message);
    }
  };

  const toggle = async (share) => {
    try {
      await api.patch(`/plans/shares/${share.id}`, { isActive: !share.isActive });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const remove = async (share) => {
    if (!confirm("Delete this link? Anyone using it will lose access and its comment history is removed.")) return;
    try {
      await api.del(`/plans/shares/${share.id}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const markRead = async (comment, isRead) => {
    try {
      await api.patch(`/plans/comments/${comment.id}`, { isRead });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const unread = comments.filter((comment) => !comment.isRead).length;

  if (loading) return <div className="text-center py-4"><div className="spinner-border text-success" /></div>;

  return (
    <div className="row g-3">
      <div className="col-lg-6">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <h6 className="fw-bold mb-1">Restricted read-only links</h6>
            <p className="small text-muted mb-3">
              Anyone with a link can read this plan (structure, targets, progress) without an account, and can send you a comment. They cannot edit anything.
            </p>

            <form className="row g-2 align-items-end bg-light p-2 rounded mb-3" onSubmit={create}>
              <div className="col-7">
                <label className="form-label small mb-0">Label</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="e.g. Board review, finance team"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div className="col-3">
                <label className="form-label small mb-0">Expires</label>
                <select
                  className="form-select form-select-sm"
                  value={form.expiresInDays}
                  onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
                >
                  <option value={0}>Never</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              <div className="col-2">
                <button className="btn-brand btn-sm w-100" type="submit">Create</button>
              </div>
            </form>

            {shares.length === 0 && <div className="small text-muted">No share links yet.</div>}

            {shares.map((share) => (
              <div key={share.id} className={`border rounded p-2 mb-2 ${share.isActive ? "" : "bg-light"}`}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="small fw-semibold">
                    {share.label || "Untitled link"}
                    {!share.isActive && <span className="badge bg-secondary ms-2">Revoked</span>}
                  </div>
                  <div className="small text-muted">
                    {share._count?.comments ?? 0} comments Â· {share.viewCount} views
                  </div>
                </div>
                <div className="input-group input-group-sm mb-1">
                  <input className="form-control" readOnly value={linkFor(share.token)} onFocus={(e) => e.target.select()} />
                  <button className="btn btn-outline-secondary" onClick={() => copy(share.token)}>
                    {copiedToken === share.token ? <Check size={13} className="me-1" /> : <Copy size={13} className="me-1" />}
                    {copiedToken === share.token ? "Copied" : "Copy"}
                  </button>
                  <a className="btn btn-outline-secondary" href={linkFor(share.token)} target="_blank" rel="noreferrer">Open</a>
                  <a
                    className="btn btn-outline-secondary"
                    href={`${API_BASE}/plans/shared/${share.token}/calendar.ics`}
                    title="Subscribe to this plan's reporting deadlines in your calendar"
                  >
                    .ics
                  </a>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    Created {new Date(share.createdAt).toLocaleDateString()}
                    {share.expiresAt ? ` Â· expires ${new Date(share.expiresAt).toLocaleDateString()}` : ""}
                    {share.lastViewedAt ? ` Â· last viewed ${new Date(share.lastViewedAt).toLocaleDateString()}` : ""}
                  </span>
                  <span className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => toggle(share)}>
                      {share.isActive ? "Revoke" : "Reactivate"}
                    </button>
                    <button className="btn btn-sm btn-outline-danger py-0" onClick={() => remove(share)}>
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Feedback from colleagues</h6>
              <span className={`badge ${unread ? "bg-danger" : "bg-light text-dark border"}`}>{unread} unread</span>
            </div>

            {comments.length === 0 ? (
              <div className="text-center text-muted py-4 small">
                <MessageSquare size={24} className="mb-2" />
                <div>No comments yet. Share a link and feedback will land here.</div>
              </div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {comments.map((comment) => (
                  <div key={comment.id} className={`border-bottom py-2 ${comment.isRead ? "" : "bg-light px-2 rounded"}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="small fw-semibold">
                        {comment.authorName}
                        {comment.authorEmail && <span className="text-muted fw-normal"> Â· {comment.authorEmail}</span>}
                      </div>
                      <span className="text-muted" style={{ fontSize: 11 }}>{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="small my-1" style={{ whiteSpace: "pre-wrap" }}>{comment.body}</div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        {comment.share?.label ? `via ${comment.share.label}` : "via share link"}
                      </span>
                      <button className="btn btn-sm btn-link p-0 text-decoration-none" onClick={() => markRead(comment, !comment.isRead)}>
                        {comment.isRead ? "Mark unread" : "Mark read"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ plan, onChanged }) {
  const [frequency, setFrequency] = useState("QUARTERLY");
  const [dueDays, setDueDays] = useState(15);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", type: "QUARTERLY", periodLabel: "", dueDate: "" });

  const generate = async () => {
    setBusy(true);
    try {
      const result = await api.post(`/plans/${plan.id}/reports/generate`, {
        frequency,
        dueDaysAfterPeriod: Number(dueDays),
      });
      alert(`${result.created} deadline(s) created, ${result.skipped} already existed.`);
      onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (report, payload) => {
    try {
      await api.put(`/plans/reports/${report.id}`, payload);
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const remove = async (report) => {
    if (!confirm(`Delete the "${report.title}" deadline?`)) return;
    try {
      await api.del(`/plans/reports/${report.id}`);
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const add = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/plans/${plan.id}/reports`, {
        ...form,
        type: form.type,
        dueDate: form.dueDate,
      });
      setAdding(false);
      setForm({ title: "", type: "QUARTERLY", periodLabel: "", dueDate: "" });
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const overdue = plan.reports.filter((report) => report.status === "Pending" && new Date(report.dueDate) < new Date()).length;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h6 className="fw-bold mb-0">Reporting deadlines</h6>
            <div className="small text-muted">
              Every deadline triggers reminders {openDeadlineWindow()} before it falls due and escalates once missed.
              {overdue > 0 && <span className="text-danger fw-semibold"> {overdue} overdue.</span>}
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm" style={{ width: 130 }} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="SEMI_ANNUAL">Semi-annual</option>
              <option value="ANNUAL">Annual</option>
            </select>
            <div className="input-group input-group-sm" style={{ width: 150 }}>
              <span className="input-group-text">due +</span>
              <input type="number" min="0" max="90" className="form-control" value={dueDays} onChange={(e) => setDueDays(e.target.value)} />
              <span className="input-group-text">days</span>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={generate} disabled={busy}>
              <Sparkles size={13} className="me-1" />{busy ? "Generatingâ€¦" : "Generate schedule"}
            </button>
            <button className="btn-brand btn-sm" onClick={() => setAdding(!adding)}>
              <Plus size={13} className="me-1" /> Add
            </button>
          </div>
        </div>

        {adding && (
          <form className="row g-2 align-items-end bg-light p-2 rounded mb-3" onSubmit={add}>
            <div className="col-md-4">
              <label className="form-label small mb-0">Title</label>
              <input required className="form-control form-control-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Period</label>
              <input required className="form-control form-control-sm" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} placeholder="Q1 2026" />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Type</label>
              <select className="form-select form-select-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>MONTHLY</option>
                <option>QUARTERLY</option>
                <option>SEMI_ANNUAL</option>
                <option>ANNUAL</option>
                <option>AD_HOC</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Due date</label>
              <input required type="date" className="form-control form-control-sm" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="col-md-2">
              <button className="btn-brand btn-sm w-100">Save</button>
            </div>
          </form>
        )}

        {plan.reports.length === 0 ? (
          <div className="text-center text-muted py-5 small">No reporting deadlines. Generate a schedule for the period.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr className="small text-uppercase">
                  <th>Period</th>
                  <th>Report</th>
                  <th>Type</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plan.reports.map((report) => {
                  const late = report.status === "Pending" && new Date(report.dueDate) < new Date();
                  return (
                    <tr key={report.id} className={late ? "table-danger" : undefined}>
                      <td className="small fw-semibold">{report.periodLabel}</td>
                      <td className="small">{report.title}</td>
                      <td className="small text-muted">{report.type.replace("_", " ").toLowerCase()}</td>
                      <td>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          style={{ width: 145 }}
                          defaultValue={new Date(report.dueDate).toISOString().slice(0, 10)}
                          onBlur={(e) => {
                            if (e.target.value && e.target.value !== new Date(report.dueDate).toISOString().slice(0, 10)) {
                              update(report, { dueDate: e.target.value });
                            }
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 125 }}
                          value={report.status}
                          onChange={(e) => update(report, { status: e.target.value })}
                        >
                          <option>Pending</option>
                          <option>Submitted</option>
                          <option>Approved</option>
                          <option>Waived</option>
                        </select>
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-danger py-0" onClick={() => remove(report)}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function openDeadlineWindow() {
  return "the configured lead time";
}

function SettingsTab({ plan, onChanged, onBack }) {
  const [form, setForm] = useState({
    title: plan.title,
    periodLabel: plan.periodLabel,
    startDate: new Date(plan.startDate).toISOString().slice(0, 10),
    endDate: new Date(plan.endDate).toISOString().slice(0, 10),
    status: plan.status,
    owner: plan.owner || "",
    summary: plan.summary || "",
    vision: plan.vision || "",
    mission: plan.mission || "",
    isPublished: plan.isPublished,
  });
  const [saving, setSaving] = useState(false);
  const [childToAdopt, setChildToAdopt] = useState("");
  const [alignChild, setAlignChild] = useState(plan.children?.[0]?.id || "");
  const [duplicate, setDuplicate] = useState({ periodLabel: "", startDate: "", endDate: "", isPublished: false });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put(`/plans/${plan.id}`, {
        ...form,
        owner: form.owner || null,
        summary: form.summary || null,
        vision: form.vision || null,
        mission: form.mission || null,
      });
      onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeParent = async (parentPlanId) => {
    try {
      await api.put(`/plans/${plan.id}`, { parentPlanId: parentPlanId || null });
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const adopt = async () => {
    if (!childToAdopt) return;
    try {
      await api.post(`/plans/${plan.id}/link-child`, { childPlanId: childToAdopt });
      setChildToAdopt("");
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const unlinkChild = async (childId) => {
    try {
      await api.put(`/plans/${childId}`, { parentPlanId: null });
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const autoAlign = async () => {
    if (!alignChild) return;
    try {
      const result = await api.post(`/plans/${plan.id}/auto-align`, { childPlanId: alignChild });
      alert(`${result.linked} item(s) aligned to this plan by code.`);
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const duplicatePlan = async () => {
    if (!duplicate.periodLabel.trim() || !duplicate.startDate || !duplicate.endDate) {
      alert("Enter the new period label, start date and end date.");
      return;
    }
    try {
      const result = await api.post(`/plans/${plan.id}/duplicate`, {
        ...duplicate,
        parentPlanId: null,
        status: "Draft",
        copyActuals: false,
      });
      alert(`${result.items} item(s) copied into ${result.plan.periodLabel}.`);
      setDuplicate({ periodLabel: "", startDate: "", endDate: "", isPublished: false });
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  };

  const removePlan = async () => {
    if (!confirm(`Delete "${plan.title}" permanently, including all items and deadlines?`)) return;
    try {
      await api.del(`/plans/${plan.id}`);
      onBack();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold mb-3">Plan metadata</h6>
            <form className="row g-2" onSubmit={save}>
              <div className="col-md-8">
                <label className="form-label small fw-semibold">Title</label>
                <input required className="form-control form-control-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Period label</label>
                <input required className="form-control form-control-sm" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Start</label>
                <input type="date" required className="form-control form-control-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">End</label>
                <input type="date" required className="form-control form-control-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Status</label>
                <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Draft</option>
                  <option>Active</option>
                  <option>Closed</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Owner</label>
                <input className="form-control form-control-sm" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="publish-plan" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                  <label className="form-check-label small" htmlFor="publish-plan">Publish on the public home page</label>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Summary</label>
                <textarea className="form-control form-control-sm" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Vision</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Mission</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
              </div>
              <div className="col-12 text-end">
                <button className="btn-brand btn-sm" disabled={saving}>{saving ? "Savingâ€¦" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h6 className="fw-bold mb-2">Hierarchy</h6>
            <div className="small text-muted mb-2">
              Annual plan &rarr; strategic plan &rarr; roadmap. Child delivery rolls into linked items.
            </div>
            <label className="form-label small fw-semibold">Parent plan</label>
            <select className="form-select form-select-sm mb-3" value={plan.parent?.id || ""} onChange={(e) => changeParent(e.target.value)}>
              <option value="">Not linked</option>
              {(plan.linkablePlans || []).map((parent) => (
                <option key={parent.id} value={parent.id}>{parent.periodLabel} Â· {parent.title}</option>
              ))}
            </select>

            {(plan.adoptablePlans || []).length > 0 && (
              <>
                <label className="form-label small fw-semibold">Link a child plan</label>
                <div className="input-group input-group-sm mb-3">
                  <select className="form-select" value={childToAdopt} onChange={(e) => setChildToAdopt(e.target.value)}>
                    <option value="">Select planâ€¦</option>
                    {(plan.adoptablePlans || []).map((child) => (
                      <option key={child.id} value={child.id}>{child.periodLabel} Â· {child.title}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline-secondary" onClick={adopt} disabled={!childToAdopt}>Link</button>
                </div>
              </>
            )}

            {plan.children?.length > 0 && (
              <>
                <div className="small fw-semibold mb-1">Linked child plans</div>
                {plan.children.map((child) => (
                  <div key={child.id} className="d-flex justify-content-between align-items-center small border-bottom py-1">
                    <span className="text-truncate me-2">{child.periodLabel} Â· {child.title}</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-light text-dark border">
                        {percent(plan.childPlanProgress?.find((entry) => entry.id === child.id)?.completion)}%
                      </span>
                      <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => unlinkChild(child.id)} title="Unlink">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-3">
                  <label className="form-label small fw-semibold">Align child items by code</label>
                  <div className="input-group input-group-sm">
                    <select className="form-select" value={alignChild} onChange={(e) => setAlignChild(e.target.value)}>
                      {plan.children.map((child) => (
                        <option key={child.id} value={child.id}>{child.periodLabel}</option>
                      ))}
                    </select>
                    <button className="btn btn-outline-secondary" onClick={autoAlign}>
                      <Link2 size={12} className="me-1" />Auto-align
                    </button>
                  </div>
                  <div className="form-text">Matches codes such as P1 or P1-O1 to this plan's items.</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h6 className="fw-bold mb-1">Duplicate into a new period</h6>
            <p className="small text-muted mb-2">
              Use this plan as the blueprint for the next period. Targets are copied, actuals and progress start clean.
            </p>
            <div className="row g-2">
              <div className="col-12">
                <input
                  className="form-control form-control-sm"
                  placeholder="New period label (e.g. 2027/28 EFY)"
                  value={duplicate.periodLabel}
                  onChange={(e) => setDuplicate({ ...duplicate, periodLabel: e.target.value })}
                />
              </div>
              <div className="col-6">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={duplicate.startDate}
                  onChange={(e) => setDuplicate({ ...duplicate, startDate: e.target.value })}
                />
              </div>
              <div className="col-6">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={duplicate.endDate}
                  onChange={(e) => setDuplicate({ ...duplicate, endDate: e.target.value })}
                />
              </div>
              <div className="col-12">
                <button className="btn btn-sm btn-outline-secondary w-100" onClick={duplicatePlan}>
                  <Plus size={13} className="me-1" /> Create copy as a draft
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold text-danger mb-2">Danger zone</h6>
            <p className="small text-muted mb-2">Deleting removes the plan, its items, alert history and reporting deadlines. Linked child plans are kept but unlinked.</p>
            <button className="btn btn-sm btn-outline-danger" onClick={removePlan}>
              <Trash2 size={13} className="me-1" /> Delete this plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
