import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";

export default function PrintTimesheet() {
  const { id } = useParams();
  const [ts, setTs] = useState(null);

  useEffect(() => {
    api.get(`/timesheets/${id}`).then(setTs).catch(console.error);
  }, [id]);

  if (!ts) return <div className="p-5 text-center">Loading or not found...</div>;

  // Group entries by project
  const byProject = {};
  ts.entries.forEach(e => {
    const p = e.projectName || "General";
    if (!byProject[p]) byProject[p] = [];
    byProject[p].push(e);
  });

  return (
    <div className="container py-5 bg-white" style={{ maxWidth: "900px" }}>
      <Helmet><title>Timesheet - {ts.user.firstName} {ts.user.lastName}</title></Helmet>
      
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
        <div>
          <h2 className="fw-bold mb-0 text-uppercase">Monthly Timesheet</h2>
          <div className="text-muted">{new Date(0, ts.month - 1).toLocaleString('default', { month: 'long' })} {ts.year}</div>
        </div>
        <div className="text-end">
          <div className="fw-bold fs-4">Ethio-Biopharma</div>
          <div className="text-muted small">Workforce Command Center</div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-6">
          <div className="small text-muted text-uppercase fw-bold">Employee Name</div>
          <div className="fs-5 fw-bold">{ts.user.firstName} {ts.user.lastName}</div>
        </div>
        <div className="col-6 text-end">
          <div className="small text-muted text-uppercase fw-bold">Status</div>
          <div className={`fs-5 fw-bold ${ts.status === 'APPROVED' ? 'text-success' : 'text-warning'}`}>{ts.status}</div>
        </div>
      </div>

      <table className="table table-bordered align-middle">
        <thead className="table-light">
          <tr>
            <th>Project / Task</th>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const d = new Date(ts.year, ts.month - 1, day);
              if (d.getMonth() !== ts.month - 1) return null;
              return <th key={day} className="text-center small p-1">{day}</th>;
            })}
            <th className="text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byProject).map(([project, entries]) => {
            let projectTotal = 0;
            return (
              <tr key={project}>
                <td className="fw-bold">{project}</td>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const d = new Date(ts.year, ts.month - 1, day);
                  if (d.getMonth() !== ts.month - 1) return null;
                  const entry = entries.find(e => new Date(e.date).getDate() === day);
                  const mark = entry ? (entry.leaveCode || entry.hours || "") : "";
                  if (entry && Number(entry.hours)) projectTotal += Number(entry.hours);
                  return <td key={day} className="text-center small p-1">{mark}</td>;
                })}
                <td className="text-center fw-bold">{projectTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="row mt-5 pt-5">
        <div className="col-6">
          <div className="border-top border-dark w-75 pt-2">Employee Signature</div>
        </div>
        <div className="col-6 text-end">
          <div className="border-top border-dark w-75 ms-auto pt-2">Supervisor Approval</div>
        </div>
      </div>
      
      <div className="text-center mt-5 text-muted small">
        Printed on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}