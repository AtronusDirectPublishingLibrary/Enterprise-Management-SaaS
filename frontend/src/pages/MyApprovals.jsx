import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Check, X, Calendar, Clock, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import SignatureDialog from "../components/SignatureDialog";

export default function MyApprovals() {
  const [data, setData] = useState({ leaves: [], plans: [] });
  const [timesheets, setTimesheets] = useState([]);
  const [signing, setSigning] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = () => {
    api.get("/approvals").then(setData).catch(console.error);
    api.get("/timesheets/pending").then(setTimesheets).catch(console.error);
  };
  useEffect(() => { loadData(); }, []);

  const requestSignature = (kind, item, status) => {
    let reason = null;
    if (status === "REJECTED") {
      reason = window.prompt("Reason for rejection:");
      if (!reason || !reason.trim()) return;
    }
    setSigning({ kind, item, status, reason: reason?.trim() || null });
  };

  const confirmSignature = async (signedName) => {
    if (!signing) return;
    setBusy(true);
    try {
      if (signing.kind === "leave") {
        await api.put(`/hr/leave/${signing.item.id}`, {
          status: signing.status,
          rejectionReason: signing.reason,
          signedName,
        });
      } else if (signing.kind === "plan") {
        await api.put(`/annual-plans/${signing.item.id}/action`, {
          status: signing.status,
          rejectionReason: signing.reason,
          signedName,
        });
      } else if (signing.kind === "timesheet") {
        await api.put(`/timesheets/${signing.item.id}/action`, {
          status: signing.status,
          rejectionReason: signing.reason,
          signedName,
        });
      }
      setSigning(null);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to record the signed decision");
    } finally {
      setBusy(false);
    }
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
                          <button className="btn btn-sm btn-success d-inline-flex align-items-center gap-1" onClick={() => requestSignature("leave", l, "APPROVED")} title="Approve and sign"><PenLine size={13} /> Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => requestSignature("leave", l, "REJECTED")} title="Reject and sign"><X size={14} /></button>
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
                          <button className="btn btn-sm btn-success d-inline-flex align-items-center gap-1" onClick={() => requestSignature("plan", p, "APPROVED")}><PenLine size={13} /> Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => requestSignature("plan", p, "REJECTED")}>Reject</button>
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
                          <button className="btn btn-sm btn-success d-inline-flex align-items-center gap-1" onClick={() => requestSignature("timesheet", t, "APPROVED")}><PenLine size={13} /> Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => requestSignature("timesheet", t, "REJECTED")}>Reject</button>
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

      <SignatureDialog
        open={Boolean(signing)}
        title={signing?.status === "APPROVED" ? "Sign approval" : "Sign rejection"}
        subtitle={
          signing?.kind === "leave"
            ? `Leave request from ${signing?.item?.user?.firstName || ""} ${signing?.item?.user?.lastName || ""}`
            : signing?.kind === "plan"
              ? `Annual leave plan from ${signing?.item?.user?.firstName || ""} ${signing?.item?.user?.lastName || ""}`
              : `Timesheet ${signing?.item?.month || ""}/${signing?.item?.year || ""} from ${signing?.item?.user?.firstName || ""} ${signing?.item?.user?.lastName || ""}`
        }
        confirmLabel={signing?.status === "APPROVED" ? "Sign approval" : "Sign rejection"}
        busy={busy}
        onCancel={() => setSigning(null)}
        onConfirm={confirmSignature}
      />
    </div>
  );
}