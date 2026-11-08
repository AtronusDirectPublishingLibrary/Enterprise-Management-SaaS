import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";

const TYPE_LABELS = { AOP: "Annual Operational Plan", STRATEGIC: "Strategic Plan", ROADMAP: "Roadmap" };
const KIND_LABELS = {
  PILLAR: "Pillar",
  GOAL: "Goal",
  OBJECTIVE: "Objective",
  STRATEGY: "Strategy",
  ACTIVITY: "Activity",
  KPI: "KPI",
  MILESTONE: "Milestone",
};

function latestReading(kpi) {
  const readings = [...(kpi.targets || [])].filter((row) => row.actual != null);
  return readings.length ? readings[readings.length - 1] : null;
}

export default function PlanPrintPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/plans/${planId}`)
      .then(setPlan)
      .catch((e) => setError(e.message));
  }, [planId]);

  const byParent = useMemo(() => {
    const map = {};
    (plan?.items || []).forEach((item) => {
      const key = item.parentId || "root";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [plan]);
  const roots = byParent.root || [];
  const kpis = useMemo(() => (plan ? plan.items.filter((item) => item.kind === "KPI") : []), [plan]);

  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;
  if (!plan) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <div className="spinner-border text-success" />
      </div>
    );
  }

  const renderBranch = (item, depth = 0) => {
    const progress = plan.itemProgress?.[item.id];
    const pct = progress?.completion != null ? Math.round(progress.completion) : null;
    return (
      <div key={item.id} className="mb-1" style={{ marginLeft: depth * 18 }}>
        <div className="d-flex justify-content-between align-items-baseline">
          <div>
            {item.code && <span className="text-muted me-1" style={{ fontSize: 10 }}>{item.code}</span>}
            <span className={depth === 0 ? "fw-bold" : "fw-semibold"} style={{ fontSize: depth === 0 ? 13 : 12 }}>
              {item.title}
            </span>
            <span className="text-muted ms-1" style={{ fontSize: 10 }}>{KIND_LABELS[item.kind] || item.kind}</span>
          </div>
          {pct != null && <span style={{ fontSize: 10 }} className="text-muted">{pct}%</span>}
        </div>
        {item.description && depth === 0 && (
          <div className="text-muted" style={{ fontSize: 11 }}>{item.description}</div>
        )}
        {(byParent[item.id] || []).map((child) => renderBranch(child, depth + 1))}
      </div>
    );
  };

  const deadlineRows = (plan.reports || []).slice(0, 40);

  return (
    <div className="board-pack">
      <style>{`
        .board-pack { background: #fff; color: #1b1f23; padding: 32px 40px 56px; max-width: 1100px; margin: 0 auto; }
        .board-pack h1 { font-size: 26px; font-weight: 800; margin: 0; }
        .board-pack h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin: 26px 0 10px; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; }
        .board-pack table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        .board-pack th { background: #f1f5f2; text-align: left; padding: 5px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #cfd8d1; }
        .board-pack td { padding: 5px 6px; border-bottom: 1px solid #eceff1; vertical-align: top; }
        .board-pack .num { text-align: right; }
        .board-pack .muted { color: #6c757d; }
        .board-pack .cover { border-left: 6px solid #0B2545; padding-left: 16px; }
        .board-pack .meta { font-size: 12px; color: #495057; }
        .board-pack .pill { display: inline-block; border: 1px solid #cfd8d1; border-radius: 999px; padding: 2px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
        .board-pack .toolbar { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 18px; }
        @page { size: A4; margin: 14mm; }
        @media print {
          body { background: #fff !important; }
          .board-pack { padding: 0; max-width: none; }
          .board-pack .toolbar { display: none; }
          .board-pack h2 { break-after: avoid; }
          .board-pack tr, .board-pack .branch { break-inside: avoid; }
        }
      `}</style>

      <div className="toolbar">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} className="me-1" /> Back
        </button>
        <button className="btn btn-sm btn-success" onClick={() => window.print()}>
          <Printer size={14} className="me-1" /> Print / Save as PDF
        </button>
      </div>

      <div className="cover mb-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="text-uppercase" style={{ fontSize: 11, letterSpacing: ".12em", color: "#0B2545", fontWeight: 700 }}>
              Ethio-Biopharma Â· {TYPE_LABELS[plan.type] || plan.type}
            </div>
            <h1>{plan.title}</h1>
            <div className="meta mt-1">
              {plan.periodLabel} Â· {new Date(plan.startDate).toLocaleDateString()} â€“ {new Date(plan.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="text-end">
            <span className="pill">{plan.status}</span>
            <div className="meta mt-2">Revision r{plan.revision}</div>
          </div>
        </div>
        <div className="meta mt-2">
          Owner: <strong>{plan.owner || "â€”"}</strong> Â· Overall completion: <strong>{Math.round(plan.completion || 0)}%</strong>
          {plan.parent ? <> Â· Aligned to: <strong>{plan.parent.title}</strong></> : null}
        </div>
      </div>

      {plan.summary && (
        <>
          <h2>Executive summary</h2>
          <p style={{ fontSize: 12.5 }}>{plan.summary}</p>
        </>
      )}

      {(plan.vision || plan.mission) && (
        <>
          <h2>Direction</h2>
          <div className="row g-3">
            {plan.vision && (
              <div className="col-6">
                <div className="fw-semibold" style={{ fontSize: 12 }}>Vision</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{plan.vision}</div>
              </div>
            )}
            {plan.mission && (
              <div className="col-6">
                <div className="fw-semibold" style={{ fontSize: 12 }}>Mission</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{plan.mission}</div>
              </div>
            )}
          </div>
        </>
      )}

      <h2>Performance scorecard</h2>
      {kpis.length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>No KPIs recorded for this plan.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Indicator</th>
              <th>Unit</th>
              <th className="num">Target</th>
              <th className="num">Latest actual</th>
              <th>Latest period</th>
              <th className="num">Achieved</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => {
              const reading = latestReading(kpi);
              const target = reading?.target ?? kpi.targetValue;
              const actual = reading?.actual ?? null;
              const pct = target && actual != null ? Math.round((actual / target) * 100) : null;
              return (
                <tr key={kpi.id}>
                  <td className="muted">{kpi.code || "â€”"}</td>
                  <td className="fw-semibold">{kpi.title}</td>
                  <td className="muted">{kpi.unit || "â€”"}</td>
                  <td className="num">{target ?? "â€”"}</td>
                  <td className="num">{actual ?? "â€”"}</td>
                  <td className="muted">{reading?.periodLabel || "â€”"}</td>
                  <td className="num">{pct == null ? "â€”" : `${pct}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {plan.children?.length > 0 && (
        <>
          <h2>Aligned plans</h2>
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Type</th>
                <th>Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.children.map((child) => (
                <tr key={child.id}>
                  <td className="fw-semibold">{child.title}</td>
                  <td className="muted">{TYPE_LABELS[child.type] || child.type}</td>
                  <td className="muted">{child.periodLabel}</td>
                  <td className="muted">{child.status}{child.isPublished ? " Â· published" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Plan structure</h2>
      {roots.length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>No structure captured yet.</div>
      ) : (
        <div>{roots.map((item) => renderBranch(item))}</div>
      )}

      {deadlineRows.length > 0 && (
        <>
          <h2>Reporting deadlines</h2>
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Cadence</th>
                <th>Due</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deadlineRows.map((report) => (
                <tr key={report.id}>
                  <td className="fw-semibold">{report.title}</td>
                  <td className="muted">{report.cadence || "â€”"}</td>
                  <td className="muted">{new Date(report.dueDate).toLocaleDateString()}</td>
                  <td className="muted">{report.owner || "â€”"}</td>
                  <td className="muted">{report.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="mt-4 pt-2 border-top muted" style={{ fontSize: 10 }}>
        Generated {new Date().toLocaleString()} Â· Ethio-Biopharma planning system Â· Revision r{plan.revision}
        {plan.approvedBy ? ` Â· Approved by ${plan.approvedBy} on ${new Date(plan.approvedAt).toLocaleDateString()}` : ""}
      </div>
    </div>
  );
}
