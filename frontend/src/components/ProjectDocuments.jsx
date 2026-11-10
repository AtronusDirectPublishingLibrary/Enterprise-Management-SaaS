import { useCallback, useEffect, useRef, useState } from "react";
import { api, assetUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { canAccess, isSystemAdmin } from "../lib/access";
import { Edit2, ExternalLink, FileText, Plus, Trash2, Upload, X } from "lucide-react";

const TYPES = [
  "Policy",
  "Procedure",
  "Guideline",
  "Report",
  "Form",
  "Template",
  "Contract",
  "Terms of Reference",
  "Approval",
  "Other",
];

const STATUSES = ["Active", "Draft", "Under Review", "Approved", "Superseded", "Expired"];

const EMPTY = { title: "", docNumber: "", type: "Report", status: "Active", notes: "" };

export default function ProjectDocuments({ projectId }) {
  const { user } = useAuth();
  const canManage = isSystemAdmin(user) || user?.role === "project_manager" || canAccess(user, "documents");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [typeOther, setTypeOther] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/documents/project/${encodeURIComponent(projectId)}`)
      .then((rows) => setDocuments(Array.isArray(rows) ? rows : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setTypeOther("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const startCreate = () => {
    resetForm();
    setError("");
    setShowForm(true);
  };

  const startEdit = (document) => {
    const knownType = TYPES.includes(document.type) && document.type !== "Other";
    setForm({
      title: document.title || "",
      docNumber: document.docNumber || "",
      type: knownType ? document.type : "Other",
      status: document.status || "Active",
      notes: document.notes || "",
    });
    setTypeOther(knownType ? "" : document.type || "");
    setEditingId(document.id);
    setFile(null);
    setError("");
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!editingId && !file) {
      setError("Choose a file to upload.");
      return;
    }
    setSaving(true);
    setError("");
    const body = new FormData();
    body.append("title", form.title);
    body.append("docNumber", form.docNumber);
    body.append("thematic", "Project document");
    body.append("type", form.type === "Other" ? typeOther || "Other" : form.type);
    body.append("status", form.status);
    body.append("notes", form.notes);
    body.append("projectId", projectId);
    if (file) body.append("file", file);

    try {
      if (editingId) await api.upload(`/documents/${editingId}`, body, "PUT");
      else await api.upload("/documents", body);
      resetForm();
      load();
    } catch (e) {
      setError(e.message || "Could not save this document.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (document) => {
    if (!window.confirm(`Delete “${document.title}”?`)) return;
    try {
      await api.del(`/documents/${document.id}`);
      if (editingId === document.id) resetForm();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card border-0 shadow-sm mt-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <FileText size={18} /> Project documents
            </h5>
            <div className="small text-muted">
              Contracts, approvals, reports and supporting files kept with this project.
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn-brand btn-sm d-flex align-items-center gap-1"
              onClick={showForm && !editingId ? resetForm : startCreate}
            >
              {showForm && !editingId ? <X size={14} /> : <Plus size={14} />}
              {showForm && !editingId ? "Cancel" : "Add document"}
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {showForm && (
          <form className="row g-2 align-items-end bg-light p-3 rounded mb-3" onSubmit={submit}>
            <div className="col-12 d-flex justify-content-between align-items-center">
              <strong className="small">{editingId ? "Edit document details" : "Upload a project document"}</strong>
              <button type="button" className="btn btn-sm btn-link text-muted p-0" onClick={resetForm} title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Title *</label>
              <input
                required
                className="form-control form-control-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold">Doc number</label>
              <input
                className="form-control form-control-sm"
                value={form.docNumber}
                onChange={(e) => setForm({ ...form, docNumber: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Type *</label>
              <select
                className="form-select form-select-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Status</label>
              <select
                className="form-select form-select-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            {form.type === "Other" && (
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Specify type *</label>
                <input
                  required
                  className="form-control form-control-sm"
                  value={typeOther}
                  onChange={(e) => setTypeOther(e.target.value)}
                />
              </div>
            )}
            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                File {editingId ? "(optional — replaces the current file)" : "*"}
              </label>
              <input
                ref={fileInput}
                type="file"
                className="form-control form-control-sm"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                required={!editingId}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label small fw-semibold">Notes</label>
              <input
                className="form-control form-control-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1" disabled={saving}>
                <Upload size={14} /> {saving ? "Saving…" : editingId ? "Save changes" : "Upload"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="spinner-border spinner-border-sm text-success" />
        ) : documents.length === 0 ? (
          <div className="text-muted small py-4 text-center">No documents attached yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Doc #</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>By</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <div className="fw-semibold">{document.title}</div>
                      {document.notes ? <div className="small text-muted">{document.notes}</div> : null}
                    </td>
                    <td className="small">{document.type === "Other" ? document.typeOther || "Other" : document.type}</td>
                    <td className="small">{document.docNumber || "—"}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{document.status || "Active"}</span>
                    </td>
                    <td className="small text-muted">
                      {document.uploadDate ? new Date(document.uploadDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="small text-muted">{document.uploadedBy || "—"}</td>
                    <td className="text-end text-nowrap">
                      {document.fileUrl ? (
                        <a
                          className="btn btn-sm btn-outline-success me-1"
                          href={assetUrl(document.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          title={document.fileName || "Open file"}
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : null}
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => startEdit(document)}
                            title="Edit document details"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => remove(document)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
