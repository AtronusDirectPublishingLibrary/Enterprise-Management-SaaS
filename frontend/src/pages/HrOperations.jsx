import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  PlayCircle,
  Star,
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

export default function HrOperations() {
  const [tab, setTab] = useState("induction");
  const [inductions, setInductions] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cycle, setCycle] = useState("");
  const [appraisals, setAppraisals] = useState([]);
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

  useEffect(() => {
    Promise.all([loadInductions(), api.get("/appraisals/cycles")])
      .then(([, options]) => {
        setCycles(options);
        const current = options[0]?.cycle || "";
        setCycle(current);
        return loadAppraisals(current);
      })
      .catch((err) => setError(err.message));
  }, [loadInductions, loadAppraisals]);

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
                <div className="hrx-stat" style={{ "--hrx-accent": "#c9a227" }}>
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
                        <span className="text-muted" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>weight {item.weight}%</span>
                      </label>
                      <div className="d-flex gap-2 align-items-center">
                        <select
                          className="form-select form-select-sm"
                          value={reviewDraft.items[item.id] ?? ""}
                          onChange={(event) =>
                            setReviewDraft({ ...reviewDraft, items: { ...reviewDraft.items, [item.id]: event.target.value } })
                          }
                        >
                          <option value="">Not scored</option>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <option key={score} value={score}>{score} / 5</option>
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
