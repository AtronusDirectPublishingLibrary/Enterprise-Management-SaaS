import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Briefcase, TrendingUp, AlertTriangle } from "lucide-react";
import PmsTabs from "../components/PmsTabs";

export default function Portfolios() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portfolios")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-danger mt-4">Error: {error}</div>;
  if (!data) return <div className="spinner-border text-success mt-5" />;

  return (
    <div className="p-4">
      <PmsTabs />
      <div className="d-flex align-items-center gap-2 mb-4">
        <Briefcase size={28} style={{ color: "var(--brand-primary)" }} />
        <h2 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>Portfolio Management</h2>
      </div>

      {/* Executive Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3" style={{ borderLeft: "4px solid var(--brand-primary)" }}>
            <span className="text-muted small fw-bold">Total Portfolio Budget</span>
            <h3 className="fw-bold mb-0">{data.summary.totalBudget.toLocaleString()} ETB</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3" style={{ borderLeft: "4px solid #e74c3c" }}>
            <span className="text-muted small fw-bold">Total Spent</span>
            <h3 className="fw-bold mb-0 text-danger">{data.summary.totalSpent.toLocaleString()} ETB</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3" style={{ borderLeft: "4px solid #f39c12" }}>
            <span className="text-muted small fw-bold">Average Progress</span>
            <h3 className="fw-bold mb-0">{data.summary.avgProgress}%</h3>
          </div>
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="card border-0 shadow-sm">
        <div className="app-table">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Health</th>
                <th className="text-end">Budget</th>
              </tr>
            </thead>
            <tbody>
              {data.portfolios.map((p) => (
                <tr key={p.projectId}>
                  <td className="fw-semibold">{p.projectId}</td>
                  <td>{p.title}</td>
                  <td><span className={"badge-status " + p.status.toLowerCase().replace(/\s+/g, '-')}>{p.status}</span></td>
                  <td>
                    <div className="progress" style={{ height: 6, minWidth: 100 }}>
                      <div className="progress-bar progress-bar-brand" style={{ width: p.progress + "%" }} />
                    </div>
                    <small className="text-muted">{p.progress}%</small>
                  </td>
                  <td>
                    <span className={"fw-bold d-flex align-items-center gap-1 " + (p.health === "Overdue" ? "text-danger" : p.health === "At Risk" ? "text-warning" : "text-success")}>
                      {p.health === "On Track" ? <TrendingUp size={14}/> : <AlertTriangle size={14}/>} {p.health}
                    </span>
                  </td>
                  <td className="text-end">{p.totalPlan.toLocaleString()} ETB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}