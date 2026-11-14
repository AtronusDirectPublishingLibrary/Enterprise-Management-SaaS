import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  GitPullRequest,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { api } from "../../lib/api";
import QmsShell from "./QmsShell";
import { QmsBadge, fmtDateTime } from "./qmsUi";

const EMPTY = {
  documents: { total: 0, approved: 0, inReview: 0, dueForReview: 0 },
  deviations: { total: 0, open: 0, investigating: 0, criticalOpen: 0 },
  capas: { total: 0, open: 0, pendingVerification: 0, overdue: 0 },
  changes: { total: 0, inReview: 0, approved: 0, implemented: 0 },
  recent: [],
};

export default function QmsOverview() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.get("/qms/overview")
      .then((payload) => setData(payload || EMPTY))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const kpis = [
    {
      label: "Controlled documents",
      value: data.documents.total,
      hint: `${data.documents.approved} approved · ${data.documents.inReview} in review`,
      icon: FileText,
      tone: "navy",
    },
    {
      label: "Open deviations",
      value: data.deviations.open + data.deviations.investigating,
      hint: `${data.deviations.criticalOpen} critical open`,
      icon: AlertTriangle,
      tone: data.deviations.criticalOpen ? "red" : "blue",
    },
    {
      label: "Open CAPA",
      value: data.capas.open,
      hint: `${data.capas.overdue} overdue · ${data.capas.pendingVerification} awaiting verification`,
      icon: Wrench,
      tone: data.capas.overdue ? "red" : "green",
    },
    {
      label: "Change controls",
      value: data.changes.total,
      hint: `${data.changes.inReview} in review · ${data.changes.approved} approved`,
      icon: GitPullRequest,
      tone: "blue",
    },
  ];

  const signals = [
    {
      label: "Documents due for review",
      value: data.documents.dueForReview,
      detail: "Approved documents with a review date in the next 30 days.",
      path: "/qms/documents?filter=due",
      icon: CalendarClock,
      danger: data.documents.dueForReview > 0,
    },
    {
      label: "Critical deviations",
      value: data.deviations.criticalOpen,
      detail: "Critical quality events still open or under investigation.",
      path: "/qms/deviations",
      icon: AlertTriangle,
      danger: data.deviations.criticalOpen > 0,
    },
    {
      label: "Overdue CAPA",
      value: data.capas.overdue,
      detail: "Corrective or preventive actions past their due date.",
      path: "/qms/capa",
      icon: Wrench,
      danger: data.capas.overdue > 0,
    },
    {
      label: "CAPA awaiting verification",
      value: data.capas.pendingVerification,
      detail: "Actions ready for QA effectiveness review.",
      path: "/qms/capa",
      icon: CheckCircle2,
      danger: false,
    },
  ];

  return (
    <div>
      <Helmet><title>QMS Overview | BEMS</title></Helmet>
      <QmsShell
        title="Quality control tower"
        description="One view of the quality system: controlled documents, quality events, corrective actions and changes. The loop is complete only when every signal is reviewed, actioned and closed with evidence."
        actions={(
          <>
            <Link to="/qms/deviations" className="btn btn-light btn-sm d-inline-flex align-items-center gap-1">
              <AlertTriangle size={14} /> Report deviation
            </Link>
            <Link to="/qms/documents" className="btn btn-brand btn-sm d-inline-flex align-items-center gap-1">
              <FileText size={14} /> Document register
            </Link>
          </>
        )}
      >
        {error ? (
          <div className="qms-alert qms-alert--danger mb-3">
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button>
          </div>
        ) : null}

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="qms-section-title mb-0">Quality at a glance</div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className="me-1" /> Refresh
          </button>
        </div>

        <div className="qms-grid qms-grid--4 mb-5">
          {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
            <article className={`qms-kpi qms-kpi--${tone}`} key={label}>
              <div className="qms-kpi__label">{label}</div>
              <div className="qms-kpi__value">{loading && !value ? "—" : value}</div>
              <div className="qms-kpi__hint">{hint}</div>
              <span className="qms-kpi__icon"><Icon size={18} /></span>
            </article>
          ))}
        </div>

        <div className="qms-grid qms-grid--2 mb-5">
          <section className="qms-card">
            <div className="qms-card__head">
              <h2>WHO quality loop</h2>
              <span className="qms-note">Detect → contain → investigate → correct → verify</span>
            </div>
            <div className="qms-card__body">
              <div className="qms-stepper">
                {[
                  "Document the requirement",
                  "Detect the deviation",
                  "Investigate root cause",
                  "Correct and prevent",
                  "Control the change",
                  "Review effectiveness",
                ].map((step, index) => (
                  <div key={step} className={`qms-step ${index === 0 ? "is-done" : index === 1 ? "is-current" : ""}`}>
                    {step}
                  </div>
                ))}
              </div>
              <p className="qms-note mt-3 mb-0">
                Each stage writes its own audit record. A deviation without a root cause, or a CAPA without
                effectiveness evidence, stays open on this page until QA closes it.
              </p>
            </div>
          </section>

          <section className="qms-card">
            <div className="qms-card__head">
              <h2>Quality signals</h2>
              <span className="qms-badge qms-badge--review">{signals.filter((s) => s.danger).length} attention</span>
            </div>
            <div className="qms-card__body">
              <div className="d-flex flex-column gap-2">
                {signals.map(({ label, value, detail, path, icon: Icon, danger }) => (
                  <Link
                    key={label}
                    to={path}
                    className="d-flex align-items-center justify-content-between gap-3 text-reset text-decoration-none border rounded p-2"
                    style={{ borderColor: "#eee6d5", background: danger ? "#fff9f4" : "#fffdf8" }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <span className={`qms-kpi__icon position-static ${danger ? "text-danger" : ""}`} style={{ width: 30, height: 30 }}>
                        <Icon size={15} />
                      </span>
                      <span>
                        <span className="d-block fw-semibold small">{label}</span>
                        <span className="qms-note">{detail}</span>
                      </span>
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <strong className="h5 mb-0" style={{ color: danger ? "var(--qms-red)" : "var(--qms-navy)" }}>{value}</strong>
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="qms-detail-grid">
          <section className="qms-card">
            <div className="qms-card__head">
              <h2>Recent quality activity</h2>
              <span className="qms-note">Across documents, deviations, CAPA and changes</span>
            </div>
            <div className="qms-card__body qms-card__body--flush">
              {data.recent.length === 0 ? (
                <div className="qms-empty">
                  <ShieldCheck size={28} />
                  <h3>No quality records yet</h3>
                  <p className="mb-0">Start with a controlled document, then use the registers to report events and actions.</p>
                </div>
              ) : (
                <div className="qms-table-wrap" style={{ border: 0, boxShadow: "none", borderRadius: 0 }}>
                  <table className="qms-table">
                    <thead>
                      <tr>
                        <th>Record</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((item) => (
                        <tr key={`${item.type}-${item.id}`}>
                          <td>
                            <Link to={item.path} className="qms-table__title">{item.title}</Link>
                            <div className="qms-table__sub">{item.code}</div>
                          </td>
                          <td><span className="qms-badge qms-badge--draft">{item.type}</span></td>
                          <td><QmsBadge status={item.status} /></td>
                          <td className="text-muted small">{fmtDateTime(item.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="qms-card">
            <div className="qms-card__head"><h2>Start a quality record</h2></div>
            <div className="qms-card__body d-flex flex-column gap-2">
              {[
                { to: "/qms/documents/new", label: "Register a controlled document", icon: FileText },
                { to: "/qms/deviations", label: "Report a deviation", icon: AlertTriangle },
                { to: "/qms/capa", label: "Raise a CAPA", icon: Wrench },
                { to: "/qms/changes", label: "Request a change", icon: PlusCircle },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="d-flex align-items-center gap-2 p-2 rounded text-reset text-decoration-none" style={{ background: "#f7f4ec" }}>
                  <span className="qms-kpi__icon position-static" style={{ width: 30, height: 30 }}><Icon size={15} /></span>
                  <span className="small fw-semibold flex-grow-1">{label}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
              <div className="qms-alert mt-2">
                <span>
                  <ClipboardList size={14} className="me-1" />
                  Every transition is written to the audit trail with the signed-in user and timestamp.
                </span>
              </div>
            </div>
          </section>
        </div>
      </QmsShell>
    </div>
  );
}
