import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api, buildQuery } from "../../lib/api";
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

const EMPTY_SUMMARY = { total: 0, approved: 0, inReview: 0, dueForReview: 0 };

function personName(person) {
  if (!person) return "—";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username || "—";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGE[status] || "bg-secondary"}`}>{status?.replace("_", " ")}</span>;
}

export default function QmsDocuments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [dueOnly, setDueOnly] = useState(searchParams.get("filter") === "due");

  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery({
        status,
        category,
        department,
        search,
        filter: dueOnly ? "due" : "",
      });
      const data = await api.get(`/qms/documents${query}`);
      setItems(data?.items || []);
      setSummary(data?.summary || EMPTY_SUMMARY);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, category, department, search, dueOnly]);

  useEffect(() => {
    const timer = setTimeout(load, 220);
    return () => clearTimeout(timer);
  }, [load]);

  const canCreate = canCreateQmsDocument(user);
  const approver = isQmsApprover(user);

  const canEdit = (doc) =>
    ["DRAFT", "IN_REVIEW"].includes(doc.status) &&
    (doc.owner?.username === user?.username ||
      doc.approver?.username === user?.username ||
      approver);

  const canSupersede = (doc) =>
    doc.status === "APPROVED" &&
    (doc.owner?.username === user?.username || approver);

  const kpis = useMemo(
    () => [
      { key: "total", label: "Total documents", value: summary.total, icon: FileText, tone: "primary" },
      { key: "approved", label: "Approved", value: summary.approved, icon: CheckCircle2, tone: "success" },
      { key: "review", label: "In review", value: summary.inReview, icon: Clock3, tone: "warning" },
      { key: "due", label: "Due for review", value: summary.dueForReview, icon: CalendarClock, tone: "danger" },
    ],
    [summary],
  );

  const openModal = (type, doc) => setModal({ type, doc, value: "", busy: false, error: null });
  const closeModal = () => setModal(null);

  const runModal = async () => {
    if (!modal) return;
    const { type, doc, value } = modal;
    if (type === "reject" && value.trim().length < 3) {
      setModal((current) => ({ ...current, error: "Give a reason of at least 3 characters." }));
      return;
    }
    if (type === "supersede" && value.trim().length < 5) {
      setModal((current) => ({ ...current, error: "Describe the change in at least 5 characters." }));
      return;
    }

    setModal((current) => ({ ...current, busy: true, error: null }));
    try {
      if (type === "approve") {
        await api.post(`/qms/documents/${doc.id}/approve`, {});
        setNotice(`${doc.code} v${doc.version} approved.`);
      } else if (type === "reject") {
        await api.post(`/qms/documents/${doc.id}/reject`, { reason: value.trim() });
        setNotice(`${doc.code} v${doc.version} returned to draft.`);
      } else if (type === "obsolete") {
        await api.post(`/qms/documents/${doc.id}/obsolete`, {});
        setNotice(`${doc.code} v${doc.version} marked obsolete.`);
      } else if (type === "supersede") {
        const created = await api.post(`/qms/documents/${doc.id}/supersede`, {
          changeSummary: value.trim(),
        });
        setNotice(`New draft ${created.code} v${created.version} created.`);
        closeModal();
        await load();
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
    approve: "Approve document",
    reject: "Return document for changes",
    obsolete: "Obsolete document",
    supersede: "Create new version",
  }[modal?.type] || "";

  return (
    <div>
      <Helmet><title>QMS Document Register | EB-EMS</title></Helmet>
      <QmsShell
        title="Document register"
        description="Controlled documents, version history and approval records under WHO GMP document control. Superseded versions are retained; nothing leaves the register without an audited decision."
        actions={(
          <>
            <button type="button" className="btn btn-light btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className="me-1" /> Refresh
            </button>
            {canCreate ? (
              <Link to="/qms/documents/new" className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1">
                <PlusCircle size={15} /> Add document
              </Link>
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

      <div className="row g-3 mb-4">
        {kpis.map(({ key, label, value, icon: Icon, tone }) => (
          <div className="col-6 col-xl-3" key={key}>
            <button
              type="button"
              className={`card border-0 shadow-sm h-100 w-100 text-start ${key === "due" ? "qms-kpi-button" : ""}`}
              onClick={() => {
                if (key === "due") {
                  setStatus("");
                  setDueOnly(true);
                }
              }}
              style={{ cursor: key === "due" ? "pointer" : "default" }}
            >
              <div className="card-body d-flex align-items-center gap-3">
                <span className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-${tone} bg-opacity-10 text-${tone}`} style={{ width: 44, height: 44 }}>
                  <Icon size={21} />
                </span>
                <span>
                  <span className="d-block text-muted small">{label}</span>
                  <span className="d-block h4 mb-0">{loading && !summary.total ? "—" : value}</span>
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-xl-4">
              <label className="form-label small fw-semibold" htmlFor="qms-search">Search</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text"><Search size={14} /></span>
                <input
                  id="qms-search"
                  className="form-control"
                  placeholder="Code, title or description"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <label className="form-label small fw-semibold" htmlFor="qms-status">Status</label>
              <select id="qms-status" className="form-select form-select-sm" value={status} onChange={(event) => { setStatus(event.target.value); setDueOnly(false); }}>
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In review</option>
                <option value="APPROVED">Approved</option>
                <option value="SUPERSEDED">Superseded</option>
                <option value="OBSOLETE">Obsolete</option>
              </select>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <label className="form-label small fw-semibold" htmlFor="qms-category">Category</label>
              <select id="qms-category" className="form-select form-select-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <label className="form-label small fw-semibold" htmlFor="qms-department">Department</label>
              <select id="qms-department" className="form-select form-select-sm" value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="">All departments</option>
                {DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <button
                type="button"
                className={`btn btn-sm w-100 ${dueOnly ? "btn-danger" : "btn-outline-secondary"}`}
                onClick={() => setDueOnly((current) => !current)}
              >
                {dueOnly ? "Clear due filter" : "Due in 30 days"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {dueOnly ? (
        <div className="alert alert-warning py-2 d-flex justify-content-between align-items-center">
          <span className="small">Showing approved documents whose periodic review is due within 30 days.</span>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setDueOnly(false)}>Show all</button>
        </div>
      ) : null}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Category</th>
                <th>Version</th>
                <th>Status</th>
                <th>Department</th>
                <th>Owner</th>
                <th>Effective</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-5">
                    <span className="spinner-border spinner-border-sm me-2" role="status" /> Loading documents…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5">
                    <ShieldCheck size={30} className="text-muted mb-2" />
                    <p className="text-muted mb-2">
                      No QMS documents yet. Click Add Document to register the first one.
                    </p>
                    {canCreate ? (
                      <Link to="/qms/documents/new" className="btn btn-brand btn-sm">
                        <PlusCircle size={14} className="me-1" /> Add Document
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ) : (
                items.map((doc) => (
                  <tr key={doc.id}>
                    <td className="fw-semibold text-nowrap">{doc.code}</td>
                    <td>
                      <Link to={`/qms/documents/${doc.id}`} className="text-decoration-none fw-medium">
                        {doc.title}
                      </Link>
                      {doc.titleAm ? <div className="small text-muted">{doc.titleAm}</div> : null}
                    </td>
                    <td className="text-nowrap">{doc.category}</td>
                    <td className="text-nowrap">v{doc.version}</td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td>{doc.department || "—"}</td>
                    <td className="text-nowrap">{personName(doc.owner)}</td>
                    <td className="text-nowrap">{formatDate(doc.effectiveDate)}</td>
                    <td>
                      <div className="d-flex justify-content-end gap-1">
                        <Link
                          to={`/qms/documents/${doc.id}`}
                          className="btn btn-outline-secondary btn-sm"
                          title="View document"
                        >
                          <Eye size={14} />
                        </Link>
                        {canEdit(doc) ? (
                          <Link
                            to={`/qms/documents/${doc.id}`}
                            className="btn btn-outline-primary btn-sm"
                            title="Edit document"
                          >
                            <Pencil size={14} />
                          </Link>
                        ) : null}
                        {doc.status === "IN_REVIEW" && approver ? (
                          <>
                            <button type="button" className="btn btn-success btn-sm" title="Approve" onClick={() => openModal("approve", doc)}>
                              <CheckCircle2 size={14} />
                            </button>
                            <button type="button" className="btn btn-outline-danger btn-sm" title="Reject" onClick={() => openModal("reject", doc)}>
                              <XCircle size={14} />
                            </button>
                          </>
                        ) : null}
                        {canSupersede(doc) ? (
                          <button type="button" className="btn btn-outline-primary btn-sm" title="Create new version" onClick={() => openModal("supersede", doc)}>
                            <PlusCircle size={14} />
                          </button>
                        ) : null}
                        {doc.status === "APPROVED" && approver ? (
                          <button type="button" className="btn btn-outline-dark btn-sm" title="Obsolete" onClick={() => openModal("obsolete", doc)}>
                            <XCircle size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                <p className="mb-3">
                  <strong>{modal.doc.code} v{modal.doc.version}</strong>
                  <span className="text-muted"> — {modal.doc.title}</span>
                </p>

                {modal.type === "approve" ? (
                  <p className="mb-0">This confirms the document has been reviewed and is approved for use. The owner will be notified.</p>
                ) : null}

                {modal.type === "obsolete" ? (
                  <p className="mb-0">The document will be marked obsolete and retained for audit history. This cannot be reversed from the register.</p>
                ) : null}

                {modal.type === "reject" ? (
                  <>
                    <label className="form-label small fw-semibold" htmlFor="qms-reject-reason">Reason for return</label>
                    <textarea
                      id="qms-reject-reason"
                      className="form-control"
                      rows={4}
                      placeholder="What must the owner correct before resubmission?"
                      value={modal.value}
                      onChange={(event) => setModal((current) => ({ ...current, value: event.target.value }))}
                    />
                  </>
                ) : null}

                {modal.type === "supersede" ? (
                  <>
                    <label className="form-label small fw-semibold" htmlFor="qms-change-summary">Change summary</label>
                    <textarea
                      id="qms-change-summary"
                      className="form-control"
                      rows={4}
                      placeholder="Summarise what changed and why a new version is required."
                      value={modal.value}
                      onChange={(event) => setModal((current) => ({ ...current, value: event.target.value }))}
                    />
                    <div className="form-text">
                      The current version becomes SUPERSEDED and a new DRAFT is created with the next major version.
                    </div>
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
