import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Lock, MessageSquare, CheckCircle2, ArrowRight, ChevronRight, Target } from "lucide-react";
import { api } from "../lib/api";

const TYPE_LABEL = { AOP: "Annual Operational Plan", STRATEGIC: "Strategic Plan", ROADMAP: "Roadmap" };

const KIND_COLORS = {
  PILLAR: "#7c3aed",
  GOAL: "#1e5631",
  OBJECTIVE: "#0f766e",
  STRATEGY: "#0369a1",
  ACTIVITY: "#b45309",
  KPI: "#be123c",
  MILESTONE: "#4b5563",
};

export default function SharedPlanPage() {
  const token = window.location.pathname.split("/share/")[1] || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", body: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    api
      .get(`/plans/shared/${token}`)
      .then(setData)
      .catch((e) => setError(e.message || "This share link is not available."))
      .finally(() => setLoading(false));
  }, [token]);

  const items = data?.items || [];
  const kpis = useMemo(() => items.filter((item) => item.kind === "KPI"), [items]);
  const roots = useMemo(
    () => items.filter((item) => !item.parentId).sort((a, b) => a.code?.localeCompare(b.code || "") || 0),
    [items]
  );

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setFormError("");
    try {
      await api.post(`/plans/shared/${token}/comments`, {
        authorName: form.authorName,
        authorEmail: form.authorEmail || null,
        body: form.body,
      });
      setSent(true);
      setForm({ authorName: form.authorName, authorEmail: form.authorEmail, body: "" });
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex vh-100 justify-content-center align-items-center">
        <div className="spinner-border text-success" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex vh-100 flex-column justify-content-center align-items-center bg-light px-3 text-center">
        <Lock size={42} className="mb-3" style={{ color: "var(--brand-primary)" }} />
        <h3 className="fw-bold" style={{ color: "var(--brand-primary)" }}>This shared plan is not available</h3>
        <p className="text-muted mb-0">{error}</p>
      </div>
    );
  }

  const { plan, completion } = data;

  return (
    <div style={{ background: "var(--brand-bg, #f6f8f6)", minHeight: "100vh" }}>
      <header style={{ background: "var(--brand-primary, #1e5631)", color: "#fff" }}>
        <div className="container py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <ShieldCheck size={22} style={{ color: "var(--brand-secondary, #d4af37)" }} />
            <span className="fw-bold" style={{ letterSpacing: "0.4px" }}>Ethio-Biopharma</span>
          </div>
          <span className="badge rounded-pill px-3 py-2" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}>
            <Lock size={12} className="me-1" /> Read-only shared plan
          </span>
        </div>
      </header>

      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap gap-2 mb-2">
              <span className="badge" style={{ background: "rgba(30,86,49,0.08)", color: "var(--brand-primary)" }}>{TYPE_LABEL[plan.type] || plan.type}</span>
              <span className="badge bg-light text-dark border">{plan.periodLabel}</span>
              <span className="badge bg-light text-dark border">{plan.status}</span>
              {plan.parent && <span className="badge bg-light text-muted border">Part of {plan.parent.title}</span>}
            </div>
            <h1 className="fw-bold mb-2" style={{ color: "var(--brand-primary)", fontSize: "2rem" }}>{plan.title}</h1>
            <div className="text-muted small mb-3">
              {new Date(plan.startDate).toLocaleDateString()} &ndash; {new Date(plan.endDate).toLocaleDateString()}
            </div>
            {plan.summary && <p className="text-muted mb-3" style={{ maxWidth: 820 }}>{plan.summary}</p>}

            <div className="d-flex justify-content-between small mb-1">
              <span className="text-muted">Delivery completion</span>
              <span className="fw-bold" style={{ color: "var(--brand-primary)" }}>{Math.round(completion || 0)}%</span>
            </div>
            <div className="progress" style={{ height: 8 }}>
              <div className="progress-bar" style={{ width: `${Math.min(100, completion || 0)}%`, background: "var(--brand-primary)" }} />
            </div>
            {(plan.vision || plan.mission) && (
              <div className="row g-3 mt-3">
                {plan.vision && (
                  <div className="col-md-6">
                    <div className="text-uppercase small fw-bold text-muted mb-1">Vision</div>
                    <div className="small">{plan.vision}</div>
                  </div>
                )}
                {plan.mission && (
                  <div className="col-md-6">
                    <div className="text-uppercase small fw-bold text-muted mb-1">Mission</div>
                    <div className="small">{plan.mission}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>Plan structure</h5>
                {roots.length === 0 && <div className="text-muted small">No structure captured yet.</div>}
                {roots.map((item) => (
                  <SharedTreeRow key={item.id} item={item} items={items} depth={0} />
                ))}
              </div>
            </div>

            {kpis.length > 0 && (
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>
                    <Target size={17} className="me-2" />Key performance indicators
                  </h5>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-uppercase">
                          <th>KPI</th>
                          <th className="text-end">Target</th>
                          <th className="text-end">Latest</th>
                          <th style={{ width: 130 }}>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpis.map((kpi) => {
                          const latest = [...(kpi.targets || [])]
                            .filter((entry) => entry.target != null)
                            .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel))
                            .pop();
                          return (
                            <tr key={kpi.id}>
                              <td className="small">
                                <div className="fw-semibold">{kpi.title}</div>
                                <div className="text-muted" style={{ fontSize: 11 }}>
                                  {latest ? `${latest.periodLabel}${kpi.unit ? ` · ${kpi.unit}` : ""}` : kpi.unit || ""}
                                </div>
                              </td>
                              <td className="text-end small">{latest?.target ?? kpi.targetValue ?? "—"}</td>
                              <td className="text-end small">{latest?.actual ?? kpi.currentValue ?? "—"}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="progress flex-grow-1" style={{ height: 6 }}>
                                    <div className="progress-bar" style={{ width: `${Math.min(100, kpi.progress || 0)}%`, background: kpi.progress >= 80 ? "#16a34a" : kpi.progress >= 40 ? "#d97706" : "#dc2626" }} />
                                  </div>
                                  <span className="small text-muted">{Math.round(kpi.progress || 0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: 20 }}>
              <div className="card-body">
                <h6 className="fw-bold mb-1"><MessageSquare size={15} className="me-1" /> Send a comment</h6>
                <p className="small text-muted mb-3">
                  Your comment goes directly to the plan owner. No account needed, and you cannot change anything here.
                </p>

                {sent ? (
                  <div className="text-center py-3">
                    <CheckCircle2 size={34} className="text-success mb-2" />
                    <div className="fw-semibold">Comment sent</div>
                    <div className="small text-muted mb-3">Thank you — the plan owner has been notified.</div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setSent(false)}>
                      Write another comment
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit}>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold mb-1">Your name</label>
                      <input
                        required
                        minLength={2}
                        className="form-control form-control-sm"
                        value={form.authorName}
                        onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold mb-1">Email (optional)</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={form.authorEmail}
                        onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold mb-1">Comment</label>
                      <textarea
                        required
                        minLength={3}
                        rows={4}
                        className="form-control form-control-sm"
                        value={form.body}
                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                        placeholder="Feedback on targets, assumptions or priorities..."
                      />
                    </div>
                    {formError && <div className="alert alert-danger py-1 small mb-2">{formError}</div>}
                    <button className="btn-brand btn-sm w-100" disabled={sending}>
                      {sending ? "Sending…" : "Send comment"} <ArrowRight size={14} className="ms-1" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="small text-muted text-center mt-4 mb-0">
          Shared view of {plan.title}. Content is read-only and may change as the plan is updated.
        </p>
      </div>
    </div>
  );
}

function SharedTreeRow({ item, items, depth }) {
  const children = items
    .filter((child) => child.parentId === item.id)
    .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const progress = Math.max(0, Math.min(100, item.progress || 0));

  return (
    <>
      <div className="d-flex align-items-center gap-2 py-2 border-bottom" style={{ paddingLeft: depth * 18 }}>
        <span className="badge flex-shrink-0" style={{ background: KIND_COLORS[item.kind] || "#64748b", fontSize: 10 }}>
          {item.code || item.kind}
        </span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="small fw-semibold d-flex align-items-center gap-1">
            {children.length > 0 && <ChevronRight size={12} className="text-muted" />}
            <span className="text-truncate">{item.title}</span>
          </div>
          {item.description && <div className="text-muted text-truncate" style={{ fontSize: 11 }}>{item.description}</div>}
        </div>
        {item.kind !== "PILLAR" && item.kind !== "OBJECTIVE" && (
          <span className={`badge ${item.status === "Completed" ? "bg-success" : item.status === "At Risk" ? "bg-warning text-dark" : "bg-light text-dark border"}`} style={{ fontSize: 10 }}>
            {item.status}
          </span>
        )}
        <div className="d-flex align-items-center gap-1" style={{ width: 92 }}>
          <div className="progress flex-grow-1" style={{ height: 5 }}>
            <div className={`progress-bar ${progress >= 80 ? "bg-success" : progress >= 40 ? "bg-warning" : "bg-danger"}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-muted" style={{ fontSize: 10 }}>{Math.round(progress)}%</span>
        </div>
      </div>
      {children.map((child) => (
        <SharedTreeRow key={child.id} item={child} items={items} depth={depth + 1} />
      ))}
    </>
  );
}
