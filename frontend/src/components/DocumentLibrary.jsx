import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
} from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { canAccess } from "../lib/access";

const TYPE_OPTIONS = ["Policy", "Procedure", "Guideline", "Report", "Form", "Template", "Plan", "Other"];
const STATUS_OPTIONS = ["Active", "Under Review", "Expired", "Draft", "Suspended"];
const THEMATIC_OPTIONS = [
  "Research and Development",
  "Research Training",
  "Innovation",
  "Governance",
  "Production or Manufacturing",
  "General",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  docNumber: "",
  thematic: "General",
  thematicOther: "",
  type: "Report",
  typeOther: "",
  status: "Active",
  notes: "",
  isPublic: false,
};

const slug = (value) => String(value || "").toLowerCase().trim().replace(/\s+/g, "-");

/**
 * One document registry, two deliberately different workspaces:
 *   internal — every record, for staff with database access;
 *   public   — only records explicitly released to the website.
 * Publication is a property of the document, not a second copy, so a paper is
 * never out of date in one library and current in the other.
 */
export default function DocumentLibrary({ scope = "internal" }) {
  const { user } = useAuth();
  const isPublicScope = scope === "public";
  const canManage =
    canAccess(user, "documents") || canAccess(user, "archive") || user?.role === "project_manager";

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/documents");
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load the document registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleSave = async (formData) => {
    try {
      if (editDoc) await api.upload(`/documents/${editDoc.id}`, formData, "PUT");
      else await api.upload("/documents", formData);
      setShowModal(false);
      setEditDoc(null);
      setNotice(editDoc ? "Document updated." : "Document filed and numbered.");
      await loadDocs();
    } catch (e) {
      setError(e.message || "Could not save the document.");
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete “${doc.title}” permanently? This removes it from both libraries.`)) return;
    try {
      await api.del(`/documents/${doc.id}`);
      setNotice("Document deleted.");
      await loadDocs();
    } catch (e) {
      setError(e.message);
    }
  };

  const togglePublic = async (doc) => {
    setBusyId(doc.id);
    setError("");
    try {
      await api.upload(
        `/documents/${doc.id}`,
        (() => {
          const fd = new FormData();
          fd.append("isPublic", doc.isPublic ? "false" : "true");
          return fd;
        })(),
        "PUT",
      );
      setNotice(doc.isPublic ? `“${doc.title}” removed from the public library.` : `“${doc.title}” published to the website.`);
      await loadDocs();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const scoped = isPublicScope ? docs.filter((doc) => doc.isPublic && doc.status === "Active") : docs;
    return {
      total: scoped.length,
      public: scoped.filter((doc) => doc.isPublic).length,
      active: scoped.filter((doc) => doc.status === "Active").length,
      review: scoped.filter((doc) => doc.status === "Under Review").length,
      expired: scoped.filter((doc) => doc.status === "Expired").length,
    };
  }, [docs, isPublicScope]);

  const visibleDocs = useMemo(() => {
    let rows = isPublicScope ? docs.filter((doc) => doc.isPublic && doc.status === "Active") : docs;
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(needle) ||
          doc.docNumber?.toLowerCase().includes(needle) ||
          doc.thematic?.toLowerCase().includes(needle) ||
          doc.type?.toLowerCase().includes(needle),
      );
    }
    if (statusFilter !== "All") rows = rows.filter((doc) => doc.status === statusFilter);
    if (typeFilter !== "All") rows = rows.filter((doc) => doc.type === typeFilter);
    return rows;
  }, [docs, isPublicScope, search, statusFilter, typeFilter]);

  const openCreate = () => {
    setEditDoc(null);
    setShowModal(true);
  };

  const openEdit = (doc) => {
    setEditDoc(doc);
    setShowModal(true);
  };

  return (
    <div className="document-library pb-4">
      <div className="document-library__hero">
        <div>
          <div className="page-kicker">{isPublicScope ? "Public website · published records" : "Corporate records · staff access"}</div>
          <h2 className="page-title mb-1 d-flex align-items-center gap-2">
            {isPublicScope ? <Globe2 size={25} /> : <Archive size={25} />}
            {isPublicScope ? "Public Document Library" : "Internal Document Archive"}
          </h2>
          <p className="mb-0 text-muted small document-library__lede">
            {isPublicScope
              ? "These documents are visible on the public website. Publishing here never changes the internal record — it only releases the same file to the public catalogue."
              : "The complete corporate record, available only to signed-in staff with database access. Use the visibility control to release a document to the public library."}
          </p>
        </div>
        <div className="document-library__hero-actions">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={loadDocs}>
            <RefreshCw size={14} /> Refresh
          </button>
          {canManage ? (
            <button className="btn-brand btn-sm d-flex align-items-center gap-1" onClick={openCreate}>
              <Plus size={15} /> Add document
            </button>
          ) : null}
        </div>
      </div>

      <div className="document-library__stats">
        <Stat label={isPublicScope ? "Published" : "Total records"} value={isPublicScope ? stats.public : stats.total} icon={<FileText size={16} />} />
        {!isPublicScope ? <Stat label="Public" value={stats.public} icon={<Globe2 size={16} />} /> : null}
        <Stat label="Active" value={stats.active} icon={<CheckCircle2 size={16} />} />
        <Stat label="Under review" value={stats.review} icon={<Search size={16} />} />
        <Stat label="Expired" value={stats.expired} icon={<Archive size={16} />} tone="warn" />
      </div>

      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      {notice ? (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span>{notice}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} />
        </div>
      ) : null}

      <div className="document-library__toolbar">
        <div className="document-library__search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Search title, number, type or thematic area…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search documents"
          />
        </div>
        <select className="form-select form-select-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by type">
          <option value="All">All types</option>
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>{type === "Other" ? "Other (specify)" : type}</option>
          ))}
        </select>
        {!isPublicScope ? (
          <select className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        ) : null}
      </div>

      {showModal ? (
        <DocumentForm
          doc={editDoc}
          defaultPublic={isPublicScope}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditDoc(null);
          }}
        />
      ) : null}

      <div className="app-table document-library__table">
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border text-success" role="status" />
          </div>
        ) : (
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>Document</th>
                <th>Number</th>
                <th>Thematic area</th>
                <th>Type</th>
                <th>Status</th>
                {!isPublicScope ? <th>Website</th> : null}
                <th>File</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="fw-semibold">{doc.title}</div>
                    <div className="small text-muted">
                      {doc.unit || "Corporate record"}
                      {doc.version ? ` · v${doc.version}` : ""}
                    </div>
                  </td>
                  <td>
                    <code className="doc-number">{doc.docNumber || "—"}</code>
                  </td>
                  <td className="small">{doc.thematic === "Other" ? doc.thematicOther || "Other" : doc.thematic}</td>
                  <td className="small">
                    <span className={`doc-type doc-type--${slug(doc.type)}`}>{doc.type === "Other" ? doc.typeOther || "Other" : doc.type}</span>
                  </td>
                  <td>
                    <span className={"badge-status " + slug(doc.status)}>{doc.status}</span>
                  </td>
                  {!isPublicScope ? (
                    <td>
                      <button
                        type="button"
                        className={`doc-visibility ${doc.isPublic ? "is-public" : ""}`}
                        onClick={() => togglePublic(doc)}
                        disabled={!canManage || busyId === doc.id}
                        title={doc.isPublic ? "Remove from the public website" : "Publish to the public website"}
                      >
                        {doc.isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
                        {doc.isPublic ? "Public" : "Internal"}
                      </button>
                    </td>
                  ) : null}
                  <td>
                    {doc.fileUrl ? (
                      <a href={assetUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success py-0 px-2">
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-end text-nowrap">
                    {canManage ? (
                      <>
                        <button className="btn btn-sm btn-link text-secondary p-1" onClick={() => openEdit(doc)} title="Edit document">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm btn-link text-danger p-1" onClick={() => handleDelete(doc)} title="Delete document">
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {visibleDocs.length === 0 ? (
                <tr>
                  <td colSpan={isPublicScope ? 7 : 8} className="text-center text-muted py-5">
                    {isPublicScope
                      ? "No documents have been released to the public library yet."
                      : "No documents match this view. Add the first record or clear the filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      <div className="document-library__note">
        <Lock size={14} />
        <span>
          Every upload receives a unique number (for example EB-POL-2026-0001). Manual numbers are checked
          across the whole registry, so the same number cannot be used twice.
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone }) {
  return (
    <div className={`document-stat ${tone === "warn" ? "document-stat--warn" : ""}`}>
      <span className="document-stat__icon">{icon}</span>
      <span className="document-stat__value">{value}</span>
      <span className="document-stat__label">{label}</span>
    </div>
  );
}

function DocumentForm({ doc, defaultPublic, onSave, onClose }) {
  const [data, setData] = useState(() => ({
    ...EMPTY_FORM,
    ...(doc
      ? {
          title: doc.title || "",
          docNumber: doc.docNumber || "",
          thematic: doc.thematic || "General",
          thematicOther: doc.thematicOther || "",
          type: doc.type || "Report",
          typeOther: doc.typeOther || "",
          status: doc.status || "Active",
          notes: doc.notes || "",
          isPublic: Boolean(doc.isPublic),
        }
      : { isPublic: defaultPublic }),
  }));
  const fileRef = useRef(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!doc && !fileRef.current?.files?.[0]) {
      setFormError("Choose the document file to upload.");
      return;
    }
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "isPublic") fd.append(key, value ? "true" : "false");
      else fd.append(key, value ?? "");
    });
    if (fileRef.current?.files?.[0]) fd.append("file", fileRef.current.files[0]);
    setSaving(true);
    try {
      await onSave(fd);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(11,37,69,0.55)", zIndex: 1050 }} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-0">{doc ? "Edit document" : "File a new document"}</h5>
              <div className="small text-muted">
                {doc ? doc.docNumber || "Number not assigned" : "A unique number is assigned automatically if you leave it blank."}
              </div>
            </div>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger py-2 small">{formError}</div> : null}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-bold">Title *</label>
                  <input className="form-control" required value={data.title} onChange={(event) => set("title", event.target.value)} />
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-bold">Document number</label>
                  <input
                    className="form-control"
                    value={data.docNumber}
                    onChange={(event) => set("docNumber", event.target.value)}
                    placeholder={doc ? data.docNumber || "Not assigned" : "Auto · EB-POL-2026-0001"}
                  />
                  <div className="form-text">Leave blank on a new document to auto-number.</div>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-bold">Type *</label>
                  <select className="form-select" value={data.type} onChange={(event) => set("type", event.target.value)}>
                    {TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type === "Other" ? "Other (specify)" : type}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Status</label>
                  <select className="form-select" value={data.status} onChange={(event) => set("status", event.target.value)}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {data.type === "Other" ? (
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Specify document type *</label>
                    <input
                      className="form-control"
                      required
                      value={data.typeOther}
                      onChange={(event) => set("typeOther", event.target.value)}
                      placeholder="e.g., Board resolution, MOU, Standard operating manual"
                    />
                  </div>
                ) : null}

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Thematic area</label>
                  <select className="form-select" value={data.thematic} onChange={(event) => set("thematic", event.target.value)}>
                    {THEMATIC_OPTIONS.map((area) => (
                      <option key={area}>{area}</option>
                    ))}
                  </select>
                </div>
                {data.thematic === "Other" ? (
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Specify thematic area *</label>
                    <input className="form-control" required value={data.thematicOther} onChange={(event) => set("thematicOther", event.target.value)} />
                  </div>
                ) : null}

                <div className="col-12">
                  <label className="form-label small fw-bold">Notes</label>
                  <textarea className="form-control" rows={2} value={data.notes} onChange={(event) => set("notes", event.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold">File {doc ? "(leave blank to keep the current file)" : "*"}</label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="form-control"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    required={!doc}
                  />
                  {doc?.fileName ? <div className="form-text">Current file: {doc.fileName}</div> : null}
                </div>

                <div className="col-12">
                  <div className={`doc-public-choice ${data.isPublic ? "is-on" : ""}`}>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="doc-public"
                        checked={data.isPublic}
                        onChange={(event) => set("isPublic", event.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="doc-public">
                        <strong>Release to the public website</strong>
                        <span>
                          {data.isPublic
                            ? "This file will appear in the public document library once it is Active."
                            : "Kept in the internal archive only. You can publish it later with one click."}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-brand" disabled={saving}>
                {saving ? "Saving…" : doc ? "Save changes" : "File document"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
