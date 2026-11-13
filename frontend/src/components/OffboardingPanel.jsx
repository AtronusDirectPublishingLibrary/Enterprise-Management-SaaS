import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  DoorOpen,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  UserMinus,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import Avatar from "./Avatar";

const REASONS = [
  ["RESIGNATION", "Resignation"],
  ["TERMINATION", "Termination"] ,
  ["RETIREMENT", "Retirement"],
  ["CONTRACT_END", "Contract end"],
  ["OTHER", "Other"],
];

const STATUS_META = {
  SUBMITTED: { label: "Resignation submitted", tone: "#b06a1f" },
  INITIATED: { label: "Initiated", tone: "#2e6f9e" },
  IN_PROGRESS: { label: "In progress", tone: "var(--brand-secondary)" },
  READY_FOR_EXIT: { label: "Ready for exit", tone: "#2f8f6b" },
  COMPLETED: { label: "Completed", tone: "#0d3357" },
  WITHDRAWN: { label: "Withdrawn", tone: "#8c8c8c" },
};

const CATEGORY_TONE = {
  HANDOVER: "#2e6f9e",
  ASSETS: "#8a6d1f",
  ACCESS: "#8c3b3b",
  FINANCE: "#2f8f6b",
  HR: "#0d3357",
  EXIT: "#5b4b8a",
  GENERAL: "#5c6b7a",
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fullName = (person) =>
  person ? [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username : "—";

const emptyForm = { userId: "", reason: "RESIGNATION", noticeDate: "", lastWorkingDay: "", managerId: "", handoverNotes: "" };
const emptyDetail = {
  reason: "RESIGNATION",
  noticeDate: "",
  lastWorkingDay: "",
  exitInterviewAt: "",
  exitInterviewNotes: "",
  handoverNotes: "",
  finalSettlementAmount: "",
  settlementStatus: "PENDING",
  eligibleForRehire: "",
  managerId: "",
};

/** HR workspace for employee exits: notice, checklist, settlement and closure. */
export default function OffboardingPanel() {
  const [cases, setCases] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState(emptyDetail);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newTask, setNewTask] = useState({ title: "", category: "GENERAL", owner: "HR", dueAt: "" });
  const [settings, setSettings] = useState(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await api.get("/offboarding");
      setCases(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      setStaff(await api.get("/offboarding/eligible-staff"));
    } catch {
      setStaff([]);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await api.get("/offboarding/settings"));
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    load();
    loadStaff();
    loadSettings();
  }, [load, loadStaff, loadSettings]);

  const selected = useMemo(() => cases.find((row) => row.id === selectedId) || null, [cases, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDetail(emptyDetail);
      return;
    }
    setDetail({
      reason: selected.reason || "RESIGNATION",
      noticeDate: selected.noticeDate ? String(selected.noticeDate).slice(0, 10) : "",
      lastWorkingDay: selected.lastWorkingDay ? String(selected.lastWorkingDay).slice(0, 10) : "",
      exitInterviewAt: selected.exitInterviewAt ? String(selected.exitInterviewAt).slice(0, 16) : "",
      exitInterviewNotes: selected.exitInterviewNotes || "",
      handoverNotes: selected.handoverNotes || "",
      finalSettlementAmount: selected.finalSettlementAmount ?? "",
      settlementStatus: selected.settlementStatus || "PENDING",
      eligibleForRehire: selected.eligibleForRehire === null || selected.eligibleForRehire === undefined ? "" : String(selected.eligibleForRehire),
      managerId: selected.managerId || "",
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((row) =>
      [fullName(row.user), row.user?.employeeNo, row.user?.department, row.reason, STATUS_META[row.status]?.label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [cases, search]);

  const stats = useMemo(() => {
    const active = cases.filter((row) => ["INITIATED", "IN_PROGRESS", "READY_FOR_EXIT"].includes(row.status));
    return {
      submitted: cases.filter((row) => row.status === "SUBMITTED").length,
      active: active.length,
      openTasks: active.reduce((sum, row) => sum + row.blockedByOpenTasks, 0),
      ready: cases.filter((row) => row.status === "READY_FOR_EXIT").length,
      completed: cases.filter((row) => row.status === "COMPLETED").length,
    };
  }, [cases]);

  const reset = () => {
    setNotice("");
    setError("");
  };

  const createCase = async (event) => {
    event.preventDefault();
    reset();
    if (!form.userId || !form.lastWorkingDay) {
      setError("Choose the employee and their last working day.");
      return;
    }
    setBusy("create");
    try {
      const created = await api.post("/offboarding", {
        userId: form.userId,
        reason: form.reason,
        noticeDate: form.noticeDate || null,
        lastWorkingDay: form.lastWorkingDay,
        managerId: form.managerId || null,
        handoverNotes: form.handoverNotes || null,
      });
      setShowNew(false);
      setForm(emptyForm);
      setNotice(`Exit file opened for ${fullName(created.user)}.`);
      await load();
      await loadStaff();
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const saveDetail = async () => {
    if (!selected) return;
    reset();
    setBusy("save");
    try {
      await api.patch(`/offboarding/${selected.id}`, {
        reason: detail.reason,
        noticeDate: detail.noticeDate || null,
        lastWorkingDay: detail.lastWorkingDay || selected.lastWorkingDay,
        exitInterviewAt: detail.exitInterviewAt || null,
        exitInterviewNotes: detail.exitInterviewNotes || null,
        handoverNotes: detail.handoverNotes || null,
        finalSettlementAmount:
          detail.finalSettlementAmount === "" ? null : Number(detail.finalSettlementAmount),
        settlementStatus: detail.settlementStatus,
        eligibleForRehire: detail.eligibleForRehire === "" ? null : detail.eligibleForRehire === "true",
        managerId: detail.managerId || null,
      });
      setNotice("Exit details saved.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const toggleTask = async (task) => {
    if (!selected) return;
    reset();
    setBusy(task.id);
    try {
      await api.patch(`/offboarding/${selected.id}/tasks/${task.id}`, { completed: !task.completedAt });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const addTask = async (event) => {
    event.preventDefault();
    if (!selected || !newTask.title.trim()) return;
    reset();
    setBusy("task");
    try {
      await api.post(`/offboarding/${selected.id}/tasks`, {
        title: newTask.title.trim(),
        category: newTask.category,
        owner: newTask.owner,
        dueAt: newTask.dueAt || null,
      });
      setNewTask({ title: "", category: "GENERAL", owner: "HR", dueAt: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const removeTask = async (task) => {
    if (!selected) return;
    if (!window.confirm(`Remove “${task.title}” from the checklist?`)) return;
    reset();
    setBusy(task.id);
    try {
      await api.del(`/offboarding/${selected.id}/tasks/${task.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSettingsBusy(true);
    setSettingsNotice("");
    setError("");
    try {
      const saved = await api.patch("/offboarding/settings", {
        noticePeriodDays: Number(settings.noticePeriodDays),
        allowEmployeeInitiated: Boolean(settings.allowEmployeeInitiated),
      });
      setSettings(saved);
      setSettingsNotice(
        `Saved. Employee resignations now require ${saved.noticePeriodDays} days' notice${
          saved.allowEmployeeInitiated ? "" : " and are closed to self-service"
        }.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSettingsBusy(false);
    }
  };

  const acceptResignation = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        `Accept ${fullName(selected.user)}'s resignation effective ${formatDate(detail.lastWorkingDay)}? Their exit checklist becomes active immediately.`
      )
    ) {
      return;
    }
    reset();
    setBusy("accept");
    try {
      await api.post(`/offboarding/${selected.id}/accept`, {
        lastWorkingDay: detail.lastWorkingDay || undefined,
        note: detail.handoverNotes || undefined,
      });
      setNotice(`Resignation accepted for ${fullName(selected.user)}. The exit checklist is now active.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const declineResignation = async () => {
    if (!selected) return;
    const reason = window.prompt(
      `Why is ${fullName(selected.user)}'s resignation not being accepted? The employee sees this reason.`
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Give a short reason for declining the resignation.");
      return;
    }
    reset();
    setBusy("decline");
    try {
      await api.post(`/offboarding/${selected.id}/decline`, { reason: reason.trim() });
      setNotice("Resignation declined and the employee notified.");
      await load();
      await loadStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const approve = async () => {
    if (!selected) return;
    reset();
    setBusy("approve");
    try {
      await api.post(`/offboarding/${selected.id}/approve`, {});
      setNotice("Exit signed off. The case is ready for the final working day.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const complete = async () => {
    if (!selected) return;
    if (!window.confirm(`Close the exit file for ${fullName(selected.user)}? This is the final adjournment.`)) return;
    reset();
    setBusy("complete");
    try {
      await api.post(`/offboarding/${selected.id}/complete`, {
        eligibleForRehire: detail.eligibleForRehire === "" ? undefined : detail.eligibleForRehire === "true",
        settlementStatus: detail.settlementStatus,
        finalSettlementAmount:
          detail.finalSettlementAmount === "" ? undefined : Number(detail.finalSettlementAmount),
      });
      setNotice("Offboarding completed and archived in the register.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const withdraw = async () => {
    if (!selected) return;
    const reason = window.prompt("Why is this exit being withdrawn? (optional)");
    if (reason === null) return;
    reset();
    setBusy("withdraw");
    try {
      await api.post(`/offboarding/${selected.id}/withdraw`, { reason: reason || undefined });
      setNotice("Case withdrawn. The record is retained for the audit trail.");
      await load();
      await loadStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const removeCase = async () => {
    if (!selected) return;
    if (!window.confirm("Permanently delete this offboarding case and its checklist?")) return;
    reset();
    setBusy("delete");
    try {
      await api.del(`/offboarding/${selected.id}`);
      setSelectedId(null);
      setNotice("Case deleted.");
      await load();
      await loadStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  return (
    <div className="offboarding">
      {error ? (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <span>{notice}</span>
          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="offboarding__stats mb-4">
        {[
          { label: "Awaiting review", value: stats.submitted },
          { label: "Active exits", value: stats.active },
          { label: "Open checklist items", value: stats.openTasks },
          { label: "Ready for exit", value: stats.ready },
          { label: "Completed", value: stats.completed },
        ].map((tile) => (
          <div className="offboarding__stat" key={tile.label}>
            <div className="offboarding__stat-value">{tile.value}</div>
            <div className="offboarding__stat-label">{tile.label}</div>
          </div>
        ))}
      </div>

      {settings ? (
        <div className="card border-0 shadow-sm mb-4 offboarding__settings">
          <div className="card-body d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-3">
            <div>
              <h2 className="h6 fw-bold mb-1 d-flex align-items-center gap-2">
                <CalendarClock size={17} /> Resignation notice period
              </h2>
              <div className="small text-muted">
                The minimum advance notice employees must give when filing a resignation in My Portal. The earliest
                permissible last working day is calculated from today.
              </div>
              {settingsNotice ? <div className="small text-success mt-1">{settingsNotice}</div> : null}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="input-group input-group-sm offboarding__notice-input">
                <input
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  className="form-control"
                  value={settings.noticePeriodDays}
                  onChange={(event) =>
                    setSettings({ ...settings, noticePeriodDays: event.target.value })
                  }
                  aria-label="Notice period in days"
                />
                <span className="input-group-text">days</span>
              </div>
              <div className="form-check form-switch mb-0 d-flex align-items-center gap-2 ms-xl-2">
                <input
                  id="allow-employee-exits"
                  className="form-check-input"
                  type="checkbox"
                  checked={Boolean(settings.allowEmployeeInitiated)}
                  onChange={(event) =>
                    setSettings({ ...settings, allowEmployeeInitiated: event.target.checked })
                  }
                />
                <label className="form-check-label small" htmlFor="allow-employee-exits">
                  Employees can file resignations
                </label>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={saveSettings}
                disabled={settingsBusy}
              >
                {settingsBusy ? "Saving…" : "Save policy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="row g-4">
        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <DoorOpen size={18} /> Exit register
                </h2>
                <button
                  type="button"
                  className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    setShowNew((open) => !open);
                    reset();
                  }}
                >
                  {showNew ? <X size={14} /> : <Plus size={14} />} {showNew ? "Close" : "New exit"}
                </button>
              </div>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><Search size={14} /></span>
                <input
                  className="form-control"
                  placeholder="Search name, department, status…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search exits"
                />
              </div>
            </div>
            <div className="card-body p-0">
              {showNew ? (
                <form className="p-3 border-bottom bg-light" onSubmit={createCase}>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold mb-1" htmlFor="exit-employee">Employee</label>
                    <select
                      id="exit-employee"
                      className="form-select form-select-sm"
                      value={form.userId}
                      onChange={(event) => {
                        const person = staff.find((row) => row.id === event.target.value);
                        setForm({
                          ...form,
                          userId: event.target.value,
                          managerId: person?.immediateSupervisorId || "",
                        });
                      }}
                      required
                    >
                      <option value="">Select a staff member…</option>
                      {staff.map((person) => (
                        <option key={person.id} value={person.id}>
                          {fullName(person)}{person.department ? ` · ${person.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold mb-1" htmlFor="exit-reason">Reason</label>
                      <select
                        id="exit-reason"
                        className="form-select form-select-sm"
                        value={form.reason}
                        onChange={(event) => setForm({ ...form, reason: event.target.value })}
                      >
                        {REASONS.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold mb-1" htmlFor="exit-notice">Notice date</label>
                      <input
                        id="exit-notice"
                        type="date"
                        className="form-control form-control-sm"
                        value={form.noticeDate}
                        onChange={(event) => setForm({ ...form, noticeDate: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold mb-1" htmlFor="exit-lwd">Last working day</label>
                    <input
                      id="exit-lwd"
                      type="date"
                      className="form-control form-control-sm"
                      value={form.lastWorkingDay}
                      onChange={(event) => setForm({ ...form, lastWorkingDay: event.target.value })}
                      required
                    />
                    {settings ? (
                      <div className="form-text">
                        Employee notice policy: {settings.noticePeriodDays} days · earliest{" "}
                        {formatDate(settings.earliestLastWorkingDay)}. HR-created exits may override it.
                      </div>
                    ) : null}
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold mb-1" htmlFor="exit-manager">Exit manager (optional)</label>
                    <select
                      id="exit-manager"
                      className="form-select form-select-sm"
                      value={form.managerId}
                      onChange={(event) => setForm({ ...form, managerId: event.target.value })}
                    >
                      <option value="">Use the line supervisor</option>
                      {staff.map((person) => (
                        <option key={person.id} value={person.id}>{fullName(person)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold mb-1" htmlFor="exit-notes">Handover notes</label>
                    <textarea
                      id="exit-notes"
                      className="form-control form-control-sm"
                      rows="2"
                      value={form.handoverNotes}
                      onChange={(event) => setForm({ ...form, handoverNotes: event.target.value })}
                      placeholder="Key projects, contacts, pending items…"
                    />
                  </div>
                  <button className="btn-brand btn-sm w-100" disabled={busy === "create"}>
                    {busy === "create" ? "Opening…" : "Open exit file"}
                  </button>
                  <div className="form-text">The standard 10-point exit checklist is created automatically.</div>
                </form>
              ) : null}

              <div className="offboarding__list">
                {filtered.length === 0 ? (
                  <div className="p-4 text-muted small">
                    {cases.length ? "No exits match your search." : "No exit files yet. Use “New exit” to start one."}
                  </div>
                ) : (
                  filtered.map((row) => {
                    const meta = STATUS_META[row.status] || { label: row.status, tone: "#0d3357" };
                    return (
                      <button
                        type="button"
                        key={row.id}
                        className={`offboarding__row ${row.id === selectedId ? "is-active" : ""}`}
                        onClick={() => {
                          setSelectedId(row.id);
                          reset();
                        }}
                      >
                        <Avatar name={fullName(row.user)} src={row.user?.avatarUrl} size={44} />
                        <span className="flex-grow-1 text-start">
                          <span className="d-block fw-semibold small">{fullName(row.user)}</span>
                          <span className="d-block text-muted" style={{ fontSize: "0.74rem" }}>
                            {row.user?.department || row.user?.jobTitle || "—"} · LWD {formatDate(row.lastWorkingDay)}
                          </span>
                          <span className="d-flex align-items-center gap-2 mt-1">
                            <span className="badge rounded-pill" style={{ background: `${meta.tone}1a`, color: meta.tone }}>
                              {meta.label}
                            </span>
                            <span className="text-muted" style={{ fontSize: "0.72rem" }}>{row.progress}% complete</span>
                          </span>
                        </span>
                        <ChevronRight size={16} className="text-muted" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          {!selected ? (
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
                <UserMinus size={38} className="text-muted mb-3" />
                <h2 className="h5 fw-bold">Select an exit file</h2>
                <p className="text-muted small mb-0" style={{ maxWidth: "44ch" }}>
                  Open a case from the register to manage its checklist, exit interview, settlement and final sign-off.
                </p>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
                  <div className="d-flex align-items-center gap-3">
                    <Avatar name={fullName(selected.user)} src={selected.user?.avatarUrl} size={64} ring />
                    <div>
                      <h2 className="h5 fw-bold mb-1">{fullName(selected.user)}</h2>
                      <div className="small text-muted">
                        {[selected.user?.position || selected.user?.jobTitle, selected.user?.department, selected.user?.employeeNo]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                      <div className="small text-muted mt-1">
                        {selected.status === "SUBMITTED"
                          ? `Filed by the employee on ${formatDate(selected.resignationSubmittedAt || selected.createdAt)}`
                          : `Opened by ${fullName(selected.initiatedBy)} on ${formatDate(selected.createdAt)}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className="badge rounded-pill d-inline-block mb-2"
                      style={{
                        background: `${(STATUS_META[selected.status] || {}).tone || "#0d3357"}1a`,
                        color: (STATUS_META[selected.status] || {}).tone || "#0d3357",
                      }}
                    >
                      {(STATUS_META[selected.status] || {}).label || selected.status}
                    </span>
                    <div className="small text-muted d-flex align-items-center gap-1 justify-content-end">
                      <CalendarClock size={14} /> LWD {formatDate(selected.lastWorkingDay)}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-semibold">Exit checklist</span>
                  <span className="text-muted">
                    {selected.tasksCompleted} of {selected.tasksTotal} complete
                    {selected.blockedByOpenTasks ? ` · ${selected.blockedByOpenTasks} open` : ""}
                  </span>
                </div>
                <div className="progress mb-3" style={{ height: 8 }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${selected.progress}%`, background: (STATUS_META[selected.status] || {}).tone || "#0d3357" }}
                    aria-valuenow={selected.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                {selected.status === "SUBMITTED" ? (
                  <div className="resignation-callout mb-3">
                    <div className="resignation-callout__grid">
                      <div>
                        <span>Filed</span>
                        <strong>{formatDate(selected.resignationSubmittedAt)}</strong>
                      </div>
                      <div>
                        <span>Notice applied</span>
                        <strong>{selected.noticePeriodDays ?? "—"} days</strong>
                      </div>
                      <div>
                        <span>Requested last day</span>
                        <strong>{formatDate(selected.lastWorkingDay)}</strong>
                      </div>
                    </div>
                    {selected.resignationNote ? (
                      <p className="small mb-0 mt-2"><strong>Employee note:</strong> {selected.resignationNote}</p>
                    ) : null}
                    <div className="small mt-2">
                      Accept to activate the checklist, or decline with a reason the employee will see.
                    </div>
                  </div>
                ) : null}

                <ul className="list-unstyled offboarding__tasks mb-3">
                  {selected.tasks.map((task) => (
                    <li key={task.id} className={`offboarding__task ${task.completedAt ? "is-done" : ""}`}>
                      <button
                        type="button"
                        className="offboarding__tick"
                        onClick={() => toggleTask(task)}
                        disabled={busy === task.id || ["COMPLETED", "WITHDRAWN", "SUBMITTED"].includes(selected.status)}
                        aria-label={task.completedAt ? `Reopen ${task.title}` : `Complete ${task.title}`}
                      >
                        {task.completedAt ? <CheckCircle2 size={19} style={{ color: "#2f8f6b" }} /> : <Circle size={19} className="text-muted" />}
                      </button>
                      <span className="flex-grow-1">
                        <span className="d-block small fw-semibold">{task.title}</span>
                        <span className="text-muted" style={{ fontSize: "0.73rem" }}>
                          <span className="badge rounded-pill me-1" style={{ background: `${CATEGORY_TONE[task.category] || "#5c6b7a"}18`, color: CATEGORY_TONE[task.category] || "#5c6b7a" }}>
                            {task.category}
                          </span>
                          Owner {task.owner}
                          {task.dueAt ? ` · due ${formatDate(task.dueAt)}` : ""}
                          {task.completedAt ? ` · done ${formatDate(task.completedAt)} by ${task.completedBy || "—"}` : ""}
                        </span>
                      </span>
                      {!task.completedAt && !["COMPLETED", "WITHDRAWN", "SUBMITTED"].includes(selected.status) ? (
                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeTask(task)} disabled={busy === task.id}>
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {!["COMPLETED", "WITHDRAWN", "SUBMITTED"].includes(selected.status) ? (
                  <form className="row g-2 align-items-end mb-4" onSubmit={addTask}>
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold mb-1" htmlFor="new-task-title">Add checklist item</label>
                      <input
                        id="new-task-title"
                        className="form-control form-control-sm"
                        value={newTask.title}
                        onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
                        placeholder="e.g. Hand over the supplier contact list"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-semibold mb-1" htmlFor="new-task-category">Category</label>
                      <select
                        id="new-task-category"
                        className="form-select form-select-sm"
                        value={newTask.category}
                        onChange={(event) => setNewTask({ ...newTask, category: event.target.value })}
                      >
                        {["HANDOVER", "ASSETS", "ACCESS", "FINANCE", "HR", "EXIT", "GENERAL"].map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-semibold mb-1" htmlFor="new-task-owner">Owner</label>
                      <select
                        id="new-task-owner"
                        className="form-select form-select-sm"
                        value={newTask.owner}
                        onChange={(event) => setNewTask({ ...newTask, owner: event.target.value })}
                      >
                        {["HR", "EMPLOYEE", "IT", "FINANCE", "PAYROLL"].map((value) => (
                          <option key={value} value={value}>{value === "EMPLOYEE" ? "Employee" : value}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-semibold mb-1" htmlFor="new-task-due">Due</label>
                      <input
                        id="new-task-due"
                        type="date"
                        className="form-control form-control-sm"
                        value={newTask.dueAt}
                        onChange={(event) => setNewTask({ ...newTask, dueAt: event.target.value })}
                      />
                    </div>
                    <div className="col-md-1">
                      <button className="btn btn-sm btn-outline-secondary w-100" disabled={busy === "task" || !newTask.title.trim()} aria-label="Add checklist item">
                        <Plus size={15} />
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-reason">Reason</label>
                    <select
                      id="detail-reason"
                      className="form-select form-select-sm"
                      value={detail.reason}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, reason: event.target.value })}
                    >
                      {REASONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-notice">Notice date</label>
                    <input
                      id="detail-notice"
                      type="date"
                      className="form-control form-control-sm"
                      value={detail.noticeDate}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, noticeDate: event.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-lwd">Last working day</label>
                    <input
                      id="detail-lwd"
                      type="date"
                      className="form-control form-control-sm"
                      value={detail.lastWorkingDay}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, lastWorkingDay: event.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-interview">Exit interview</label>
                    <input
                      id="detail-interview"
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={detail.exitInterviewAt}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, exitInterviewAt: event.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-settlement">Final settlement (ETB)</label>
                    <input
                      id="detail-settlement"
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={detail.finalSettlementAmount}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, finalSettlementAmount: event.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-settlement-status">Settlement status</label>
                    <select
                      id="detail-settlement-status"
                      className="form-select form-select-sm"
                      value={detail.settlementStatus}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, settlementStatus: event.target.value })}
                    >
                      {["PENDING", "CALCULATED", "PAID"].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="detail-rehire">Eligible for rehire</label>
                    <select
                      id="detail-rehire"
                      className="form-select form-select-sm"
                      value={detail.eligibleForRehire}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, eligibleForRehire: event.target.value })}
                    >
                      <option value="">Not decided</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold" htmlFor="detail-notes">Exit interview notes</label>
                    <textarea
                      id="detail-notes"
                      className="form-control form-control-sm"
                      rows="3"
                      value={detail.exitInterviewNotes}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, exitInterviewNotes: event.target.value })}
                      placeholder="What went well, what could improve, handover quality…"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold" htmlFor="detail-handover">Handover notes</label>
                    <textarea
                      id="detail-handover"
                      className="form-control form-control-sm"
                      rows="2"
                      value={detail.handoverNotes}
                      disabled={selected.status === "COMPLETED"}
                      onChange={(event) => setDetail({ ...detail, handoverNotes: event.target.value })}
                    />
                  </div>
                </div>

                {selected.status !== "COMPLETED" ? (
                  <div className="d-flex justify-content-end mb-3">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={saveDetail} disabled={busy === "save"}>
                      {busy === "save" ? "Saving…" : "Save exit details"}
                    </button>
                  </div>
                ) : null}

                <div className="border-top pt-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div className="small d-flex flex-column gap-1">
                    {selected.status === "SUBMITTED" ? (
                      <>
                        <span className="d-flex align-items-center gap-2">
                          <ShieldCheck size={15} style={{ color: "#2f8f6b" }} />
                          Resignation signed {formatDate(selected.resignationSubmittedAt)}
                        </span>
                        <span className="d-flex align-items-center gap-2 text-muted">
                          <CalendarClock size={15} /> Awaiting HR acceptance
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="d-flex align-items-center gap-2">
                          <ShieldCheck size={15} style={{ color: selected.employeeAcknowledgedAt ? "#2f8f6b" : "#8c8c8c" }} />
                          {selected.employeeAcknowledgedAt
                            ? `Employee acknowledged on ${formatDate(selected.employeeAcknowledgedAt)}`
                            : "Employee has not acknowledged yet"}
                        </span>
                        <span className="d-flex align-items-center gap-2 text-muted">
                          <BadgeCheck size={15} style={{ color: selected.hrApprovedAt ? "#2f8f6b" : "#8c8c8c" }} />
                          {selected.hrApprovedAt ? `HR signed off ${formatDate(selected.hrApprovedAt)}` : "Awaiting HR sign-off"}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {selected.status === "SUBMITTED" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                          onClick={acceptResignation}
                          disabled={busy === "accept"}
                        >
                          <BadgeCheck size={15} /> {busy === "accept" ? "Accepting…" : "Accept resignation"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                          onClick={declineResignation}
                          disabled={busy === "decline"}
                        >
                          <Undo2 size={14} /> {busy === "decline" ? "Declining…" : "Decline"}
                        </button>
                      </>
                    ) : (
                      <>
                        {["INITIATED", "IN_PROGRESS"].includes(selected.status) ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                            onClick={approve}
                            disabled={busy === "approve"}
                            title="Requires every checklist item to be complete"
                          >
                            <BadgeCheck size={15} /> Sign off checklist
                          </button>
                        ) : null}
                        {selected.status !== "COMPLETED" ? (
                          <button type="button" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={withdraw} disabled={busy === "withdraw"}>
                            <Undo2 size={14} /> Withdraw
                          </button>
                        ) : null}
                        {selected.status !== "COMPLETED" ? (
                          <button type="button" className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1" onClick={removeCase} disabled={busy === "delete"}>
                            <Trash2 size={14} /> Delete
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn-brand btn-sm d-inline-flex align-items-center gap-1"
                          onClick={complete}
                          disabled={busy === "complete" || selected.status === "COMPLETED" || selected.status === "WITHDRAWN"}
                        >
                          <DoorOpen size={15} /> Close exit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}