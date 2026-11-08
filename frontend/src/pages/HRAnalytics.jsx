import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Users, AlertTriangle, TrendingUp } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function HRAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/hr-analytics").then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="p-5 text-center">Loading analytics...</div>;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Executive HR | EBPE</title></Helmet>
      <h2 className="h3 fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>Executive HR Dashboard</h2>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase small fw-bold opacity-75">Total Headcount</h6>
                  <h2 className="display-5 fw-bold mb-0">{data.headcount}</h2>
                </div>
                <Users size={48} className="opacity-25" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 bg-danger text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase small fw-bold opacity-75">Expired Certifications</h6>
                  <h2 className="display-5 fw-bold mb-0">{data.expiredTrainings}</h2>
                </div>
                <AlertTriangle size={48} className="opacity-25" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-4">Hiring Trend (Last 12 Months)</h5>
              <div style={{ height: "300px" }}>
                <Bar 
                  data={{ labels: data.chart.labels, datasets: [{ label: 'New Hires', data: data.chart.data, backgroundColor: '#0B2545', borderRadius: 4 }] }} 
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-4">Headcount by Department</h5>
              <ul className="list-group list-group-flush">
                {Object.entries(data.byDept).map(([dept, count]) => (
                  <li key={dept} className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <span>{dept}</span>
                    <span className="badge bg-secondary rounded-pill">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}