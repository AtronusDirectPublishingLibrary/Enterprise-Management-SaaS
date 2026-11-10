import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  FileText,
  FileUp,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, assetUrl } from "../lib/api";

const EMPTY = {
  title: "",
  department: "",
  position: "",
  version: "1.0",
  effectiveDate: "",
  summary: "",
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function JobDescriptionsPanel() {
  const [descriptions, setDescriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const [library, people] = await Promise.all([
        api.get("/job-descriptions"),
        api.get("/job-descriptions/assignable-users"),
      ]);
      setDescriptions(library);
      setUsers(people);
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

  const chooseFile = (next) => {
    setError("");
    if (!next) return;
    const name = next.name.toLowerCase();
    if (![".pdf", ".doc", ".docx"].some((ext) => name.endsWith(ext))) {
      setError("Upload a PDF, DOC or DOCX file.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Job description files must be 10 MB or smaller.");
      return;
    }
    setFile(next);
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Attach the job description document.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value !== null) body.append(key, value);
      });
      await api.upload("/job-descriptions", body);
      setForm(EMPTY);
      setFile(null);
      setShowUpload(false);
      await load();
      flash("Job description uploaded. Assign it to the employees who need it.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (description) => {
    if (!window.confirm(`Delete “${description.title}” and remove it from assigned employees?`)) return;
    try {
      await api.del(`/job-descriptions/${description.id}`);
      await load();
      flash("Job description deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleArchive = async (description) => {
    try {
      await api.put(`/job-descriptions/${description.id}`, {
        status: description.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openAssign = (description) => {
    setAssigning(description);
    setSelectedUsers(description.assignments.map((assignment) => assignment.userId));
    setUserSearch("");
  };

  const saveAssignments = async () => {
    if (!assigning) return;
    const existing = new Set(assigning.assignments.map((assignment) => assignment.userId));
    const toAdd = selectedUsers.filter((id) => !existing.has(id));
    const toRemove = [...existing].filter((id) => !selectedUsers.includes(id));
    setBusy(true);
    try {
      if (toAdd.length) {
        await api.post(`/job-descriptions/${assigning.id}/assign`, { userIds: toAdd });
      }
      for (const userId of toRemove) {
        await api.del(`/job-descriptions/${assigning.id}/assign/${userId}`);
      }
      setAssigning(null);
      await load();
      flash(`Assignments updated${toAdd.length ? ` · ${toAdd.length} employee(s) notified` : ""}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.firstName, user.lastName, user.username, user.department, user.jobTitle, user.position]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [users, userSearch]);

  if (loading) return <div className="p-4 text-muted">Loading job descriptions…</div>;

  return (
    <div>
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      {notice ? <div className="alert alert-success py-2">{notice}</div> : null}

      <div className="hrx-card">
        <div className="hrx-card-head">
          <div>
            <h2 className="d-flex align-items-center gap-2"><FileText size={16} /> Job description library</h2>
            <div className="small text-muted">
              Upload the signed JD, then assign it. Employees only see the descriptions assigned to them.
            </div>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={load}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button type="button" className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1" onClick={() => setShowUpload((open) => !open)}>
              {showUpload ? <X size={14} /> : <Plus size={14} />} {showUpload ? "Close" : "Upload JD"}
            </button>
          </div>
        </div>

        {showUpload ? (
          <form className="hrx-card-body hrx-form" onSubmit={upload}>
            <div className="row g-3">
              <div className="col-md-5">
                <label className="form-label">Title</label>
                <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Quality Control Analyst — Job Description" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Department</label>
                <input className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Position / grade</label>
                <input className="form-control" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Version</label>
                <input className="form-control" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Effective date</label>
                <input type="date" className="form-control" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Summary (optional)</label>
                <input className="form-control" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Purpose of the role" />
              </div>
              <div className="col-12">
                <label
                  className={`logo-dropzone${dragging ? " is-dragging" : ""}`}
                  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    chooseFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  <FileUp size={22} />
                  <div>
                    <strong>{file ? file.name : "Drop the JD document here, or browse"}</strong>
                    <div className="small text-muted">
                      PDF, DOC or DOCX · max 10 MB {file ? `· ${formatSize(file.size)}` : ""}
                    </div>
                  </div>
                  <input type="file" accept=".pdf,.doc,.docx" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-sm btn-brand d-inline-flex align-items-center gap-2" disabled={busy}>
                <Upload size={14} /> {busy ? "Uploading…" : "Upload job description"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Document</th>
                <th className="d-none d-md-table-cell">Version</th>
                <th className="d-none d-lg-table-cell">Effective</th>
                <th>Assigned to</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {descriptions.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted py-4 small">No job descriptions uploaded yet. Start with the roles you are hiring or reviewing.</td></tr>
              ) : descriptions.map((description) => (
                <tr key={description.id}>
                  <td>
                    <div className="fw-semibold small">{description.title}</div>
                    <div className="text-muted" style={{ fontSize: "0.73rem" }}>
                      {description.department || "No department"} · {description.fileName} · {formatSize(description.fileSize)}
                    </div>
                  </td>
                  <td className="small d-none d-md-table-cell">v{description.version}</td>
                  <td className="small d-none d-lg-table-cell">{formatDate(description.effectiveDate)}</td>
                  <td style={{ minWidth: 160 }}>
                    {description.assignments.length === 0 ? (
                      <span className="small text-muted">Unassigned</span>
                    ) : (
                      <div className="d-flex flex-wrap gap-1">
                        {description.assignments.slice(0, 3).map((assignment) => (
                          <span key={assignment.id} className="badge bg-light text-dark border">
                            {[assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(" ") || assignment.user.username}
                            {assignment.acknowledgedAt ? " ✓" : ""}
                          </span>
                        ))}
                        {description.assignments.length > 3 ? (
                          <span className="badge bg-light text-dark border">+{description.assignments.length - 3}</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`hrx-chip ${description.status === "ACTIVE" ? "hrx-chip--good" : "hrx-chip--muted"}`}>
                      {description.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="text-end text-nowrap">
                    <a className="btn btn-sm btn-outline-primary me-1" href={assetUrl(`/api/job-descriptions/${description.id}/file`)} target="_blank" rel="noreferrer" title="Open document">
                      <Download size={13} />
                    </a>
                    <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => openAssign(description)} title="Assign employees">
                      <UserPlus size={13} />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => toggleArchive(description)} title={description.status === "ACTIVE" ? "Archive" : "Restore"}>
                      <Archive size={13} />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(description)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {assigning ? (
        <div className="signature-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setAssigning(null);
        }}>
          <div className="signature-modal" role="dialog" aria-modal="true" aria-label="Assign job description" style={{ maxWidth: 700 }}>
            <div className="signature-modal__head d-flex justify-content-between align-items-start gap-3">
              <div>
                <div className="text-uppercase small fw-bold" style={{ letterSpacing: "0.12em", color: "var(--brand-secondary)" }}>Assign</div>
                <h2 className="h5 fw-bold mb-0">{assigning.title}</h2>
                <div className="small" style={{ opacity: 0.78 }}>v{assigning.version} · only selected employees can open it</div>
              </div>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setAssigning(null)} disabled={busy} aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="signature-modal__body">
              <div className="hr-search mb-3">
                <Search size={15} />
                <input className="form-control form-control-sm" placeholder="Search people by name, department or position…" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
              </div>
              <div style={{ maxHeight: 330, overflowY: "auto" }} className="border rounded">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-muted small">No people match this search.</div>
                ) : filteredUsers.map((user) => {
                  const selected = selectedUsers.includes(user.id);
                  return (
                    <label key={user.id} className="d-flex align-items-center gap-3 px-3 py-2 border-bottom mb-0" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={selected}
                        onChange={() =>
                          setSelectedUsers((current) =>
                            selected ? current.filter((id) => id !== user.id) : [...current, user.id]
                          )
                        }
                      />
                      <span className="flex-grow-1">
                        <span className="fw-semibold small d-block">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}
                        </span>
                        <span className="text-muted" style={{ fontSize: "0.74rem" }}>
                          {[user.jobTitle || user.position, user.department].filter(Boolean).join(" · ") || user.username}
                        </span>
                      </span>
                      {assigning.assignments.some((assignment) => assignment.userId === user.id) ? (
                        <span className="badge bg-light text-dark border">Already assigned</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
              <div className="small text-muted mt-2">
                Selected {selectedUsers.length} employee{selectedUsers.length === 1 ? "" : "s"}. New assignees receive a notification in My Portal.
              </div>
            </div>
            <div className="signature-modal__foot">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAssigning(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn-brand btn-sm d-inline-flex align-items-center gap-2" onClick={saveAssignments} disabled={busy}>
                <Users size={15} /> {busy ? "Saving…" : "Save assignments"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
