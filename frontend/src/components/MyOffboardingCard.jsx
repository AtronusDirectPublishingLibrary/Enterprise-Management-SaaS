import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  DoorOpen,
  Info,
  PenLine,
  Send,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import SignatureDialog from "./SignatureDialog";

const STATUS = {
  SUBMITTED: { label: "Awaiting HR", tone: "#b06a1f" },
  INITIATED: { label: "Initiated", tone: "#2e6f9e" },
  IN_PROGRESS: { label: "In progress", tone: "#c9a227" },
  READY_FOR_EXIT: { label: "Ready for exit", tone: "#2f8f6b" },
  COMPLETED: { label: "Completed", tone: "#0d3357" },
  WITHDRAWN: { label: "Withdrawn", tone: "#8c8c8c" },
};

const OWNER_LABEL = {
  EMPLOYEE: "You",
  HR: "HR",
  IT: "IT",
  FINANCE: "Finance",
  PAYROLL: "Payroll",
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.username || "";

/** The leaver's view of their own exit file, shown in My Portal. */
export default function MyOffboardingCard({ onError, onChanged }) {
  const [exitCase, setExitCase] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [signing, setSigning] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ lastWorkingDay: "", note: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [mine, settingsData] = await Promise.all([
        api.get("/offboarding/mine"),
        api.get("/offboarding/settings").catch(() => null),
      ]);
      setExitCase(mine);
      setSettings(settingsData);
      if (!request.lastWorkingDay && settingsData?.earliestLastWorkingDay) {
        setRequest((current) => ({ ...current, lastWorkingDay: settingsData.earliestLastWorkingDay }));
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [onError, request.lastWorkingDay]);

  useEffect(() => {
    load();
    // Load once on mount; the form default is filled from the settings response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  const toggle = async (task) => {
    setBusyId(task.id);
    setError("");
    setNotice("");
    try {
      await api.patch(`/offboarding/${exitCase.id}/tasks/${task.id}`, { completed: true });
      setNotice(`Marked “${task.title}” as done.`);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  const acknowledge = async (signedName) => {
    try {
      await api.post(`/offboarding/${exitCase.id}/acknowledge`, { signedName });
      setSigning(false);
      setNotice("Acknowledgment signed and stored with your exit file.");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
      setSigning(false);
    }
  };

  const startResignation = () => {
    setError("");
    setNotice("");
    setRequest((current) => ({
      lastWorkingDay: current.lastWorkingDay || settings?.earliestLastWorkingDay || "",
      note: current.note || "",
    }));
    setRequestOpen(true);
  };

  const continueToSign = (event) => {
    event.preventDefault();
    setError("");
    const earliest = settings?.earliestLastWorkingDay;
    if (!request.lastWorkingDay) {
      setError("Choose your last working day.");
      return;
    }
    if (earliest && request.lastWorkingDay < earliest) {
      setError(`HR requires ${settings.noticePeriodDays} days' notice. Choose ${earliest} or later.`);
      return;
    }
    setRequestOpen(false);
    setSigning(true);
  };

  const submitResignation = async (signedName) => {
    try {
      const created = await api.post("/offboarding/resignation", {
        lastWorkingDay: request.lastWorkingDay,
        note: request.note.trim() || undefined,
        signedName,
      });
      setSigning(false);
      setExitCase(created);
      setNotice("Resignation submitted and signed. HR has been notified and will review it.");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
      setSigning(false);
      setRequestOpen(true);
    }
  };

  const cancelResignation = async () => {
    if (!window.confirm("Withdraw your resignation before HR reviews it?")) return;
    setError("");
    try {
      await api.post(`/offboarding/${exitCase.id}/cancel`, {});
      setExitCase(null);
      setNotice("Resignation withdrawn. You can file a new one whenever you are ready.");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const alerts = (
    <>
      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      {notice ? <div className="alert alert-success py-2 small">{notice}</div> : null}
    </>
  );

  /* ------------------------------------------------- no exit file: resignation */
  if (!exitCase) {
    if (!settings?.allowEmployeeInitiated) return null;
    return (
      <>
        <div className="card border-0 shadow-sm mb-4 resignation-card">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <div>
              <h2 className="h6 fw-bold mb-1 d-flex align-items-center gap-2">
                <DoorOpen size={18} /> Resignation &amp; notice
              </h2>
              <div className="small text-muted">
                Start your exit here. Your resignation is signed, time-stamped and linked to the HR offboarding
                register automatically.
              </div>
            </div>
            <span className="badge rounded-pill resignation-card__notice">
              <Clock size={13} /> {settings.noticePeriodDays} days&apos; notice
            </span>
          </div>
          <div className="card-body">
            {alerts}
            <div className="row g-3 align-items-center">
              <div className="col-md-8">
                <p className="small text-muted mb-2">
                  HR policy requires <strong>{settings.noticePeriodDays} days</strong> between your notice and your
                  last working day. The earliest you can leave is{" "}
                  <strong>{formatDate(settings.earliestLastWorkingDay)}</strong>. HR reviews every resignation before
                  the exit checklist begins.
                </p>
                <div className="small text-muted d-flex align-items-center gap-2">
                  <Info size={14} /> Filing a resignation is not final until HR accepts it. You can withdraw it before
                  then.
                </div>
              </div>
              <div className="col-md-4 text-md-end">
                <button
                  type="button"
                  className="btn-brand btn-sm d-inline-flex align-items-center gap-2"
                  onClick={startResignation}
                >
                  <Send size={15} /> Submit resignation
                </button>
              </div>
            </div>
          </div>
        </div>

        {requestOpen ? (
          <div
            className="signature-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setRequestOpen(false);
            }}
          >
            <form className="signature-modal resignation-modal" onSubmit={continueToSign} role="dialog" aria-modal="true" aria-labelledby="resignation-title">
              <div className="signature-modal__head d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="text-uppercase small fw-bold" style={{ letterSpacing: "0.12em", color: "var(--brand-secondary)" }}>
                    Notice of resignation
                  </div>
                  <h2 id="resignation-title" className="h5 fw-bold mb-1">Plan your last working day</h2>
                  <p className="small mb-0" style={{ opacity: 0.78 }}>
                    HR requires {settings.noticePeriodDays} days&apos; notice. Choose a date on or after{" "}
                    {formatDate(settings.earliestLastWorkingDay)}.
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setRequestOpen(false)} aria-label="Close resignation form">
                  <X size={15} />
                </button>
              </div>

              <div className="signature-modal__body">
                {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
                <label className="form-label small fw-bold" htmlFor="resignation-lwd">Requested last working day</label>
                <input
                  id="resignation-lwd"
                  type="date"
                  className="form-control"
                  min={settings.earliestLastWorkingDay}
                  value={request.lastWorkingDay}
                  onChange={(event) => setRequest({ ...request, lastWorkingDay: event.target.value })}
                  required
                />
                <div className="form-text mb-3">
                  Earliest permitted: {formatDate(settings.earliestLastWorkingDay)} · notice applied today
                </div>

                <label className="form-label small fw-bold" htmlFor="resignation-note">Reason or context (optional)</label>
                <textarea
                  id="resignation-note"
                  className="form-control"
                  rows="3"
                  maxLength={4000}
                  value={request.note}
                  onChange={(event) => setRequest({ ...request, note: event.target.value })}
                  placeholder="Share anything HR should know: handover priorities, questions about the exit process…"
                />
                <div className="form-text">
                  Your manager and HR see this note. You will sign on the next step.
                </div>
              </div>

              <div className="signature-modal__foot">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRequestOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-brand btn-sm d-inline-flex align-items-center gap-2">
                  <PenLine size={15} /> Continue to sign
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <SignatureDialog
          open={signing}
          title="Sign your resignation"
          subtitle={`Type your full name to resign with ${settings.noticePeriodDays} days' notice, effective ${formatDate(request.lastWorkingDay)}.`}
          confirmLabel="Submit resignation"
          onCancel={() => {
            setSigning(false);
            setRequestOpen(true);
          }}
          onConfirm={submitResignation}
        />
      </>
    );
  }

  /* ---------------------------------------------------------- active exit file */
  const status = STATUS[exitCase.status] || { label: exitCase.status, tone: "#0d3357" };
  const submitted = exitCase.status === "SUBMITTED";
  const open = exitCase.tasks.filter((task) => !task.completedAt);
  const mine = open.filter((task) => task.owner === "EMPLOYEE");
  const days = exitCase.daysRemaining;
  const hrContact = submitted
    ? exitCase.manager
      ? `${fullName(exitCase.manager)} · your manager`
      : "HR review pending"
    : fullName(exitCase.initiatedBy) || "HR";

  return (
    <div className="card border-0 shadow-sm mb-4 exit-card">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center gap-3 flex-wrap">
        <div>
          <h2 className="h6 fw-bold mb-1 d-flex align-items-center gap-2">
            <DoorOpen size={18} /> {submitted ? "Your resignation" : "Your offboarding"}
          </h2>
          <div className="small text-muted">
            {submitted
              ? "HR is reviewing your resignation. Your checklist activates as soon as it is accepted."
              : "Everything HR needs from you before your last working day, in one place."}
          </div>
        </div>
        <span className="badge rounded-pill" style={{ background: `${status.tone}1a`, color: status.tone }}>
          {status.label}
        </span>
      </div>
      <div className="card-body">
        {alerts}

        {submitted ? (
          <div className="resignation-summary mb-3">
            <div>
              <span className="resignation-summary__label">Submitted</span>
              <span className="resignation-summary__value">{formatDate(exitCase.resignationSubmittedAt)}</span>
            </div>
            <div>
              <span className="resignation-summary__label">Notice applied</span>
              <span className="resignation-summary__value">{exitCase.noticePeriodDays ?? settings?.noticePeriodDays ?? "—"} days</span>
            </div>
            <div>
              <span className="resignation-summary__label">Requested last day</span>
              <span className="resignation-summary__value">{formatDate(exitCase.lastWorkingDay)}</span>
            </div>
            <div>
              <span className="resignation-summary__label">Reviewer</span>
              <span className="resignation-summary__value">{hrContact}</span>
            </div>
          </div>
        ) : null}

        <div className="row g-3 mb-3">
          <div className="col-sm-4">
            <div className="text-muted small">Last working day</div>
            <div className="fw-semibold d-flex align-items-center gap-2">
              <CalendarClock size={15} /> {formatDate(exitCase.lastWorkingDay)}
            </div>
            <div className="small" style={{ color: days < 0 ? "#c0392b" : "#2f8f6b" }}>
              {days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago` : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} remaining`}
            </div>
          </div>
          <div className="col-sm-4">
            <div className="text-muted small">Reason</div>
            <div className="fw-semibold">{String(exitCase.reason).replace(/_/g, " ").toLowerCase()}</div>
          </div>
          <div className="col-sm-4">
            <div className="text-muted small">{submitted ? "Line manager" : "HR contact"}</div>
            <div className="fw-semibold">
              {submitted && !exitCase.manager
                ? "—"
                : submitted
                  ? fullName(exitCase.manager)
                  : hrContact}
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="alert alert-light border small py-2 mb-3 d-flex align-items-start gap-2">
            <Clock size={15} className="mt-1" style={{ color: "#b06a1f" }} />
            <span>
              Awaiting HR acceptance. You can still withdraw this resignation before it is accepted; after that,
              changes go through HR.
            </span>
          </div>
        ) : null}

        <div className="d-flex justify-content-between small mb-1">
          <span className="fw-semibold">Exit checklist</span>
          <span className="text-muted">
            {exitCase.tasksCompleted} of {exitCase.tasksTotal} complete
            {submitted ? " · awaits acceptance" : ""}
          </span>
        </div>
        <div className="progress mb-3" style={{ height: 8 }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${exitCase.progress}%`, background: status.tone }}
            aria-valuenow={exitCase.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <ul className="list-unstyled mb-3 exit-checklist">
          {exitCase.tasks.map((task) => (
            <li key={task.id} className={`exit-checklist__item ${task.completedAt ? "is-done" : ""} ${submitted ? "is-locked" : ""}`}>
              <span className="exit-checklist__mark">
                {task.completedAt ? <CheckCircle2 size={17} /> : <span className="exit-checklist__dot" />}
              </span>
              <span className="flex-grow-1">
                <span className="d-block fw-semibold small">{task.title}</span>
                <span className="text-muted" style={{ fontSize: "0.74rem" }}>
                  {OWNER_LABEL[task.owner] || task.owner}
                  {task.dueAt ? ` · due ${formatDate(task.dueAt)}` : ""}
                  {task.completedAt ? ` · done ${formatDate(task.completedAt)}` : ""}
                </span>
              </span>
              {!submitted && !task.completedAt && task.owner === "EMPLOYEE" ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => toggle(task)}
                  disabled={busyId === task.id}
                >
                  {busyId === task.id ? "Saving…" : "Mark done"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {!submitted && mine.length ? (
          <div className="alert alert-light border small py-2 mb-3">
            {mine.length} item{mine.length === 1 ? " is" : "s are"} waiting on you. Return equipment and complete the
            handover before your last day.
          </div>
        ) : null}

        {exitCase.handoverNotes ? (
          <div className="mb-3">
            <div className="text-muted small fw-semibold">Handover notes from HR</div>
            <div className="small" style={{ whiteSpace: "pre-wrap" }}>{exitCase.handoverNotes}</div>
          </div>
        ) : null}

        {exitCase.resignationNote ? (
          <div className="mb-3">
            <div className="text-muted small fw-semibold">Your note to HR</div>
            <div className="small" style={{ whiteSpace: "pre-wrap" }}>{exitCase.resignationNote}</div>
          </div>
        ) : null}

        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap border-top pt-3">
          <div className="small text-muted d-flex align-items-center gap-2">
            {submitted ? (
              <>
                <ShieldCheck size={15} style={{ color: "#2f8f6b" }} />
                Resignation signed on {formatDate(exitCase.resignationSubmittedAt)}
              </>
            ) : exitCase.employeeAcknowledgedAt ? (
              <>
                <ShieldCheck size={15} style={{ color: "#2f8f6b" }} />
                Acknowledged and signed on {formatDate(exitCase.employeeAcknowledgedAt)}
              </>
            ) : (
              <>
                <PenLine size={15} /> Sign to acknowledge the exit terms and checklist.
              </>
            )}
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {submitted ? (
              <button type="button" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={cancelResignation}>
                <Undo2 size={14} /> Withdraw resignation
              </button>
            ) : null}
            {!submitted && !exitCase.employeeAcknowledgedAt && ["INITIATED", "IN_PROGRESS", "READY_FOR_EXIT"].includes(exitCase.status) ? (
              <button type="button" className="btn-brand btn-sm d-inline-flex align-items-center gap-2" onClick={() => setSigning(true)}>
                <BadgeCheck size={15} /> Acknowledge exit
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <SignatureDialog
        open={signing}
        title="Acknowledge your offboarding"
        subtitle="Type your full name to confirm the exit terms, handover and final settlement record."
        confirmLabel="Sign acknowledgment"
        onCancel={() => setSigning(false)}
        onConfirm={acknowledge}
      />
    </div>
  );
}
