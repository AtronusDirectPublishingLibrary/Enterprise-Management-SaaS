import { useEffect, useState } from "react";
import { CalendarClock, Mail, Play, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const TYPES = [
  { value: "AOP", label: "Annual (AOP)" },
  { value: "STRATEGIC", label: "Strategic" },
  { value: "ROADMAP", label: "Roadmap" },
];

const FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
];

/**
 * Admin/executive panel for recurring consolidated-report delivery. The
 * server checks due schedules every 15 minutes and records each run.
 */
export default function ReportSchedules() {
  const { user } = useAuth();
  const canManage = ["admin", "executive"].includes(user?.role);
  const [schedules, setSchedules] = useState([]);
  const [type, setType] = useState("AOP");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [recipients, setRecipients] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () =>
    api.get("/report-schedules")
      .then((data) => setSchedules(Array.isArray(data) ? data : []))
      .catch(() => setSchedules([]));

  useEffect(() => {
    if (canManage) load();
  }, [canManage]);

  if (!canManage) return null;

  async function createSchedule(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const list = recipients
        .split(/[,;\s]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      await api.post("/report-schedules", { type, frequency, recipients: list });
      setRecipients("");
      setMessage("Schedule saved. The report will be emailed on its next run date.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function toggle(schedule) {
    setBusy(true); setError(""); setMessage("");
    try {
      await api.patch(`/report-schedules/${schedule.id}`, { enabled: !schedule.enabled });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function runNow(schedule) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api.post(`/report-schedules/${schedule.id}/run`, {});
      setMessage(
        result.mailStatus === "SENT"
          ? "Report email sent."
          : result.mailStatus === "FAILED"
            ? `Email failed: ${result.mailError || "unknown error"}`
            : "Report generated, but SMTP is not configured so no email was sent. The run is recorded."
      );
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function remove(schedule) {
    if (!window.confirm("Delete this report schedule? Past runs remain in the audit trail.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api.del(`/report-schedules/${schedule.id}`);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="home-card no-print mt-4">
      <div className="home-card-head">
        <div>
          <div className="home-eyebrow">Scheduled distribution</div>
          <h2 className="d-flex align-items-center gap-2"><CalendarClock size={20} /> Report schedules</h2>
        </div>
        <span className="badge bg-light text-dark border">{schedules.length}</span>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {message && <div className="alert alert-info py-2 small">{message}</div>}

      <form onSubmit={createSchedule} className="row g-2 align-items-end mb-3">
        <div className="col-md-3">
          <label className="form-label small fw-semibold mb-1">Report</label>
          <select className="form-select form-select-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small fw-semibold mb-1">Frequency</label>
          <select className="form-select form-select-sm" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="col-md-5">
          <label className="form-label small fw-semibold mb-1">Recipients (comma-separated email)</label>
          <input
            className="form-control form-control-sm"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="ceo@ethiobiopharma.et, planning@ethiobiopharma.et"
          />
        </div>
        <div className="col-md-2">
          <button type="submit" className="btn btn-brand btn-sm w-100" disabled={busy}>
            <Mail size={14} /> Add schedule
          </button>
        </div>
      </form>

      {schedules.length === 0 ? (
        <div className="small text-muted">
          No schedules yet. Add one above; delivery needs SMTP_HOST, MAIL_FROM and the rest of the SMTP settings in
          backend/.env.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0" style={{ fontSize: "0.82rem" }}>
            <thead>
              <tr><th>Report</th><th>Frequency</th><th>Recipients</th><th>Next run</th><th>Last run</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td><strong>{schedule.type}</strong></td>
                  <td>{schedule.frequency}</td>
                  <td>{schedule.recipients?.length ? schedule.recipients.join(", ") : <span className="text-muted">none</span>}</td>
                  <td>{schedule.enabled ? new Date(schedule.nextRunAt).toLocaleDateString("en-GB") : "paused"}</td>
                  <td>{schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString("en-GB") : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className={`badge border-0 ${schedule.enabled ? "bg-success" : "bg-secondary"}`}
                      onClick={() => toggle(schedule)}
                      disabled={busy}
                      title={schedule.enabled ? "Pause this schedule" : "Resume this schedule"}
                    >
                      {schedule.enabled ? "enabled" : "paused"}
                    </button>
                  </td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-outline-secondary btn-sm me-1" onClick={() => runNow(schedule)} disabled={busy} title="Send now">
                      <Play size={13} />
                    </button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(schedule)} disabled={busy} title="Delete schedule">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
