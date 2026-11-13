import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const TYPE_META = {
  ROADMAP: {
    label: "Roadmap",
    path: "/database/roadmap",
    accent: "#7c3aed",
    subtitle: "Ten-year horizon. Each strategic plan sits inside a roadmap phase.",
  },
  STRATEGIC: {
    label: "Strategic Plan",
    path: "/database/strategic-plan",
    accent: "var(--brand-primary)",
    subtitle: "Five-year strategy. Each annual plan sits inside a strategic period.",
  },
  AOP: {
    label: "Annual Plan",
    path: "/database/aop",
    accent: "var(--brand-primary)",
    subtitle: "Fiscal-year plan (July–June), labelled by EFY and Ethiopian calendar year.",
  },
};

const STATE_STYLES = {
  Active: "bg-success",
  Preparing: "bg-info text-dark",
  Planned: "bg-secondary",
  Closing: "bg-warning text-dark",
  Closed: "bg-dark",
  Archived: "bg-light text-dark border",
};

const ORDER = ["ROADMAP", "STRATEGIC", "AOP"];

export default function PlanningPeriods() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [runSummary, setRunSummary] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/plans/periods/calendar");
      setPeriods(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const type of ORDER) map.set(type, []);
    for (const period of periods) {
      const bucket = map.get(period.type) ?? [];
      bucket.push(period);
      map.set(period.type, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }
    return map;
  }, [periods]);

  const openPreview = useCallback(async (period) => {
    if (!period.plan?.id) return;
    setPreview({ period, diff: null, error: "" });
    try {
      const result = await api.post(`/plans/${period.plan.id}/rollover`, { dryRun: true });
      setPreview({ period, diff: result.preview, error: "" });
    } catch (e) {
      setPreview({ period, diff: null, error: e.message });
    }
  }, []);

  // Deep link from the plan list: /planning-calendar?plan=<id>
  const deepLinkPlan = searchParams.get("plan");
  useEffect(() => {
    if (!deepLinkPlan || !periods.length) return;
    const match = periods.find((period) => period.plan?.id === deepLinkPlan);
    if (!match) return;
    const next = new URLSearchParams(searchParams);
    next.delete("plan");
    setSearchParams(next, { replace: true });
    openPreview(match);
  }, [deepLinkPlan, periods, searchParams, setSearchParams, openPreview]);

  const commit = async () => {
    if (!preview?.period?.plan?.id) return;
    setBusy(true);
    try {
      const result = await api.post(`/plans/${preview.period.plan.id}/rollover`, { dryRun: false });
      setPreview(null);
      setNotice(
        `Created ${result.target.label} as a draft with ${result.createdItems} item(s) and ${result.reportsCreated} reporting deadline(s).`
      );
      await load();
    } catch (e) {
      setPreview({ ...preview, error: e.message });
    } finally {
      setBusy(false);
    }
  };

  const runWatch = async (dryRun) => {
    setBusy(true);
    setRunSummary(null);
    try {
      const summary = await api.post("/plans/periods/lifecycle/run", { dryRun });
      setRunSummary(summary);
      if (!dryRun) await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            <CalendarRange size={28} style={{ color: "var(--brand-primary)" }} /> Planning Calendar
          </h2>
          <p className="text-muted mb-0 small" style={{ maxWidth: 760 }}>
            Every Roadmap, Strategic and Annual period, its state and its successor. The daily watch
            prepares the next period ahead of the end date, activates approved periods on their start
            date and closes ended ones.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center" onClick={load} disabled={busy}>
            <RefreshCw size={14} className="me-1" /> Refresh
          </button>
          {isAdmin && (
            <>
              <button
                className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                onClick={() => runWatch(true)}
                disabled={busy}
                title="Show what the daily watch would do today without changing anything"
              >
                <PlayCircle size={14} className="me-1" /> Dry run
              </button>
              <button
                className="btn-brand btn-sm d-flex align-items-center"
                onClick={() => runWatch(false)}
                disabled={busy}
                title="Run the period watch now"
              >
                <Sparkles size={14} className="me-1" /> Run watch now
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {notice && (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span>
            <CheckCircle2 size={14} className="me-1" /> {notice}
          </span>
          <button className="btn btn-sm btn-link p-0" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {runSummary && (
        <div className="card border-0 shadow-sm p-3 mb-4 small">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <strong>
                {runSummary.dryRun ? "Watch dry run" : "Watch run"} — {new Date(runSummary.now).toLocaleString()}
              </strong>
              <div className="text-muted">
                prepared {runSummary.prepared.length} · activated {runSummary.activated.length} · closed{" "}
                {runSummary.closed.length} · archived {runSummary.archived.length}
              </div>
              {runSummary.warnings.length > 0 && (
                <ul className="mb-0 ps-3 text-warning-emphasis">
                  {runSummary.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
            <button className="btn btn-sm btn-link p-0" onClick={() => setRunSummary(null)}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
        </div>
      ) : (
        ORDER.map((type) => {
          const meta = TYPE_META[type];
          const list = grouped.get(type) ?? [];
          return (
            <section key={type} className="mb-5">
              <div className="d-flex align-items-baseline gap-3 mb-3">
                <h5 className="fw-bold mb-0" style={{ color: meta.accent }}>
                  {meta.label}
                </h5>
                <span className="text-muted small">{meta.subtitle}</span>
              </div>

              {list.length === 0 ? (
                <div className="card border-0 shadow-sm p-4 text-muted small">
                  No {meta.label.toLowerCase()} periods yet.
                </div>
              ) : (
                <div className="row g-3">
                  {list.map((period) => {
                    const ended = period.daysRemaining < 0;
                    return (
                      <div className="col-xl-6" key={period.id}>
                        <div
                          className="card border-0 shadow-sm h-100"
                          style={{ borderLeft: `4px solid ${meta.accent}` }}
                        >
                          <div className="card-body d-flex flex-column">
                            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                              <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className={`badge ${STATE_STYLES[period.state] || "bg-secondary"}`}>
                                  {period.state}
                                </span>
                                <span className="fw-bold" style={{ color: "var(--brand-primary)" }}>
                                  {period.label}
                                </span>
                                {period.labelAlt && (
                                  <span className="badge bg-light text-dark border">{period.labelAlt}</span>
                                )}
                                {period.isCurrent && <span className="badge bg-success">current</span>}
                                {period.needsPreparation && (
                                  <span className="badge bg-warning text-dark">next period due</span>
                                )}
                              </div>
                              <span className="small text-muted">
                                {ended
                                  ? `ended ${Math.abs(period.daysRemaining)}d ago`
                                  : `${period.daysRemaining}d left`}
                              </span>
                            </div>

                            <div className="small text-muted mb-2">
                              {new Date(period.startDate).toLocaleDateString()} &ndash;{" "}
                              {new Date(period.endDate).toLocaleDateString()}
                            </div>

                            <div className="mb-2">
                              {period.plan ? (
                                <div className="d-flex justify-content-between gap-2">
                                  <span className="text-truncate">{period.plan.title}</span>
                                  <span className="badge bg-light text-dark border">{period.plan.status}</span>
                                </div>
                              ) : (
                                <span className="text-danger small">No plan record for this period yet.</span>
                              )}
                            </div>

                            <div className="small text-muted mb-3">
                              {period.predecessor && (
                                <span className="me-3">after {period.predecessor.label}</span>
                              )}
                              {period.successor ? (
                                <span>
                                  successor {period.successor.label} ({period.successor.state})
                                </span>
                              ) : (
                                <span>no successor prepared</span>
                              )}
                            </div>

                            <div className="mt-auto d-flex flex-wrap gap-2">
                              {period.plan && (
                                <Link
                                  className="btn btn-sm btn-outline-secondary"
                                  to={`${meta.path}?plan=${period.plan.id}`}
                                >
                                  Open plan <ChevronRight size={13} className="ms-1" />
                                </Link>
                              )}
                              {period.plan && !period.successor && (
                                <button className="btn-brand btn-sm" onClick={() => openPreview(period)}>
                                  Prepare next period <ArrowRight size={13} className="ms-1" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}

      {preview && (
        <PreviewModal
          state={preview}
          busy={busy}
          onClose={() => setPreview(null)}
          onCommit={commit}
        />
      )}
    </div>
  );
}

function PreviewModal({ state, busy, onClose, onCommit }) {
  const { period, diff, error } = state;
  return (
    <div className="modal d-block" style={{ background: "rgba(15,23,42,0.5)" }} onClick={onClose}>
      <div
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header">
            <div>
              <h5 className="modal-title fw-bold mb-0">Prepare the next {TYPE_META[period.type].label.toLowerCase()}</h5>
              <div className="small text-muted">
                from {period.label} {period.plan ? `· ${period.plan.title}` : ""}
              </div>
            </div>
            <button className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {!diff && !error && (
              <div className="text-center py-4">
                <div className="spinner-border text-success" />
              </div>
            )}

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {diff && (
              <>
                <div className="border rounded p-3 mb-3 bg-light">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <div className="fw-bold" style={{ color: "var(--brand-primary)" }}>
                        {diff.target.label}
                        {diff.target.labelAlt ? ` · ${diff.target.labelAlt}` : ""}
                      </div>
                      <div className="small text-muted">{diff.target.title}</div>
                    </div>
                    <span className="badge bg-info text-dark">Preparing</span>
                  </div>
                  <div className="small mt-2">
                    {new Date(diff.target.startDate).toLocaleDateString()} &ndash;{" "}
                    {new Date(diff.target.endDate).toLocaleDateString()}
                  </div>
                  <div className="small mt-1">
                    {diff.target.parentPlanLabel ? (
                      <span>Linked to {diff.target.parentPlanLabel}</span>
                    ) : (
                      <span className="text-warning-emphasis">No covering parent plan</span>
                    )}
                  </div>
                </div>

                <div className="table-responsive mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Item type</th>
                        <th className="text-end">Carried</th>
                        <th className="text-end">Skipped</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.items.map((row) => (
                        <tr key={row.kind}>
                          <td className="small">{row.kind}</td>
                          <td className="text-end">{row.carried}</td>
                          <td className="text-end text-muted">{row.skipped}</td>
                          <td className="text-end text-muted">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="small text-muted mb-3">
                  {diff.totalCarried} of {diff.totalItems} item(s) carry over. Reporting deadlines:{" "}
                  <strong>{diff.reports.windows}</strong> {diff.reports.frequency.toLowerCase().replace("_", "-")}{" "}
                  obligation(s).
                </div>

                {diff.kpis.length > 0 && (
                  <div className="mb-3">
                    <div className="small fw-bold text-uppercase text-muted mb-1">KPI baselines</div>
                    <ul className="list-unstyled small mb-0" style={{ maxHeight: 160, overflowY: "auto" }}>
                      {diff.kpis.map((kpi) => (
                        <li key={kpi.title} className="d-flex justify-content-between gap-2 border-bottom py-1">
                          <span className="text-truncate">{kpi.title}</span>
                          <span className="text-nowrap text-muted">
                            {kpi.previousBaseline ?? "—"} <ArrowRight size={11} /> {kpi.baseline ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diff.warnings.length > 0 && (
                  <div className="alert alert-warning py-2 small mb-0">
                    <div className="fw-semibold mb-1">
                      <TriangleAlert size={13} className="me-1" /> Before you commit
                    </div>
                    <ul className="mb-0 ps-3">
                      {diff.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-brand btn-sm" disabled={!diff || busy} onClick={onCommit}>
              {busy ? "Creating…" : "Create draft period"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
