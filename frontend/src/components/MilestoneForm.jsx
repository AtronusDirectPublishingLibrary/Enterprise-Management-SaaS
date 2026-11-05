import { useState } from "react";

export default function MilestoneForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       initialData?.title       ?? "",
    description: initialData?.description ?? "",
    startDate:   initialData?.startDate   ? String(initialData.startDate).substring(0, 10) : "",
    endDate:     initialData?.endDate     ? String(initialData.endDate).substring(0, 10)   : "",
    progress:    initialData?.progress    ?? 0,
    status:      initialData?.status      ?? "Not Started",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title:       form.title,
        description: form.description,
        startDate:   form.startDate,
        endDate:     form.endDate,
        progress:    Number(form.progress),
        status:      form.status,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">{initialData?.milestoneId ? "Edit Milestone" : "New Milestone"}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-2">
                <label className="form-label small fw-semibold">Title</label>
                <input className="form-control form-control-sm" required minLength={2} maxLength={200}
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Description</label>
                <textarea className="form-control form-control-sm" rows={2} maxLength={500}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Start Date</label>
                  <input type="date" required className="form-control form-control-sm"
                    value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">End Date</label>
                  <input type="date" required className="form-control form-control-sm"
                    value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Progress %</label>
                  <input type="number" min={0} max={100} className="form-control form-control-sm"
                    value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Status</label>
                  <select className="form-select form-select-sm" value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {["Not Started", "In Progress", "On Hold", "Complete", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-brand btn-sm" disabled={saving}>
                {saving ? "Saving…" : "Save Milestone"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
