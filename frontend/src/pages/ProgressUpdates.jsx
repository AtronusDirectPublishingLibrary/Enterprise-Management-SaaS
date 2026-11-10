import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, ClipboardList, MessageSquare, RefreshCw, Send, X } from "lucide-react";
import { useAuth } from "../lib/auth";

const TYPE_LABELS = { AOP: "Annual Plan", STRATEGIC: "Strategic Plan", ROADMAP: "Roadmap" };

const currentPeriod = () =>
  new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

const statusClass = (status) =>
  ["Verified", "Reviewed"].includes(status)
    ? "status-on"
    : status === "Submitted"
    ? "status-behind"
    : "status-none";

const isVerified = (status) => ["Verified", "Reviewed"].includes(status);

export default function ProgressUpdates() {
  const { user } = useAuth();
  const canVerify = user?.role === "admin" || user?.role === "executive" || user?.position === "Strategy and Planning Officer";
  const [targets, setTargets] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [type, setType] = useState("");
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    progress: 0,
    periodLabel: currentPeriod(),
    summary: "",
    achievements: "",
    challenges: "",
    nextSteps: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const query = new URLSearchParams();
      if (type) query.set("type", type);
      if (mine) query.set("mine", "true");
      const [targetRows, updateRows] = await Promise.all([
        api.get(`/progress-updates/targets?${query.toString()}`),
        api.get(`/progress-updates?${query.toString()}`),
      ]);
      setTargets(targetRows);
      setUpdates(updateRows);
    } catch (e) {
      if (!silent) setError(e.message || "Could not load progress updates.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type, mine]);

  // A new active period replaces the assignments list without a page reload.
  useEffect(() => {
    const refresh = () => { if (!document.hidden && !selected) load(true); };
    const onVisible = () => { if (!document.hidden) refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, mine, selected]);

  const openForm = (target) => {
    setSelected(target);
    const latest = target.latest;
    setForm({
      progress: latest?.progress ?? target.progress ?? 0,
      periodLabel: latest?.periodLabel || currentPeriod(),
      summary: latest?.summary || "",
      achievements: "",
      challenges: "",
      nextSteps: "",
    });
    setMessage("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/progress-updates", {
        itemId: selected.id,
        periodLabel: form.periodLabel,
        progress: Number(form.progress),
        summary: form.summary,
        achievements: form.achievements,
        challenges: form.challenges,
        nextSteps: form.nextSteps,
        status: "Submitted",
      });
      setMessage(`Update submitted for “${selected.title}”. It will feed the consolidated report once verified by the Strategy and Planning Officer.`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message || "Could not submit the update.");
    } finally { setSaving(false); }
  };

  const verify = async (update) => {
    try {
      await api.put(`/progress-updates/${update.id}`, { status: "Verified" });
      setMessage(`Update ${update.reference || ""} verified. The plan item and consolidated reports now use it.`);
      await load();
    } catch (e) {
      setError(e.message || "Could not verify the update.");
    }
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const target of targets) {
      const key = target.plan?.id || "other";
      if (!map.has(key)) map.set(key, { plan: target.plan, rows: [] });
      map.get(key).rows.push(target);
    }
    return [...map.values()];
  }, [targets]);

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Progress Updates | EBPE</title></Helmet>

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <div className="page-kicker">Planning · owner reporting</div>
          <h2 className="page-title mb-0 d-flex align-items-center gap-2"><ClipboardList size={24} /> Progress updates</h2>
          <div className="gold-rule mt-2" />
          <div className="small text-muted mt-2">
            Task owners report progress once per period against the current active plan period. Each submission
            gets a report index (PU-0001, PU-0002…). Only updates verified by the Strategy and Planning Officer
            feed the consolidated annual, strategic and roadmap reports automatically.
          </div>
        </div>
        <div className="progress-filters">
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Plan level">
            <option value="">All plan levels</option>
            <option value="AOP">Annual Plan</option>
            <option value="STRATEGIC">Strategic Plan</option>
            <option value="ROADMAP">Roadmap</option>
          </select>
          <div className="form-check form-switch mb-0 progress-filters__switch">
            <input className="form-check-input" type="checkbox" id="mine-only" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            <label className="form-check-label" htmlFor="mine-only">My assignments only</label>
          </div>
          <button className="btn btn-outline-primary btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {message && <div className="alert alert-success border-0 shadow-sm">{message}</div>}
      {error && <div className="alert alert-danger border-0 shadow-sm">{error}</div>}

      {loading ? (
        <div className="d-flex justify-content-center py-5"><div className="spinner-border text-success" role="status" /></div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">Assignments you can report on</h5>
                  <span className="badge bg-light text-dark">{targets.length}</span>
                </div>
                {grouped.length === 0 ? (
                  <div className="text-muted small py-4 text-center">
                    No assignable activities, milestones or KPIs were found for this filter.
                    Create plans and assign owners in the Plan Editor first.
                  </div>
                ) : grouped.map((group) => (
                  <div key={group.plan?.id || "other"} className="mb-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <div>
                        <div className="fw-bold" style={{ color: "var(--brand-primary)" }}>{group.plan?.title}</div>
                        <div className="small text-muted">
                          {TYPE_LABELS[group.plan?.type] || group.plan?.type} · {group.plan?.periodLabel}
                          {group.rows.some((row) => row.isCurrentPlan) ? (
                            <span className="badge bg-success ms-2">current period</span>
                          ) : null}
                        </div>
                      </div>
                      <span className="badge bg-light text-dark">{group.rows.length} items</span>
                    </div>
                    <div className="table-responsive progress-assignments">
                      <table className="table table-sm align-middle mb-0 progress-assignments__table">
                        <thead className="table-light">
                          <tr>
                            <th>Item</th>
                            <th className="progress-col-owner">Owner</th>
                            <th className="text-end progress-col-progress">Progress</th>
                            <th className="progress-col-latest">Latest</th>
                            <th className="text-end progress-col-action">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((target) => (
                            <tr key={target.id}>
                              <td>
                                <div className="fw-semibold">
                                  {target.latest?.reference ? <span className="badge bg-light text-dark me-2">{target.latest.reference}</span> : null}
                                  {target.title}
                                </div>
                                <div className="small text-muted">{target.kind}{target.code ? ` · ${target.code}` : ""}</div>
                              </td>
                              <td className="small">{target.owner || "Unassigned"}</td>
                              <td className="text-end">{target.progress ?? 0}%</td>
                              <td>
                                {target.latest ? (
                                  <span className={`status-pill ${statusClass(target.latest.status)}`}>
                                    {isVerified(target.latest.status) ? "Verified" : target.latest.status} · {target.latest.periodLabel}
                                  </span>
                                ) : (
                                  <span className="status-pill status-none">No update</span>
                                )}
                              </td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => openForm(target)}
                                  disabled={!target.canUpdate}
                                  title={target.canUpdate ? "Submit a progress update" : `Owned by ${target.owner}`}
                                >
                                  Update
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm progress-recent">
              <div className="card-body">
                <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><MessageSquare size={18} /> Recent updates</h5>
                {updates.length === 0 ? (
                  <div className="progress-recent__empty">
                    <span className="progress-recent__empty-icon"><MessageSquare size={22} /></span>
                    <strong>No updates yet</strong>
                    <p className="mb-0">Submitted progress notes will appear here with their verification status, ready for review.</p>
                  </div>
                ) : (
                  <div className="progress-recent__list">
                    {updates.slice(0, 25).map((update) => (
                      <div key={update.id} className="progress-update-card">
                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                          <strong className="small">
                            {update.reference ? <span className="badge bg-light text-dark me-2">{update.reference}</span> : null}
                            {update.item?.title}
                          </strong>
                          <span className={`status-pill ${statusClass(update.status)}`}>{isVerified(update.status) ? "Verified" : update.status}</span>
                        </div>
                        <div className="small text-muted mb-1">
                          {update.authorName} · {update.periodLabel} · {update.progress}%
                          {update.reviewedBy ? ` · verified by ${update.reviewedBy}` : ""}
                        </div>
                        <p className="small mb-2">{update.summary}</p>
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                          <span className="small text-muted">{update.plan?.title}</span>
                          {canVerify && !isVerified(update.status) && (
                            <button className="btn btn-sm btn-outline-success" onClick={() => verify(update)}>
                              <CheckCircle2 size={13} /> Verify update
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal show d-block" style={{ background: "rgba(11,37,69,0.55)", zIndex: 1050 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-0">Submit progress update</h5>
                  <div className="small text-muted">{selected.title} · {selected.plan?.title}</div>
                  <div className="report-form__chips mt-2">
                    <span>{selected.kind}</span>
                    {selected.code ? <span>{selected.code}</span> : null}
                    <span>Owner · {selected.owner || "Unassigned"}</span>
                    <span className={`status-pill ${statusClass(selected.latest?.status)}`}>{selected.latest?.status || "No update yet"}</span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelected(null)} aria-label="Close" />
              </div>
              <form onSubmit={submit}>
                <div className="modal-body">
                  <div className="report-form">
                    <div className="report-form__main">
                      <section className="report-form__section">
                        <div className="report-form__section-head">
                          <div>
                            <h6>Reporting window</h6>
                            <p>Every update is tied to one plan period. Use the period named in the approved plan.</p>
                          </div>
                        </div>
                        <div className="row g-3 align-items-end">
                          <div className="col-md-5">
                            <label className="form-label" htmlFor="period-label">Reporting period</label>
                            <input id="period-label" className="form-control" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} placeholder="e.g., Oct 2026" required />
                          </div>
                          <div className="col-md-7">
                            <label className="form-label d-flex justify-content-between" htmlFor="progress-range">
                              <span>Progress against target</span>
                              <strong className="report-form__percent">{form.progress}%</strong>
                            </label>
                            <input id="progress-range" type="range" className="form-range" min="0" max="100" step="1" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
                            <div className="report-form__scale"><span>0%</span><span>50%</span><span>100%</span></div>
                          </div>
                        </div>
                      </section>

                      <section className="report-form__section">
                        <div className="report-form__section-head">
                          <div>
                            <h6>Narrative</h6>
                            <p>Write for the consolidated report: outcome first, then evidence. One topic per line makes the report easier to assemble.</p>
                          </div>
                        </div>
                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label" htmlFor="summary">Summary of progress <span className="text-danger">*</span></label>
                            <textarea id="summary" className="form-control" rows="4" required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What was delivered this period? Include the main result, milestone or decision." />
                            <div className="form-text">Required. This is the text that appears in verified reports.</div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="achievements">Achievements</label>
                            <textarea id="achievements" className="form-control" rows="4" value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} placeholder="One achievement per line" />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="challenges">Challenges / risks</label>
                            <textarea id="challenges" className="form-control" rows="4" value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} placeholder="One challenge or risk per line" />
                          </div>
                          <div className="col-12">
                            <label className="form-label" htmlFor="next-steps">Next steps</label>
                            <textarea id="next-steps" className="form-control" rows="3" value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })} placeholder="What happens next period, and who owns it?" />
                          </div>
                        </div>
                      </section>
                    </div>

                    <aside className="report-form__aside">
                      <div className="report-form__aside-card">
                        <h6>What happens after you submit</h6>
                        <ol className="report-form__steps">
                          <li><span>1</span> The update is saved as <strong>Submitted</strong> and indexed automatically.</li>
                          <li><span>2</span> The Strategy and Planning Officer reviews the evidence.</li>
                          <li><span>3</span> Once verified, the plan item progress and consolidated reports update.</li>
                        </ol>
                      </div>
                      <div className="report-form__aside-card report-form__aside-card--muted">
                        <h6>Before you submit</h6>
                        <ul>
                          <li>Figures match the approved plan period.</li>
                          <li>Blockers are stated plainly, with the decision needed.</li>
                          <li>No personal or confidential information is included.</li>
                        </ul>
                      </div>
                    </aside>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setSelected(null)}><X size={15} /> Cancel</button>
                  <button type="submit" className="btn btn-brand" disabled={saving}>
                    <Send size={15} /> {saving ? "Submitting…" : "Submit update"}
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
