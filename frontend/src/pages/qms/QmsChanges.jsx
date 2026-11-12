import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2,
  Eye,
  GitPullRequest,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { api, buildQuery } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { isQmsApprover } from "../../lib/access";
import QmsShell from "./QmsShell";
import {
  QMS_DEPARTMENTS,
  QmsBadge,
  QmsEmpty,
  QmsField,
  QmsModal,
  fmtDate,
  personName,
  qmsStatusLabel,
} from "./qmsUi";

const CATEGORIES = ["Document", "Process", "Equipment", "Facility", "System", "Supplier"];
const RISK_LEVELS = ["High", "Medium", "Low"];

const EMPTY_SUMMARY = { total: 0, draft: 0, inReview: 0, approved: 0, implemented: 0, closed: 0, rejected: 0 };

function emptyForm() {
  return {
    title: "",
    description: "",
    reason: "",
    category: "Process",
    riskLevel: "Medium",
    department: "QA",
    ownerId: "",
    impactAssessment: "",
    implementationPlan: "",
    effectiveDate: "",
    relatedDocument: "",
  };
}

export default function QmsChanges() {
  const { user } = useAuth();
  const approver = isQmsApprover(user);

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [riskLevel, setRiskLevel] = useState("");

  const [formModal, setFormModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery({ status, riskLevel, search });
      const data = await api.get(`/qms/changes${query}`);
      setItems(data?.items || []);
      setSummary(data?.summary || EMPTY_SUMMARY);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, riskLevel, search]);

  useEffect(() => {
    const timer = setTimeout(load, 220);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    api.get("/qms/documents/people").then(setPeople).catch(() => setPeople([]));
  }, []);

  const canManage = (item) => item?.owner?.username === user?.username || approver;

  const openDetail = async (item) => {
    setModalError(null);
    try {
      setDetail(await api.get(`/qms/changes/${item.id}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshDetail = async (id) => {
    try {
      setDetail(await api.get(`/qms/changes/${id}`));
    } catch {
      setDetail(null);
    }
  };

  const create = async () => {
    setBusy(true);
    setModalError(null);
    try {
      const created = await api.post("/qms/changes", formModal);
      setFormModal(null);
      setNotice(`${created.code} drafted.`);
      await load();
      await openDetail(created);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (item, action, body = {}) => {
    try {
      await api.post(`/qms/changes/${item.id}/${action}`, body);
      setNotice(`${item.code} ${action === "submit" ? "submitted for review" : action === "approve" ? "approved" : action === "reject" ? "returned to draft" : action === "implement" ? "marked implemented" : "closed"}.`);
      await load();
      await refreshDetail(item.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const runActionModal = async () => {
    const changeId = actionModal?.id || detail?.id;
    if (!changeId) return;
    setBusy(true);
    setModalError(null);
    try {
      await api.post(`/qms/changes/${changeId}/${actionModal.mode}`, actionModal.mode === "reject" ? { reason: actionModal.reason } : { closureNotes: actionModal.closureNotes });
      setActionModal(null);
      setNotice(`Change ${actionModal.mode === "reject" ? "returned to draft" : "closed"}.`);
      await load();
      await refreshDetail(changeId);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const kpis = [
    { label: "Total changes", value: summary.total, tone: "navy", icon: GitPullRequest },
    { label: "Awaiting review", value: summary.inReview, tone: "blue", icon: ShieldAlert },
    { label: "Approved", value: summary.approved, tone: "green", icon: CheckCircle2 },
    { label: "Implemented / closed", value: summary.implemented + summary.closed, tone: "navy", icon: CheckCircle2 },
  ];

  return (
    <div>
      <Helmet><title>QMS Change Control | EB-EMS</title></Helmet>
      <QmsShell
        title="Change control"
        description="Assess impact before anything changes. Each request moves from draft to QA review, approval, implementation and closure, with the risk assessment and evidence recorded at each stage."
        actions={(
          <button type="button" className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1" onClick={() => { setModalError(null); setFormModal(emptyForm()); }}>
            <PlusCircle size={15} /> Request change
          </button>
        )}
      >
        {error ? <div className="qms-alert qms-alert--danger mb-3"><span>{error}</span><button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button></div> : null}
        {notice ? <div className="qms-alert qms-alert--success mb-3"><span>{notice}</span><button type="button" className="btn-close" onClick={() => setNotice(null)} /></div> : null}

        <div className="qms-grid qms-grid--4 mb-4">
          {kpis.map(({ label, value, tone, icon: Icon }) => (
            <article className={`qms-kpi qms-kpi--${tone}`} key={label}>
              <div className="qms-kpi__label">{label}</div>
              <div className="qms-kpi__value">{loading && !value ? "—" : value}</div>
              <span className="qms-kpi__icon"><Icon size={18} /></span>
            </article>
          ))}
        </div>

        <div className="qms-toolbar mb-3">
          <div className="qms-toolbar__search">
            <label htmlFor="chg-search">Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text"><Search size={14} /></span>
              <input id="chg-search" className="form-control" placeholder="Code, title, reason or document" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ minWidth: 160 }}>
            <label htmlFor="chg-status">Status</label>
            <select id="chg-status" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In review</option>
              <option value="APPROVED">Approved</option>
              <option value="IMPLEMENTED">Implemented</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label htmlFor="chg-risk">Risk</label>
            <select id="chg-risk" className="form-select form-select-sm" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
              <option value="">All risks</option>
              {RISK_LEVELS.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className="me-1" /> Refresh
          </button>
        </div>

        {items.length === 0 && !loading ? (
          <div className="qms-card">
            <QmsEmpty icon={GitPullRequest} title="No change controls in this view">
              Use change control for any planned change to a document, process, equipment, facility, system or supplier.
            </QmsEmpty>
          </div>
        ) : (
          <div className="qms-table-wrap">
            <table className="qms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Change</th>
                  <th>Risk</th>
                  <th>Category</th>
                  <th>Owner</th>
                  <th>Effective</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="qms-table__code">{item.code}</td>
                    <td>
                      <button type="button" className="btn btn-link p-0 qms-table__title text-start" onClick={() => openDetail(item)}>{item.title}</button>
                      <div className="qms-table__sub">{item.reason?.slice(0, 90)}{item.reason?.length > 90 ? "…" : ""}</div>
                    </td>
                    <td><QmsBadge status={item.riskLevel} /></td>
                    <td>{item.category}</td>
                    <td className="text-nowrap">{personName(item.owner)}</td>
                    <td className="text-nowrap">{fmtDate(item.effectiveDate)}</td>
                    <td><QmsBadge status={item.status} /></td>
                    <td>
                      <div className="qms-row-actions">
                        <button type="button" className="btn btn-outline-secondary btn-sm" title="View" onClick={() => openDetail(item)}><Eye size={14} /></button>
                        {item.status === "DRAFT" && item.owner?.username === user?.username ? <button type="button" className="btn btn-outline-primary btn-sm" title="Submit" onClick={() => act(item, "submit")}><Send size={14} /></button> : null}
                        {item.status === "IN_REVIEW" && approver ? <button type="button" className="btn btn-success btn-sm" title="Approve" onClick={() => act(item, "approve")}><CheckCircle2 size={14} /></button> : null}
                        {item.status === "IN_REVIEW" && approver ? <button type="button" className="btn btn-outline-danger btn-sm" title="Reject" onClick={() => { setModalError(null); setActionModal({ id: item.id, mode: "reject", reason: "" }); openDetail(item); }}><XCircle size={14} /></button> : null}
                        {item.status === "APPROVED" && canManage(item) ? <button type="button" className="btn btn-outline-primary btn-sm" title="Record implementation" onClick={() => act(item, "implement")}><GitPullRequest size={14} /></button> : null}
                        {item.status === "IMPLEMENTED" && approver ? <button type="button" className="btn btn-success btn-sm" title="Close" onClick={() => { setModalError(null); setActionModal({ id: item.id, mode: "close", closureNotes: "" }); openDetail(item); }}><CheckCircle2 size={14} /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QmsShell>

      {formModal ? (
        <QmsModal
          title="Request a change"
          subtitle="Record the reason, impact and implementation plan before QA review."
          wide
          onClose={() => setFormModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setFormModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-brand btn-sm" onClick={create} disabled={busy}>{busy ? "Saving…" : "Create draft"}</button>
            </>
          )}
        >
          {modalError ? <div className="qms-alert qms-alert--danger mb-3">{modalError}</div> : null}
          <div className="qms-form-grid">
            <QmsField label="Title" required full>
              <input className="form-control" value={formModal.title} onChange={(e) => setFormModal({ ...formModal, title: e.target.value })} />
            </QmsField>
            <QmsField label="What will change" required full>
              <textarea className="form-control" rows={3} value={formModal.description} onChange={(e) => setFormModal({ ...formModal, description: e.target.value })} />
            </QmsField>
            <QmsField label="Reason for change" required full>
              <textarea className="form-control" rows={3} value={formModal.reason} onChange={(e) => setFormModal({ ...formModal, reason: e.target.value })} />
            </QmsField>
            <QmsField label="Category">
              <select className="form-select" value={formModal.category} onChange={(e) => setFormModal({ ...formModal, category: e.target.value })}>
                {CATEGORIES.map((value) => <option key={value}>{value}</option>)}
              </select>
            </QmsField>
            <QmsField label="Risk level">
              <select className="form-select" value={formModal.riskLevel} onChange={(e) => setFormModal({ ...formModal, riskLevel: e.target.value })}>
                {RISK_LEVELS.map((value) => <option key={value}>{value}</option>)}
              </select>
            </QmsField>
            <QmsField label="Department">
              <select className="form-select" value={formModal.department} onChange={(e) => setFormModal({ ...formModal, department: e.target.value })}>
                {QMS_DEPARTMENTS.map((value) => <option key={value}>{value}</option>)}
              </select>
            </QmsField>
            <QmsField label="Owner">
              <select className="form-select" value={formModal.ownerId} onChange={(e) => setFormModal({ ...formModal, ownerId: e.target.value })}>
                <option value="">Me (the signed-in requester)</option>
                {people.map((person) => <option key={person.id} value={person.id}>{personName(person)} — {person.position || person.username}</option>)}
              </select>
            </QmsField>
            <QmsField label="Related document" hint="Controlled document code or reference.">
              <input className="form-control" value={formModal.relatedDocument} onChange={(e) => setFormModal({ ...formModal, relatedDocument: e.target.value })} />
            </QmsField>
            <QmsField label="Target effective date">
              <input type="date" className="form-control" value={formModal.effectiveDate} onChange={(e) => setFormModal({ ...formModal, effectiveDate: e.target.value })} />
            </QmsField>
            <QmsField label="Impact assessment" full>
              <textarea className="form-control" rows={4} value={formModal.impactAssessment} onChange={(e) => setFormModal({ ...formModal, impactAssessment: e.target.value })} />
            </QmsField>
            <QmsField label="Implementation plan" full>
              <textarea className="form-control" rows={4} value={formModal.implementationPlan} onChange={(e) => setFormModal({ ...formModal, implementationPlan: e.target.value })} />
            </QmsField>
          </div>
        </QmsModal>
      ) : null}

      {detail ? (
        <QmsModal
          title={`${detail.code} · ${qmsStatusLabel(detail.status)}`}
          subtitle={detail.title}
          wide
          onClose={() => setDetail(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setDetail(null)}>Close</button>
              {detail.status === "DRAFT" && detail.owner?.username === user?.username ? <button type="button" className="btn btn-brand btn-sm" onClick={() => act(detail, "submit")}>Submit for review</button> : null}
              {detail.status === "IN_REVIEW" && approver ? <button type="button" className="btn btn-success btn-sm" onClick={() => act(detail, "approve")}>Approve</button> : null}
              {detail.status === "IN_REVIEW" && approver ? <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { setModalError(null); setActionModal({ id: detail.id, mode: "reject", reason: "" }); }}>Reject</button> : null}
              {detail.status === "APPROVED" && canManage(detail) ? <button type="button" className="btn btn-brand btn-sm" onClick={() => act(detail, "implement")}>Record implementation</button> : null}
              {detail.status === "IMPLEMENTED" && approver ? <button type="button" className="btn btn-success btn-sm" onClick={() => { setModalError(null); setActionModal({ id: detail.id, mode: "close", closureNotes: "" }); }}>Close change</button> : null}
            </>
          )}
        >
          <div className="qms-detail-grid">
            <div>
              <dl className="qms-detail-list">
                <div><dt>Description</dt><dd>{detail.description}</dd></div>
                <div><dt>Reason</dt><dd>{detail.reason}</dd></div>
                <div><dt>Impact assessment</dt><dd>{detail.impactAssessment || "Not recorded"}</dd></div>
                <div><dt>Implementation plan</dt><dd>{detail.implementationPlan || "Not recorded"}</dd></div>
                <div><dt>Closure notes</dt><dd>{detail.closureNotes || "Not recorded"}</dd></div>
              </dl>
            </div>
            <div>
              <dl className="qms-detail-list">
                <div><dt>Status</dt><dd><QmsBadge status={detail.status} /></dd></div>
                <div><dt>Risk</dt><dd><QmsBadge status={detail.riskLevel} /></dd></div>
                <div><dt>Category</dt><dd>{detail.category}</dd></div>
                <div><dt>Owner</dt><dd>{personName(detail.owner)}</dd></div>
                <div><dt>Approver</dt><dd>{personName(detail.approvedBy)}</dd></div>
                <div><dt>Effective</dt><dd>{fmtDate(detail.effectiveDate)}</dd></div>
                <div><dt>Related document</dt><dd>{detail.relatedDocument || "—"}</dd></div>
                <div><dt>Implemented</dt><dd>{fmtDate(detail.implementedAt)}</dd></div>
                {detail.rejectionReason ? <div><dt>Rejection reason</dt><dd className="text-danger">{detail.rejectionReason}</dd></div> : null}
              </dl>
            </div>
          </div>
        </QmsModal>
      ) : null}

      {actionModal ? (
        <QmsModal
          title={actionModal.mode === "reject" ? "Return change to draft" : "Close change"}
          subtitle={actionModal.mode === "reject" ? "Tell the owner what must change before resubmission." : "Record the implementation outcome and evidence."}
          onClose={() => setActionModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setActionModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className={`btn ${actionModal.mode === "reject" ? "btn-danger" : "btn-success"} btn-sm`} onClick={runActionModal} disabled={busy}>
                {busy ? "Working…" : actionModal.mode === "reject" ? "Return to draft" : "Close change"}
              </button>
            </>
          )}
        >
          {modalError ? <div className="qms-alert qms-alert--danger mb-3">{modalError}</div> : null}
          <QmsField label={actionModal.mode === "reject" ? "Rejection reason" : "Closure notes"} required full>
            <textarea
              className="form-control"
              rows={4}
              value={actionModal.mode === "reject" ? actionModal.reason : actionModal.closureNotes}
              onChange={(e) => setActionModal(actionModal.mode === "reject" ? { ...actionModal, reason: e.target.value } : { ...actionModal, closureNotes: e.target.value })}
            />
          </QmsField>
        </QmsModal>
      ) : null}
    </div>
  );
}
