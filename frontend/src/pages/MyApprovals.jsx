import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Check, X, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyApprovals() {
  const [data, setData] = useState({ leaves: [], plans: [] });
  const [timesheets, setTimesheets] = useState([]);

  const loadData = () => {
    api.get("/approvals").then(setData).catch(console.error);
    api.get("/timesheets/pending").then(setTimesheets).catch(console.error);
  };
  useEffect(() => { loadData(); }, []);

  const handleLeave = async (id, status) => {
    let reason = null;
    if (status === "REJECTED") reason = window.prompt("Rejection reason:");
    if (status === "REJECTED" && !reason) return;
    try {
      await api.put(`/hr/leave/${id}`, { status, rejectionReason: reason });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handlePlan = async (id, status) => {
    try {
      await api.put(`/annual-plans/${id}/action`, { status });
      loadData();
    } catch (err) { alert("Failed"); }
  };

  const handleTimesheetAction = async (id, status) => {
    let reason = null;
    if (status === "REJECTED") reason = window.prompt("Reason for rejection:");
    if (status === "REJECTED" && !reason) return;
    try {
      await api.put(`/timesheets/${id}/action`, { status, rejectionReason: reason });
      loadData();
    } catch (err) { alert("Failed"); }
  };

  return (
    <div className="container-fluid py-4">
      <Helmet><title>My Approvals | EBPE</title></Helmet>
      <h2 className="h4 fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>My Approvals</h2>

      <div className="row g-4">

        {/* Pending Leave Requests */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-bold py-3">
              <Calendar size={18} className="me-2" /> Pending Leave Requests
            </div>
            <div className="card-body p-0">
              {data.leaves.length === 0 ? (
                <div className="p-4 text-muted text-center">No pending requests</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {data.leaves.map(l => (
                    <li key={l.id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">{l.user.firstName} {l.user.lastName}</div>
                          <div className="small text-muted">
                            {l.type} • {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-success" onClick={() => handleLeave(l.id, "APPROVED")} title="Approve"><Check size={14} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleLeave(l.id, "REJECTED")} title="Reject"><X size={14} /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Pending Annual Plans */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-bold py-3">
              <Calendar size={18} className="me-2" /> Pending Annual Plans
            </div>
            <div className="card-body p-0">
              {data.plans.length === 0 ? (
                <div className="p-4 text-muted text-center">No pending plans</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {data.plans.map(p => (
                    <li key={p.id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold">{p.user.firstName} {p.user.lastName}</div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-success" onClick={() => handlePlan(p.id, "APPROVED")}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePlan(p.id, "REJECTED")}>Reject</button>
                        </div>
                      </div>
                      <div className="small text-muted">{p.items.length} planned periods</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Pending Timesheets - now a top-level sibling */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-bold py-3">
              <Clock size={18} className="me-2" /> Pending Timesheets
            </div>
            <div className="card-body p-0">
              {timesheets.length === 0 ? (
                <div className="p-4 text-muted text-center">No pending timesheets</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {timesheets.map(t => (
                    <li key={t.id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold">{t.user.firstName} {t.user.lastName} ({t.month}/{t.year})</div>
                        <div className="d-flex gap-2">
                          <Link to={`/print-timesheet/${t.id}`} className="btn btn-sm btn-outline-secondary">View</Link>
                          <button className="btn btn-sm btn-success" onClick={() => handleTimesheetAction(t.id, "APPROVED")}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleTimesheetAction(t.id, "REJECTED")}>Reject</button>
                        </div>
                      </div>
                      <div className="small text-muted">{(t.entries || []).length} days logged</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}