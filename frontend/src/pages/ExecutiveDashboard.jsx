import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ShieldAlert, Activity, Users } from "lucide-react";

const COLORS = ["#0B2545", "#D4AF37", "#f39c12", "#e74c3c", "#3498db"];

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/reporting/executive")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-danger mt-4">Access Denied or Error: {error}</div>;
  if (!data) return <div className="spinner-border text-success mt-5" />;

  const statusData = Object.entries(data.statusCounts).map(([name, value]) => ({ name, value }));
  const workloadData = data.workload;

  return (
    <div className="p-4" style={{ background: "var(--brand-bg)", minHeight: "100vh" }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <ShieldAlert size={28} style={{ color: "var(--brand-primary)" }} />
        <h2 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>Executive Dashboard</h2>
      </div>

      <div className="row g-4">
        {/* Status Breakdown */}
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm p-3 h-100">
            <h6 className="fw-bold text-muted mb-3 d-flex align-items-center gap-2"><Activity size={16} /> Project Status Distribution</h6>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Workload Distribution */}
        <div className="col-md-6 col-lg-8">
          <div className="card border-0 shadow-sm p-3 h-100">
            <h6 className="fw-bold text-muted mb-3 d-flex align-items-center gap-2"><Users size={16} /> Team Workload (Assigned Tasks)</h6>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#f39c12" />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="#0B2545" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Project Health Table */}
        <div className="col-12 mt-4">
          <div className="card border-0 shadow-sm p-3">
            <h6 className="fw-bold text-muted mb-3">Portfolio Health</h6>
            <div className="app-table">
              <table className="table mb-0">
                <thead>
                  <tr><th>Project</th><th>Status</th><th>Progress</th><th>Health</th></tr>
                </thead>
                <tbody>
                  {data.projectHealth.map(p => (
                    <tr key={p.projectId}>
                      <td className="fw-semibold">{p.title}</td>
                      <td><span className={`badge-status ${p.status.toLowerCase().replace(/\s+/g, '-')}`}>{p.status}</span></td>
                      <td>{p.progress}%</td>
                      <td>
                        <span className={"fw-bold " + (p.health === "Overdue" ? "text-danger" : p.health === "At Risk" ? "text-warning" : "text-success")}>
                          {p.health}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}