import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowUpRight, CheckCircle2, Link2, Plus, Target, X } from "lucide-react";
import PmsTabs from "../components/PmsTabs";
import { objectiveLabel, planUrl } from "../lib/planning";

const EMPTY_FORM = { title: "", description: "", targetDate: "", planItemId: "" };

/**
 * PMS delivery objectives. These are provisional project-level statements, not
 * the corporate objectives of the AOP, Strategic Plan or Roadmap. Each one can
 * name the corporate objective it contributes to, which is how project delivery
 * aggregates into the corporate view while remaining a project delivery record.
 */
export default function PmsProjectGoals() {
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [corporate, setCorporate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkingGoal, setLinkingGoal] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [goalRows, projectRows, rollup] = await Promise.all([
        api.get("/goals"),
        api.get("/projects").catch(() => []),
        api.get("/portfolios").catch(() => null),
      ]);
      setGoals(Array.isArray(goalRows) ? goalRows : []);
      setProjects(Array.isArray(projectRows) ? projectRows : []);
      setCorporate(rollup);
    } catch (e) {
      setError(e.message || "Could not load project objectives.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const corporateObjectives = useMemo(() => corporate?.goals || [], [corporate]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    try {
      await api.post("/goals", {
        title: form.title,
        description: form.description || undefined,
        targetDate: form.targetDate,
        planItemId: form.planItemId || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setNotice("Project objective created.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const handleLink = async (goalId) => {
    if (!selectedProject) return;
    setBusy(`project-${goalId}`);
    try {
      await api.post(`/goals/${goalId}/link/${selectedProject}`, {});
      setLinkingGoal(null);
      setSelectedProject("");
      setNotice("Project linked to the objective.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const linkCorporate = async (goalId, planItemId) => {
    setBusy(`corporate-${goalId}`);
    setError("");
    try {
      await api.patch(`/goals/${goalId}`, { planItemId: planItemId || null });
      setNotice(planItemId ? "Objective aligned to a corporate objective." : "Corporate alignment removed.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="planning-page pb-4">
      <PmsTabs />
      <div className="planning-head">
        <div>
          <div className="page-kicker">PMS · projects and programmes</div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            <Target size={26} /> Project Objectives
          </h2>
          <p className="text-muted small mb-0 planning-head__lede">
            Objectives that define what PMS projects will deliver, with the corporate objective each one supports.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" to="/goals">
            Corporate objectives <ArrowUpRight size={13} />
          </Link>
          <button type="button" className="btn-brand btn-sm d-inline-flex align-items-center gap-1" onClick={() => setShowForm((open) => !open)}>
            <Plus size={14} /> {showForm ? "Close" : "New project objective"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      {notice ? (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span className="d-flex align-items-center gap-2"><CheckCircle2 size={14} /> {notice}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} />
        </div>
      ) : null}

      <div className="planning-note mb-3">
        <Target size={15} />
        <div>
          <strong>Corporate alignment</strong>
          <p>
            Each project objective may be aligned to an approved corporate objective. Delivery progress and actual
            expenditure then appear with that objective in the corporate portfolio.
          </p>
        </div>
      </div>

      {showForm ? (
        <form className="card border-0 shadow-sm p-3 planning-form" onSubmit={handleCreate}>
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Project objective title *</label>
              <input
                required
                className="form-control form-control-sm"
                placeholder="e.g., Commission the cold-chain hub"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Target date *</label>
              <input
                required
                type="date"
                className="form-control form-control-sm"
                value={form.targetDate}
                onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label small fw-semibold">Corporate objective it serves</label>
              <select
                className="form-select form-select-sm"
                value={form.planItemId}
                onChange={(event) => setForm({ ...form, planItemId: event.target.value })}
              >
                <option value="">Not aligned yet</option>
                {corporateObjectives.map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objectiveLabel(objective.planType)} · {objective.title} ({objective.periodLabel})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Description</label>
              <input
                className="form-control form-control-sm"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
              Cancel
            </button>
            <button type="submit" className="btn-brand btn-sm" disabled={busy === "create"}>
              {busy === "create" ? "Saving…" : "Save project objective"}
            </button>
          </div>
        </form>
      ) : null}

      {loading && goals.length === 0 ? (
        <div className="py-5 text-center"><div className="spinner-border text-success" role="status" /></div>
      ) : null}

      <div className="pms-goal-grid">
        {goals.map((goal) => {
          const objective = goal.corporateObjective;
          return (
            <article className="pms-goal" key={goal.id}>
              <div className="pms-goal__head">
                <h4>{goal.title}</h4>
                <span className={`badge-status ${String(goal.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{goal.status}</span>
              </div>
              <p className="pms-goal__desc">{goal.description || "No description provided."}</p>
              <div className="pms-goal__meta">
                <span>Target {new Date(goal.targetDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span>{goal.progress}% complete</span>
              </div>

              <div className="pms-goal__corporate">
                <span className="pms-goal__label"><Target size={12} /> Corporate objective</span>
                {objective ? (
                  <div className="pms-goal__corporate-linked">
                    <span className="plan-type-chip">{objectiveLabel(objective.plan?.type)}</span>
                    <span>{objective.title}</span>
                    <Link to={planUrl(objective.plan?.id, objective.plan?.type)} className="pms-goal__corporate-link" title="Open plan">
                      <ArrowUpRight size={12} />
                    </Link>
                    <button
                      type="button"
                      className="pms-goal__corporate-clear"
                      title="Remove alignment"
                      onClick={() => linkCorporate(goal.id, null)}
                      disabled={busy === `corporate-${goal.id}`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <select
                    className="form-select form-select-sm"
                    value=""
                    disabled={busy === `corporate-${goal.id}`}
                    onChange={(event) => linkCorporate(goal.id, event.target.value)}
                    aria-label={`Align ${goal.title} to a corporate objective`}
                  >
                    <option value="">Align to a corporate objective…</option>
                    {corporateObjectives.map((option) => (
                      <option key={option.id} value={option.id}>
                        {objectiveLabel(option.planType)} · {option.title} ({option.periodLabel})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pms-goal__projects">
                <span className="pms-goal__label"><Link2 size={12} /> Projects ({goal.projects.length})</span>
                {goal.projects.length ? (
                  goal.projects.map((entry) => (
                    <span className="pms-goal__project" key={entry.projectId} title={entry.project.title}>
                      {entry.project.title}
                    </span>
                  ))
                ) : (
                  <span className="pms-goal__none">No project linked yet</span>
                )}
              </div>

              {linkingGoal === goal.id ? (
                <div className="pms-goal__link">
                  <select className="form-select form-select-sm" value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}>
                    <option value="">Select project…</option>
                    {projects.map((project) => (
                      <option key={project.projectId} value={project.projectId}>{project.title}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-sm btn-success" onClick={() => handleLink(goal.id)} disabled={busy === `project-${goal.id}`}>Link</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setLinkingGoal(null)}>Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center gap-1"
                  onClick={() => { setLinkingGoal(goal.id); setSelectedProject(""); }}
                >
                  <Plus size={13} /> Link project
                </button>
              )}
            </article>
          );
        })}
        {!loading && goals.length === 0 ? (
          <div className="planning-empty">
            <Target size={22} />
            <strong>No project objectives yet</strong>
            <span>Create delivery objectives for your projects and align them to the corporate objectives they serve.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
