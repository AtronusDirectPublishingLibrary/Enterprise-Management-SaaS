import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  LineElement, PointElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import PmsTabs from "../components/PmsTabs";
import AutoFitNumber from "../components/AutoFitNumber";
import { useTheme } from "../lib/theme";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  // Chart.js paints to a canvas and cannot resolve CSS variables, so series
  // colours are read from the active palette as real hex values.
  const { colors } = useTheme();
  const PALETTE = [colors.primary, colors.secondary, colors.accent, colors.info, colors.success, colors.warning, colors.danger];

  useEffect(() => {
    api.get("/dashboard/stats")
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!stats) return <div className="spinner-border text-success" />;

  const { kpi, statusDistribution, departmentProgress, divisionProgress,
          planActualData, milestoneTimeline, sourceOfFundsDistribution } = stats;

  const statusLabels = Object.keys(statusDistribution);
  const statusData   = Object.values(statusDistribution);
  const deptLabels   = departmentProgress.map((d) => d.department);
  const deptData     = departmentProgress.map((d) => d.avgProgress);
  const divLabels    = divisionProgress.map((d) => d.division);
  const divData      = divisionProgress.map((d) => d.avgProgress);
  const paLabels     = planActualData.map((d) => d.title.length > 20 ? d.title.slice(0, 20) + "…" : d.title);
  const paPlan       = planActualData.map((d) => d.plan);
  const paActual     = planActualData.map((d) => d.actual);
  const srcLabels    = Object.keys(sourceOfFundsDistribution);
  const srcData      = Object.values(sourceOfFundsDistribution);

  return (
    <div className="pb-4">
      <PmsTabs />
      <h2 className="page-title">PMS Dashboard</h2>

      <div className="row g-2 mb-3">
        <KPI label="Total Projects" value={kpi.totalProjects} tone="gold" />
        <KPI label="Active Projects" value={kpi.activeProjects} tone="green" />
        <KPI label="On Track" value={kpi.onTrackProjects} tone="orange" />
        <KPI label="Completion Rate" value={`${kpi.completionRate}%`} />
        <KPI label="Total Plan (ETB)" value={fmt(kpi.totalPlan)} tone="gold" />
        <KPI label="Total Actual (ETB)" value={fmt(kpi.totalActual)} tone="orange" />
        <KPI label="Variance (ETB)" value={fmt(kpi.variance)} tone={kpi.variance >= 0 ? "green" : "red"} />
        <KPI label="Over Budget" value={kpi.overBudgetProjects} tone="red" />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="chart-card h-100">
            <h6>Status Distribution</h6>
            <div style={{ height: 200 }}>
              <Doughnut data={{ labels: statusLabels, datasets: [{ data: statusData, backgroundColor: PALETTE, borderWidth: 0 }] }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 12, font: {size: 11} } } } }} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="chart-card h-100">
            <h6>Avg Progress by Department</h6>
            <div style={{ height: 200 }}>
              <Bar data={{ labels: deptLabels, datasets: [{ label: "% Complete", data: deptData, backgroundColor: PALETTE[0], borderRadius: 4 }] }}
                options={{ indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { max: 100, grid:{display:false} }, y:{grid:{display:false}} } }} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="chart-card h-100">
            <h6>Avg Progress by Division</h6>
            <div style={{ height: 200 }}>
              <Bar data={{ labels: divLabels, datasets: [{ label: "% Complete", data: divData, backgroundColor: PALETTE[1], borderRadius: 4 }] }}
                options={{ indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { max: 100, grid:{display:false} }, y:{grid:{display:false}} } }} />
            </div>
          </div>
        </div>
      </div>

      {/* NEW ROW: Financial Tracker & Timeline */}
      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="chart-card h-100">
            <h6>Global Financial Tracker (Top Projects)</h6>
            <div style={{ height: 220 }}>
              <Bar data={{ labels: paLabels, datasets: [
                { label: "Plan (ETB)", data: paPlan, backgroundColor: PALETTE[0], borderRadius: 4 },
                { label: "Actual (ETB)", data: paActual, backgroundColor: PALETTE[2], borderRadius: 4 }
              ] }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: "top", labels:{boxWidth:12, font:{size:11}} } }, scales:{ x:{grid:{display:false}}, y:{grid:{color:"#f0f0f0"}} } }} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="chart-card h-100">
            <h6>Milestone Completions (12m)</h6>
            <div style={{ height: 220 }}>
              <Line data={{ labels: milestoneTimeline.labels, datasets: [{
                label: "Completed", data: milestoneTimeline.data, borderColor: PALETTE[0], backgroundColor: `${PALETTE[0]}26`, fill: true, tension: 0.3, pointBackgroundColor: PALETTE[1]
              }] }}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid:{color:"#f0f0f0"} }, x:{grid:{display:false}} } }} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-12">
          <div className="chart-card">
            <h6>Source of Funds</h6>
            <div style={{ height: 180 }}>
              <Doughnut data={{ labels: srcLabels, datasets: [{ data: srcData, backgroundColor: PALETTE, borderWidth: 0 }] }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: "right" } } }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, tone = "" }) {
  return (
    <div className="col-md-3 col-6">
      <div className={"card-kpi " + tone} style={{ padding: "0.75rem 1rem" }}>
        <AutoFitNumber className="kpi-number" maxRem={1.4} minRem={0.76}>{value}</AutoFitNumber>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}
function fmt(n) { return Math.round(Number(n) || 0).toLocaleString(); }