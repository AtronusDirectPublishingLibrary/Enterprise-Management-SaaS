import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  ArrowUpRight,
  Briefcase,
  FolderKanban,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import PlanningScope from "../components/PlanningScope";
import { formatMoney, formatPercent, objectiveLabel, planUrl, progressTone } from "../lib/planning";

export default function Goals() {
  const [data, setData] = useState(null);
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setError(e.message || "Could not load the corporate objectives.");
    } finally {
      setLoading(false);
    }
  }, [type, period]);

  useEffect(() => {
    loadRollup();
  }, [loadRollup]);

  const summary = data?.summary;
  const filters = data?.filters;
  const corporateGoals = data?.goals || [];
  const scopeLabel = useMemo(() => {
    if (!type && !period) return "All plans and periods";
    const typeLabel = filters?.types?.find((entry) => entry.value === type)?.label || "All plan types";
    return period ? `${typeLabel} · ${period}` : typeLabel;
  }, [type, period, filters]);

  return (
    <div className="planning-page pb-4">
      <div className="planning-head">
        <div>
          <div className="page-kicker">Planning &amp; reporting · corporate objectives</div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            <Target size={26} /> Corporate Objectives
          </h2>
          <p className="text-muted small mb-0 planning-head__lede">
            Approved objectives from the Roadmap, Strategic Plan and Annual Operational Plan. Annual Objectives are
            presented with the Strategic Objectives and Roadmap Goals they support.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" to="/pms/goals">
            <Target size={14} /> Project objectives
          </Link>
          <Link className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" to="/portfolios">
            <Briefcase size={14} /> Corporate portfolios <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <PlanningScope
        filters={filters}
        type={type}
        period={period}
        onChange={({ type: nextType, period: nextPeriod }) => {
          if (nextType !== undefined) setType(nextType);
          if (nextPeriod !== undefined) setPeriod(nextPeriod);
        }}
        resultLabel={
          summary
            ? `${summary.corporateGoalCount} corporate objective${summary.corporateGoalCount === 1 ? "" : "s"} · ${scopeLabel}`
            : scopeLabel
        }
      />

      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      <div className="planning-summary">
        <SummaryCard label="Corporate objectives" value={summary?.corporateGoalCount ?? "—"} icon={<Target size={16} />} tone="primary" />
        <SummaryCard
          label="Corporate portfolio budget"
          value={summary ? `${formatMoney(summary.totalBudget, { compact: true })} ETB` : "—"}
          icon={<Briefcase size={16} />}
          tone="gold"
          hint="Approved plan budget"
        />
        <SummaryCard
          label="Budget-weighted progress"
          value={summary ? formatPercent(summary.avgProgress) : "—"}
          icon={<TrendingUp size={16} />}
          tone="success"
        />
        <SummaryCard
          label="Linked projects"
          value={summary?.projectCount ?? "—"}
          icon={<FolderKanban size={16} />}
          tone="info"
          hint={summary?.unassignedProjectCount ? `${summary.unassignedProjectCount} project(s) not linked to a plan` : undefined}
        />
      </div>

      {loading && !data ? <div className="py-5 text-center"><div className="spinner-border text-success" role="status" /></div> : null}

      <section className="planning-section">
        <div className="planning-section__head">
          <div>
            <h3>Corporate objectives</h3>
            <p>Annual Objectives, Strategic Objectives and Roadmap Goals for the selected plan and period.</p>
          </div>
          <span className="planning-count">{corporateGoals.length}</span>
        </div>

        <div className="goal-grid">
          {corporateGoals.map((goal) => (
            <article className="corporate-goal" key={goal.id}>
              <div className="corporate-goal__top">
                <span className={`plan-type-chip plan-type-chip--${goal.planType.toLowerCase()}`}>{objectiveLabel(goal.planType)}</span>
                <span className="corporate-goal__period">{goal.periodLabel}</span>
              </div>
              <h4 className="corporate-goal__title">
                {goal.code ? <span className="corporate-goal__code">{goal.code}</span> : null}
                {goal.title}
              </h4>
              {goal.description ? <p className="corporate-goal__desc">{goal.description}</p> : null}
              <div className="corporate-goal__progress">
                <div className="progress" style={{ height: 7 }}>
                  <div className={`progress-bar ${progressTone(goal.progress)}`} style={{ width: `${goal.progress}%` }} />
                </div>
                <span>{formatPercent(goal.progress)}</span>
              </div>
              <dl className="corporate-goal__metrics">
                <div>
                  <dt>Budget</dt>
                  <dd>{formatMoney(goal.budget, { compact: true })} ETB</dd>
                </div>
                <div>
                  <dt>Activities</dt>
                  <dd>{goal.activityCount}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{(goal.planType === "AOP" ? "Annual" : goal.planType === "STRATEGIC" ? "Strategic" : "Roadmap")}</dd>
                </div>
              </dl>
              <div className="corporate-goal__foot">
                <span>{goal.owner ? `Owner · ${goal.owner}` : "Owner not assigned"}</span>
                <Link to={planUrl(goal.planId, goal.planType)} className="corporate-goal__link">
                  Open plan <ArrowUpRight size={13} />
                </Link>
              </div>
              {goal.projectObjectives?.length ? (
                <div className="corporate-goal__objectives">
                  <span className="corporate-goal__objectives-label">Project objectives</span>
                  {goal.projectObjectives.map((objective) => (
                    <span className="corporate-goal__objective" key={objective.id} title={`${objective.progress}% · ${objective.status}`}>
                      {objective.title}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!loading && corporateGoals.length === 0 ? (
            <div className="planning-empty">
              <Target size={22} />
              <strong>No corporate objectives in this scope</strong>
              <span>Choose another plan type or period, or add objectives to the plan itself.</span>
            </div>
          ) : null}
        </div>
      </section>
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
