import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  FileSignature,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import SignatureDialog from "./SignatureDialog";

const EMPTY = {
  positionTitle: "",
  department: "",
  employmentType: "FULL_TIME",
  positions: 1,
  reason: "NEW",
  grade: "",
  budgetStatus: "BUDGETED",
  targetStartDate: "",
  justification: "",
  requirements: "",
};

const STATUS_LABEL = {
  DRAFT: "Draft",
  SUBMITTED: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FULFILLED: "Vacancy created",
};

const statusClass = (status) => {
  if (status === "APPROVED") return "hrx-chip--good";
  if (status === "SUBMITTED") return "hrx-chip--warn";
  if (status === "REJECTED") return "hrx-chip--bad";
  if (status === "DRAFT") return "hrx-chip--muted";
  return "hrx-chip--info";
};

const date = (value) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");

export default function RecruitmentRequestsPanel({ onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signing, setSigning] = useState(null);

  const load = useCallback(async () => {
    try {
      setRequests(await api.get("/recruitment/requests"));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/recruitment/requests", {
        ...form,
        positions: Number(form.positions) || 1,
        targetStartDate: form.targetStartDate || null,
        grade: form.grade || null,
        justification: form.justification || null,
        requirements: form.requirements || null,
      });
      setForm(EMPTY);
      setShowForm(false);
      await load();
      onChanged?.();
      flash("Requisition saved as a draft. Open it to sign and submit.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (request) => {
    if (!window.confirm(`Delete requisition ${request.requestNumber}?`)) return;
    try {
      await api.del(`/recruitment/requests/${request.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const sign = async (signedName) => {
    if (!signing) return;
    setBusy(true);
    setError("");
    try {
      if (signing.action === "submit") {
        await api.post(`/recruitment/requests/${signing.request.id}/submit`, { signedName });
        flash(`Requisition ${signing.request.requestNumber} signed and sent for approval.`);
      } else {
        await api.post(`/recruitment/requests/${signing.request.id}/decision`, {
          decision: signing.decision,
          signedName,
          rejectionReason: signing.reason || undefined,
          createVacancy: signing.decision === "APPROVED",
        });
        flash(
          signing.decision === "APPROVED"
            ? "Requisition approved — a draft vacancy was created for recruitment."
            : "Requisition rejected and the requester can revise it."
        );
      }
      setSigning(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startReject = (request) => {
    const reason = window.prompt("Reason for rejecting this requisition:");
    if (!reason || !reason.trim()) return;
    setSigning({ action: "decision", decision: "REJECTED", request, reason: reason.trim() });
  };

  if (loading) return <div className="p-4 text-muted">Loading requisitions…</div>;

  return (
    <div>
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      {notice ? <div className="alert alert-success py-2">{notice}</div> : null}

      <div className="hrx-card mb-4">
        <div className="hrx-card-head">
          <div>
            <h2 className="d-flex align-items-center gap-2"><FileSignature size={16} /> Recruitment requests</h2>
            <div className="small text-muted">Department requisition → signed HR approval → draft vacancy.</div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Close form" : "New request"}
          </button>
        </div>

        {showForm ? (
          <form className="hrx-card-body hrx-form" onSubmit={create}>
            <div className="row g-3">
              <div className="col-md-5">
                <label className="form-label">Position title</label>
                <input className="form-control" required value={form.positionTitle} onChange={(e) => setForm({ ...form, positionTitle: e.target.value })} placeholder="e.g., Quality Control Analyst" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Department</label>
                <input className="form-control" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Positions</label>
                <input type="number" min="1" max="99" className="form-control" value={form.positions} onChange={(e) => setForm({ ...form, positions: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Employment type</label>
                <select className="form-select" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                  <option value="FULL_TIME">Full time</option>
                  <option value="PART_TIME">Part time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Reason</label>
                <select className="form-select" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                  <option value="NEW">New position</option>
                  <option value="REPLACEMENT">Replacement</option>
                  <option value="TEMPORARY">Temporary cover</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Grade</label>
                <input className="form-control" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Optional" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Budget status</label>
                <select className="form-select" value={form.budgetStatus} onChange={(e) => setForm({ ...form, budgetStatus: e.target.value })}>
                  <option value="BUDGETED">Budgeted</option>
                  <option value="APPROVED">Budget approved</option>
                  <option value="UNBUDGETED">Unbudgeted</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Target start date</label>
                <input type="date" className="form-control" value={form.targetStartDate} onChange={(e) => setForm({ ...form, targetStartDate: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label">Justification</label>
                <textarea className="form-control" rows={3} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} placeholder="Why is this role needed now? Link it to workload, projects or the annual plan." />
              </div>
              <div className="col-12">
                <label className="form-label">Key requirements</label>
                <textarea className="form-control" rows={3} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Qualifications, experience, licences…" />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-sm btn-brand" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button>
            </div>
            <div className="form-text mt-2">The request is saved as a draft. Sign it from the list to send it to HR approval.</div>
          </form>
        ) : null}
      </div>

      <div className="hrx-card">
        <div className="hrx-card-head">
          <h2 className="d-flex align-items-center gap-2"><Briefcase size={16} /> Requisition register</h2>
          <button type="button" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Request</th>
                <th className="d-none d-md-table-cell">Requester</th>
                <th className="text-center">Positions</th>
                <th>Status</th>
                <th className="d-none d-lg-table-cell">Target start</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted py-4 small">No recruitment requests yet. Raise one to start a signed, auditable hiring process.</td></tr>
              ) : requests.map((request) => {
                const submitSignature = request.signatures?.find((signature) => signature.decision === "SUBMITTED");
                const decisionSignature = request.signatures?.find((signature) => ["APPROVED", "REJECTED"].includes(signature.decision));
                return (
                  <tr key={request.id}>
                    <td>
                      <div className="fw-semibold small">{request.positionTitle}</div>
                      <div className="text-muted" style={{ fontSize: "0.73rem" }}>
                        {request.requestNumber} · {request.department} · {request.employmentType.replaceAll("_", " ").toLowerCase()}
                      </div>
                      {request.jobPosting ? (
                        <div className="small text-success mt-1">Vacancy: {request.jobPosting.title} ({request.jobPosting.status})</div>
                      ) : null}
                    </td>
                    <td className="small d-none d-md-table-cell">
                      {[request.requestedBy?.firstName, request.requestedBy?.lastName].filter(Boolean).join(" ") || request.requestedBy?.username}
                      <div className="text-muted" style={{ fontSize: "0.73rem" }}>{request.requestedBy?.department || request.department}</div>
                    </td>
                    <td className="text-center small">{request.positions}</td>
                    <td>
                      <span className={`hrx-chip ${statusClass(request.status)}`}>{STATUS_LABEL[request.status] || request.status}</span>
                      {request.rejectionReason ? <div className="small text-danger mt-1">{request.rejectionReason}</div> : null}
                      {submitSignature ? (
                        <div className="small text-muted mt-1 d-flex align-items-center gap-1">
                          <FileSignature size={12} /> Signed by {submitSignature.signedName}
                        </div>
                      ) : null}
                      {decisionSignature ? (
                        <div className="small text-muted mt-1 d-flex align-items-center gap-1">
                          <BadgeCheck size={12} /> {decisionSignature.decision.toLowerCase()} by {decisionSignature.user?.firstName || decisionSignature.signedName}
                        </div>
                      ) : null}
                    </td>
                    <td className="small d-none d-lg-table-cell">{date(request.targetStartDate)}</td>
                    <td className="text-end text-nowrap">
                      {request.status === "DRAFT" || request.status === "REJECTED" ? (
                        <>
                          <button className="btn btn-sm btn-brand me-1" onClick={() => setSigning({ action: "submit", request })}>
                            <Send size={13} /> Sign & submit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => remove(request)} aria-label="Delete request">
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : null}
                      {request.status === "SUBMITTED" ? (
                        <>
                          <button className="btn btn-sm btn-outline-success me-1" onClick={() => setSigning({ action: "decision", decision: "APPROVED", request })}>
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => startReject(request)}>
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      ) : null}
                      {request.status === "APPROVED" || request.status === "FULFILLED" ? (
                        <span className="small text-muted">Decision recorded</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SignatureDialog
        open={Boolean(signing)}
        title={signing?.action === "submit" ? "Sign recruitment requisition" : signing?.decision === "APPROVED" ? "Approve recruitment request" : "Reject recruitment request"}
        subtitle={
          signing?.action === "submit"
            ? `Sign ${signing?.request?.requestNumber || "this request"} to send it for HR approval.`
            : signing?.decision === "APPROVED"
              ? "Your signature records the approval and opens a draft vacancy."
              : "Your signature records the rejection and returns the request for revision."
        }
        confirmLabel={signing?.action === "submit" ? "Sign and submit" : signing?.decision === "APPROVED" ? "Sign approval" : "Sign rejection"}
        busy={busy}
        onCancel={() => setSigning(null)}
        onConfirm={sign}
      />
    </div>
  );
}
