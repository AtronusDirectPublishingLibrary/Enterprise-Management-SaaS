import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
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
  dateInput,
  fmtDate,
  personName,
  qmsStatusLabel,
} from "./qmsUi";

const CATEGORIES = ["Product", "Process", "Equipment", "Document", "Supplier", "Other"];
const SEVERITIES = ["Critical", "Major", "Minor"];
const SOURCES = ["Internal", "Audit", "Complaint", "Supplier", "Regulatory", "Customer"];

const EMPTY_SUMMARY = { total: 0, open: 0, investigating: 0, closed: 0, criticalOpen: 0 };

function emptyForm() {
  return {
    title: "",
    description: "",
    category: "Process",
    severity: "Minor",
    source: "Internal",
    department: "QA",
    ownerId: "",
    detectedAt: dateInput(new Date()),
    dueAt: "",
    immediateAction: "",
  };
}

export default function QmsDeviations() {
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
  const [severity, setSeverity] = useState("");

  const [formModal, setFormModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery({ status, severity, search });
      const data = await api.get(`/qms/deviations${query}`);
      setItems(data?.items || []);
      setSummary(data?.summary || EMPTY_SUMMARY);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, severity, search]);

  useEffect(() => {
    const timer = setTimeout(load, 220);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    api.get("/qms/documents/people").then(setPeople).catch(() => setPeople([]));
  }, []);

  const canManage = (item) =>
    item?.owner?.username === user?.username || item?.reportedBy?.username === user?.username || approver;

  const openDetail = async (item) => {
    setModalError(null);
    try {
      const full = await api.get(`/qms/deviations/${item.id}`);
      setDetail(full);
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshDetail = async (id) => {
    try {
      setDetail(await api.get(`/qms/deviations/${id}`));
    } catch {
      setDetail(null);
    }
  };

  const create = async () => {
    setBusy(true);
    setModalError(null);
    try {
      const created = await api.post("/qms/deviations", formModal);
      setFormModal(null);
      setNotice(`${created.code} reported.`);
      await load();
      await openDetail(created);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const investigate = async (item) => {
    try {
      await api.post(`/qms/deviations/${item.id}/investigate`, {});
      setNotice(`${item.code} moved to investigation.`);
      await load();
      await refreshDetail(item.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const close = async () => {
    const deviationId = closeModal?.deviationId || detail?.id;
    if (!deviationId) return;
    setBusy(true);
    setModalError(null);
    try {
      await api.post(`/qms/deviations/${deviationId}/close`, {
        rootCause: closeModal.rootCause,
        investigation: closeModal.investigation,
        closureNotes: closeModal.closureNotes,
      });
      setCloseModal(null);
      setNotice("Deviation closed.");
      await load();
      await refreshDetail(deviationId);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const kpis = [
    { label: "Total deviations", value: summary.total, tone: "navy", icon: AlertTriangle },
    { label: "Open", value: summary.open, tone: "red", icon: ShieldAlert },
    { label: "Under investigation", value: summary.investigating, tone: "blue", icon: Search },
    { label: "Critical open", value: summary.criticalOpen, tone: "red", icon: AlertTriangle },
  ];

  return (
    <div>
      <Helmet><title>QMS Deviations | EB-EMS</title></Helmet>
      <QmsShell
        title="Deviation management"
        description="Report, contain and investigate anything that departs from an approved process, specification or document. A deviation stays open until QA records the root cause, investigation and closure decision."
        actions={(
          <button
            type="button"
            className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1"
            onClick={() => { setModalError(null); setFormModal(emptyForm()); }}
          >
            <PlusCircle size={15} /> Report deviation
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
            <label htmlFor="dev-search">Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text"><Search size={14} /></span>
              <input id="dev-search" className="form-control" placeholder="Code, title or description" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ minWidth: 150 }}>
            <label htmlFor="dev-status">Status</label>
            <select id="dev-status" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_INVESTIGATION">Under investigation</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label htmlFor="dev-severity">Severity</label>
            <select id="dev-severity" className="form-select form-select-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All severities</option>
              {SEVERITIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className="me-1" /> Refresh
          </button>
        </div>

        {items.length === 0 && !loading ? (
          <div className="qms-card">
            <QmsEmpty icon={CheckCircle2} title="No deviations in this view">
              Quality events are recorded here when a process, product, document or supplier departs from the approved standard.
            </QmsEmpty>
          </div>
        ) : (
          <div className="qms-table-wrap">
            <table className="qms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Deviation</th>
                  <th>Severity</th>
                  <th>Category / source</th>
                  <th>Department</th>
                  <th>Owner</th>
                  <th>Detected</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="qms-table__code">{item.code}</td>
                    <td>
                      <button type="button" className="btn btn-link p-0 qms-table__title text-start" onClick={() => openDetail(item)}>
                        {item.title}
                      </button>
                      <div className="qms-table__sub">{item.description?.slice(0, 90)}{item.description?.length > 90 ? "…" : ""}</div>
                    </td>
                    <td><QmsBadge status={item.severity} /></td>
                    <td><div>{item.category}</div><div className="qms-table__sub">{item.source}</div></td>
                    <td>{item.department || "—"}</td>
                    <td className="text-nowrap">{personName(item.owner)}</td>
                    <td className="text-nowrap">{fmtDate(item.detectedAt)}</td>
                    <td><QmsBadge status={item.status} /></td>
                    <td>
                      <div className="qms-row-actions">
                        <button type="button" className="btn btn-outline-secondary btn-sm" title="View" onClick={() => openDetail(item)}>
                          <Eye size={14} />
                        </button>
                        {item.status === "OPEN" && canManage(item) ? (
                          <button type="button" className="btn btn-outline-primary btn-sm" title="Start investigation" onClick={() => investigate(item)}>
                            <Search size={14} />
                          </button>
                        ) : null}
                        {item.status === "UNDER_INVESTIGATION" && approver ? (
                          <button type="button" className="btn btn-success btn-sm" title="Close deviation" onClick={() => { setModalError(null); setCloseModal({ deviationId: item.id, rootCause: item.rootCause || "", investigation: item.investigation || "", closureNotes: "" }); openDetail(item); }}>
                            <CheckCircle2 size={14} />
                          </button>
                        ) : null}
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
          title="Report a deviation"
          subtitle="Use factual language: what happened, where, when and the immediate containment."
          onClose={() => setFormModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setFormModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-brand btn-sm" onClick={create} disabled={busy}>{busy ? "Saving…" : "Report deviation"}</button>
            </>
          )}
        >
          {modalError ? <div className="qms-alert qms-alert--danger mb-3">{modalError}</div> : null}
          <div className="qms-form">
            <div className="qms-form-grid">
              <QmsField label="Title" required full>
                <input className="form-control" value={formModal.title} onChange={(e) => setFormModal({ ...formModal, title: e.target.value })} placeholder="Short factual summary" />
              </QmsField>
              <QmsField label="What happened" required full hint="Include the batch, area, equipment or document involved. Do not speculate about cause here.">
                <textarea className="form-control" rows={4} value={formModal.description} onChange={(e) => setFormModal({ ...formModal, description: e.target.value })} />
              </QmsField>
              <QmsField label="Category">
                <select className="form-select" value={formModal.category} onChange={(e) => setFormModal({ ...formModal, category: e.target.value })}>
                  {CATEGORIES.map((value) => <option key={value}>{value}</option>)}
                </select>
              </QmsField>
              <QmsField label="Severity">
                <select className="form-select" value={formModal.severity} onChange={(e) => setFormModal({ ...formModal, severity: e.target.value })}>
                  {SEVERITIES.map((value) => <option key={value}>{value}</option>)}
                </select>
              </QmsField>
              <QmsField label="Source">
                <select className="form-select" value={formModal.source} onChange={(e) => setFormModal({ ...formModal, source: e.target.value })}>
                  {SOURCES.map((value) => <option key={value}>{value}</option>)}
                </select>
              </QmsField>
              <QmsField label="Department">
                <select className="form-select" value={formModal.department} onChange={(e) => setFormModal({ ...formModal, department: e.target.value })}>
                  {QMS_DEPARTMENTS.map((value) => <option key={value}>{value}</option>)}
                </select>
              </QmsField>
              <QmsField label="Owner">
                <select className="form-select" value={formModal.ownerId} onChange={(e) => setFormModal({ ...formModal, ownerId: e.target.value })}>
                  <option value="">Me (the signed-in reporter)</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{personName(person)} — {person.position || person.username}</option>)}
                </select>
              </QmsField>
              <QmsField label="Detected on">
                <input type="date" className="form-control" value={formModal.detectedAt} onChange={(e) => setFormModal({ ...formModal, detectedAt: e.target.value })} />
              </QmsField>
              <QmsField label="Target closure">
                <input type="date" className="form-control" value={formModal.dueAt} onChange={(e) => setFormModal({ ...formModal, dueAt: e.target.value })} />
              </QmsField>
              <QmsField label="Immediate containment" full hint="What was done immediately to protect patients, product or records?">
                <textarea className="form-control" rows={3} value={formModal.immediateAction} onChange={(e) => setFormModal({ ...formModal, immediateAction: e.target.value })} />
              </QmsField>
            </div>
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
              {detail.status === "OPEN" && canManage(detail) ? (
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => investigate(detail)}>Start investigation</button>
              ) : null}
              {detail.status === "UNDER_INVESTIGATION" && approver ? (
                <button type="button" className="btn btn-success btn-sm" onClick={() => { setModalError(null); setCloseModal({ deviationId: detail.id, rootCause: detail.rootCause || "", investigation: detail.investigation || "", closureNotes: "" }); }}>Close deviation</button>
              ) : null}
              <Link to={`/qms/capa?deviationId=${detail.id}`} className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1">
                <Wrench size={14} /> Create CAPA
              </Link>
            </>
          )}
        >
          <div className="qms-detail-grid">
            <div>
              <dl className="qms-detail-list">
                <div><dt>Description</dt><dd>{detail.description}</dd></div>
                <div><dt>Immediate containment</dt><dd>{detail.immediateAction || "Not recorded"}</dd></div>
                <div><dt>Root cause</dt><dd>{detail.rootCause || "Not recorded"}</dd></div>
                <div><dt>Investigation</dt><dd>{detail.investigation || "Not recorded"}</dd></div>
                <div><dt>Closure notes</dt><dd>{detail.closureNotes || "Not recorded"}</dd></div>
              </dl>
            </div>
            <div>
              <dl className="qms-detail-list">
                <div><dt>Status</dt><dd><QmsBadge status={detail.status} /></dd></div>
                <div><dt>Severity</dt><dd><QmsBadge status={detail.severity} /></dd></div>
                <div><dt>Category / source</dt><dd>{detail.category} · {detail.source}</dd></div>
                <div><dt>Department</dt><dd>{detail.department || "—"}</dd></div>
                <div><dt>Reported by</dt><dd>{personName(detail.reportedBy)}</dd></div>
                <div><dt>Owner</dt><dd>{personName(detail.owner)}</dd></div>
                <div><dt>Detected / due</dt><dd>{fmtDate(detail.detectedAt)} · {fmtDate(detail.dueAt)}</dd></div>
                <div><dt>Closed</dt><dd>{detail.closedAt ? `${fmtDate(detail.closedAt)} by ${personName(detail.closedBy)}` : "Open"}</dd></div>
              </dl>
              <div className="qms-section-title">Linked CAPA</div>
              {detail.capas?.length ? (
                <div className="d-flex flex-column gap-2">
                  {detail.capas.map((capa) => (
                    <Link key={capa.id} to="/qms/capa" className="d-flex justify-content-between align-items-center gap-2 p-2 border rounded text-reset text-decoration-none">
                      <span><strong className="small">{capa.code}</strong><span className="d-block qms-note">{capa.title}</span></span>
                      <QmsBadge status={capa.status} />
                    </Link>
                  ))}
                </div>
              ) : <p className="qms-note mb-0">No CAPA linked yet.</p>}
            </div>
          </div>
        </QmsModal>
      ) : null}

      {closeModal ? (
        <QmsModal
          title="Close deviation"
          subtitle="Closure requires the root cause, investigation summary and QA decision."
          onClose={() => setCloseModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCloseModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-success btn-sm" onClick={close} disabled={busy}>{busy ? "Closing…" : "Close deviation"}</button>
            </>
          )}
        >
          {modalError ? <div className="qms-alert qms-alert--danger mb-3">{modalError}</div> : null}
          <div className="qms-form-grid">
            <QmsField label="Root cause" required full>
              <textarea className="form-control" rows={3} value={closeModal.rootCause} onChange={(e) => setCloseModal({ ...closeModal, rootCause: e.target.value })} />
            </QmsField>
            <QmsField label="Investigation summary" required full>
              <textarea className="form-control" rows={4} value={closeModal.investigation} onChange={(e) => setCloseModal({ ...closeModal, investigation: e.target.value })} />
            </QmsField>
            <QmsField label="Closure decision" required full>
              <textarea className="form-control" rows={3} value={closeModal.closureNotes} onChange={(e) => setCloseModal({ ...closeModal, closureNotes: e.target.value })} />
            </QmsField>
          </div>
        </QmsModal>
      ) : null}
    </div>
  );
}
