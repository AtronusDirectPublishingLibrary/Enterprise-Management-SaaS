import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../lib/api";

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const money = (value, currency = "ETB") =>
  typeof value === "number"
    ? `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`
    : "—";

const scoreOptions = (maxScore = 5) => {
  const max = Number(maxScore) || 5;
  const step = Number.isInteger(max) ? 1 : 0.5;
  const options = [];
  for (let value = step; value <= max + 0.0001; value += step) options.push(Number(value.toFixed(1)));
  return options;
};

const STATUS = {
  DRAFT: ["Self-assessment open", "hrx-chip--warn"],
  SELF_SUBMITTED: ["Submitted — with your supervisor", "hrx-chip--info"],
  MANAGER_REVIEWED: ["Reviewed by your supervisor", "hrx-chip--info"],
  COMPLETED: ["Completed", "hrx-chip--good"],
};

/**
 * The career journey at a glance: onboarding checklist, the twice-yearly
 * appraisal, the latest pay record and, for supervisors, their team.
 */
export default function HrJourneyCards({ data, onSaved, onError }) {
  const { induction, appraisal, appraisalCycle, payslips, team } = data;

  const [items, setItems] = useState(() =>
    Object.fromEntries((appraisal?.items || []).map((item) => [item.id, item.selfScore ?? ""]))
  );
  const [summary, setSummary] = useState(appraisal?.selfSummary || "");
  const [busy, setBusy] = useState(false);

  const inductionPercent = useMemo(() => {
    if (!induction?.tasks?.length) return 0;
    return Math.round((induction.tasks.filter((task) => task.completedAt).length / induction.tasks.length) * 100);
  }, [induction]);

  const latestPay = payslips?.[0];
  const [statusLabel, statusChip] = STATUS[appraisal?.status] || ["Not started", "hrx-chip--muted"];
  const editable = appraisal?.status === "DRAFT";

  const submitAppraisal = async (event) => {
    event.preventDefault();
    if (!appraisal) return;
    setBusy(true);
    try {
      await api.put("/appraisals/my", {
        cycle: appraisal.cycle,
        selfSummary: summary,
        items: appraisal.items.map((item) => ({
          id: item.id,
          selfScore: items[item.id] === "" ? null : Number(items[item.id]),
        })),
        submit: true,
      });
      await onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleInductionTask = async (task) => {
    setBusy(true);
    try {
      await api.patch(`/induction/tasks/${task.id}`, { completed: !task.completedAt });
      await onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!appraisal) return;
    setBusy(true);
    try {
      await api.put("/appraisals/my", {
        cycle: appraisal.cycle,
        selfSummary: summary,
        items: appraisal.items.map((item) => ({
          id: item.id,
          selfScore: items[item.id] === "" ? null : Number(items[item.id]),
        })),
      });
      await onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-lg-5">
          <div className="hrx-card h-100">
            <div className="hrx-card-head">
              <h2 className="d-flex align-items-center gap-2"><GraduationCap size={16} /> Induction</h2>
              {induction ? <span className="hrx-chip hrx-chip--info">{induction.status}</span> : null}
            </div>
            <div className="hrx-card-body">
              {!induction ? (
                <p className="small text-muted mb-0">
                  Your induction checklist will appear here once HR opens it for you.
                </p>
              ) : (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="hrx-ring" style={{ "--value": inductionPercent }}>
                      <span>{inductionPercent}%</span>
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ color: "var(--hrx-navy)" }}>
                        {induction.tasks.filter((task) => task.completedAt).length} of {induction.tasks.length} steps done
                      </div>
                      <div className="small text-muted">Started {formatDate(induction.startDate)}</div>
                    </div>
                  </div>
                  <div>
                    {induction.tasks.map((task) => (
                      <div className="hrx-task" key={task.id}>
                        {task.completedAt ? (
                          <button
                            type="button"
                            className="btn btn-link p-0 border-0 flex-shrink-0"
                            onClick={() => toggleInductionTask(task)}
                            aria-label={`Reopen ${task.title}`}
                          >
                            <CheckCircle2 size={16} className="text-success mt-1" />
                          </button>
                        ) : (
                          <input
                            type="checkbox"
                            className="form-check-input mt-1 flex-shrink-0"
                            checked={false}
                            disabled={busy}
                            onChange={() => toggleInductionTask(task)}
                            aria-label={`Complete ${task.title}`}
                          />
                        )}
                        <div className="flex-grow-1">
                          <div className={`small ${task.completedAt ? "text-muted text-decoration-line-through" : "fw-semibold"}`}>
                            {task.title}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            {task.category?.replace(/_/g, " ").toLowerCase()}
                            {task.dueAt ? ` · due ${formatDate(task.dueAt)}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="hrx-card h-100">
            <div className="hrx-card-head">
              <h2 className="d-flex align-items-center gap-2"><BadgeCheck size={16} /> Performance appraisal</h2>
              <span className={`hrx-chip ${statusChip}`}>{statusLabel}</span>
            </div>
            <div className="hrx-card-body">
              {!appraisal ? (
                <p className="small text-muted mb-0">
                  The {appraisalCycle?.periodLabel || "current"} cycle has not opened yet. Two cycles run each fiscal
                  year — HR will open yours on schedule.
                </p>
              ) : (
                <form className="hrx-form" onSubmit={submitAppraisal}>
                  <div className="d-flex flex-wrap gap-3 small text-muted mb-3">
                    <span className="d-inline-flex align-items-center gap-1">
                      <CalendarClock size={13} /> {appraisal.periodLabel}
                    </span>
                    <span>{formatDate(appraisal.periodStart)} – {formatDate(appraisal.periodEnd)}</span>
                    {appraisal.managerRating ? <span>Manager rating {appraisal.managerRating}/{appraisal.items?.[0]?.maxScore || 5}</span> : null}
                  </div>

                  <div className="row g-2">
                    {appraisal.items.map((item) => (
                      <div className="col-md-6" key={item.id}>
                        <label className="form-label d-flex justify-content-between gap-2">
                          <span>{item.title}</span>
                          <span className="text-muted" style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>{item.weight}% · {item.maxScore}-point</span>
                        </label>
                        {item.description ? <div className="form-text mt-0 mb-1">{item.description}</div> : null}
                        <select
                          className="form-select form-select-sm"
                          value={items[item.id] ?? ""}
                          disabled={!editable}
                          onChange={(event) => setItems({ ...items, [item.id]: event.target.value })}
                        >
                          <option value="">Not scored</option>
                          {scoreOptions(item.maxScore).map((score) => (
                            <option key={score} value={score}>{score} / {item.maxScore}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className="form-label">Your summary for the period</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={summary}
                      disabled={!editable}
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder="What you delivered, what you learned, what you need next."
                    />
                  </div>

                  {appraisal.managerSummary ? (
                    <div className="mt-3 p-3 rounded" style={{ background: "#f7fafc" }}>
                      <div className="hrx-eyebrow mb-1">Supervisor feedback</div>
                      <p className="small mb-0" style={{ whiteSpace: "pre-line" }}>{appraisal.managerSummary}</p>
                    </div>
                  ) : null}

                  {editable ? (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <button className="btn btn-brand btn-sm" disabled={busy}>
                        {busy ? "Saving…" : "Submit self-assessment"}
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={saveDraft} disabled={busy}>
                        Save draft
                      </button>
                    </div>
                  ) : (
                    <div className="small text-muted mt-3">
                      {appraisal.status === "SELF_SUBMITTED"
                        ? "Thanks — your supervisor is scoring the same competencies."
                        : appraisal.status === "MANAGER_REVIEWED"
                        ? "Your supervisor has scored this cycle; it closes once HR signs off."
                        : "This cycle is closed and recorded in your file."}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className={team?.length ? "col-lg-7" : "col-12"}>
          <div className="hrx-card h-100">
            <div className="hrx-card-head">
              <h2 className="d-flex align-items-center gap-2"><Wallet size={16} /> Pay record</h2>
              <Link to="/payroll" className="small text-decoration-none">Payroll centre →</Link>
            </div>
            <div className="hrx-card-body">
              {!latestPay ? (
                <p className="small text-muted mb-0">
                  No salary record has been published to your file yet. HR keeps this private to you and payroll.
                </p>
              ) : (
                <>
                  <div className="d-flex flex-wrap align-items-end gap-4">
                    <div>
                      <div className="hrx-stat-label">Base salary</div>
                      <div className="fs-4 fw-bold" style={{ color: "var(--hrx-navy)" }}>
                        {money(latestPay.baseSalary, latestPay.currency)}
                      </div>
                      <div className="small text-muted">from {formatDate(latestPay.effectiveAt)}</div>
                    </div>
                    <div>
                      <div className="hrx-stat-label">Allowance</div>
                      <div className="fs-5 fw-semibold" style={{ color: "var(--hrx-navy)" }}>
                        {money(latestPay.allowance, latestPay.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="hrx-stat-label">Gross</div>
                      <div className="fs-5 fw-semibold" style={{ color: "var(--hrx-navy)" }}>
                        {money((latestPay.baseSalary || 0) + (latestPay.allowance || 0) + (latestPay.otherEarnings || 0), latestPay.currency)}
                      </div>
                    </div>
                  </div>
                  {latestPay.notes ? <div className="small text-muted mt-2">{latestPay.notes}</div> : null}
                  {payslips.length > 1 ? (
                    <div className="mt-3 pt-3 border-top">
                      <div className="hrx-eyebrow mb-1">History</div>
                      {payslips.slice(1, 4).map((record) => (
                        <div key={record.id} className="d-flex justify-content-between small text-muted">
                          <span>{formatDate(record.effectiveAt)}</span>
                          <span>{money(record.baseSalary, record.currency)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="form-text mt-2">
                    Payslip PDFs are issued by payroll each month and filed to your documents.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {team?.length ? (
          <div className="col-lg-5">
            <div className="hrx-card h-100">
              <div className="hrx-card-head">
                <h2 className="d-flex align-items-center gap-2"><Users size={16} /> My team</h2>
                <span className="small text-muted">{team.length} report{team.length === 1 ? "" : "s"}</span>
              </div>
              <div className="hrx-card-body">
                {team.map((member) => (
                  <div className="hrx-task" key={member.id}>
                    <div
                      className="rounded-circle d-grid place-items-center flex-shrink-0"
                      style={{
                        width: 34,
                        height: 34,
                        background: "#eef3f7",
                        color: "var(--hrx-navy)",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {(member.firstName?.[0] || member.username[0]).toUpperCase()}
                      {(member.lastName?.[0] || "").toUpperCase()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="small fw-semibold">{member.firstName} {member.lastName}</div>
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {member.jobTitle || member.department || member.username}
                      </div>
                    </div>
                    <div className="d-flex flex-column align-items-end gap-1">
                      {member.overdue ? <span className="hrx-chip hrx-chip--danger">{member.overdue} expired</span> : null}
                      {member.expiring ? <span className="hrx-chip hrx-chip--warn">{member.expiring} expiring</span> : null}
                      {member.pendingLeave ? <span className="hrx-chip hrx-chip--info">{member.pendingLeave} leave</span> : null}
                      {member.pendingTimesheets ? (
                        <span className="hrx-chip hrx-chip--info">{member.pendingTimesheets} timesheet</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
