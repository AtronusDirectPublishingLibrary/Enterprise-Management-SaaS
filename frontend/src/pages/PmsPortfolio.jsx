import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { AlertTriangle, ArrowUpRight, Briefcase, CheckCircle2, FolderKanban, TrendingUp } from "lucide-react";
import PmsTabs from "../components/PmsTabs";
import { formatMoney, formatPercent, progressTone } from "../lib/planning";

const statusClass = (status) => String(status || "").toLowerCase().replace(/\s+/g, "-");

/**
 * PMS delivery portfolio: the projects themselves, their financial plans and
 * actual expenditure. This is deliberately separate from the corporate
 * portfolio, whose budget is the plan financial ledger.
 */
export default function PmsPortfolio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.get("/portfolios"));
    } catch (e) {
      setError(e.message || "Could not load the project portfolio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projects = data?.projects || [];
  const summary = useMemo(() => {
    const total = projects.length;
    const financialPlan = projects.reduce((sum, project) => sum + project.financialPlan, 0);
    const actual = projects.reduce((sum, project) => sum + project.actualExpenditure, 0);
    const avgProgress = total ? projects.reduce((sum, project) => sum + project.progress, 0) / total : 0;
    return {
      total,
      financialPlan,
      actual,
      avgProgress,
      atRisk: projects.filter((project) => project.health !== "On Track").length,
      aligned: projects.filter((project) => project.planId).length,
    };
  }, [projects]);

  return (
    <div className="planning-page pb-4">
      <PmsTabs />
      <div className="planning-head">
        <div>
          <div className="page-kicker">PMS · projects and programmes</div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            <Briefcase size={26} /> Project Portfolio
          </h2>
          <p className="text-muted small mb-0 planning-head__lede">
            Projects in the PMS portfolio, with their financial plans, actual expenditure and delivery status.
          </p>
        </div>
        <Link className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" to="/portfolios">
          Corporate portfolios <ArrowUpRight size={13} />
        </Link>
      </div>

      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}

      <div className="planning-summary">
        <SummaryCard label="Projects" value={summary.total} icon={<FolderKanban size={16} />} tone="primary" hint={`${summary.aligned} linked to a plan`} />
        <SummaryCard label="PMS financial plan" value={`${formatMoney(summary.financialPlan, { compact: true })} ETB`} icon={<Briefcase size={16} />} tone="gold" hint="Included in approved plan budgets" />
        <SummaryCard label="Actual expenditure" value={`${formatMoney(summary.actual, { compact: true })} ETB`} icon={<TrendingUp size={16} />} tone="success" />
        <SummaryCard label="Average progress" value={formatPercent(summary.avgProgress)} icon={<TrendingUp size={16} />} tone="info" />
        <SummaryCard label="Off track" value={summary.atRisk} icon={<AlertTriangle size={16} />} tone="info" hint="At risk or overdue" />
      </div>

      {loading && !data ? <div className="py-5 text-center"><div className="spinner-border text-success" role="status" /></div> : null}

      <div className="app-table planning-table pms-portfolio-table">
        <div className="table-responsive">
          <table className="table pms-portfolio mb-0 align-middle">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Budget (ETB)</th>
                <th className="pms-portfolio__col-alignment">Plan alignment &amp; objectives</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.projectId}>
                  <td>
                    <div className="planning-title">
                      <strong>{project.title}</strong>
                      <span className="small text-muted">{project.projectId}</span>
                      <span className="pms-portfolio__mobile-meta">
                        {project.planId ? `${project.planTypeLabel} · ${project.periodLabel}` : "Not linked to a plan"}
                        {project.goals.length ? ` · ${project.goals.length} objective${project.goals.length === 1 ? "" : "s"}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="pms-portfolio__status">
                      <span className={`badge-status ${statusClass(project.status)}`}>{project.status}</span>
                      <span className={`planning-health ${project.health === "Overdue" ? "is-overdue" : project.health === "At Risk" ? "is-risk" : "is-ok"}`}>
                        {project.health === "On Track" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {project.health}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="planning-progress">
                      <div className="progress" style={{ height: 6 }}>
                        <div className={`progress-bar ${progressTone(project.progress)}`} style={{ width: `${project.progress}%` }} />
                      </div>
                      <small>{formatPercent(project.progress)}</small>
                    </div>
                  </td>
                  <td>
                    <div className="pms-portfolio__money">
                      <span><small>Plan</small>{formatMoney(project.financialPlan)}</span>
                      <span><small>Actual</small>{formatMoney(project.actualExpenditure)}</span>
                    </div>
                  </td>
                  <td className="small pms-portfolio__col-alignment">
                    <div className="pms-portfolio__alignment">
                      <span className="pms-portfolio__plan">
                        {project.planId ? `${project.planTypeLabel} · ${project.periodLabel}` : "Not linked to a plan"}
                      </span>
                      {project.goals.length ? (
                        <div className="pms-portfolio__objectives">
                          {project.goals.map((goal) => (
                            <span key={goal.id} title={goal.title}>{goal.title}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && projects.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted py-5">No projects yet.</td></tr>
              ) : null}
            </tbody>
            {projects.length ? (
              <tfoot>
                <tr>
                  <th colSpan={3}>Project portfolio total</th>
                  <th>
                    <div className="pms-portfolio__money">
                      <span title={`${formatMoney(summary.financialPlan)} ETB`}><small>Plan</small>{formatMoney(summary.financialPlan, { compact: true })}</span>
                      <span title={`${formatMoney(summary.actual)} ETB`}><small>Actual</small>{formatMoney(summary.actual, { compact: true })}</span>
                    </div>
                  </th>
                  <th className="pms-portfolio__col-alignment">{summary.aligned} of {summary.total} linked to a plan</th>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <div className="planning-note mt-3">
        <Briefcase size={15} />
        <div>
          <strong>Budget alignment</strong>
          <p>
            Project financial plans are included in the Annual Operational Plan and Strategic Plan. Actual project
            expenditure is reported against those approved budgets.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone = "primary", hint }) {
  return (
    <div className={`planning-summary__card planning-summary__card--${tone}`}>
      <span className="planning-summary__icon">{icon}</span>
      <div>
        <span className="planning-summary__label">{label}</span>
        <strong className="planning-summary__value">{value}</strong>
        {hint ? <span className="planning-summary__hint">{hint}</span> : null}
      </div>
    </div>
  );
}
