import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "../lib/api";

const STATUS_COPY = {
  DRAFT: ["Draft", "hrx-chip--muted"],
  SELF_SUBMITTED: ["Self-assessment in", "hrx-chip--warn"],
  MANAGER_REVIEWED: ["Manager reviewed", "hrx-chip--info"],
  COMPLETED: ["Completed", "hrx-chip--good"],
};

const progressOf = (tasks) => {
  if (!tasks?.length) return 0;
  return Math.round((tasks.filter((task) => task.completedAt).length / tasks.length) * 100);
};

const scoreOptions = (maxScore = 5) => {
  const max = Number(maxScore) || 5;
  const step = Number.isInteger(max) ? 1 : 0.5;
  const options = [];
  for (let value = step; value <= max + 0.0001; value += step) options.push(Number(value.toFixed(1)));
  return options;
};

export default function HrOperations() {
  const [tab, setTab] = useState("induction");
  const [inductions, setInductions] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cycle, setCycle] = useState("");
  const [appraisals, setAppraisals] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [criteriaTotal, setCriteriaTotal] = useState(0);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [criterionForm, setCriterionForm] = useState({
    title: "",
    description: "",
    category: "Core",
    weight: 20,
    maxScore: 5,
    guidance: "",
    appliesToDepartment: "",
    isActive: true,
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ managerSummary: "", managerRating: "", items: {} });

  const flash = (message) => {
    setNotice(message);
    setError("");
    window.setTimeout(() => setNotice(""), 4000);
  };

  const loadInductions = useCallback(async () => {
    setInductions(await api.get("/induction"));
  }, []);

  const loadAppraisals = useCallback(async (target) => {
    const rows = await api.get(`/appraisals${target ? `?cycle=${encodeURIComponent(target)}` : ""}`);
    setAppraisals(rows);
  }, []);

  const loadCriteria = useCallback(async () => {
    const payload = await api.get("/appraisals/criteria");
    setCriteria(payload.criteria || []);
    setCriteriaTotal(payload.totalWeight || 0);
  }, []);

  useEffect(() => {
    Promise.all([loadInductions(), api.get("/appraisals/cycles"), loadCriteria()])
      .then(([, options]) => {
        setCycles(options);
        const current = options[0]?.cycle || "";
        setCycle(current);
        return loadAppraisals(current);
      })
      .catch((err) => setError(err.message));
  }, [loadInductions, loadAppraisals, loadCriteria]);

  const resetCriterion = () => {
    setEditingCriterion(null);
    setCriterionForm({ title: "", description: "", category: "Core", weight: 20, maxScore: 5, guidance: "", appliesToDepartment: "", isActive: true });
  };

  const editCriterion = (criterion) => {
    setEditingCriterion(criterion);
    setCriterionForm({
      title: criterion.title,
      description: criterion.description || "",
      category: criterion.category || "Core",
      weight: criterion.weight,
      maxScore: criterion.maxScore,
      guidance: criterion.guidance || "",
      appliesToDepartment: criterion.appliesToDepartment || "",
      isActive: criterion.isActive,
    });
  };

  const saveCriterion = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...criterionForm,
        weight: Number(criterionForm.weight),
        maxScore: Number(criterionForm.maxScore),
        appliesToDepartment: criterionForm.appliesToDepartment || null,
      };
      if (editingCriterion) await api.put(`/appraisals/criteria/${editingCriterion.id}`, payload);
      else await api.post("/appraisals/criteria", payload);
      await loadCriteria();
      resetCriterion();
      flash("Appraisal framework updated. New and draft appraisals now use it.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeCriterion = async (criterion) => {
    if (!window.confirm(`Remove “${criterion.title}” from the appraisal framework?`)) return;
    try {
      await api.del(`/appraisals/criteria/${criterion.id}`);
      await loadCriteria();
      if (editingCriterion?.id === criterion.id) resetCriterion();
      flash("Criterion removed.");
    } catch (err) {
      setError(err.message);
    }
  };

  const openCycle = async () => {
    setBusy(true);
    try {
      const result = await api.post("/appraisals/cycle", { cycle });
      flash(`Opened ${cycle}: ${result.created} appraisals created, ${result.skipped} already existed.`);
      await loadAppraisals(cycle);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeCycle = async (value) => {
    setCycle(value);
    setReview(null);
    try {
      await loadAppraisals(value);
    } catch (err) {
      setError(err.message);
    }
  };

  const openReview = (row) => {
    setReview(row);
    setReviewDraft({
      managerSummary: row.managerSummary || "",
      managerRating: row.managerRating ?? "",
      items: Object.fromEntries(row.items.map((item) => [item.id, item.managerScore ?? ""])),
    });
  };

  const saveReview = async (complete) => {
    if (!review) return;
    try {
      const payload = {
        managerSummary: reviewDraft.managerSummary,
        managerRating: reviewDraft.managerRating === "" ? null : Number(reviewDraft.managerRating),
        complete,
        items: review.items.map((item) => ({
          id: item.id,
          managerScore: reviewDraft.items[item.id] === "" ? null : Number(reviewDraft.items[item.id]),
        })),
      };
      await api.put(`/appraisals/${review.id}/review`, payload);
      await loadAppraisals(cycle);
      flash(complete ? "Appraisal completed" : "Review saved");
      setReview(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const summary = useMemo(() => {
    const submitted = appraisals.filter((row) => row.status !== "DRAFT").length;
    const done = appraisals.filter((row) => row.status === "COMPLETED").length;
    return { submitted, done, total: appraisals.length };
  }, [appraisals]);

  const cycleLabel = cycles.find((option) => option.cycle === cycle)?.periodLabel || cycle;

  return (
    <div className="pb-4">
      <div className="hrx-hero mb-4">
        <div className="hrx-eyebrow">People operations</div>
        <h1>Induction &amp; performance</h1>
        <div className="hrx-hero-meta">
          <span><GraduationCap size={14} /> Onboarding checklists</span>
          <span><CalendarClock size={14} /> Two appraisal cycles per fiscal year</span>
        </div>
        <div className="hrx-hero-actions">
          <button type="button" className={`btn btn-sm ${tab === "induction" ? "btn-gold" : "btn-ghost"}`} onClick={() => setTab("induction")}>
            <GraduationCap size={15} /> Induction
          </button>
          <button type="button" className={`btn btn-sm ${tab === "appraisals" ? "btn-gold" : "btn-ghost"}`} onClick={() => setTab("appraisals")}>
            <ClipboardCheck size={15} /> Appraisals
          </button>
          <button type="button" className={`btn btn-sm ${tab === "framework" ? "btn-gold" : "btn-ghost"}`} onClick={() => setTab("framework")}>
            <SlidersHorizontal size={15} /> Framework
          </button>
        </div>
      </div>

      {notice ? <div className="alert alert-success py-2">{notice}</div> : null}
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      {tab === "induction" ? (
        <div className="hrx-card">
          <div className="hrx-card-head">
            <h2 className="d-flex align-items-center gap-2"><GraduationCap size={16} /> Onboarding in progress</h2>
            <span className="small text-muted">{inductions.length} checklists</span>
          </div>
          <div className="hrx-card-body">
            {inductions.length === 0 ? (
              <p className="text-muted small mb-0">
                No inductions yet. Hiring a candidate from Recruitment opens one automatically.
              </p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {inductions.map((induction) => {
                  const percent = progressOf(induction.tasks);
                  const next = induction.tasks.find((task) => !task.completedAt);
                  return (
                    <div key={induction.id} className="d-flex flex-wrap gap-3 align-items-center p-3 rounded" style={{ background: "#f7fafc", border: "1px solid var(--hrx-line)" }}>
                      <div className="hrx-ring" style={{ "--value": percent, width: 64, height: 64 }}>
                        <span style={{ width: 48, height: 48, fontSize: "0.8rem" }}>{percent}%</span>
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="fw-semibold" style={{ color: "var(--hrx-navy)" }}>
                          {[induction.user.firstName, induction.user.lastName].filter(Boolean).join(" ") || induction.user.username}
                        </div>
                        <div className="small text-muted">
                          {induction.user.jobTitle || induction.user.department || induction.user.username} · started{" "}
                          {new Date(induction.startDate).toLocaleDateString("en-GB")}
                        </div>
                        {next ? (
                          <div className="small mt-1">
                            Next: <strong>{next.title}</strong>
                            {next.dueAt ? ` · due ${new Date(next.dueAt).toLocaleDateString("en-GB")}` : ""}
                          </div>
                        ) : (
                          <div className="small mt-1 text-success">Checklist complete</div>
                        )}
                      </div>
                      <span className="hrx-chip hrx-chip--info">{induction.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : tab === "framework" ? (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="hrx-card h-100">
              <div className="hrx-card-head">
                <h2><SlidersHorizontal size={16} /> {editingCriterion ? "Edit criterion" : "Add criterion"}</h2>
                {editingCriterion ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetCriterion}>Cancel edit</button> : null}
              </div>
              <div className="hrx-card-body hrx-form">
                <form onSubmit={saveCriterion}>
                  <div className="mb-3">
                    <label className="form-label">Criterion title</label>
                    <input className="form-control form-control-sm" required value={criterionForm.title} onChange={(event) => setCriterionForm({ ...criterionForm, title: event.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">What it measures</label>
                    <textarea className="form-control" rows={2} value={criterionForm.description} onChange={(event) => setCriterionForm({ ...criterionForm, description: event.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Guidance for evaluators</label>
                    <textarea className="form-control" rows={3} value={criterionForm.guidance} onChange={(event) => setCriterionForm({ ...criterionForm, guidance: event.target.value })} />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Category</label>
                      <select className="form-select form-select-sm" value={criterionForm.category} onChange={(event) => setCriterionForm({ ...criterionForm, category: event.target.value })}>
                        {["Core", "Performance", "Delivery", "Compliance", "Behaviour", "Development", "Leadership"].map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label">Weight %</label>
                      <input type="number" min="1" max="100" className="form-control form-control-sm" value={criterionForm.weight} onChange={(event) => setCriterionForm({ ...criterionForm, weight: event.target.value })} />
                    </div>
                    <div className="col-3">
                      <label className="form-label">Scale</label>
                      <input type="number" min="1" max="10" step="0.5" className="form-control form-control-sm" value={criterionForm.maxScore} onChange={(event) => setCriterionForm({ ...criterionForm, maxScore: event.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3 mt-3">
                    <label className="form-label">Department (optional)</label>
                    <input className="form-control form-control-sm" placeholder="Blank = everyone" value={criterionForm.appliesToDepartment} onChange={(event) => setCriterionForm({ ...criterionForm, appliesToDepartment: event.target.value })} />
                  </div>
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" id="criterion-active" checked={criterionForm.isActive} onChange={(event) => setCriterionForm({ ...criterionForm, isActive: event.target.checked })} />
                    <label className="form-check-label small" htmlFor="criterion-active">Active for new and draft appraisals</label>
                  </div>
                  <button className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1" disabled={busy}>
                    <Save size={14} /> {editingCriterion ? "Save criterion" : "Add criterion"}
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="hrx-card h-100">
              <div className="hrx-card-head">
                <h2><SlidersHorizontal size={16} /> Evaluation framework</h2>
                <span className={`hrx-chip ${criteriaTotal === 100 ? "hrx-chip--good" : "hrx-chip--warn"}`}>{criteriaTotal}% weighted</span>
              </div>
              <div className="hrx-card-body p-0">
                {criteria.length === 0 ? (
                  <p className="text-muted small p-4 mb-0">No criteria yet. Add the first criterion.</p>
                ) : (
                  <div className="d-flex flex-column">
                    {criteria.map((criterion) => (
                      <div key={criterion.id} className="d-flex gap-3 align-items-start p-3 border-bottom">
                        <span className="hrx-chip hrx-chip--muted" style={{ minWidth: 42, justifyContent: "center" }}>{criterion.weight}%</span>
                        <div className="flex-grow-1">
                          <div className="fw-semibold small">{criterion.title}</div>
                          <div className="small text-muted">{criterion.category || "Core"} · {criterion.maxScore}-point scale{criterion.appliesToDepartment ? ` · ${criterion.appliesToDepartment}` : " · all staff"}</div>
                          {criterion.description ? <div className="small text-muted mt-1">{criterion.description}</div> : null}
                          {!criterion.isActive ? <span className="badge bg-secondary mt-1">Inactive</span> : null}
                        </div>
                        <div className="d-flex gap-1">
                          <button type="button" className="btn btn-sm btn-light border" onClick={() => editCriterion(criterion)} title="Edit"><Pencil size={13} /></button>
                          <button type="button" className="btn btn-sm btn-light border text-danger" onClick={() => removeCriterion(criterion)} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="hrx-card-body small text-muted">
                Weight total should be 100%. Changing the framework updates draft appraisals immediately; completed appraisals keep the criteria and scores they were signed with.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="hrx-card mb-4">
            <div className="hrx-card-head">
              <h2 className="d-flex align-items-center gap-2"><CalendarClock size={16} /> Cycle</h2>
              <div className="d-flex flex-wrap gap-2 ms-auto" style={{ flex: "1 1 260px", maxWidth: "100%" }}>
                <select className="form-select form-select-sm" style={{ flex: "1 1 170px", minWidth: 0 }} value={cycle} onChange={(event) => changeCycle(event.target.value)}>
                  {cycles.map((option) => (
                    <option key={option.cycle} value={option.cycle}>
                      {option.periodLabel} ({option.cycle})
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1" onClick={openCycle} disabled={busy}>
                  <PlayCircle size={14} /> Open cycle
                </button>
              </div>
            </div>
            <div className="hrx-card-body">
              <div className="hrx-stats">
                <div className="hrx-stat" style={{ "--hrx-accent": "#0d3357" }}>
                  <div className="hrx-stat-label"><Users size={13} /> Appraisals</div>
                  <div className="hrx-stat-value">{summary.total}</div>
                </div>
                <div className="hrx-stat" style={{ "--hrx-accent": "var(--brand-secondary)" }}>
                  <div className="hrx-stat-label"><ClipboardCheck size={13} /> Self-assessments in</div>
                  <div className="hrx-stat-value">{summary.submitted}</div>
                </div>
                <div className="hrx-stat" style={{ "--hrx-accent": "#2f8f6b" }}>
                  <div className="hrx-stat-label"><BadgeCheck size={13} /> Completed</div>
                  <div className="hrx-stat-value">{summary.done}</div>
                </div>
              </div>
              <div className="small text-muted mt-3">
                {cycleLabel}: self-assessment opens for every staff member, then the supervisor scores the same
                competencies. Two cycles run each fiscal year, July–December and January–July.
              </div>
            </div>
          </div>

          <div className="hrx-card">
            <div className="hrx-card-head">
              <h2 className="d-flex align-items-center gap-2"><ClipboardCheck size={16} /> {cycleLabel}</h2>
              <span className="small text-muted">{appraisals.length} records</span>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th className="d-none d-md-table-cell">Department</th>
                    <th>Status</th>
                    <th className="text-center d-none d-sm-table-cell">Self</th>
                    <th className="text-center d-none d-sm-table-cell">Manager</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {appraisals.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4 small">
                        No appraisals for this cycle yet — use “Open cycle” to create them.
                      </td>
                    </tr>
                  ) : (
                    appraisals.map((row) => {
                      const [label, chip] = STATUS_COPY[row.status] || [row.status, "hrx-chip--muted"];
                      return (
                        <tr key={row.id}>
                          <td>
                            <div className="fw-semibold small">
                              {[row.user.firstName, row.user.lastName].filter(Boolean).join(" ") || row.user.username}
                            </div>
                            <div className="text-muted" style={{ fontSize: "0.74rem" }}>{row.user.jobTitle || row.user.username}</div>
                          </td>
                          <td className="small d-none d-md-table-cell">{row.user.department || "—"}</td>
                          <td><span className={`hrx-chip ${chip}`}>{label}</span></td>
                          <td className="text-center small d-none d-sm-table-cell">{row.selfRating ?? "—"}</td>
                          <td className="text-center small d-none d-sm-table-cell">{row.managerRating ?? "—"}</td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openReview(row)}>
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {review ? (
            <div className="hrx-card mt-4">
              <div className="hrx-card-head">
                <h2>
                  {[review.user.firstName, review.user.lastName].filter(Boolean).join(" ") || review.user.username} · {review.periodLabel}
                </h2>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setReview(null)}>
                  Close
                </button>
              </div>
              <div className="hrx-card-body hrx-form">
                <div className="row g-3">
                  {review.items.map((item) => (
                    <div className="col-md-6" key={item.id}>
                      <label className="form-label d-flex justify-content-between">
                        <span>{item.title}</span>
                        <span className="text-muted" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>weight {item.weight}% · {item.maxScore}-point</span>
                      </label>
                      {item.description ? <div className="form-text mt-0 mb-1">{item.description}</div> : null}
                      <div className="d-flex gap-2 align-items-center">
                        <select
                          className="form-select form-select-sm"
                          value={reviewDraft.items[item.id] ?? ""}
                          onChange={(event) =>
                            setReviewDraft({ ...reviewDraft, items: { ...reviewDraft.items, [item.id]: event.target.value } })
                          }
                        >
                          <option value="">Not scored</option>
                          {scoreOptions(item.maxScore).map((score) => (
                            <option key={score} value={score}>{score} / {item.maxScore}</option>
                          ))}
                        </select>
                        <span className="small text-muted text-nowrap">
                          self {item.selfScore ?? "—"}
                        </span>
                      </div>
                      {item.comment ? <div className="form-text">“{item.comment}”</div> : null}
                    </div>
                  ))}
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-md-3">
                    <label className="form-label">Overall manager rating</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      className="form-control"
                      value={reviewDraft.managerRating}
                      onChange={(event) => setReviewDraft({ ...reviewDraft, managerRating: event.target.value })}
                    />
                  </div>
                  <div className="col-md-9">
                    <label className="form-label">Supervisor summary</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={reviewDraft.managerSummary}
                      onChange={(event) => setReviewDraft({ ...reviewDraft, managerSummary: event.target.value })}
                    />
                  </div>
                </div>

                {review.selfSummary ? (
                  <div className="mt-3 p-3 rounded" style={{ background: "#f7fafc" }}>
                    <div className="hrx-eyebrow mb-1">Employee's own summary</div>
                    <p className="small mb-0" style={{ whiteSpace: "pre-line" }}>{review.selfSummary}</p>
                  </div>
                ) : null}

                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="btn btn-brand d-inline-flex align-items-center gap-1" onClick={() => saveReview(false)}>
                    <Star size={14} /> Save review
                  </button>
                  <button type="button" className="btn btn-outline-success d-inline-flex align-items-center gap-1" onClick={() => saveReview(true)}>
                    <BadgeCheck size={14} /> Complete appraisal
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
