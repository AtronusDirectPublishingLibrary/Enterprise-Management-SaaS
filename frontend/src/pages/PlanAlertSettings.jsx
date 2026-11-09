import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Mail, Save, Send, CalendarClock, Play, CircleAlert, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import PageHeader from "../components/PageHeader";

const SEVERITY = {
  CRITICAL: { bg: "#fee2e2", icon: CircleAlert, color: "#b91c1c" },
  WARNING: { bg: "#fef3c7", icon: AlertTriangle, color: "#b45309" },
  INFO: { bg: "#dbeafe", icon: Info, color: "#1d4ed8" },
};

const PLAN_PATH = { AOP: "/database/aop", STRATEGIC: "/database/strategic-plan", ROADMAP: "/database/roadmap" };

export default function PlanAlertSettings() {
  const [settings, setSettings] = useState(null);
  const [mail, setMail] = useState({ configured: true, hint: "" });
  const [alerts, setAlerts] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [config, alertList, reportList] = await Promise.all([
      api.get("/plans/settings/plan-alerts"),
      api.get("/plans/alerts?status=Open"),
      api.get("/plans/reports?status=Pending"),
    ]);
    setSettings(config.settings);
    setMail({ configured: config.mailConfigured, hint: config.mailHint });
    setAlerts(Array.isArray(alertList) ? alertList : []);
    setDeadlines(Array.isArray(reportList) ? reportList : []);
  }, []);

  useEffect(() => {
    load().catch((e) => setStatus(e.message));
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const result = await api.put("/plans/settings/plan-alerts", {
        ...settings,
        recipients: settings.recipients,
        paceTolerancePct: Number(settings.paceTolerancePct),
        criticalGapPct: Number(settings.criticalGapPct),
        dueSoonDays: Number(settings.dueSoonDays),
      });
      setSettings(result.settings);
      setStatus("Alert settings saved.");
    } catch (e) {
      setStatus(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setStatus("");
    try {
      await api.post("/plans/settings/plan-alerts/test", { to: testTo });
      setStatus(`Test email sent to ${testTo}.`);
    } catch (e) {
      setStatus(e.message);
    }
  };

  const runNow = async () => {
    setStatus("Running alert check…");
    try {
      const summary = await api.post("/plans/alerts/run", {});
      setStatus(
        `Checked ${summary.evaluated.plans} plan(s): ${summary.created} new, ${summary.updated} refreshed, ${summary.resolved} resolved, ${summary.emailsSent} email(s) sent.`
      );
      load();
    } catch (e) {
      setStatus(e.message);
    }
  };

  if (!settings) {
    return <div className="p-4 text-center py-5"><div className="spinner-border text-success" /></div>;
  }

  return (
    <div className="plan-alerts-page">
      <PageHeader
        icon={<BellRing size={20} />}
        kicker="Planning · assurance"
        title="Plan Alerts & Reporting"
        subtitle="Configure how the system watches plan targets and reporting deadlines. Everything here changes runtime behaviour — no code changes needed."
        actions={
          <button className="btn-brand btn-sm d-flex align-items-center" onClick={runNow}>
            <Play size={13} className="me-1" /> Run check now
          </button>
        }
      />

      {status && <div className="alert alert-info py-2 small">{status}</div>}

      <div className="row g-3">
        <div className="col-lg-5">
          <form className="card border-0 shadow-sm" onSubmit={save}>
            <div className="card-body">
              <h6 className="fw-bold mb-3">Alert thresholds</h6>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Alert when performance is below pace by (%)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  className="form-control form-control-sm"
                  value={settings.paceTolerancePct}
                  onChange={(e) => setSettings({ ...settings, paceTolerancePct: e.target.value })}
                />
                <div className="form-text">Actual vs the pro-rata target for the elapsed part of the plan period.</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Escalate to CRITICAL when the gap exceeds (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-control form-control-sm"
                  value={settings.criticalGapPct}
                  onChange={(e) => setSettings({ ...settings, criticalGapPct: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Remind before due dates (days)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-control form-control-sm"
                  value={settings.dueSoonDays}
                  onChange={(e) => setSettings({ ...settings, dueSoonDays: e.target.value })}
                />
                <div className="form-text">Applies to milestone, activity and reporting deadlines.</div>
              </div>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="alerts-email"
                  checked={settings.emailEnabled}
                  onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor="alerts-email">Send alert email</label>
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="alerts-admins"
                  checked={settings.includeAdmins}
                  onChange={(e) => setSettings({ ...settings, includeAdmins: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor="alerts-admins">Include all administrators as recipients</label>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Additional recipients</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="ceo@ebpe.et, pm@ebpe.et"
                  value={(settings.recipients || []).join(", ")}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      recipients: e.target.value.split(",").map((entry) => entry.trim()).filter(Boolean),
                    })
                  }
                />
                <div className="form-text">Owners of the plan, KPI or report are always included.</div>
              </div>
              <button className="btn-brand btn-sm w-100" disabled={saving}>
                <Save size={13} className="me-1" />{saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>

          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-2"><Mail size={15} /> Email delivery</h6>
              <div className={`small mb-2 ${mail.configured ? "text-success" : "text-warning"}`}>
                {mail.configured ? "SMTP is configured." : "Email is not configured yet."}
              </div>
              {!mail.configured && (
                <div className="small text-muted mb-2">
                  {mail.hint} Alert records are still created in-app and shown on each plan until SMTP is set.
                </div>
              )}
              <div className="input-group input-group-sm">
                <input
                  className="form-control"
                  placeholder="you@example.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <button className="btn btn-outline-secondary" onClick={sendTest} disabled={!testTo}>
                  <Send size={12} className="me-1" />Send test
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Open alerts ({alerts.length})</h6>
                <span className="small text-muted">Across all plans</span>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center text-success small py-4">
                  <CheckCircle2 size={24} className="mb-1" />
                  <div>No open alerts. All targets and deadlines are on track.</div>
                </div>
              ) : (
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {alerts.map((alert) => {
                    const style = SEVERITY[alert.severity] || SEVERITY.INFO;
                    const AlertIcon = style.icon;
                    return (
                      <div key={alert.id} className="border-bottom py-2">
                        <div className="d-flex align-items-start gap-2 plan-alert-item">
                          <span className="badge flex-shrink-0" style={{ background: style.bg, color: style.color }}>
                            <AlertIcon size={12} className="me-1" />{alert.severity}
                          </span>
                          <div className="flex-grow-1 min-w-0">
                            <div className="small fw-semibold alert-title">{alert.title}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>{alert.message}</div>
                            <div className="small mt-1">
                              <Link to={`${PLAN_PATH[alert.plan?.type] || "/database/strategic-plan"}?plan=${alert.planId}`} className="text-decoration-none">
                                {alert.plan?.title}
                              </Link>
                              <span className="text-muted"> · {alert.rule.replace(/_/g, " ").toLowerCase()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2"><CalendarClock size={15} /> Pending reporting deadlines ({deadlines.length})</h6>
              </div>
              {deadlines.length === 0 ? (
                <div className="text-muted small py-3">No pending reports.</div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 320, overflowY: "auto" }}>
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr className="small text-uppercase">
                        <th>Report</th>
                        <th>Plan</th>
                        <th>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deadlines.map((report) => {
                        const late = new Date(report.dueDate) < new Date();
                        return (
                          <tr key={report.id}>
                            <td className="small">{report.periodLabel} · {report.title}</td>
                            <td className="small text-muted">{report.plan?.periodLabel}</td>
                            <td className={`small ${late ? "text-danger fw-semibold" : ""}`}>
                              {new Date(report.dueDate).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
