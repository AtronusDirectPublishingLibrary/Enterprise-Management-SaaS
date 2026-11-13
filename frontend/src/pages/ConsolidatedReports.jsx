import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { BarChart3, Download, FileSpreadsheet, FileText, Printer, RefreshCw, Sparkles } from "lucide-react";
import ReportSchedules from "../components/ReportSchedules";
import AutoFitNumber from "../components/AutoFitNumber";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TYPE_TABS = [
  { value: "AOP", label: "Annual", hint: "Annual Operational Plan" },
  { value: "STRATEGIC", label: "Strategic", hint: "5-year Strategic Plan" },
  { value: "ROADMAP", label: "Roadmap", hint: "Long-range Roadmap" },
];

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.startsWith("on track") || value === "completed") return "status-on";
  if (value === "behind" || value === "in progress") return "status-behind";
  if (value.startsWith("at risk")) return "status-risk";
  return "status-none";
};

async function download(path, fallbackName) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    let message = `Download failed (${res.status})`;
    try { message = JSON.parse(text)?.message || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const name = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function KpiMatrix({ rows }) {
  if (!rows.length) return <p className="text-muted mb-0">No KPIs are defined for this plan.</p>;
  return (
    <div className="matrix-scroll">
      <table className="report-matrix">
        <thead>
          <tr>
            <th>Code</th><th>KPI</th><th>Owner</th><th className="num">Baseline</th><th className="num">Target</th>
            <th className="num">Latest actual</th><th>Period</th><th className="num">Progress</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.code}-${row.kpi}-${index}`}>
              <td>{row.code || "—"}</td>
              <td><strong>{row.kpi}</strong>{row.note && row.note !== "—" ? <div className="small text-muted">{row.note}</div> : null}</td>
              <td>{row.owner}</td>
              <td className="num">{row.baseline}</td>
              <td className="num">{row.target}</td>
              <td className="num">{row.actual}</td>
              <td>{row.period}</td>
              <td className="num">{row.progress == null ? "—" : `${row.progress}%`}</td>
              <td><span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryMatrix({ rows, label }) {
  if (!rows.length) return <p className="text-muted mb-0">No {label.toLowerCase()} are defined for this plan.</p>;
  return (
    <div className="matrix-scroll">
      <table className="report-matrix">
        <thead>
          <tr>
            <th>Code</th><th>{label.slice(0, -1)}</th><th>Owner</th><th>Due</th><th className="num">Budget</th>
            <th className="num">Progress</th><th>Status</th><th>Latest owner update</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.code}-${row.item}-${index}`}>
              <td>{row.code || "—"}</td>
              <td><strong>{row.item}</strong></td>
              <td>{row.owner}</td>
              <td>{row.due}</td>
              <td className="num">{row.budget}</td>
              <td className="num">{row.progress}%</td>
              <td><span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span></td>
              <td className="small">{row.latestUpdate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConsolidatedReports() {
  const [type, setType] = useState("AOP");  const [plans, setPlans] = useState([]);
  const [currentPlanIds, setCurrentPlanIds] = useState({});
  const [planId, setPlanId] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const loadPlans = () =>
    api.get("/consolidated-reports/plans")
      .then((data) => {
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setCurrentPlanIds(data.currentPlanIds || {});
      })
      .catch(() => setPlans([]));

  useEffect(() => { loadPlans(); }, []);

  useEffect(() => {
    setPlanId("");
  }, [type]);

  const typePlans = useMemo(() => plans.filter((plan) => plan.type === type), [plans, type]);

  const loadReport = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ type });
      if (planId) query.set("planId", planId);
      const data = await api.get(`/consolidated-reports?${query.toString()}`);
      setReport(data);
    } catch (e) {
      if (!silent) {
        setReport(null);
        setError(e.message || "Could not build the report.");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type, planId]);

  // Republish automatically when a new planning period becomes active while
  // the page is open. No manual switch is needed; a chosen historical plan is
  // respected until the user returns to "Latest/current".
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      loadPlans();
      if (!planId) loadReport(true);
    };
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
  }, [planId, type]);

  const downloadAs = async (format) => {
    setBusy(format);
    setError("");
    try {
      const query = new URLSearchParams({ type, format });
      if (planId) query.set("planId", planId);
      if (report?.meta?.filename) query.set("filename", report.meta.filename);
      await download(`/consolidated-reports?${query.toString()}`, `${report?.meta?.filename || "report"}.${format}`);
    } catch (e) {
      setError(e.message || "Download failed.");
    } finally { setBusy(""); }
  };

  const cover = report?.meta;
  const headline = report?.headline;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Consolidated Reports | EBPE</title></Helmet>

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3 no-print">
        <div>
          <div className="page-kicker">Planning · performance intelligence</div>
          <h2 className="page-title mb-0 d-flex align-items-center gap-2"><BarChart3 size={24} /> Consolidated reports</h2>
          <div className="gold-rule mt-2" />
          <div className="small text-muted mt-2">
            Coherent narrative and matrix reports for the annual, strategic and roadmap plans, built from targets,
            milestones, KPIs and task-owner progress updates verified by the Strategy and Planning Officer.
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-end">
          <div>
            <label className="form-label small fw-semibold mb-1">Plan period</label>
            <select className="form-select form-select-sm" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Current {TYPE_TABS.find((tab) => tab.value === type)?.hint}</option>
              {typePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} · {plan.periodLabel}{plan.isCurrent || currentPlanIds[type] === plan.id ? " · current" : ""}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-outline-primary btn-sm" onClick={loadReport} title="Rebuild">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 no-print">
        <div className="d-flex flex-wrap gap-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`btn ${type === tab.value ? "btn-primary" : "btn-light"}`}
              onClick={() => setType(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="d-flex flex-wrap gap-2 report-toolbar">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => downloadAs("doc")} disabled={!report || busy === "doc"}>
            <FileText size={15} /> {busy === "doc" ? "Preparing…" : "Editable Word"}
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => downloadAs("xls")} disabled={!report || busy === "xls"}>
            <FileSpreadsheet size={15} /> {busy === "xls" ? "Preparing…" : "Excel workbook"}
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => downloadAs("csv")} disabled={!report || busy === "csv"}>
            <FileSpreadsheet size={15} /> {busy === "csv" ? "Preparing…" : "Matrices (CSV)"}
          </button>
          <button className="btn btn-brand btn-sm" onClick={() => window.print()} disabled={!report}>
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger border-0 shadow-sm no-print">{error}</div>}

      {loading ? (
        <div className="d-flex justify-content-center py-5"><div className="spinner-border text-success" role="status" /></div>
      ) : !report ? (
        <div className="alert alert-warning border-0 shadow-sm">
          No plan is available for this report. Create the {TYPE_TABS.find((tab) => tab.value === type)?.hint} first.
        </div>
      ) : (
        <article className="report-page">
          <header className="report-cover">
            <div className="kicker">{cover.typeLabel} · consolidated performance report</div>
            <h1>{cover.title}</h1>
            <div className="meta">
              {cover.organisation.name} · {cover.periodLabel} · {cover.status}
              {cover.isCurrentPeriod ? <span className="badge bg-light text-dark ms-2">current period</span> : null}
              {" · "}Owner: {cover.owner}
            </div>
            <div className="meta">
              Generated {new Date(cover.generatedAt).toLocaleString("en-GB")} by {cover.generatedBy}
              {cover.periodState ? ` · period ${cover.periodState.toLowerCase()}` : ""}
            </div>
            <div className="meta">
              {cover.lastVerifiedAt
                ? `Data last verified ${new Date(cover.lastVerifiedAt).toLocaleString("en-GB")}`
                : "No verified progress update in this window — figures come from plan items only"}
            </div>
            <div className="report-kpis">
              <div className="report-kpi"><AutoFitNumber className="num">{headline.completion}%</AutoFitNumber><span className="label">Overall delivery</span></div>
              <div className="report-kpi"><AutoFitNumber className="num">{headline.kpis.onTrack}/{headline.kpis.total}</AutoFitNumber><span className="label">KPIs on track</span></div>
              <div className="report-kpi"><AutoFitNumber className="num">{headline.milestones.completed}/{headline.milestones.total}</AutoFitNumber><span className="label">Milestones complete</span></div>
              <div className="report-kpi"><AutoFitNumber className="num">{headline.activities.total}</AutoFitNumber><span className="label">Activities tracked</span></div>
              <div className="report-kpi"><AutoFitNumber className="num">ETB {Math.round(headline.budget).toLocaleString()}</AutoFitNumber><span className="label">Budget under delivery</span></div>
            </div>
          </header>

          <section className="report-section">
            <h2><span className="index">01</span> Executive narrative</h2>
            <p>{report.narrative.overview}</p>
            <p>{report.narrative.kpiStory}</p>
            <p>{report.narrative.milestoneStory}</p>
          </section>

          {report.ai ? (
            <section className="report-section report-ai-section">
              <h2><span className="index">02</span> AI decision brief</h2>
              <div className="report-ai-head">
                <span><Sparkles size={15} /> {report.ai.engine}</span>
                <span>{report.ai.confidence}% confidence</span>
                <span>Generated {new Date(report.ai.generatedAt).toLocaleString("en-GB")}</span>
              </div>
              <p className="report-ai-summary">{report.ai.summary}</p>
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <h3 className="h6 fw-bold">What the data says</h3>
                  <ul className="mb-0">{report.ai.findings.map((finding, index) => <li key={index}>{finding}</li>)}</ul>
                </div>
                <div className="col-md-6">
                  <h3 className="h6 fw-bold">Recommended actions</h3>
                  <ol className="mb-0">{report.ai.actions.map((action, index) => <li key={index}>{action}</li>)}</ol>
                </div>
              </div>
            </section>
          ) : null}

          <section className="report-section">
            <h2><span className="index">03</span> Achievements</h2>
            {report.narrative.achievements.length ? (
              <ul>{report.narrative.achievements.map((item, index) => <li key={index}>{item}</li>)}</ul>
            ) : <p className="mb-0 text-muted">No achievements were recorded in this window.</p>}
          </section>

          <section className="report-section">
            <h2><span className="index">04</span> Challenges and risks</h2>
            {report.narrative.challenges.length ? (
              <ul>{report.narrative.challenges.map((item, index) => <li key={index}>{item}</li>)}</ul>
            ) : <p className="mb-0 text-muted">No material challenges were recorded.</p>}
          </section>

          <section className="report-section">
            <h2><span className="index">05</span> Next steps</h2>
            {report.narrative.nextSteps.length ? (
              <ul>{report.narrative.nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ul>
            ) : <p className="mb-0 text-muted">Next steps will be set at the next reporting window.</p>}
            <p className="mt-3 mb-0"><strong>Outlook.</strong> {report.narrative.outlook}</p>
          </section>

          <section className="report-section">
            <h2><span className="index">06</span> KPI performance matrix</h2>
            <KpiMatrix rows={report.matrices.kpis} />
          </section>

          <section className="report-section">
            <h2><span className="index">07</span> Milestone matrix</h2>
            <DeliveryMatrix rows={report.matrices.milestones} label="Milestones" />
          </section>

          <section className="report-section">
            <h2><span className="index">08</span> Activity matrix</h2>
            <DeliveryMatrix rows={report.matrices.activities} label="Activities" />
          </section>

          <section className="report-section">
            <h2><span className="index">09</span> Accountability by task owner</h2>
            {report.matrices.owners.length ? (
              <div className="matrix-scroll">
                <table className="report-matrix">
                  <thead>
                    <tr><th>Owner</th><th className="num">Items</th><th className="num">Completed</th><th className="num">At risk</th><th className="num">KPIs</th><th className="num">Avg. progress</th><th className="num">Updates</th></tr>
                  </thead>
                  <tbody>
                    {report.matrices.owners.map((row) => (
                      <tr key={row.owner}>
                        <td><strong>{row.owner}</strong></td>
                        <td className="num">{row.items}</td>
                        <td className="num">{row.completed}</td>
                        <td className="num">{row.atRisk}</td>
                        <td className="num">{row.kpis}</td>
                        <td className="num">{row.averageProgress}%</td>
                        <td className="num">{row.updates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-muted mb-0">No owners are assigned.</p>}
          </section>

          <section className="report-section">
            <h2><span className="index">10</span> Task-owner progress notes</h2>
            {report.narrative.ownerNotes.length ? (
              <div className="d-flex flex-column gap-3">
                {report.narrative.ownerNotes.map((note) => (
                  <div key={note.owner} className="progress-update-card">
                    <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                      <strong>{note.owner}</strong>
                      <span className={`status-pill ${statusClass(note.status)}`}>{note.status} · {note.progress}%</span>
                    </div>
                    <p className="mb-0 small">{note.text}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted mb-0">No verified progress updates in this window.</p>}
          </section>

          {(report.reports.length > 0 || report.rollup.length > 0) && (
            <section className="report-section">
              <h2><span className="index">11</span> Reporting obligations and roll-up</h2>
              {report.rollup.length > 0 && (
                <>
                  <h3 className="h6 fw-bold">Linked child plans</h3>
                  <div className="matrix-scroll mb-3">
                    <table className="report-matrix">
                      <thead><tr><th>Plan</th><th>Type</th><th>Period</th><th className="num">Completion</th></tr></thead>
                      <tbody>
                        {report.rollup.map((child) => (
                          <tr key={child.id}><td>{child.title}</td><td>{child.type}</td><td>{child.periodLabel}</td><td className="num">{child.completion}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {report.reports.length > 0 && (
                <div className="matrix-scroll">
                  <table className="report-matrix">
                    <thead><tr><th>Report</th><th>Period</th><th>Due</th><th>Status</th></tr></thead>
                    <tbody>
                      {report.reports.map((row, index) => (
                        <tr key={index}><td>{row.title}</td><td>{row.periodLabel}</td><td>{row.dueDate}</td><td><span className="status-pill status-none">{row.status}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <footer className="report-section">
            <div className="d-flex flex-wrap justify-content-between gap-2 small text-muted">
              <span>{cover.organisation.name} · {cover.organisation.address}</span>
              <span>Consolidated from plan data and task-owner progress updates · {new Date(cover.generatedAt).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="report-signature">
              <div className="line">Prepared by — Strategy &amp; Planning</div>
              <div className="line">Approved by — Chief Executive Officer</div>
            </div>
          </footer>
        </article>
      )}

      {!loading && report && <ReportSchedules />}
    </div>
  );
}
