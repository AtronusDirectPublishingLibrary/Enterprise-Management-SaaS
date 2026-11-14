import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Eye,
  PlusCircle,
  RefreshCw,
  Search,
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
  fmtDate,
  personName,
  qmsStatusLabel,
} from "./qmsUi";

const TYPES = ["Corrective", "Preventive"];
const SOURCE_TYPES = ["Deviation", "Change", "Audit", "Complaint", "Other"];

const EMPTY_SUMMARY = { total: 0, open: 0, inProgress: 0, pendingVerification: 0, closed: 0, overdue: 0 };

function emptyForm(deviationId = "") {
  return {
    title: "",
    type: "Corrective",
    sourceType: deviationId ? "Deviation" : "Other",
    sourceRef: "",
    deviationId,
    description: "",
    rootCause: "",
    actionPlan: "",
    department: "QA",
    ownerId: "",
    dueAt: "",
  };
}

export default function QmsCapa() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const approver = isQmsApprover(user);
  const linkedDeviation = searchParams.get("deviationId") || "";

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [people, setPeople] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const [formModal, setFormModal] = useState(() => (linkedDeviation ? emptyForm(linkedDeviation) : null));
  const [detail, setDetail] = useState(null);
  const [verifyModal, setVerifyModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery({ status, type, search });
      const data = await api.get(`/qms/capa${query}`);
      setItems(data?.items || []);
      setSummary(data?.summary || EMPTY_SUMMARY);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, type, search]);

  useEffect(() => {
    const timer = setTimeout(load, 220);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    Promise.all([
      api.get("/qms/documents/people"),
      api.get("/qms/deviations"),
    ]).then(([userList, deviationData]) => {
      setPeople(userList || []);
      setDeviations(deviationData?.items || []);
    }).catch(() => {});
  }, []);

  const canManage = (item) => item?.owner?.username === user?.username || approver;

  const openDetail = async (item) => {
    setModalError(null);
    try {
      setDetail(await api.get(`/qms/capa/${item.id}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshDetail = async (id) => {
    try {
      setDetail(await api.get(`/qms/capa/${id}`));
    } catch {
      setDetail(null);
    }
  };

  const create = async () => {
    setBusy(true);
    setModalError(null);
    try {
      const created = await api.post("/qms/capa", formModal);
      setFormModal(null);
      setNotice(`${created.code} created.`);
      await load();
      await openDetail(created);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const start = async (item) => {
    try {
      await api.post(`/qms/capa/${item.id}/start`, {});
      setNotice(`${item.code} started.`);
      await load();
      await refreshDetail(item.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitVerification = async () => {
    setBusy(true);
    setModalError(null);
    try {
      await api.post(`/qms/capa/${detail.id}/submit`, {
        effectivenessCheck: verifyModal.effectivenessCheck,
      });
      setVerifyModal(null);
      setNotice(`${detail.code} submitted for verification.`);
      await load();
      await refreshDetail(detail.id);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setModalError(null);
    try {
      await api.post(`/qms/capa/${detail.id}/verify`, {
        effective: verifyModal.effective,
        verificationNotes: verifyModal.verificationNotes,
      });
      setVerifyModal(null);
      setNotice(`${detail.code} ${verifyModal.effective ? "closed" : "returned to progress"}.`);
      await load();
      await refreshDetail(detail.id);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const kpis = [
    { label: "Total CAPA", value: summary.total, tone: "navy", icon: Wrench },
    { label: "Open / in progress", value: summary.open + summary.inProgress, tone: "blue", icon: Clock },
    { label: "Awaiting verification", value: summary.pendingVerification, tone: "green", icon: CheckCircle2 },
    { label: "Overdue", value: summary.overdue, tone: "red", icon: Clock },
  ];

  return (
    <div>
      <Helmet><title>QMS CAPA | BEMS</title></Helmet>
      <QmsShell
        title="Corrective and preventive action"
        description="Turn a quality event into a verified improvement. CAPA tracks the root cause, action plan, owner, due date and the effectiveness check that allows QA to close it."
        actions={(
          <button type="button" className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1" onClick={() => { setModalError(null); setFormModal(emptyForm()); }}>
            <PlusCircle size={15} /> Raise CAPA
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
            <label htmlFor="capa-search">Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text"><Search size={14} /></span>
              <input id="capa-search" className="form-control" placeholder="Code, title or source reference" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ minWidth: 150 }}>
            <label htmlFor="capa-status">Status</label>
            <select id="capa-status" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="PENDING_VERIFICATION">Pending verification</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label htmlFor="capa-type">Type</label>
            <select id="capa-type" className="form-select form-select-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className="me-1" /> Refresh
          </button>
        </div>

        {items.length === 0 && !loading ? (
          <div className="qms-card">
            <QmsEmpty icon={CheckCircle2} title="No CAPA in this view">
              Raise a corrective action for a deviation, audit finding, complaint or change. Preventive actions can be created before an event occurs.
            </QmsEmpty>
          </div>
        ) : (
          <div className="qms-table-wrap">
            <table className="qms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Owner</th>
                  <th>Due</th>
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
                      <div className="qms-table__sub">{item.description?.slice(0, 90)}{item.description?.length > 90 ? "…" : ""}</div>
                    </td>
                    <td>{item.type}</td>
                    <td><div>{item.sourceType}</div><div className="qms-table__sub">{item.sourceRef || "—"}</div></td>
                    <td className="text-nowrap">{personName(item.owner)}</td>
                    <td className={`text-nowrap ${item.status !== "CLOSED" && item.dueAt && new Date(item.dueAt) < new Date() ? "text-danger fw-semibold" : ""}`}>{fmtDate(item.dueAt)}</td>
                    <td><QmsBadge status={item.status} /></td>
                    <td>
                      <div className="qms-row-actions">
                        <button type="button" className="btn btn-outline-secondary btn-sm" title="View" onClick={() => openDetail(item)}><Eye size={14} /></button>
                        {item.status === "OPEN" && canManage(item) ? <button type="button" className="btn btn-outline-primary btn-sm" title="Start" onClick={() => start(item)}><Clock size={14} /></button> : null}
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
          title="Raise a CAPA"
          subtitle="Correct the cause, prevent recurrence, then prove the action worked."
          wide
          onClose={() => setFormModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setFormModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-brand btn-sm" onClick={create} disabled={busy}>{busy ? "Saving…" : "Create CAPA"}</button>
            </>
          )}
        >
          {modalError ? <div className="qms-alert qms-alert--danger mb-3">{modalError}</div> : null}
          <div className="qms-form-grid">
            <QmsField label="Title" required full>
              <input className="form-control" value={formModal.title} onChange={(e) => setFormModal({ ...formModal, title: e.target.value })} />
            </QmsField>
            <QmsField label="Description" required full>
              <textarea className="form-control" rows={3} value={formModal.description} onChange={(e) => setFormModal({ ...formModal, description: e.target.value })} />
            </QmsField>
            <QmsField label="Type">
              <select className="form-select" value={formModal.type} onChange={(e) => setFormModal({ ...formModal, type: e.target.value })}>
                {TYPES.map((value) => <option key={value}>{value}</option>)}
              </select>
            </QmsField>
            <QmsField label="Source type">
              <select className="form-select" value={formModal.sourceType} onChange={(e) => setFormModal({ ...formModal, sourceType: e.target.value })}>
                {SOURCE_TYPES.map((value) => <option key={value}>{value}</option>)}
              </select>
            </QmsField>
            <QmsField label="Linked deviation">
              <select className="form-select" value={formModal.deviationId} onChange={(e) => setFormModal({ ...formModal, deviationId: e.target.value, sourceType: e.target.value ? "Deviation" : formModal.sourceType })}>
                <option value="">No linked deviation</option>
                {deviations.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.title}</option>)}
              </select>
            </QmsField>
            <QmsField label="Source reference" hint="Document, audit or complaint reference.">
              <input className="form-control" value={formModal.sourceRef} onChange={(e) => setFormModal({ ...formModal, sourceRef: e.target.value })} />
            </QmsField>
            <QmsField label="Department">
              <select className="form-select" value={formModal.department} onChange={(e) => setFormModal({ ...formModal, department: e.target.value })}>
                {QMS_DEPARTMENTS.map((value) => <option key={value}>{value}</option>)}
              </select>
            </QmsField>
            <QmsField label="Owner">
              <select className="form-select" value={formModal.ownerId} onChange={(e) => setFormModal({ ...formModal, ownerId: e.target.value })}>
                <option value="">Me (the signed-in creator)</option>
                {people.map((person) => <option key={person.id} value={person.id}>{personName(person)} — {person.position || person.username}</option>)}
              </select>
            </QmsField>
            <QmsField label="Due date">
              <input type="date" className="form-control" value={formModal.dueAt} onChange={(e) => setFormModal({ ...formModal, dueAt: e.target.value })} />
            </QmsField>
            <QmsField label="Root cause" full>
              <textarea className="form-control" rows={3} value={formModal.rootCause} onChange={(e) => setFormModal({ ...formModal, rootCause: e.target.value })} />
            </QmsField>
            <QmsField label="Action plan" full hint="What will be done, by whom and by when?">
              <textarea className="form-control" rows={4} value={formModal.actionPlan} onChange={(e) => setFormModal({ ...formModal, actionPlan: e.target.value })} />
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
              {detail.status === "OPEN" && canManage(detail) ? <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => start(detail)}>Start action</button> : null}
              {detail.status === "IN_PROGRESS" && canManage(detail) ? <button type="button" className="btn btn-brand btn-sm" onClick={() => { setModalError(null); setVerifyModal({ mode: "submit", effectivenessCheck: detail.effectivenessCheck || "" }); }}>Submit for verification</button> : null}
              {detail.status === "PENDING_VERIFICATION" && approver ? <button type="button" className="btn btn-success btn-sm" onClick={() => { setModalError(null); setVerifyModal({ mode: "verify", effective: true, verificationNotes: "" }); }}>Verify effectiveness</button> : null}
            </>
          )}
        >
          <div className="qms-detail-grid">
            <div>
              <dl className="qms-detail-list">
                <div><dt>Description</dt><dd>{detail.description}</dd></div>
                <div><dt>Root cause</dt><dd>{detail.rootCause || "Not recorded"}</dd></div>
                <div><dt>Action plan</dt><dd>{detail.actionPlan || "Not recorded"}</dd></div>
                <div><dt>Effectiveness check</dt><dd>{detail.effectivenessCheck || "Not recorded"}</dd></div>
              </dl>
            </div>
            <div>
              <dl className="qms-detail-list">
                <div><dt>Status</dt><dd><QmsBadge status={detail.status} /></dd></div>
                <div><dt>Type / source</dt><dd>{detail.type} · {detail.sourceType}</dd></div>
                <div><dt>Source reference</dt><dd>{detail.sourceRef || "—"}</dd></div>
                <div><dt>Owner</dt><dd>{personName(detail.owner)}</dd></div>
                <div><dt>Due</dt><dd>{fmtDate(detail.dueAt)}</dd></div>
                <div><dt>Verified</dt><dd>{detail.verifiedAt ? `${fmtDate(detail.verifiedAt)} by ${personName(detail.verifiedBy)}` : "Not verified"}</dd></div>
                {detail.deviation ? (
                  <div><dt>Linked deviation</dt><dd><Link to="/qms/deviations">{detail.deviation.code} — {detail.deviation.title}</Link></dd></div>
                ) : null}
              </dl>
            </div>
          </div>
        </QmsModal>
      ) : null}

      {verifyModal ? (
        <QmsModal
          title={verifyModal.mode === "submit" ? "Submit CAPA for verification" : "Verify CAPA effectiveness"}
          subtitle={verifyModal.mode === "submit" ? "Describe the evidence QA will review." : "Closing requires evidence that the action prevented recurrence."}
          onClose={() => setVerifyModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setVerifyModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className={`btn ${verifyModal.mode === "submit" ? "btn-brand" : "btn-success"} btn-sm`} onClick={verifyModal.mode === "submit" ? submitVerification : verify} disabled={busy}>
                {busy ? "Working…" : verifyModal.mode === "submit" ? "Submit" : "Record verification"}
              </button>
            </>
          )}
        >
          {modalError ? <div className="qms-alert qms-alert--danger mb-3">{modalError}</div> : null}
          {verifyModal.mode === "submit" ? (
            <QmsField label="Effectiveness check" required full hint="For example: three months of batch records show zero recurrence.">
              <textarea className="form-control" rows={4} value={verifyModal.effectivenessCheck} onChange={(e) => setVerifyModal({ ...verifyModal, effectivenessCheck: e.target.value })} />
            </QmsField>
          ) : (
            <div className="qms-form-grid">
              <QmsField label="Decision">
                <select className="form-select" value={String(verifyModal.effective)} onChange={(e) => setVerifyModal({ ...verifyModal, effective: e.target.value === "true" })}>
                  <option value="true">Effective — close CAPA</option>
                  <option value="false">Not effective — return to progress</option>
                </select>
              </QmsField>
              <QmsField label="Verification notes" full>
                <textarea className="form-control" rows={4} value={verifyModal.verificationNotes} onChange={(e) => setVerifyModal({ ...verifyModal, verificationNotes: e.target.value })} />
              </QmsField>
            </div>
          )}
        </QmsModal>
      ) : null}
    </div>
  );
}
