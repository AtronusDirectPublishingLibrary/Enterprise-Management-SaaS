import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const emptyAssign = { userId: "", title: "", description: "", priority: "NORMAL", dueAt: "" };
const emptyUpdate = { note: "", progress: 0, status: "OPEN" };

const nameOf = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.username || "Staff";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No due date";

const daysLeft = (value) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
};

const priorityClass = (priority) =>
  priority === "HIGH" ? "task-priority task-priority--high" : priority === "LOW" ? "task-priority task-priority--low" : "task-priority";

/**
 * Two-way work assignment between a supervisor and their direct reports.
 * The supervisor sets the outcome and due date; both sides post progress notes
 * against the same task so the record stays in one place.
 */
export default function TeamTasks() {
  const { user } = useAuth();
  const [data, setData] = useState({ reports: [], assignedByMe: [], assignedToMe: [], personal: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("assigned");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assign, setAssign] = useState(emptyAssign);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [update, setUpdate] = useState(emptyUpdate);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.get("/team-tasks");
      setData({
        reports: Array.isArray(payload?.reports) ? payload.reports : [],
        assignedByMe: Array.isArray(payload?.assignedByMe) ? payload.assignedByMe : [],
        assignedToMe: Array.isArray(payload?.assignedToMe) ? payload.assignedToMe : [],
        personal: Array.isArray(payload?.personal) ? payload.personal : [],
      });
    } catch (e) {
      setError(e.message || "Could not load the team workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canAssign = data.reports.length > 0;
  const counts = useMemo(
    () => ({
      assigned: data.assignedByMe.filter((task) => task.status === "OPEN").length,
      mine: data.assignedToMe.filter((task) => task.status === "OPEN").length,
      done: data.assignedByMe.filter((task) => task.status === "DONE").length + data.assignedToMe.filter((task) => task.status === "DONE").length,
    }),
    [data],
  );

  const rows = tab === "assigned" ? data.assignedByMe : tab === "mine" ? data.assignedToMe : data.personal;

  const openAssign = () => {
    setAssign({ ...emptyAssign, userId: data.reports[0]?.id || "" });
    setAssignOpen(true);
  };

  const createTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/team-tasks", {
        ...assign,
        dueAt: assign.dueAt || null,
        description: assign.description || null,
      });
      setAssignOpen(false);
      setAssign(emptyAssign);
      setNotice(`Task assigned${assign.dueAt ? ` · due ${formatDate(assign.dueAt)}` : ""}.`);
      await load();
    } catch (e) {
      setError(e.message || "Could not assign this task.");
    } finally {
      setSaving(false);
    }
  };

  const openUpdate = (task) => {
    setSelected(task);
    setUpdate({ note: "", progress: task.progress || 0, status: task.status || "OPEN" });
  };

  const postUpdate = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/team-tasks/${selected.id}/updates`, {
        note: update.note.trim(),
        progress: Number(update.progress),
        status: update.status,
      });
      setNotice("Progress update shared. The other person has been notified.");
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.message || "Could not post the progress update.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task) => {
    try {
      await api.patch(`/team-tasks/${task.id}`, { status: task.status === "DONE" ? "OPEN" : "DONE" });
      await load();
    } catch (e) {
      setError(e.message || "Could not update the task.");
    }
  };

  return (
    <div className="container-fluid py-4 team-tasks">
      <Helmet><title>Team & Tasks | BEMS</title></Helmet>

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <div className="page-kicker">Supervision · delivery</div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2"><ClipboardList size={25} /> Team &amp; Tasks</h2>
          <p className="small text-muted mb-0" style={{ maxWidth: "72ch" }}>
            Assign work to your direct reports, follow progress notes, and keep a shared record of decisions. Employees
            see everything assigned to them here and in My Portal.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
          {canAssign ? (
            <button className="btn-brand btn-sm d-flex align-items-center gap-1" onClick={openAssign}>
              <Plus size={15} /> Assign a task
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      {notice ? (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span>{notice}</span>
          <button type="button" className="btn-close" onClick={() => setNotice("")} aria-label="Dismiss" />
        </div>
      ) : null}

      <div className="row g-3 mb-3">
        <Metric label="Open · assigned by me" value={counts.assigned} icon={<Users size={17} />} />
        <Metric label="Open · assigned to me" value={counts.mine} icon={<ClipboardList size={17} />} />
        <Metric label="Completed together" value={counts.done} icon={<CheckCircle2 size={17} />} />
        <Metric label="Direct reports" value={data.reports.length} icon={<Users size={17} />} />
      </div>

      <div className="team-tasks__tabs" role="tablist" aria-label="Task views">
        <button type="button" role="tab" aria-selected={tab === "assigned"} className={tab === "assigned" ? "is-active" : ""} onClick={() => setTab("assigned")}>
          Assigned by me <span>{data.assignedByMe.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "is-active" : ""} onClick={() => setTab("mine")}>
          Work assigned to me <span>{data.assignedToMe.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "personal"} className={tab === "personal" ? "is-active" : ""} onClick={() => setTab("personal")}>
          My own tasks <span>{data.personal.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-5 text-center"><div className="spinner-border text-success" role="status" /></div>
      ) : rows.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center">
          <ClipboardList size={30} className="mx-auto mb-2 text-muted" />
          <div className="fw-semibold">Nothing here yet.</div>
          <div className="small text-muted">
            {tab === "assigned"
              ? canAssign
                ? "Assign the first task to a direct report."
                : "You do not have direct reports yet. HR can set a supervisor on each staff profile."
              : tab === "mine"
              ? "When a supervisor assigns you work it will appear here."
              : "Add personal follow-ups from My Portal."}
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rows.map((task) => {
            const due = daysLeft(task.dueAt);
            const overdue = due !== null && due < 0 && task.status !== "DONE";
            return (
              <article className={`task-card ${task.status === "DONE" ? "is-done" : ""}`} key={task.id}>
                <div className="task-card__main">
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <span className={priorityClass(task.priority)}>{task.priority || "NORMAL"}</span>
                    <strong className="task-card__title">{task.title}</strong>
                    {task.status === "DONE" ? <span className="status-pill status-on">Completed</span> : null}
                  </div>
                  {task.description ? <p className="task-card__description">{task.description}</p> : null}
                  <div className="task-card__meta">
                    <span><Users size={13} /> {tab === "assigned" ? nameOf(task.user) : task.assignedByName || nameOf(task.user)}</span>
                    <span className={overdue ? "text-danger fw-semibold" : ""}>
                      {overdue ? `Overdue by ${Math.abs(due)} day${Math.abs(due) === 1 ? "" : "s"}` : formatDate(task.dueAt)}
                    </span>
                    <span><MessageSquare size={13} /> {task.updates?.length || 0} update{task.updates?.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="task-card__progress">
                    <div className="progress" style={{ height: 6 }}>
                      <div className="progress-bar" style={{ width: `${task.progress || 0}%` }} />
                    </div>
                    <span>{task.progress || 0}%</span>
                  </div>
                  {task.latestUpdate ? (
                    <div className="task-card__latest">
                      <MessageSquare size={13} />
                      <span>{task.latestUpdate}</span>
                    </div>
                  ) : null}
                </div>
                <div className="task-card__actions">
                  <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => openUpdate(task)}>
                    <Send size={13} /> Progress update
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => toggleDone(task)}>
                    <CheckCircle2 size={13} /> {task.status === "DONE" ? "Reopen" : "Mark done"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {assignOpen ? (
        <div className="modal show d-block" style={{ background: "rgba(11,37,69,0.55)", zIndex: 1050 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-0">Assign work</h5>
                  <div className="small text-muted">The assignee is notified immediately.</div>
                </div>
                <button type="button" className="btn-close" onClick={() => setAssignOpen(false)} aria-label="Close" />
              </div>
              <form onSubmit={createTask}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Assign to *</label>
                      <select className="form-select" required value={assign.userId} onChange={(event) => setAssign({ ...assign, userId: event.target.value })}>
                        <option value="">Choose a direct report…</option>
                        {data.reports.map((report) => (
                          <option key={report.id} value={report.id}>{report.name}{report.position ? ` · ${report.position}` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">Priority</label>
                      <select className="form-select" value={assign.priority} onChange={(event) => setAssign({ ...assign, priority: event.target.value })}>
                        <option value="LOW">Low</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">Due date</label>
                      <input type="date" className="form-control" value={assign.dueAt} onChange={(event) => setAssign({ ...assign, dueAt: event.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Task *</label>
                      <input className="form-control" required value={assign.title} onChange={(event) => setAssign({ ...assign, title: event.target.value })} placeholder="What should be delivered?" />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Context and expected outcome</label>
                      <textarea className="form-control" rows={3} value={assign.description} onChange={(event) => setAssign({ ...assign, description: event.target.value })} placeholder="Scope, acceptance criteria, links to the plan or project…" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setAssignOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-brand" disabled={saving}>{saving ? "Assigning…" : "Assign task"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="modal show d-block" style={{ background: "rgba(11,37,69,0.55)", zIndex: 1050 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-0">Progress update</h5>
                  <div className="small text-muted">{selected.title}</div>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelected(null)} aria-label="Close" />
              </div>
              <form onSubmit={postUpdate}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-bold d-flex justify-content-between">
                        <span>Progress</span><span>{update.progress}%</span>
                      </label>
                      <input type="range" className="form-range" min="0" max="100" step="5" value={update.progress} onChange={(event) => setUpdate({ ...update, progress: Number(event.target.value) })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">Status</label>
                      <select className="form-select" value={update.status} onChange={(event) => setUpdate({ ...update, status: event.target.value })}>
                        <option value="OPEN">In progress</option>
                        <option value="DONE">Completed</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">What changed? *</label>
                      <textarea className="form-control" rows={3} required value={update.note} onChange={(event) => setUpdate({ ...update, note: event.target.value })} placeholder="Progress made, blockers, decisions needed…" />
                    </div>
                    {selected.updates?.length ? (
                      <div className="col-12">
                        <div className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: "0.08em" }}>Recent exchange</div>
                        <div className="task-thread">
                          {selected.updates.slice(0, 6).map((entry) => (
                            <div className="task-thread__item" key={entry.id}>
                              <div className="task-thread__meta">
                                <strong>{entry.authorName}</strong>
                                <span>{new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                                {entry.progress !== null && entry.progress !== undefined ? <span>{entry.progress}%</span> : null}
                              </div>
                              <div>{entry.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setSelected(null)}><X size={14} /> Cancel</button>
                  <button type="submit" className="btn btn-brand" disabled={saving || !update.note.trim()}>
                    <Send size={14} /> {saving ? "Sharing…" : "Share update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div className="col-6 col-xl-3">
      <div className="team-metric">
        <span className="team-metric__icon">{icon}</span>
        <div>
          <div className="team-metric__value">{value}</div>
          <div className="team-metric__label">{label}</div>
        </div>
      </div>
    </div>
  );
}
