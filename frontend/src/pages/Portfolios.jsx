import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  FolderKanban,
  Info,
  Link2,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import PlanningScope from "../components/PlanningScope";
import { formatMoney, formatPercent, planUrl, progressTone } from "../lib/planning";

const STATUS_TONE = {
  Completed: "completed",
  "In Progress": "in-progress",
  Planning: "planning",
  "On Hold": "on-hold",
  Cancelled: "cancelled",
  "Not Started": "not-started",
};

const statusClass = (status) => STATUS_TONE[status] || String(status || "").toLowerCase().replace(/\s+/g, "-");

export default function Portfolios() {
  const { user } = useAuth();
  const canAssignPlan = ["admin", "executive", "project_manager"].includes(user?.role);
  const [data, setData] = useState(null);
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assigning, setAssigning] = useState("");

  const loadRollup = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (period) params.set("period", period);
      const query = params.toString();
      setData(await api.get(`/portfolios${query ? `?${query}` : ""}`));
    } catch (e) {
      setError(e.message || "Could not load the portfolio roll-up.");
    } finally {
      setLoading(false);
    }
  }, [type, period]);

  useEffect(() => {
    loadRollup();
  }, [loadRollup]);

  const summary = data?.summary;
  const plans = data?.plans || [];
  const portfolios = data?.portfolios || [];
  const projects = data?.projects || [];
  const unassigned = data?.unassignedProjects || [];
  const reconciliation = data?.reconciliation;

  const scopeLabel = useMemo(() => {
    if (!type && !period) return "All plans and periods";
    const typeLabel = data?.filters?.types?.find((entry) => entry.value === type)?.label || "All plan types";
    return period ? `${typeLabel} · ${period}` : typeLabel;
  }, [type, period, data]);

  const assignPlan = async (projectId, planId) => {
    setAssigning(projectId);
    setError("");
    try {
      await api.post(`/portfolios/project/${encodeURIComponent(projectId)}/plan`, { planId: planId || null });
      setNotice(planId ? "Project linked to the plan. Corporate figures were recalculated." : "Project unlinked from its plan.");
      await loadRollup();
    } catch (e) {
      setError(e.message);
    } finally {
      setAssigning("");
    }
  };

  return (
    <div className="planning-page pb-4">
      <div className="planning-head">
        <div>
          <div className="page-kicker">Planning &amp; reporting · corporate portfolios</div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            <Briefcase size={26} /> Corporate Portfolios
          </h2>
          <p className="text-muted small mb-0 planning-head__lede">
            The approved portfolio of the Roadmap, Strategic Plan and Annual Operational Plan, with budgets, delivery
            progress, objectives and funded projects.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" to="/pms/portfolio">
            <FolderKanban size={14} /> Project portfolio
          </Link>
          <Link className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" to="/goals">
            <Target size={14} /> Corporate objectives <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <PlanningScope
        filters={data?.filters}
        type={type}
        period={period}
        onChange={({ type: nextType, period: nextPeriod }) => {
          if (nextType !== undefined) setType(nextType);
          if (nextPeriod !== undefined) setPeriod(nextPeriod);
        }}
        resultLabel={
          summary
            ? `${summary.planCount} plan${summary.planCount === 1 ? "" : "s"} · ${summary.projectCount} project${summary.projectCount === 1 ? "" : "s"} · ${scopeLabel}`
            : scopeLabel
        }
      />

      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      {notice ? (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span>{notice}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} />
        </div>
      ) : null}

      <div className="planning-summary planning-summary--five">
        <SummaryCard
          label="Corporate portfolio budget"
          value={summary ? `${formatMoney(summary.totalBudget, { compact: true })} ETB` : "—"}
          icon={<Wallet size={16} />}
          tone="primary"
          hint="Approved plan budgets"
        />
        <SummaryCard
          label="PMS actual expenditure"
          value={summary ? `${formatMoney(summary.pmsActual, { compact: true })} ETB` : "—"}
          icon={<TrendingUp size={16} />}
          tone="success"
          hint="Execution against the plan"
        />
        <SummaryCard
          label="Budget-weighted progress"
          value={summary ? formatPercent(summary.avgProgress) : "—"}
          icon={<TrendingUp size={16} />}
          tone="gold"
        />
        <SummaryCard
          label="Corporate objectives"
          value={summary?.corporateGoalCount ?? "—"}
          icon={<Target size={16} />}
          tone="info"
        />
        <SummaryCard
          label="Projects in scope"
          value={summary?.projectCount ?? "—"}
          icon={<FolderKanban size={16} />}
          tone="info"
          hint={summary?.unassignedProjectCount ? `${summary.unassignedProjectCount} not linked to a plan` : undefined}
        />
      </div>

      {loading && !data ? <div className="py-5 text-center"><div className="spinner-border text-success" role="status" /></div> : null}

      <section className="planning-section">
        <div className="planning-section__head">
          <div>
            <h3>Corporate portfolio by plan</h3>
            <p>Each document in scope with its budget, delivery progress, objectives and linked projects.</p>
          </div>
          <span className="planning-count">{portfolios.length}</span>
        </div>

        <div className="app-table planning-table corporate-portfolio-table">
          <div className="table-responsive">
            <table className="table corporate-portfolio corp-plan mb-0 align-middle">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Budget (ETB)</th>
                  <th>Progress</th>
                  <th className="corporate-portfolio__col-counts">Portfolio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {portfolios.map((portfolio) => (
                  <tr key={portfolio.key}>
                    <td>
                      <div className="planning-title">
                        <span className={`plan-type-chip plan-type-chip--${portfolio.planType.toLowerCase()}`}>{portfolio.planTypeLabel}</span>
                        <strong>{portfolio.title}</strong>
                        <span className="small text-muted">{portfolio.periodLabel}</span>
                      </div>
                    </td>
                    <td><span className={`badge-status ${statusClass(portfolio.status)}`}>{portfolio.status}</span></td>
                    <td>
                      <div className="corporate-portfolio__money">
                        <span><small>Budget</small>{formatMoney(portfolio.budget)}</span>
                        <span><small>PMS actual</small>{formatMoney(portfolio.actualExpenditure)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="planning-progress">
                        <div className="progress" style={{ height: 6 }}>
                          <div className={`progress-bar ${progressTone(portfolio.progress)}`} style={{ width: `${portfolio.progress}%` }} />
                        </div>
                        <small>{formatPercent(portfolio.progress)}</small>
                      </div>
                    </td>
                    <td className="corporate-portfolio__col-counts">
                      <div className="corporate-portfolio__counts">
                        <span><strong>{portfolio.goalCount}</strong> objectives</span>
                        <span><strong>{portfolio.projectCount}</strong> projects</span>
                      </div>
                    </td>
                    <td className="text-end">
                      <Link className="btn btn-sm btn-outline-primary py-0 px-2" to={planUrl(portfolio.planId, portfolio.planType)} title="Open plan">
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && portfolios.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted py-5">No plans in this scope. Choose another plan type or period.</td></tr>
                ) : null}
              </tbody>
              {portfolios.length ? (
                <tfoot>
                  <tr>
                    <th colSpan={2}>Corporate total</th>
                    <th>
                      <div className="corporate-portfolio__money">
                        <span title={`${formatMoney(summary?.totalBudget)} ETB`}><small>Budget</small>{formatMoney(summary?.totalBudget, { compact: true })}</span>
                        <span title={`${formatMoney(summary?.pmsActual)} ETB`}><small>PMS actual</small>{formatMoney(summary?.pmsActual, { compact: true })}</span>
                      </div>
                    </th>
                    <th>{summary ? formatPercent(summary.avgProgress) : "—"}</th>
                    <th className="corporate-portfolio__col-counts">{summary?.corporateGoalCount ?? 0} objectives · {summary?.projectCount ?? 0} projects</th>
                    <th />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      </section>

      <section className="planning-section">
        <div className="planning-section__head">
          <div>
            <h3>Projects delivering this portfolio</h3>
            <p>Assign a project to the document it serves to include it in that plan type and period.</p>
          </div>
          <span className="planning-count">{projects.length}</span>
        </div>

        <div className="app-table planning-table corporate-portfolio-table">
          <div className="table-responsive">
            <table className="table corporate-portfolio corp-project mb-0 align-middle">
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="corporate-portfolio__col-detail">Plan &amp; objectives</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Budget (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.projectId}>
                    <td>
                      <div className="planning-title">
                        <strong>{project.title}</strong>
                        <span className="small text-muted">{project.projectId}</span>
                        <span className="corporate-portfolio__mobile-meta">
                          {project.planId ? `${project.planTypeLabel} · ${project.periodLabel}` : "Not linked to a plan"}
                          {project.goals.length ? ` · ${project.goals.length} objective${project.goals.length === 1 ? "" : "s"}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="corporate-portfolio__col-detail">
                      {canAssignPlan ? (
                        <select
                          className="form-select form-select-sm planning-plan-select"
                          value={project.planId || ""}
                          disabled={assigning === project.projectId}
                          onChange={(event) => assignPlan(project.projectId, event.target.value)}
                          aria-label={`Plan for ${project.title}`}
                        >
                          <option value="">Not linked to a plan</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.typeLabel} · {plan.periodLabel}
                            </option>
                          ))}
                        </select>
                      ) : project.planId ? (
                        <span className="small">{project.planTypeLabel} · {project.periodLabel}</span>
                      ) : (
                        <span className="small text-muted">Not linked</span>
                      )}
                      {project.planType ? (
                        <div className="mt-1"><span className={`plan-type-chip plan-type-chip--${project.planType.toLowerCase()}`}>{project.planTypeLabel}</span></div>
                      ) : null}
                      {project.goals.length ? (
                        <div className="corporate-portfolio__objectives">
                          {project.goals.map((goal) => (
                            <span key={goal.id} title={goal.title}>{goal.title}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="corporate-portfolio__status">
                        <span className={`badge-status ${statusClass(project.status)}`}>{project.status}</span>
                        <span className={`planning-health ${project.health === "Overdue" ? "is-overdue" : project.health === "At Risk" ? "is-risk" : "is-ok"}`}>
                          {project.health === "On Track" ? <TrendingUp size={12} /> : <AlertTriangle size={12} />} {project.health}
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
                      <div className="corporate-portfolio__money">
                        <span><small>Plan</small>{formatMoney(project.financialPlan)}</span>
                        <span><small>Actual</small>{formatMoney(project.actualExpenditure)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && projects.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted py-5">No projects in this scope. Link projects to a plan to include them here.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {unassigned.length ? (
          <div className="planning-unassigned">
            <div className="planning-unassigned__head">
              <Link2 size={15} />
              <strong>{unassigned.length} project{unassigned.length === 1 ? "" : "s"} not linked to any plan</strong>
              <span>These projects are outside the filtered corporate totals until they are assigned.</span>
            </div>
            <div className="planning-unassigned__list">
              {unassigned.slice(0, 12).map((project) => (
                <span key={project.projectId} className="planning-unassigned__chip">{project.title}</span>
              ))}
              {unassigned.length > 12 ? <span className="planning-unassigned__chip">+{unassigned.length - 12} more</span> : null}
            </div>
          </div>
        ) : null}
      </section>

      {reconciliation ? (
        <div className="planning-note">
          <Info size={15} />
          <div>
            <strong>Portfolio budget basis</strong>
            <p>{reconciliation.note}</p>
            <div className="planning-note__stats">
              <span>{reconciliation.countedItems} approved financial lines</span>
              <span>{reconciliation.skippedParentBudgets} parent budgets represented by activities</span>
              <span>{reconciliation.skippedAlignedParents} aligned objectives included with their parent</span>
              <span>Project financial plans are included in plan budgets</span>
            </div>
          </div>
        </div>
      ) : null}
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
