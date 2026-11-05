import { useState } from "react";
import { api } from "../lib/api";
import { CheckCircle } from "lucide-react";

export default function PublicForm() {
  const [form, setForm] = useState({ title: "", description: "", sourceOfFunds: "Treasury", requesterName: "", requesterEmail: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/forms/submit", form);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    }
  };

  if (success) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100" style={{ background: "var(--brand-bg)" }}>
        <div className="card border-0 shadow-lg p-5 text-center" style={{ maxWidth: 500 }}>
          <CheckCircle size={64} className="text-success mx-auto mb-3" />
          <h3 className="fw-bold">Request Submitted!</h3>
          <p className="text-muted">Your project intake request has been received. The PMO will review it shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ background: "var(--brand-bg)" }}>
      <div className="card border-0 shadow-lg p-4" style={{ maxWidth: 600, width: "100%" }}>
        <h3 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>Project Intake Form</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Project Title</label>
            <input required className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label fw-semibold">Your Name</label>
              <input required className="form-control" value={form.requesterName} onChange={e => setForm({...form, requesterName: e.target.value})} />
            </div>
            <div className="col-6">
              <label className="form-label fw-semibold">Your Email</label>
              <input required type="email" className="form-control" value={form.requesterEmail} onChange={e => setForm({...form, requesterEmail: e.target.value})} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Source of Funds</label>
            <select className="form-select" value={form.sourceOfFunds} onChange={e => setForm({...form, sourceOfFunds: e.target.value})}>
              <option>Treasury</option>
              <option>Competitive Grants</option>
              <option>Grand Challenges Eth.</option>
              <option>Other</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Project Description</label>
            <textarea required className="form-control" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <button type="submit" className="btn-brand w-100 py-2">Submit Request</button>
        </form>
      </div>
    </div>
  );
}