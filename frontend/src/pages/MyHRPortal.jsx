import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Paperclip,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { api, API_BASE, assetUrl } from "../lib/api";
import HrProfileCard from "../components/HrProfileCard";
import HrJourneyCards from "../components/HrJourneyCards";
import SignatureSettingsCard from "../components/SignatureSettingsCard";
import MyJobDescriptionsCard from "../components/MyJobDescriptionsCard";
import SignatureDialog from "../components/SignatureDialog";
import Avatar from "../components/Avatar";
import AvatarUploadCard from "../components/AvatarUploadCard";
import MyOffboardingCard from "../components/MyOffboardingCard";

/* ------------------------------------------------------------------ helpers */

const DAY = 86_400_000;

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const daysFromToday = (iso) =>
  Math.round((startOfDay(iso).getTime() - startOfDay(new Date()).getTime()) / DAY);

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const relativeDue = (iso) => {
  if (!iso) return "No due date";
  const diff = daysFromToday(iso);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `In ${diff} days`;
};

const SEVERITY = {
  overdue: { chip: "bg-danger", text: "text-danger", label: "Overdue" },
  today: { chip: "bg-warning text-dark", text: "text-warning-emphasis", label: "Today" },
  soon: { chip: "bg-info text-dark", text: "text-info-emphasis", label: "This week" },
  later: { chip: "bg-light text-dark border", text: "text-muted", label: "Upcoming" },
  info: { chip: "bg-light text-dark border", text: "text-muted", label: "Info" },
};

const KIND_ICON = {
  TIMESHEET: Clock,
  TRAINING: BadgeCheck,
  DOCUMENT: FileText,
  CONTRACT: ClipboardList,
  PROBATION: CalendarClock,
  LEAVE_PLAN: CalendarDays,
  LEAVE: Calendar,
  APPROVAL: ClipboardList,
  HOLIDAY: Calendar,
  TASK: CheckCircle2,
};

const CATEGORY_LABEL = {
  CONTRACT: "Contract",
  ID: "ID",
  LICENCE: "Licence",
  CERTIFICATE: "Certificate",
  MEDICAL: "Medical",
  OTHER: "Other",
};

const EMPTY_TASK = { title: "", dueAt: "", priority: "NORMAL" };
const EMPTY_DOC = { title: "", category: "CERTIFICATE", expiresAt: "", reference: "" };

/* --------------------------------------------------------------------- page */

export default function MyHRPortal() {
  const [data, setData] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signAction, setSignAction] = useState(null);

  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState(EMPTY_DOC);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: "", startDate: "", endDate: "", reason: "" });

  const [projects, setProjects] = useState([{ name: "Regular", entries: {} }]);
  const [planItems, setPlanItems] = useState([{ startDate: "", endDate: "", leaveType: "ANNUAL", notes: "" }]);

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const [overview, gate] = await Promise.all([
        api.get("/hr-self/overview"),
        api
          .get(`/timesheets/compliance?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
          .catch(() => null),
      ]);
      setData(overview);
      setCompliance(gate);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load your workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Seed the editable forms from the overview payload.
  useEffect(() => {
    if (!data) return;
    const sheet = data.timesheet;
    if (sheet?.entries?.length) {
      const grouped = {};
      sheet.entries.forEach((entry) => {
        const name = entry.projectName || "Regular";
        if (!grouped[name]) grouped[name] = {};
        grouped[name][new Date(entry.date).getDate()] = entry.leaveCode || entry.hours;
      });
      setProjects(Object.entries(grouped).map(([name, entries]) => ({ name, entries })));
    }
    if (data.plan?.items?.length) {
      setPlanItems(
        data.plan.items.map((item) => ({
          startDate: item.startDate.slice(0, 10),
          endDate: item.endDate.slice(0, 10),
          leaveType: item.leaveType,
          notes: item.notes || "",
        }))
      );
    }
    if (data.leaveTypes?.length && !leaveForm.type) {
      setLeaveForm((form) => ({ ...form, type: data.leaveTypes[0].code }));
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const month = useMemo(() => new Date().getMonth(), []);
  const year = useMemo(() => new Date().getFullYear(), []);

  /* --------------------------------------------------------------- mutations */

  const addTask = async (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    setBusy(true);
    try {
      await api.post("/hr-self/tasks", {
        title: taskForm.title.trim(),
        dueAt: taskForm.dueAt || null,
        priority: taskForm.priority,
      });
      setTaskForm(EMPTY_TASK);
      setShowTaskForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      await api.patch(`/hr-self/tasks/${task.id}`, { status: task.status === "DONE" ? "OPEN" : "DONE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeTask = async (task) => {
    try {
      await api.del(`/hr-self/tasks/${task.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addDocument = async (event) => {
    event.preventDefault();
    if (!docForm.title.trim()) return;
    setBusy(true);
    try {
      await api.post("/hr-self/documents", {
        title: docForm.title.trim(),
        category: docForm.category,
        reference: docForm.reference || undefined,
        expiresAt: docForm.expiresAt || null,
      });
      setDocForm(EMPTY_DOC);
      setShowDocForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeDocument = async (document) => {
    try {
      await api.del(`/hr-self/documents/${document.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadDocumentFile = async (document, file) => {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_BASE}/hr-self/documents/${document.id}/file`, {
        method: "POST",
        body,
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Upload failed");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requestSignature = (type, payload = {}) => setSignAction({ type, ...payload });

  const submitLeave = async (signedName) => {
    setBusy(true);
    try {
      await api.post("/hr-self/leave", { ...leaveForm, signedName });
      setShowLeaveForm(false);
      setLeaveForm({ type: leaveForm.type, startDate: "", endDate: "", reason: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTimesheet = async (submit, signedName) => {
    setBusy(true);
    try {
      const entries = [];
      projects.forEach((project) => {
        if (!project.name) return;
        Object.entries(project.entries).forEach(([day, value]) => {
          const text = String(value ?? "").trim();
          if (!text) return;
          if (/^\d+(\.\d+)?$/.test(text)) {
            const hours = Number(text);
            if (hours > 0) {
              entries.push({ date: new Date(year, month, Number(day)), hours, projectName: project.name });
            }
          } else {
            entries.push({
              date: new Date(year, month, Number(day)),
              hours: 0,
              leaveCode: text.toUpperCase().slice(0, 4),
              projectName: project.name,
            });
          }
        });
      });
      await api.post("/timesheets/save", { month: month + 1, year, entries });
      if (submit) {
        const sheet = await api.get(`/timesheets/my-timesheet?month=${month + 1}&year=${year}`);
        if (sheet?.id) {
          try {
            await api.post(`/timesheets/${sheet.id}/submit`, { signedName });
          } catch (submitError) {
            if (submitError?.data?.blockers) setCompliance((current) => ({ ...(current || {}), blockers: submitError.data.blockers, canSubmit: false, message: submitError.message }));
            throw submitError;
          }
        }
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const savePlan = async (submit, signedName) => {
    setBusy(true);
    try {
      const items = planItems.filter((item) => item.startDate && item.endDate);
      if (!items.length) throw new Error("Add at least one date range to the plan");
      const saved = await api.post("/annual-plans", { year, items });
      if (submit && saved?.id) await api.post(`/annual-plans/${saved.id}/submit`, { signedName });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmSignature = async (signedName) => {
    if (!signAction) return;
    try {
      if (signAction.type === "document") {
        setBusy(true);
        await api.post(`/hr-self/documents/${signAction.document.id}/sign`, { name: signedName });
        await load();
      } else if (signAction.type === "leave") {
        await submitLeave(signedName);
      } else if (signAction.type === "timesheet") {
        await saveTimesheet(true, signedName);
      } else if (signAction.type === "plan") {
        await savePlan(true, signedName);
      }
      setSignAction(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------------ render */

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  if (!data) {
    return <div className="alert alert-danger m-4">{error || "Could not load your workspace"}</div>;
  }

  const { profile, counters, agenda, tasks, documents, training, leaves, leaveTypes, plan, timesheet } = data;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
  const openTasks = tasks.filter((task) => task.status === "OPEN");
  const doneTasks = tasks.filter((task) => task.status === "DONE");
  const assignedTasks = openTasks.filter((task) => task.assignedById);
  const sheetLocked = timesheet && ["SUBMITTED", "FORWARDED", "APPROVED"].includes(timesheet.status);
  const gateBlocked = Boolean(compliance && !compliance.submitted && !compliance.canSubmit);
  const planLocked = plan && ["SUBMITTED", "APPROVED", "VERIFIED"].includes(plan.status);

  const today = formatDate(new Date().toISOString());
  const firstName = name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const profileLine =
    [profile.jobTitle, profile.department, profile.employeeNo && `Staff no. ${profile.employeeNo}`]
      .filter(Boolean)
      .join(" · ") || "Your HR records, due dates and tasks in one place.";
  const supervisorName = profile.immediateSupervisor
    ? [profile.immediateSupervisor.firstName, profile.immediateSupervisor.lastName].filter(Boolean).join(" ") ||
      profile.immediateSupervisor.username
    : null;
  const nextDue = agenda.find((item) => item.dueAt && item.severity !== "info") || null;

  const tiles = [
    { label: "Overdue", value: counters.overdue, icon: AlertTriangle, accent: counters.overdue ? "#c0392b" : "#9fb3c2" },
    { label: "Next 7 days", value: counters.dueSoon, icon: CalendarClock, accent: "var(--brand-secondary)" },
    { label: "Open tasks", value: counters.openTasks, icon: ClipboardList, accent: "#0d3357" },
    { label: "Awaiting approval", value: counters.approvals, icon: BadgeCheck, accent: "#2e6f9e" },
    { label: "Annual leave left", value: counters.leaveDaysLeft ?? "—", icon: CalendarDays, accent: "#2f8f6b", suffix: "days" },
  ];
  return (
    <div className="container-fluid py-4 hr-portal-page" style={{ maxWidth: "1240px" }}>
      <Helmet>
        <title>My Portal | EBPE</title>
      </Helmet>

      <div className="hrx-hero mb-4">
        <div className="hrx-hero-identity">
          <Avatar name={name} src={profile.avatarUrl} size={92} ring />
          <div className="hrx-hero-copy">
            <div className="hrx-eyebrow">Staff self-service · {today}</div>
            <h1>{greeting}, {firstName}.</h1>
            <div className="hrx-hero-meta">
              {profileLine ? <span>{profileLine}</span> : null}
              {profile.immediateSupervisor ? <span>Supervisor · {supervisorName}</span> : null}
              {nextDue ? <span>Next up · {nextDue.title}</span> : null}
            </div>
          </div>
        </div>
        <div className="hrx-hero-actions">
          <button type="button" className="btn btn-sm btn-gold" onClick={() => setShowTaskForm(true)}>
            <Plus size={15} /> Add a task
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowLeaveForm((open) => !open)}>
            <CalendarDays size={15} /> Request leave
          </button>
          <Link to="/my-approvals" className="btn btn-sm btn-ghost">
            <BadgeCheck size={15} /> Approvals{counters.approvals ? ` (${counters.approvals})` : ""}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <AvatarUploadCard profile={profile} onSaved={load} onError={setError} />

      <MyOffboardingCard onError={setError} onChanged={load} />

      <HrProfileCard data={data} onSaved={load} onError={setError} />

      <SignatureSettingsCard profile={profile} onSaved={load} onError={setError} />

      <div className="hrx-stats mb-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              className="hrx-stat"
              key={tile.label}
              style={{ "--hrx-accent": tile.accent }}
            >
              <div className="hrx-stat-label"><Icon size={13} /> {tile.label}</div>
              <div className="hrx-stat-value">
                {tile.value}
                {tile.suffix ? <small>{tile.suffix}</small> : null}
              </div>
            </div>
          );
        })}
      </div>

      <HrJourneyCards data={data} onSaved={load} onError={setError} />

      <MyJobDescriptionsCard onError={setError} />

      <div className="row g-4 mb-4">
        {/* Agenda */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                <CalendarDays size={18} /> What is due
              </h2>
              <span className="badge bg-light text-dark border">{agenda.filter((item) => item.severity !== "info").length} open</span>
            </div>
            <div className="list-group list-group-flush">
              {agenda.length === 0 ? (
                <div className="p-4 text-muted small">Nothing due. Your HR records, timesheets and plan are up to date.</div>
              ) : (
                agenda.map((item) => {
                  const Icon = KIND_ICON[item.kind] || Calendar;
                  const tone = SEVERITY[item.severity] || SEVERITY.info;
                  return (
                    <div key={item.id} className="list-group-item d-flex gap-3 align-items-start py-3">
                      <span className={`rounded-circle d-inline-flex align-items-center justify-content-center bg-${item.severity === "overdue" ? "danger" : "light"} ${item.severity === "overdue" ? "text-white" : "text-secondary"}`} style={{ width: 34, height: 34, flex: "0 0 34px" }}>
                        <Icon size={16} />
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{item.title}</div>
                        {item.detail ? <div className="small text-muted">{item.detail}</div> : null}
                      </div>
                      <div className="text-end" style={{ minWidth: 130 }}>
                        <span className={`badge ${tone.chip} mb-1`}>{tone.label}</span>
                        <div className={`small ${tone.text}`}>{relativeDue(item.dueAt)}</div>
                        {item.dueAt ? <div className="text-muted" style={{ fontSize: "0.72rem" }}>{formatDate(item.dueAt)}</div> : null}
                      </div>
                      {item.link ? (
                        <Link className="btn btn-sm btn-outline-secondary align-self-center" to={item.link}>
                          {item.action || "Open"}
                        </Link>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                <ClipboardList size={18} /> My tasks
              </h2>
              <div className="d-flex align-items-center gap-2">
                {assignedTasks.length ? (
                  <Link to="/team-tasks" className="badge bg-light text-dark text-decoration-none">
                    {assignedTasks.length} from supervisor
                  </Link>
                ) : null}
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowTaskForm((open) => !open)}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {showTaskForm ? (
              <form className="p-3 border-bottom bg-light" onSubmit={addTask}>
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="What needs doing?"
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  required
                />
                <div className="d-flex gap-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={taskForm.dueAt}
                    onChange={(event) => setTaskForm({ ...taskForm, dueAt: event.target.value })}
                    aria-label="Due date"
                  />
                  <select
                    className="form-select form-select-sm"
                    value={taskForm.priority}
                    onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}
                    aria-label="Priority"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                  </select>
                  <button className="btn btn-sm btn-primary" disabled={busy}>
                    Save
                  </button>
                </div>
              </form>
            ) : null}

            <div className="list-group list-group-flush">
              {openTasks.length === 0 ? (
                <div className="p-4 text-muted small">No open tasks. Add one for anything HR asks you to follow up.</div>
              ) : (
                openTasks.map((task) => {
                  const due = task.dueAt ? daysFromToday(task.dueAt) : null;
                  return (
                    <div key={task.id} className="list-group-item d-flex align-items-start gap-2 py-2">
                      <input className="form-check-input mt-1" type="checkbox" checked={false} onChange={() => toggleTask(task)} aria-label={`Complete ${task.title}`} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{task.title}</div>
                        {task.assignedById ? (
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            Assigned by {task.assignedByName || "your supervisor"}
                            {task.progress ? ` · ${task.progress}% complete` : ""}
                          </div>
                        ) : null}
                        <div className="text-muted" style={{ fontSize: "0.74rem" }}>
                          {task.dueAt ? `${relativeDue(task.dueAt)} · ${formatDate(task.dueAt)}` : "No due date"}
                          {task.priority === "HIGH" ? <span className="text-danger fw-semibold"> · High</span> : null}
                        </div>
                        {task.latestUpdate ? (
                          <div className="text-muted fst-italic" style={{ fontSize: "0.72rem" }}>
                            Latest: {task.latestUpdate}
                          </div>
                        ) : null}
                      </div>
                      {due !== null && due < 0 ? (
                        <span className="badge bg-danger align-self-center">Overdue</span>
                      ) : null}
                      <button type="button" className="btn btn-sm btn-link text-muted p-0" onClick={() => removeTask(task)} aria-label={`Delete ${task.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
              {doneTasks.length ? (
                <div className="px-3 py-2 small text-muted border-top">
                  {doneTasks.length} completed —{" "}
                  {doneTasks.slice(0, 2).map((task) => (
                    <button key={task.id} type="button" className="btn btn-link btn-sm p-0 me-2" onClick={() => toggleTask(task)}>
                      {task.title}
                    </button>
                  ))}
                  {doneTasks.length > 2 ? "…" : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Documents */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                <FileText size={18} /> My documents
              </h2>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowDocForm((open) => !open)}>
                <Plus size={14} /> Add
              </button>
            </div>

            {showDocForm ? (
              <form className="p-3 border-bottom bg-light" onSubmit={addDocument}>
                <div className="row g-2">
                  <div className="col-sm-5">
                    <input
                      className="form-control form-control-sm"
                      placeholder="Document title"
                      value={docForm.title}
                      onChange={(event) => setDocForm({ ...docForm, title: event.target.value })}
                      required
                    />
                  </div>
                  <div className="col-sm-4">
                    <select
                      className="form-select form-select-sm"
                      value={docForm.category}
                      onChange={(event) => setDocForm({ ...docForm, category: event.target.value })}
                    >
                      {Object.keys(CATEGORY_LABEL).map((category) => (
                        <option key={category} value={category}>
                          {CATEGORY_LABEL[category]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-sm-3">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={docForm.expiresAt}
                      onChange={(event) => setDocForm({ ...docForm, expiresAt: event.target.value })}
                      aria-label="Expiry"
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-end mt-2">
                  <button className="btn btn-sm btn-primary" disabled={busy}>
                    Add document
                  </button>
                </div>
              </form>
            ) : null}

            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Document</th>
                    <th className="d-none d-md-table-cell">Category</th>
                    <th>Expires</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4 small">
                        No documents on file. Add your certificates and IDs so their expiry dates show up above.
                      </td>
                    </tr>
                  ) : (
                    documents.map((document) => {
                      const diff = document.expiresAt ? daysFromToday(document.expiresAt) : null;
                      return (
                        <tr key={document.id}>
                          <td className="fw-semibold small">
                            {document.title}
                            {document.signedAt ? (
                              <span className="hrx-chip hrx-chip--good ms-2">Signed</span>
                            ) : null}
                            {document.fileUrl ? (
                              <a
                                className="ms-2 text-decoration-none"
                                href={assetUrl(document.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open scan of ${document.title}`}
                              >
                                <Paperclip size={13} />
                              </a>
                            ) : null}
                          </td>
                          <td className="small text-muted d-none d-md-table-cell">
                            {CATEGORY_LABEL[document.category] || document.category}
                          </td>
                          <td className="small">
                            {document.expiresAt ? (
                              <span className={diff < 0 ? "text-danger fw-semibold" : diff <= 60 ? "text-warning-emphasis" : ""}>
                                {formatDate(document.expiresAt)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex align-items-center gap-2">
                              <label className="btn btn-link btn-sm text-muted p-0 mb-0" title="Attach a scan">
                                <Paperclip size={14} />
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  hidden
                                  onChange={(event) => uploadDocumentFile(document, event.target.files?.[0])}
                                  aria-label={`Attach a file to ${document.title}`}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-muted p-0"
                                onClick={() => requestSignature("document", { document })}
                                title={document.signedAt ? "Re-sign" : "Sign electronically"}
                                aria-label={`Sign ${document.title}`}
                              >
                                <PenLine size={14} />
                              </button>
                              <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={() => removeDocument(document)} aria-label={`Delete ${document.title}`}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Approvals + leave balance */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white py-3">
              <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                <BadgeCheck size={18} /> Waiting on you
              </h2>
            </div>
            <div className="card-body">
              {counters.approvals === 0 ? (
                <div className="small text-muted">No requests are waiting for your decision.</div>
              ) : (
                <>
                  <div className="small text-muted mb-2">
                    {counters.approvals} item{counters.approvals === 1 ? "" : "s"} from your team need a decision.
                  </div>
                  <Link className="btn btn-sm btn-primary" to="/approvals">
                    Open approvals
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                <Calendar size={18} /> Leave balance {year}
              </h2>
            </div>
            <div className="card-body">
              {data.balances.length === 0 ? (
                <div className="small text-muted">No leave entitlement recorded for {year} yet — HR sets this each year.</div>
              ) : (
                data.balances.map((balance) => {
                  const left = balance.entitledDays + balance.rolloverDays - balance.usedDays;
                  return (
                    <div key={balance.id} className="mb-3">
                      <div className="d-flex justify-content-between small fw-semibold">
                        <span className="text-capitalize">{balance.leaveType.toLowerCase()}</span>
                        <span>
                          {left} left <span className="text-muted fw-normal">of {balance.entitledDays + balance.rolloverDays}</span>
                        </span>
                      </div>
                      <div className="progress mt-1" style={{ height: 6 }}>
                        <div
                          className="progress-bar bg-success"
                          style={{ width: `${Math.max(0, Math.min(100, (left / Math.max(1, balance.entitledDays + balance.rolloverDays)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reporting gate */}
      <div className={`card border-0 shadow-sm mb-4 timesheet-gate ${compliance?.canSubmit ? "is-clear" : gateBlocked ? "is-blocked" : ""}`}>
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div className="d-flex gap-3">
              <span className={`timesheet-gate__mark ${compliance?.canSubmit ? "is-clear" : gateBlocked ? "is-blocked" : ""}`}>
                {compliance?.canSubmit || compliance?.submitted ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              </span>
              <div>
                <div className="hrx-eyebrow mb-1">Timesheet reporting gate</div>
                <h2 className="h6 fw-bold mb-1">
                  {compliance?.submitted
                    ? "Your timesheet is already submitted"
                    : gateBlocked
                      ? `${compliance.blockers.length} reporting obligation${compliance.blockers.length === 1 ? "" : "s"} must be cleared`
                      : "Reports and updates are clear"}
                </h2>
                <p className="small text-muted mb-0">
                  {compliance?.message || "Checking your overdue reports and progress updates…"}
                  {compliance?.deadline ? ` The current deadline is ${formatDate(compliance.deadline)}.` : ""}
                </p>
              </div>
            </div>
            <span className={`badge ${compliance?.submitted ? "bg-success" : gateBlocked ? "bg-danger" : "bg-success"}`}>
              {!compliance ? "Checking" : compliance.submitted ? "Submitted" : gateBlocked ? "Action required" : "Ready to submit"}
            </span>
          </div>

          {gateBlocked ? (
            <div className="timesheet-gate__blockers mt-3">
              {compliance.blockers.map((blocker) => (
                <div className="timesheet-gate__item" key={blocker.id}>
                  <span className="timesheet-gate__type">{blocker.type === "REPORT" ? "Report" : "Update"}</span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold small">{blocker.title}</div>
                    <div className="small text-muted">{blocker.reason}{blocker.plan ? ` · ${blocker.plan}` : ""}</div>
                  </div>
                  <Link className="btn btn-sm btn-outline-danger" to={blocker.link}>Resolve</Link>
                </div>
              ))}
            </div>
          ) : null}

          <div className="timesheet-gate__note mt-3">
            <span><Clock size={13} /> Reminders are sent 5 days and 2 days before the deadline, on the due date and if the sheet becomes overdue.</span>
            <span><PenLine size={13} /> A signed timesheet is accepted only after every overdue report and progress update is complete.</span>
          </div>
        </div>
      </div>

      {/* Timesheet */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
            <Clock size={18} /> Timesheet — {new Date(year, month, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })}
          </h2>
          <div className="d-flex align-items-center gap-2">
            {timesheet ? (
              <span className={`badge bg-${timesheet.status === "APPROVED" ? "success" : ["SUBMITTED", "FORWARDED"].includes(timesheet.status) ? "warning" : timesheet.status === "REJECTED" ? "danger" : "secondary"}`}>
                {timesheet.status === "SUBMITTED"
                  ? "With HR & Admin"
                  : timesheet.status === "FORWARDED"
                    ? "With supervisor"
                    : timesheet.status}
              </span>
            ) : null}
            <span className="small text-muted">Submit by the {data.submissionDay}th</span>
          </div>
        </div>
        <div className="card-body">
          {timesheet?.rejectionReason ? <div className="alert alert-danger small py-2">Returned: {timesheet.rejectionReason}</div> : null}

          {projects.map((project, index) => (
            <div key={index} className="mb-3 border rounded p-3">
              <div className="d-flex gap-2 mb-2 align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm w-50"
                  placeholder="Project or workstream"
                  value={project.name}
                  onChange={(event) => {
                    const next = [...projects];
                    next[index] = { ...next[index], name: event.target.value };
                    setProjects(next);
                  }}
                  disabled={sheetLocked}
                />
                {!sheetLocked && projects.length > 1 ? (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setProjects(projects.filter((_, i) => i !== index))}>
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                <span className="small text-muted">Enter hours or an absence code:</span>
                {data.leaveTypes?.map((type) => (
                  <span className="badge bg-light text-dark border" key={type.code}>
                    <strong>{type.shortCode || type.code.slice(0, 2)}</strong> = {type.name}
                  </span>
                ))}
                <span className="badge bg-light text-dark border"><strong>AB</strong> = Absent</span>
              </div>
              <datalist id="timesheet-leave-codes">
                {data.leaveTypes?.map((type) => (
                  <option key={type.code} value={type.shortCode || type.code.slice(0, 2)}>{type.name}</option>
                ))}
                <option value="AB">Absent</option>
              </datalist>
              <div className="row g-1">
                {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, day) => day + 1).map((day) => {
                  const date = new Date(year, month, day);
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div className="col-2 col-md-1" key={day}>
                      <div className={`p-1 border rounded text-center ${weekend ? "bg-light" : ""}`}>
                        <div className="small text-muted" style={{ fontSize: "0.65rem" }}>{day}</div>
                        <input
                          type="text"
                          inputMode="text"
                          list="timesheet-leave-codes"
                          maxLength={4}
                          className="form-control form-control-sm text-center p-0"
                          style={{ fontSize: "0.72rem" }}
                          placeholder="h"
                          title="Enter hours (e.g. 8) or a leave code (e.g. AL, SL, AB)"
                          value={project.entries[day] ?? ""}
                          onChange={(event) => {
                            const next = [...projects];
                            next[index] = { ...next[index], entries: { ...next[index].entries, [day]: event.target.value } };
                            setProjects(next);
                          }}
                          disabled={weekend || sheetLocked}
                          aria-label={`Hours or absence code for day ${day}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!sheetLocked ? (
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setProjects([...projects, { name: "", entries: {} }])}>
                <Plus size={14} /> Add project
              </button>
              <button type="button" className="btn btn-sm btn-primary ms-auto" onClick={() => saveTimesheet(false)} disabled={busy}>
                Save draft
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                onClick={() => requestSignature("timesheet")}
                disabled={busy || gateBlocked}
                title={gateBlocked ? "Clear the overdue reports and progress updates above before submitting." : "Sign and submit this timesheet"}
              >
                <PenLine size={14} /> Sign & submit
              </button>
            </div>
          ) : (
            <div className="text-end">
              <a href={`/print-timesheet/${timesheet.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-dark">
                Print timesheet
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Annual leave plan */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
            <CalendarDays size={18} /> Annual leave plan {year}
          </h2>
          {plan ? (
            <span className={`badge bg-${plan.status === "VERIFIED" ? "success" : plan.status === "APPROVED" ? "primary" : plan.status === "SUBMITTED" ? "warning" : plan.status === "REJECTED" ? "danger" : "secondary"}`}>
              {plan.status}
            </span>
          ) : null}
        </div>
        <div className="card-body">
          {plan?.status === "REJECTED" ? <div className="alert alert-danger small py-2">Rejected: {plan.rejectionReason}</div> : null}

          {planLocked ? (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Type</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {planItems.map((item, index) => (
                    <tr key={index}>
                      <td>{formatDate(item.startDate)}</td>
                      <td>{formatDate(item.endDate)}</td>
                      <td className="text-capitalize">{item.leaveType.toLowerCase()}</td>
                      <td className="text-muted">{item.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {planItems.map((item, index) => (
                <div className="row g-2 mb-2 align-items-end" key={index}>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Start</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={item.startDate}
                      onChange={(event) => {
                        const next = [...planItems];
                        next[index] = { ...next[index], startDate: event.target.value };
                        setPlanItems(next);
                      }}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">End</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={item.endDate}
                      onChange={(event) => {
                        const next = [...planItems];
                        next[index] = { ...next[index], endDate: event.target.value };
                        setPlanItems(next);
                      }}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={item.leaveType}
                      onChange={(event) => {
                        const next = [...planItems];
                        next[index] = { ...next[index], leaveType: event.target.value };
                        setPlanItems(next);
                      }}
                    >
                      {(leaveTypes.length ? leaveTypes : [{ code: "ANNUAL", name: "Annual leave" }]).map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setPlanItems(planItems.filter((_, i) => i !== index))}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="d-flex gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setPlanItems([...planItems, { startDate: "", endDate: "", leaveType: "ANNUAL", notes: "" }])}
                >
                  <Plus size={14} /> Add dates
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => savePlan(false)} disabled={busy}>
                  Save draft
                </button>
                <button type="button" className="btn btn-sm btn-success d-inline-flex align-items-center gap-1" onClick={() => requestSignature("plan")} disabled={busy}>
                  <PenLine size={14} /> Sign & submit
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leave requests */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
            <Calendar size={18} /> My leave requests
          </h2>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowLeaveForm((open) => !open)}>
            {showLeaveForm ? "Cancel" : "+ Request leave"}
          </button>
        </div>

        {showLeaveForm ? (
          <form className="p-3 border-bottom bg-light" onSubmit={(event) => { event.preventDefault(); requestSignature("leave"); }}>
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Type</label>
                <select
                  className="form-select form-select-sm"
                  value={leaveForm.type}
                  onChange={(event) => setLeaveForm({ ...leaveForm, type: event.target.value })}
                  required
                >
                  {(leaveTypes.length ? leaveTypes : [{ code: "ANNUAL", name: "Annual leave" }]).map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold">From</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={leaveForm.startDate}
                  onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold">To</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={leaveForm.endDate}
                  onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <button className="btn btn-sm btn-success w-100 d-inline-flex align-items-center justify-content-center gap-1" disabled={busy}>
                  <PenLine size={14} /> Sign & submit
                </button>
              </div>
            </div>
          </form>
        ) : null}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted small">
                    No leave requests yet.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="small text-capitalize">{leave.type.toLowerCase()}</td>
                    <td className="small">
                      {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                    </td>
                    <td>
                      <span className={`badge bg-${leave.status === "APPROVED" ? "success" : leave.status === "REJECTED" ? "danger" : "warning"}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="small text-danger">{leave.rejectionReason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
            <BookOpen size={18} /> My training &amp; certifications
          </h2>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Course</th>
                <th>Provider</th>
                <th>Completed</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {training.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted small">
                    No training records yet.
                  </td>
                </tr>
              ) : (
                training.map((record) => {
                  const diff = record.expiresAt ? daysFromToday(record.expiresAt) : null;
                  return (
                    <tr key={record.id}>
                      <td className="fw-semibold small">{record.title}</td>
                      <td className="small">{record.provider}</td>
                      <td className="small">{formatDate(record.completedAt)}</td>
                      <td className="small">
                        {record.expiresAt ? (
                          <span className={diff < 0 ? "text-danger fw-semibold" : diff <= 30 ? "text-warning-emphasis fw-semibold" : ""}>
                            {formatDate(record.expiresAt)} {diff < 0 ? "(expired)" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SignatureDialog
        open={Boolean(signAction)}
        title={
          signAction?.type === "document"
            ? "Sign document"
            : signAction?.type === "leave"
              ? "Sign leave request"
              : signAction?.type === "timesheet"
                ? "Sign timesheet"
                : "Sign annual leave plan"
        }
        subtitle={
          signAction?.type === "document"
            ? `Sign “${signAction.document?.title || "this document"}” electronically.`
            : "Sign to confirm the content and submit it for approval."
        }
        confirmLabel="Sign & submit"
        busy={busy}
        onCancel={() => setSignAction(null)}
        onConfirm={confirmSignature}
      />
    </div>
  );
}
