import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CircleDollarSign,
  Download,
  Filter,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import PmsTabs from "../components/PmsTabs";
import { useTheme } from "../lib/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const HEALTH_ORDER = ["On Track", "Watch", "At Risk", "Overdue"];

const money = (value) =>
  `ETB ${Math.round(Number(value) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const shortMoney = (value) => {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}bn`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (Math.abs(number) >= 1_000) return `${Math.round(number / 1_000)}k`;
  return String(Math.round(number));
};

async function downloadDataset(query) {
  const response = await fetch(`${API_BASE}/reporting/executive-bi/export?${query}`, { credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const name = disposition.match(/filename=\"?([^\";]+)\"?/i)?.[1] || "EB-EMS_Executive_BI.csv";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ExecutiveDashboard() {
  const { colors } = useTheme();
  const NAVY = colors.primary;
  const GOLD = colors.secondary;
  const HEALTH_COLORS = {
    "On Track": colors.success,
    Watch: colors.secondary,
    "At Risk": colors.warning,
    Overdue: colors.danger,
  };
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ department: "all", status: "all", fund: "all", manager: "all" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const queryString = useMemo(
    () =>
      new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value && value !== "all"),
      ).toString(),
    [filters],
  );

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        setData(await api.get(`/reporting/executive-bi${queryString ? `?${queryString}` : ""}`));
      } catch (e) {
        setError(e.message || "Could not load executive analytics.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryString],
  );

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));

  const exportData = async () => {
    setExporting(true);
    setError("");
    try {
      await downloadDataset(queryString);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-4">
        <PmsTabs />
        <div className="d-flex justify-content-center py-5"><div className="spinner-border text-success" role="status" /></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4">
        <PmsTabs />
        <div className="alert alert-danger mt-4"><ShieldAlert size={16} className="me-2" /> {error}</div>
      </div>
    );
  }

  if (!data) return null;
  const totals = data.totals;
  const healthData = HEALTH_ORDER.map((label) => ({
    name: label,
    value: data.projects.filter((project) => project.health === label).length,
  })).filter((row) => row.value > 0);
  const budgetData = data.dimensions.department.slice(0, 7);
  const monthlyData = data.monthly.map((row) => ({
    ...row,
    plan: Math.round(row.plan / 1_000_000),
    actual: Math.round(row.actual / 1_000_000),
  }));

  return (
    <div className="executive-bi-page">
      <Helmet><title>Executive BI | Ethio-Biopharma</title></Helmet>
      <PmsTabs />

      <div className="executive-bi-hero">
        <div>
          <div className="executive-bi-kicker">PMS · executive intelligence</div>
          <h1>Portfolio command centre</h1>
          <p>
            A live, cross-filtered view of delivery, money and risk across the project portfolio. The
            AI decision brief reads the same filtered data as every chart on this page.
          </p>
          <div className="executive-bi-hero-meta">
            <span><Gauge size={14} /> {totals.projects} projects in scope</span>
            <span><CircleDollarSign size={14} /> {money(totals.plan)} approved plan</span>
            <span><BrainCircuit size={14} /> {data.ai.engine}</span>
          </div>
        </div>
        <div className="executive-bi-hero-actions">
          <button type="button" className="btn btn-ghost" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="btn btn-gold" onClick={exportData} disabled={exporting}>
            <Download size={15} /> {exporting ? "Preparing…" : "Power BI dataset"}
          </button>
        </div>
      </div>

      <div className="executive-bi-filters">
        <span className="executive-bi-filter-label"><Filter size={14} /> Slice portfolio</span>
        <FilterSelect label="Department" value={filters.department} options={data.options.departments} onChange={(value) => setFilter("department", value)} />
        <FilterSelect label="Status" value={filters.status} options={data.options.statuses} onChange={(value) => setFilter("status", value)} />
        <FilterSelect label="Fund" value={filters.fund} options={data.options.funds} onChange={(value) => setFilter("fund", value)} />
        <FilterSelect label="Manager" value={filters.manager} options={data.options.managers} onChange={(value) => setFilter("manager", value)} />
        {queryString ? <button type="button" className="executive-bi-clear" onClick={() => setFilters({ department: "all", status: "all", fund: "all", manager: "all" })}>Clear filters</button> : null}
      </div>

      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      <div className="executive-bi-kpis">
        <Metric label="Overall delivery" value={`${totals.averageProgress}%`} hint={`${totals.complete} completed · ${totals.active} active`} icon={Target} />
        <Metric label="Budget under delivery" value={money(totals.plan)} hint={`${money(totals.actual)} actual`} icon={CircleDollarSign} tone="gold" />
        <Metric label="Budget variance" value={money(totals.variance)} hint={totals.utilization == null ? "No financial plan" : `${totals.utilization}% utilised`} icon={TrendingUp} tone={totals.variance < 0 ? "danger" : "good"} />
        <Metric label="At risk" value={totals.atRisk} hint={`${totals.overdue} overdue`} icon={AlertTriangle} tone={totals.overdue ? "danger" : totals.atRisk ? "warn" : "good"} />
      </div>

      <div className="executive-bi-grid">
        <section className="executive-bi-panel executive-bi-ai-panel">
          <div className="executive-bi-ai-head">
            <div className="executive-bi-ai-mark"><Sparkles size={19} /></div>
            <div>
              <div className="executive-bi-kicker">AI decision brief</div>
              <h2>What the portfolio is telling you</h2>
            </div>
            <span className="executive-bi-confidence">{data.ai.confidence}% confidence</span>
          </div>
          <p className="executive-bi-ai-summary">{data.ai.summary}</p>
          <div className="executive-bi-ai-columns">
            <div>
              <h3>Signals</h3>
              <ul>{data.ai.findings.map((finding, index) => <li key={index}>{finding}</li>)}</ul>
            </div>
            <div>
              <h3>Next actions</h3>
              <ul className="executive-bi-actions">{data.ai.actions.map((action, index) => <li key={index}>{action}</li>)}</ul>
            </div>
          </div>
          <div className="executive-bi-ai-foot">
            <span>{data.ai.engine}</span>
            <span>Generated {new Date(data.ai.generatedAt).toLocaleString("en-GB")}</span>
            <span>{data.ai.dataQuality?.join(" · ")}</span>
          </div>
        </section>

        <section className="executive-bi-panel">
          <PanelTitle title="Portfolio health" subtitle="Schedule-adjusted project health" icon={ShieldAlert} />
          <div className="executive-bi-chart">
            {healthData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={healthData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                    {healthData.map((entry) => <Cell key={entry.name} fill={HEALTH_COLORS[entry.name]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState label="No projects match these filters." />}
          </div>
        </section>

        <section className="executive-bi-panel executive-bi-panel--wide">
          <PanelTitle title="Delivery and spend" subtitle="Plan vs actual by activity due month (ETB millions)" icon={BarChart3} />
          <div className="executive-bi-chart executive-bi-chart--tall">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="planFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={NAVY} stopOpacity={0.3} /><stop offset="100%" stopColor={NAVY} stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.34} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e4d8" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value, name) => [`ETB ${Number(value).toLocaleString()}m`, name === "plan" ? "Plan" : "Actual"]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="plan" name="Plan" stroke={NAVY} fill="url(#planFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke={GOLD} fill="url(#actualFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="executive-bi-panel">
          <PanelTitle title="Department performance" subtitle="Average delivery · project count" icon={Users} />
          <div className="executive-bi-chart">
            {budgetData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ece7dc" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={112} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value}%`, "Average delivery"]} />
                  <Bar dataKey="progress" fill={NAVY} radius={[0, 5, 5, 0]} barSize={13} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState label="No department data in this slice." />}
          </div>
        </section>
      </div>

      <div className="executive-bi-lower">
        <section className="executive-bi-panel">
          <PanelTitle title="Projects needing attention" subtitle="Ranked by health, then plan value" icon={AlertTriangle} />
          <div className="table-responsive">
            <table className="table executive-bi-table align-middle mb-0">
              <thead><tr><th>Project</th><th>Health</th><th className="num">Progress</th><th className="num">Plan</th><th className="num">Variance</th><th>Due</th></tr></thead>
              <tbody>
                {data.projects.filter((project) => project.health !== "On Track").slice(0, 8).map((project) => (
                  <tr key={project.projectId}>
                    <td><div className="fw-semibold small">{project.title}</div><div className="small text-muted">{project.department} · {project.manager}</div></td>
                    <td><span className={`executive-bi-health health-${project.health.replace(/\s+/g, "-").toLowerCase()}`}>{project.health}</span></td>
                    <td className="num">{project.progress}%</td>
                    <td className="num">{money(project.plan)}</td>
                    <td className={`num ${project.variance < 0 ? "text-danger" : "text-success"}`}>{money(project.variance)}</td>
                    <td className="small">{new Date(project.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  </tr>
                ))}
                {data.projects.filter((project) => project.health !== "On Track").length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted py-4">Every project in this slice is on track.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="executive-bi-panel">
          <PanelTitle title="Portfolio watchlist" subtitle="Live risk signals across the filtered portfolio" icon={AlertTriangle} />
          <div className="executive-bi-watchlist">
            {[...data.risks.overdue.map((row) => ({ ...row, kind: "Overdue" })), ...data.risks.overBudget.map((row) => ({ ...row, kind: "Over budget" })), ...data.risks.dueSoon.map((row) => ({ ...row, kind: "Due soon" }))]
              .sort((a, b) => (a.kind === "Overdue" ? -1 : b.kind === "Overdue" ? 1 : b.plan - a.plan))
              .slice(0, 9)
              .map((row, index) => (
                <div className="executive-bi-watch" key={`${row.projectId}-${row.kind}-${index}`}>
                  <span className={`executive-bi-watch-dot ${row.kind === "Overdue" ? "is-danger" : row.kind === "Over budget" ? "is-warn" : "is-info"}`} />
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold small text-truncate">{row.title}</div>
                    <div className="small text-muted">{row.kind} · {row.daysToDue < 0 ? `${Math.abs(row.daysToDue)} days late` : `${row.daysToDue} days to due`}{row.utilization != null ? ` · ${row.utilization}% utilised` : ""}</div>
                  </div>
                  <span className="executive-bi-watch-value">{shortMoney(row.plan)}</span>
                </div>
              ))}
            {!data.risks.overdue.length && !data.risks.overBudget.length && !data.risks.dueSoon.length ? <EmptyState label="No active watchlist signals." /> : null}
          </div>
        </section>
      </div>

      <div className="executive-bi-footnote">
        <span><Sparkles size={13} /> AI narrative is decision support, not an audit opinion. Validate against source records before acting.</span>
        <span><Download size={13} /> The Power BI dataset is a filtered, flat CSV ready for import or scheduled refresh.</span>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="executive-bi-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value, hint, icon: Icon, tone = "" }) {
  return (
    <div className={`executive-bi-kpi ${tone ? `is-${tone}` : ""}`}>
      <div className="executive-bi-kpi-icon"><Icon size={17} /></div>
      <div><div className="executive-bi-kpi-label">{label}</div><div className="executive-bi-kpi-value">{value}</div><div className="executive-bi-kpi-hint">{hint}</div></div>
    </div>
  );
}

function PanelTitle({ title, subtitle, icon: Icon }) {
  return (
    <div className="executive-bi-panel-head">
      <div><h2><Icon size={16} /> {title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
    </div>
  );
}

function EmptyState({ label }) {
  return <div className="executive-bi-empty"><BarChart3 size={24} /><span>{label}</span></div>;
}
