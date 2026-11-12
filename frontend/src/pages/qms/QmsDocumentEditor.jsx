import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  History,
  PlusCircle,
  Save,
  Upload,
  XCircle,
} from "lucide-react";
import { API_BASE, api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { canCreateQmsDocument, isQmsApprover } from "../../lib/access";
import QmsShell from "./QmsShell";

const CATEGORIES = [
  "SOP",
  "Specification",
  "Protocol",
  "Record",
  "Policy",
  "Work Instruction",
  "Form",
];

const DEPARTMENTS = ["QA", "Production", "QC", "Warehouse", "Engineering", "Regulatory", "HR", "IT"];

const STATUS_BADGE = {
  DRAFT: "bg-secondary",
  IN_REVIEW: "bg-warning text-dark",
  APPROVED: "bg-success",
  SUPERSEDED: "bg-secondary opacity-75",
  OBSOLETE: "bg-dark",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInput(value) {
  return value ? String(value).slice(0, 10) : "";
}

function addYearsDate(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function personName(person) {
  if (!person) return "—";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username || "—";
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function emptyForm() {
  return {
    code: "",
    title: "",
    titleAm: "",
    description: "",
    category: "SOP",
    department: "QA",
    version: "1.0",
    ownerId: "",
    reviewerId: "",
    approverId: "",
    fileUrl: "",
    changeSummary: "",
    effectiveDate: "",
    reviewDueAt: addYearsDate(2),
  };
}

function formFromDocument(document) {
  return {
    code: document.code || "",
    title: document.title || "",
    titleAm: document.titleAm || "",
    description: document.description || "",
    category: document.category || "SOP",
    department: document.department || "",
    version: document.version || "1.0",
    ownerId: document.ownerId || "",
    reviewerId: document.reviewerId || "",
    approverId: document.approverId || "",
    fileUrl: document.fileUrl || "",
    changeSummary: document.changeSummary || "",
    effectiveDate: dateInput(document.effectiveDate),
    reviewDueAt: dateInput(document.reviewDueAt),
  };
}

export default function QmsDocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id;

  const [document, setDocument] = useState(null);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [doc, userList] = await Promise.all([
        isNew ? Promise.resolve(null) : api.get(`/qms/documents/${id}`),
        api.get("/qms/documents/people"),
      ]);
      setPeople(userList || []);
      setDocument(doc);
      setForm(doc ? formFromDocument(doc) : emptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const approver = isQmsApprover(user);
  const isOwner = Boolean(document?.owner?.username && document.owner.username === user?.username);
  const statusEditable = isNew || ["DRAFT", "IN_REVIEW"].includes(document?.status);
  const canEdit = isNew
    ? canCreateQmsDocument(user)
    : statusEditable &&
      (isOwner || document?.approver?.username === user?.username || approver);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    if (form.version !== "1.0" && form.changeSummary.trim().length === 0) {
      setError("A change summary is required for any version above 1.0.");
      setSaving(false);
      return;
    }

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) {
          if (["reviewerId", "approverId", "effectiveDate", "reviewDueAt"].includes(key)) {
            data.append(key, "null");
          }
          return;
        }
        data.append(key, value);
      });
      if (file) data.append("file", file);

      const saved = isNew
        ? await api.upload("/qms/documents", data, "POST")
        : await api.upload(`/qms/documents/${id}`, data, "PUT");

      setFile(null);
      if (isNew) {
        navigate(`/qms/documents/${saved.id}`);
        return;
      }
      setDocument((current) => ({ ...current, ...saved }));
      setNotice("Document saved.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openModal = (type) => setModal({ type, value: "", busy: false, error: null });
  const closeModal = () => setModal(null);

  const runModal = async () => {
    if (!modal || !document) return;
    if (modal.type === "reject" && modal.value.trim().length < 3) {
      setModal((current) => ({ ...current, error: "Give a reason of at least 3 characters." }));
      return;
    }
    if (modal.type === "supersede" && modal.value.trim().length < 5) {
      setModal((current) => ({ ...current, error: "Describe the change in at least 5 characters." }));
      return;
    }

    setModal((current) => ({ ...current, busy: true, error: null }));
    try {
      if (modal.type === "submit") {
        await api.post(`/qms/documents/${document.id}/submit`, {});
        setNotice("Submitted for review.");
      } else if (modal.type === "approve") {
        await api.post(`/qms/documents/${document.id}/approve`, {});
        setNotice("Document approved.");
      } else if (modal.type === "reject") {
        await api.post(`/qms/documents/${document.id}/reject`, { reason: modal.value.trim() });
        setNotice("Document returned to draft.");
      } else if (modal.type === "obsolete") {
        await api.post(`/qms/documents/${document.id}/obsolete`, {});
        setNotice("Document marked obsolete.");
      } else if (modal.type === "supersede") {
        const created = await api.post(`/qms/documents/${document.id}/supersede`, {
          changeSummary: modal.value.trim(),
        });
        closeModal();
        navigate(`/qms/documents/${created.id}`);
        return;
      }
      closeModal();
      await load();
    } catch (err) {
      setModal((current) => ({ ...current, busy: false, error: err.message }));
    }
  };

  const modalTitle = {
    submit: "Submit for review",
    approve: "Approve document",
    reject: "Return for changes",
    obsolete: "Obsolete document",
    supersede: "Create new version",
  }[modal?.type] || "";

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <span className="spinner-border spinner-border-sm me-2" role="status" /> Loading document…
      </div>
    );
  }

  if (!isNew && !document) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || "Document not found."}</div>
        <Link to="/qms/documents" className="btn btn-outline-secondary btn-sm">
          <ArrowLeft size={14} className="me-1" /> Back to register
        </Link>
      </div>
    );
  }

  const status = document?.status || "DRAFT";
  const downloadUrl = document?.fileUrl ? `${API_BASE}/qms/documents/${document.id}/download` : null;

  return (
    <div>
      <Helmet><title>{isNew ? "New QMS Document" : `${document.code} | QMS`} | EB-EMS</title></Helmet>
      <QmsShell
        title={isNew ? "Register a controlled document" : document.title}
        description={
          isNew
            ? "Create the first draft. Approval is a separate, audited step; no controlled document becomes effective without QA authorization."
            : `${document.code} · version ${document.version} · ${status.replace("_", " ")}. ${document.description || "Controlled document record."}`
        }
        actions={(
          <>
            {!isNew && downloadUrl ? (
              <a href={downloadUrl} className="btn btn-light btn-sm d-inline-flex align-items-center gap-1">
                <Download size={14} /> Download
              </a>
            ) : null}
            {!isNew && status === "DRAFT" && isOwner ? (
              <button type="button" className="btn btn-brand btn-sm" onClick={() => openModal("submit")}>Submit for review</button>
            ) : null}
            {!isNew && status === "IN_REVIEW" && approver ? (
              <>
                <button type="button" className="btn btn-success btn-sm" onClick={() => openModal("approve")}>
                  <CheckCircle2 size={14} className="me-1" /> Approve
                </button>
                <button type="button" className="btn btn-outline-light btn-sm" onClick={() => openModal("reject")}>
                  <XCircle size={14} className="me-1" /> Reject
                </button>
              </>
            ) : null}
            {!isNew && status === "APPROVED" && (isOwner || approver) ? (
              <button type="button" className="btn btn-light btn-sm" onClick={() => openModal("supersede")}>
                <PlusCircle size={14} className="me-1" /> Supersede
              </button>
            ) : null}
            {!isNew && status === "APPROVED" && approver ? (
              <button type="button" className="btn btn-light btn-sm" onClick={() => openModal("obsolete")}>Obsolete</button>
            ) : null}
          </>
        )}
      >

      {notice ? (
        <div className="alert alert-success d-flex justify-content-between align-items-center py-2">
          <span>{notice}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice(null)} />
        </div>
      ) : null}
      {error ? (
        <div className="alert alert-danger d-flex justify-content-between align-items-center py-2">
          <span>{error}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setError(null)} />
        </div>
      ) : null}
      {!isNew && document.rejectionReason ? (
        <div className="alert alert-warning">
          <strong>Returned for changes:</strong> {document.rejectionReason}
        </div>
      ) : null}

      <div className="row g-4">
        <div className={isNew ? "col-12 col-xl-9" : "col-12 col-xl-8"}>
          <form onSubmit={save}>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom">
                <h2 className="h6 mb-0">Identification</h2>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-code">Document code *</label>
                    <input
                      id="qms-code"
                      className="form-control"
                      placeholder="SOP-QA-001"
                      value={form.code}
                      onChange={(event) => update("code", event.target.value.toUpperCase())}
                      disabled={!canEdit}
                      required
                      pattern="[A-Z]{2,5}-[A-Z]{2,5}-[0-9]{3,5}"
                      title="Use AAA-BBB-001 format, for example SOP-QA-001"
                    />
                    <div className="form-text">Format: SOP-QA-001 (two to five letters per block).</div>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label small fw-semibold" htmlFor="qms-title">Title (English) *</label>
                    <input
                      id="qms-title"
                      className="form-control"
                      value={form.title}
                      onChange={(event) => update("title", event.target.value)}
                      disabled={!canEdit}
                      minLength={5}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold" htmlFor="qms-title-am">Title (Amharic)</label>
                    <input
                      id="qms-title-am"
                      className="form-control"
                      value={form.titleAm}
                      onChange={(event) => update("titleAm", event.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold" htmlFor="qms-category">Category *</label>
                    <select
                      id="qms-category"
                      className="form-select"
                      value={form.category}
                      onChange={(event) => update("category", event.target.value)}
                      disabled={!canEdit}
                    >
                      {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold" htmlFor="qms-department">Department</label>
                    <select
                      id="qms-department"
                      className="form-select"
                      value={form.department}
                      onChange={(event) => update("department", event.target.value)}
                      disabled={!canEdit}
                    >
                      <option value="">Not assigned</option>
                      {DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold" htmlFor="qms-description">Purpose / scope</label>
                    <textarea
                      id="qms-description"
                      className="form-control"
                      rows={3}
                      value={form.description}
                      onChange={(event) => update("description", event.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom">
                <h2 className="h6 mb-0">Version</h2>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold" htmlFor="qms-version">Version *</label>
                    <input
                      id="qms-version"
                      className="form-control"
                      value={form.version}
                      onChange={(event) => update("version", event.target.value)}
                      disabled={!canEdit}
                      pattern="[0-9]+\.[0-9]+(\.[0-9]+)?"
                      title="Use 1.0, 2.1 or 2.1.3"
                      required
                    />
                  </div>
                  <div className="col-md-9">
                    <label className="form-label small fw-semibold" htmlFor="qms-change-summary">
                      Change summary {form.version !== "1.0" ? "*" : ""}
                    </label>
                    <input
                      id="qms-change-summary"
                      className="form-control"
                      value={form.changeSummary}
                      onChange={(event) => update("changeSummary", event.target.value)}
                      disabled={!canEdit}
                      required={form.version !== "1.0"}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom">
                <h2 className="h6 mb-0">People</h2>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-owner">Owner *</label>
                    <select
                      id="qms-owner"
                      className="form-select"
                      value={form.ownerId}
                      onChange={(event) => update("ownerId", event.target.value)}
                      disabled={!canEdit}
                    >
                      <option value="">Me (the signed-in owner)</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {personName(person)} — {person.position || person.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-reviewer">Reviewer</label>
                    <select
                      id="qms-reviewer"
                      className="form-select"
                      value={form.reviewerId}
                      onChange={(event) => update("reviewerId", event.target.value)}
                      disabled={!canEdit}
                    >
                      <option value="">Not assigned</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {personName(person)} — {person.position || person.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-approver">Approver</label>
                    <select
                      id="qms-approver"
                      className="form-select"
                      value={form.approverId}
                      onChange={(event) => update("approverId", event.target.value)}
                      disabled={!canEdit}
                    >
                      <option value="">Any QMS approver</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {personName(person)} — {person.position || person.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom">
                <h2 className="h6 mb-0">Controlled file</h2>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold" htmlFor="qms-file">Upload PDF, DOC or XLS</label>
                    <input
                      id="qms-file"
                      type="file"
                      className="form-control"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(event) => setFile(event.target.files?.[0] || null)}
                      disabled={!canEdit}
                    />
                    <div className="form-text">Maximum 50 MB. The file is preserved with the version.</div>
                    {file ? (
                      <div className="small text-muted mt-1 d-flex align-items-center gap-1">
                        <Upload size={13} /> {file.name} ({formatBytes(file.size)})
                      </div>
                    ) : null}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold" htmlFor="qms-file-url">Or link an external file</label>
                    <input
                      id="qms-file-url"
                      className="form-control"
                      placeholder="https://…"
                      value={form.fileUrl}
                      onChange={(event) => update("fileUrl", event.target.value)}
                      disabled={!canEdit}
                    />
                    {!isNew && document.fileName ? (
                      <div className="small text-muted mt-1 d-flex align-items-center gap-1">
                        <FileText size={13} /> {document.fileName} ({formatBytes(document.fileSize)})
                        {downloadUrl ? <a href={downloadUrl} className="ms-1">Download</a> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom">
                <h2 className="h6 mb-0">Lifecycle</h2>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-effective">Effective date</label>
                    <input
                      id="qms-effective"
                      type="date"
                      className="form-control"
                      value={form.effectiveDate}
                      onChange={(event) => update("effectiveDate", event.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-review-due">Review due</label>
                    <input
                      id="qms-review-due"
                      type="date"
                      className="form-control"
                      value={form.reviewDueAt}
                      onChange={(event) => update("reviewDueAt", event.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold" htmlFor="qms-status">Status (workflow)</label>
                    <input id="qms-status" className="form-control" value={status} readOnly disabled />
                  </div>
                </div>
              </div>
            </div>

            {canEdit ? (
              <div className="d-flex gap-2 mb-4">
                <button type="submit" className="btn btn-brand d-inline-flex align-items-center gap-2" disabled={saving}>
                  <Save size={15} /> {saving ? "Saving…" : isNew ? "Create draft" : "Save changes"}
                </button>
                {isNew ? (
                  <Link to="/qms/documents" className="btn btn-outline-secondary">Cancel</Link>
                ) : null}
              </div>
            ) : (
              <div className="alert alert-light border small mb-4">
                This version is read-only at its current status. Create a new version from the workflow buttons to change it.
              </div>
            )}
          </form>
        </div>

        {!isNew ? (
          <div className="col-12 col-xl-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2">
                <History size={16} />
                <h2 className="h6 mb-0">Version history</h2>
              </div>
              <div className="card-body">
                {(document.versionChain || []).length === 0 ? (
                  <p className="small text-muted mb-0">No earlier versions.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {document.versionChain.map((version) => {
                      const current = version.id === document.id;
                      return (
                        <Link
                          key={version.id}
                          to={`/qms/documents/${version.id}`}
                          className={`text-decoration-none border rounded p-2 ${current ? "border-primary bg-primary bg-opacity-10" : "border-light"}`}
                        >
                          <div className="d-flex align-items-center justify-content-between gap-2">
                            <strong className="small">{version.code} v{version.version}</strong>
                            <span className={`badge ${STATUS_BADGE[version.status] || "bg-secondary"}`}>
                              {version.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="small text-muted mt-1">
                            Created {formatDate(version.createdAt)}
                            {version.approvedAt ? ` · Approved ${formatDate(version.approvedAt)}` : ""}
                          </div>
                          {version.changeSummary ? (
                            <div className="small text-muted mt-1">{version.changeSummary}</div>
                          ) : null}
                          {current ? <div className="small fw-semibold text-primary mt-1">Viewing this version</div> : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-3">
              <div className="card-body small text-muted">
                <div className="d-flex align-items-center gap-2 mb-2 text-dark fw-semibold">
                  <CalendarClock size={15} /> Control record
                </div>
                <div>Owner: {personName(document.owner)}</div>
                <div>Reviewer: {personName(document.reviewer)}</div>
                <div>Approver: {personName(document.approver)}</div>
                <div>Approved: {formatDate(document.approvedAt)}</div>
                <div>Next review: {formatDate(document.reviewDueAt)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {modal ? (
        <div className="modal fade show d-block" role="dialog" aria-modal="true" style={{ background: "rgba(11,37,69,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h2 className="modal-title h6 mb-0">{modalTitle}</h2>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} disabled={modal.busy} />
              </div>
              <div className="modal-body">
                {modal.type === "submit" ? (
                  <p className="mb-0">Submit <strong>{document.code} v{document.version}</strong> for review? The approver will be notified.</p>
                ) : null}
                {modal.type === "approve" ? (
                  <p className="mb-0">Approve <strong>{document.code} v{document.version}</strong>? It becomes effective and enters the review cycle.</p>
                ) : null}
                {modal.type === "obsolete" ? (
                  <p className="mb-0">Mark <strong>{document.code} v{document.version}</strong> obsolete? The record is retained for audit history.</p>
                ) : null}
                {modal.type === "reject" ? (
                  <>
                    <label className="form-label small fw-semibold" htmlFor="qms-editor-reject">Reason for return</label>
                    <textarea
                      id="qms-editor-reject"
                      className="form-control"
                      rows={4}
                      value={modal.value}
                      onChange={(event) => setModal((current) => ({ ...current, value: event.target.value }))}
                    />
                  </>
                ) : null}
                {modal.type === "supersede" ? (
                  <>
                    <label className="form-label small fw-semibold" htmlFor="qms-editor-supersede">Change summary</label>
                    <textarea
                      id="qms-editor-supersede"
                      className="form-control"
                      rows={4}
                      value={modal.value}
                      onChange={(event) => setModal((current) => ({ ...current, value: event.target.value }))}
                    />
                    <div className="form-text">A new draft is created and this approved version becomes SUPERSEDED.</div>
                  </>
                ) : null}
                {modal.error ? <div className="alert alert-danger py-2 mt-3 mb-0">{modal.error}</div> : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeModal} disabled={modal.busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${modal.type === "reject" || modal.type === "obsolete" ? "btn-danger" : "btn-brand"}`}
                  onClick={runModal}
                  disabled={modal.busy}
                >
                  {modal.busy ? "Working…" : modalTitle}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </QmsShell>
    </div>
  );
}
