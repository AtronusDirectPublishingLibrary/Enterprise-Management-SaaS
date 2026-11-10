import { useEffect, useRef, useState } from "react";
import { api, assetUrl } from "../lib/api";
import { FileText, Plus, Trash2, Edit2, ExternalLink } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  docNumber: "",
  thematic: "General",
  type: "Report",
  status: "Active",
  notes: "",
};

export default function ManageDocuments() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const load = () => {
    api.get("/documents").then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFile(null);
    setEditingId(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value ?? ""));
    if (file) formData.append("file", file);

    try {
      if (editingId) await api.upload(`/documents/${editingId}`, formData, "PUT");
      else await api.upload("/documents", formData);
      resetForm();
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message || "Could not save this document.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.del(`/documents/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title || "",
      docNumber: item.docNumber || "",
      thematic: item.thematic || "General",
      type: item.type || "Report",
      status: item.status || "Active",
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setFile(null);
    setShowForm(true);
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold d-flex align-items-center gap-2" style={{ color: "var(--brand-primary)" }}>
          <FileText size={28} /> Manage Documents
        </h2>
        <button className="btn-brand btn-sm d-flex align-items-center gap-2" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          <Plus size={16} /> New Document
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {showForm && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <form onSubmit={handleSubmit}>
            <h5 className="fw-bold mb-3">{editingId ? "Edit Document" : "New Document"}</h5>
            <div className="row g-2 mb-2">
              <div className="col-md-6"><label className="form-label small fw-semibold">Title *</label><input className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small fw-semibold">Doc number</label><input className="form-control" value={form.docNumber} onChange={e => setForm({ ...form, docNumber: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small fw-semibold">Thematic area</label><input className="form-control" value={form.thematic} onChange={e => setForm({ ...form, thematic: e.target.value })} /></div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Document type</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {["Policy", "Procedure", "Guideline", "Report", "Form", "Template", "General"].map(type => <option key={type}>{type}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {["Active", "Draft", "Under Review", "Expired", "Suspended"].map(status => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">File {editingId ? "(leave blank to keep current)" : "*"}</label>
                <input ref={fileInput} type="file" className="form-control" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" required={!editingId} onChange={e => setFile(e.target.files[0] || null)} />
              </div>
              <div className="col-12"><label className="form-label small fw-semibold">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="mt-3 d-flex gap-2">
              <button type="submit" className="btn-brand btn-sm" disabled={saving}>{saving ? "Saving…" : "Save document"}</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner-border" /> : (
        <div className="app-table bg-white shadow-sm rounded p-3">
          <table className="table mb-0 align-middle">
            <thead><tr><th>Title</th><th>Doc #</th><th>Thematic</th><th>Type</th><th>Status</th><th>File</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">No documents yet. Add the first one above.</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className="fw-semibold">{item.title}</td>
                  <td>{item.docNumber || "—"}</td>
                  <td>{item.thematic === "Other" ? item.thematicOther : item.thematic}</td>
                  <td>{item.type === "Other" ? item.typeOther : item.type}</td>
                  <td><span className="badge bg-light text-dark border">{item.status || "Active"}</span></td>
                  <td>
                    {item.fileUrl ? (
                      <a className="btn btn-sm btn-outline-success py-0 px-2" href={assetUrl(item.fileUrl)} target="_blank" rel="noreferrer" title={item.fileName || "Open file"}>
                        <ExternalLink size={14} />
                      </a>
                    ) : "—"}
                  </td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(item)}><Edit2 size={14} /></button>
                    <button className="btn btn-sm btn-danger text-white" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
