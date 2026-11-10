import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_BASE } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Trash2, FileText, Mail, RefreshCw, Send, PlusCircle, Wallet, Upload, Download } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { canApprovePayroll, canManagePayroll } from "../lib/access";
import AutoFitNumber from "../components/AutoFitNumber";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (value) =>
  Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_SALARY = {
  userId: "", baseSalary: "", allowance: 0, otherEarnings: 0, otherDeductions: 0, currency: "ETB", notes: "",
};

export default function Payroll() {
  const { user } = useAuth();
  const manager = canManagePayroll(user);
  const approver = canApprovePayroll(user);
  const now = new Date();
  const [records, setRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_SALARY);
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [register, setRegister] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const importInput = useRef(null);

  const loadRecords = () => {
    api.get("/payroll").then(setRecords).catch((e) => setError(e.message));
    if (manager) api.get("/payroll/staff").then(setStaff).catch(() => {});
  };

  const loadPeriod = async () => {
    try {
      setError("");
      if (!manager) {
        const slips = await api.get("/payslips");
        setRegister(null);
        setPayslips(slips);
        return;
      }
      const [reg, slips] = await Promise.all([
        api.get(`/payslips/register?year=${period.year}&month=${period.month}`),
        api.get(`/payslips?year=${period.year}&month=${period.month}`),
      ]);
      setRegister(reg);
      setPayslips(slips);
    } catch (e) {
      setError(e.message || "Could not load the payroll period.");
    }
  };

  useEffect(() => { loadRecords(); }, [manager]);
  useEffect(() => { loadPeriod(); }, [period.year, period.month, manager]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payroll", {
        ...form,
        effectiveAt: new Date(Date.UTC(period.year, period.month - 1, 1)).toISOString(),
      });
      setForm(EMPTY_SALARY);
      setMessage(`Salary record saved for ${MONTHS[period.month - 1]} ${period.year}.`);
      loadRecords();
      loadPeriod();
    } catch (err) { setError(err.message || "Failed to save the salary record."); }
  };

  const uploadPayroll = async (e) => {
    e.preventDefault();
    if (!importFile) return setError("Choose the monthly payroll CSV first.");
    setBusy("upload");
    setError("");
    setImportResult(null);
    try {
      const body = new FormData();
      body.append("file", importFile);
      const res = await fetch(`${API_BASE}/payroll/upload?year=${period.year}&month=${period.month}`, {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setImportResult(data);
      setImportFile(null);
      if (importInput.current) importInput.current.value = "";
      setMessage(
        `${data.label}: ${data.added} salary record(s) added, ${data.updated} updated, ${data.skipped} skipped.`
      );
      await Promise.all([loadRecords(), loadPeriod()]);
    } catch (err) {
      setError(err.message || "Could not import the monthly payroll CSV.");
    } finally {
      setBusy("");
    }
  };

  const decideSalary = async (record, decision) => {
    try {
      const note = decision === "reject" ? window.prompt("Reason for rejection:") : "";
      if (decision === "reject" && note == null) return;
      await api.post(`/payroll/${record.id}/${decision}`, note ? { note } : {});
      setMessage(`Salary change ${decision === "approve" ? "approved" : "rejected"} for ${record.user?.firstName || record.user?.username || "staff member"}.`);
      await loadRecords();
    } catch (e) {
      setError(e.message || "Could not update the salary approval.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this salary record?")) return;
    try {
      await api.del(`/payroll/${id}`);
      loadRecords();
      loadPeriod();
    } catch (err) { setError(err.message || "Failed to delete."); }
  };

  const generate = async () => {
    setBusy("generate");
    setMessage("");
    setError("");
    try {
      const result = await api.post("/payslips/generate", period);
      setMessage(`${result.label}: ${result.created} payslip(s) created, ${result.updated} refreshed.`);
      await loadPeriod();
    } catch (e) {
      setError(e.message || "Could not generate payslips.");
    } finally { setBusy(""); }
  };

  const sendOne = async (slip) => {
    setBusy(slip.id);
    setMessage("");
    try {
      const result = await api.post(`/payslips/${slip.id}/send`, {});
      setMessage(result.message);
      await loadPeriod();
    } catch (e) {
      setError(e.message || "Could not send the payslip.");
    } finally { setBusy(""); }
  };

  const sendAll = async () => {
    const pending = payslips.filter((slip) => slip.user?.email);
    if (!pending.length) return setError("No generated payslips with an email address for this month.");
    if (!window.confirm(`Email ${pending.length} payslip(s) for ${MONTHS[period.month - 1]} ${period.year}?`)) return;
    setBusy("send-all");
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const slip of pending) {
      try {
        const result = await api.post(`/payslips/${slip.id}/send`, {});
        if (result.status === "SENT") sent++;
        else if (result.status === "SKIPPED") skipped++;
        else failed++;
      } catch { failed++; }
    }
    setBusy("");
    setMessage(`${sent} sent, ${skipped} skipped (SMTP not configured), ${failed} failed.`);
    await loadPeriod();
  };

  const totals = useMemo(() => {
    if (!register) return null;
    return {
      gross: register.totalGross,
      net: register.totalNet,
      tax: register.totalTax,
      pension: register.totalPension,
      otherEarnings: register.totalOtherEarnings,
      otherDeductions: register.totalOtherDeductions,
      headcount: register.rows?.length || 0,
    };
  }, [register]);

  const slipByUser = useMemo(() => new Map(payslips.map((slip) => [slip.userId, slip])), [payslips]);
  const latestSlip = payslips[0] || null;
  const latestSalary = records[0] || null;

  return (
    <div className="container-fluid py-4 payroll-page">
      <Helmet><title>{manager ? "Payroll & Payslips" : "My Payroll & Payslips"} | EBPE</title></Helmet>

      <PageHeader
        icon={<Wallet size={20} />}
        kicker={manager ? "Finance · monthly cycle" : "Payroll · personal view"}
        title={manager ? "Payroll & Payslips" : "My Payroll & Payslips"}
        subtitle={
          manager
            ? "Prepare the monthly payroll register, generate branded payslips and deliver them to staff."
            : "Your salary record and payslip history. Payroll details are private to you and authorised Finance/HR staff."
        }
        actions={manager ? (
          <div className="payroll-period-actions">
            <div>
              <label className="form-label small fw-semibold mb-1">Month</label>
              <select className="form-select form-select-sm" value={period.month} onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}>
                {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label small fw-semibold mb-1">Year</label>
              <input type="number" className="form-control form-control-sm payroll-year" min="2000" max="2100" value={period.year} onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={generate} disabled={busy === "generate"}>
              <PlusCircle size={15} /> {busy === "generate" ? "Generating…" : "Generate payslips"}
            </button>
            <button className="btn btn-outline-primary btn-sm" onClick={loadPeriod} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        ) : (
          <Link to="/my-hr" className="btn btn-outline-secondary btn-sm">
            <Wallet size={15} /> My Portal
          </Link>
        )}
      />

      {message && <div className="alert alert-success border-0 shadow-sm">{message}</div>}
      {error && <div className="alert alert-danger border-0 shadow-sm">{error}</div>}
      {register && register.mailConfigured === false && (
        <div className="alert alert-warning border-0 shadow-sm small">
          Email delivery is not configured. Payslips can still be printed or saved as PDF. To email them, set
          <code className="mx-1">SMTP_HOST</code>, <code className="mx-1">SMTP_PORT</code>, <code className="mx-1">SMTP_USER</code>,
          <code className="mx-1">SMTP_PASS</code> and <code className="mx-1">MAIL_FROM</code> in the backend environment.
        </div>
      )}

      {!manager && latestSlip && (
        <div className="payroll-kpis payroll-kpis--personal">
          <div className="payroll-kpi">
            <div className="label">Latest gross</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(latestSlip.gross)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi">
            <div className="label">Other earnings</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(latestSlip.otherEarnings)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi">
            <div className="label">Pension</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(latestSlip.pension)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi">
            <div className="label">PAYE (income tax)</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(latestSlip.tax)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi payroll-kpi--net">
            <div className="label">Latest net pay</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(latestSlip.net)}</AutoFitNumber>
          </div>
        </div>
      )}

      {manager && totals && (
        <div className="payroll-kpis">
          <div className="payroll-kpi">
            <div className="label">Headcount</div>
            <div className="value">{totals.headcount}</div>
          </div>
          <div className="payroll-kpi">
            <div className="label">Gross payroll</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(totals.gross)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi">
            <div className="label">Pension</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(totals.pension)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi">
            <div className="label">PAYE (income tax)</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(totals.tax)}</AutoFitNumber>
          </div>
          <div className="payroll-kpi payroll-kpi--net">
            <div className="label">Net payable</div>
            <AutoFitNumber className="value" maxRem={1.08} minRem={0.7}>ETB {fmt(totals.net)}</AutoFitNumber>
          </div>
        </div>
      )}

      {manager && <div className="card shadow-sm border-0 payroll-register-card">
        <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
          <div>
            <h5 className="fw-bold mb-0">{MONTHS[period.month - 1]} {period.year} payroll</h5>
            <div className="small text-muted">Payslips are generated from the latest salary record effective in the month.</div>
          </div>
          <button className="btn btn-outline-primary btn-sm no-print" onClick={sendAll} disabled={busy === "send-all" || !payslips.length}>
            <Send size={14} /> {busy === "send-all" ? "Sending…" : "Email all payslips"}
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 payroll-table">
            <thead>
              <tr>
                <th className="staff-col">Staff member</th>
                <th className="num">Gross (ETB)</th>
                <th className="num">Other earnings</th>
                <th className="num">Pension</th>
                <th className="num">PAYE (income tax)</th>
                <th className="num">Other deductions</th>
                <th className="num">Net (ETB)</th>
                <th className="text-end">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {!register || register.rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-4">No salary records are effective for this month. Add one below.</td></tr>
              ) : register.rows.map((row) => {
                const slip = slipByUser.get(row.userId);
                return (
                  <tr key={row.userId}>
                    <td className="staff-cell">
                      <div className="fw-semibold">{row.employee?.firstName} {row.employee?.lastName}</div>
                      <div className="small text-muted">
                        {row.employee?.employeeNo ? `${row.employee.employeeNo} · ` : ""}
                        {row.employee?.position || row.employee?.department || row.employee?.username}
                      </div>
                    </td>
                    <td className="num">{fmt(row.gross)}</td>
                    <td className="num text-success">{fmt(row.otherEarnings)}</td>
                    <td className="num text-danger">{fmt(row.pension)}</td>
                    <td className="num text-danger">{fmt(row.tax)}</td>
                    <td className="num text-danger">{fmt(row.otherDeductions)}</td>
                    <td className="num fw-bold text-success">{fmt(row.net)}</td>
                    <td>
                      <div className="d-flex align-items-center justify-content-end gap-1 flex-wrap">
                        {slip ? (
                          <span className={`badge ${slip.status === "Sent" ? "bg-success" : "bg-secondary"}`}>{slip.status}</span>
                        ) : (
                          <span className="badge bg-light text-dark">Not generated</span>
                        )}
                        <span className="no-print d-inline-flex gap-1 flex-nowrap">
                          {slip ? (
                            <>
                              <Link className="btn btn-sm btn-outline-primary" to={`/payslips/${slip.id}`} title="Open payslip">
                                <FileText size={14} />
                              </Link>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => sendOne(slip)} disabled={busy === slip.id} title="Email payslip">
                                <Mail size={14} />
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-sm btn-outline-primary" onClick={generate} title="Generate payslips">
                              <PlusCircle size={14} />
                            </button>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {register && register.rows.length > 0 && (
              <tfoot>
                <tr className="table-light fw-bold">
                  <td>Total</td>
                  <td className="num">{fmt(register.totalGross)}</td>
                  <td className="num">{fmt(register.totalOtherEarnings)}</td>
                  <td className="num">{fmt(register.totalPension)}</td>
                  <td className="num">{fmt(register.totalTax)}</td>
                  <td className="num">{fmt(register.totalOtherDeductions)}</td>
                  <td className="num text-success">{fmt(register.totalNet)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>}

      {!manager && (
        <div className="card shadow-sm border-0 mt-3">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h5 className="fw-bold mb-1">My salary record</h5>
                <div className="small text-muted">The latest salary record effective for you; payroll uses it when generating a payslip.</div>
              </div>
              {latestSalary?.effectiveAt && (
                <span className="badge bg-light text-dark border">Effective {new Date(latestSalary.effectiveAt).toLocaleDateString("en-GB")}</span>
              )}
            </div>
            {!latestSalary ? (
              <p className="small text-muted mb-0">No salary record has been published to your file yet. Contact Finance or HR if this is unexpected.</p>
            ) : (
              <div className="row g-3">
                <div className="col-sm-6 col-xl-3"><div className="small text-muted">Base salary</div><div className="fw-bold">ETB {fmt(latestSalary.baseSalary)}</div></div>
                <div className="col-sm-6 col-xl-3"><div className="small text-muted">Allowance</div><div className="fw-bold">ETB {fmt(latestSalary.allowance)}</div></div>
                <div className="col-sm-6 col-xl-3"><div className="small text-muted">Occasional earnings</div><div className="fw-bold text-success">ETB {fmt(latestSalary.otherEarnings)}</div></div>
                <div className="col-sm-6 col-xl-3"><div className="small text-muted">Other deductions</div><div className="fw-bold text-danger">ETB {fmt(latestSalary.otherDeductions)}</div></div>
              </div>
            )}
            {latestSalary?.notes ? <div className="small text-muted mt-3">{latestSalary.notes}</div> : null}
          </div>
        </div>
      )}

      {manager && <div className="card shadow-sm border-0 mt-3 payroll-import-card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
            <div>
              <h6 className="fw-bold mb-1">Monthly payroll CSV</h6>
              <div className="small text-muted">
                Set the month and year above, download the template, then upload the finance team's completed sheet.
                Re-uploading the same month updates its records instead of creating duplicates.
              </div>
            </div>
            <a className="btn btn-outline-secondary btn-sm" href={`${API_BASE}/payroll/template`}>
              <Download size={14} /> Download template
            </a>
          </div>
          <form className="d-flex flex-wrap align-items-end gap-2" onSubmit={uploadPayroll}>
            <div className="flex-grow-1" style={{ minWidth: 220 }}>
              <label className="form-label small fw-bold mb-1">CSV file for {MONTHS[period.month - 1]} {period.year}</label>
              <input
                ref={importInput}
                type="file"
                accept=".csv,text/csv"
                className="form-control form-control-sm"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy === "upload" || !importFile}>
              <Upload size={14} /> {busy === "upload" ? "Importing…" : "Import payroll CSV"}
            </button>
          </form>
          <div className="form-text mt-1">
            Columns: <code>username</code>, <code>baseSalary</code>, <code>allowance</code>, <code>otherEarnings</code>,
            <code className="ms-1">otherDeductions</code>, <code className="ms-1">notes</code>.
          </div>
          {importResult && (
            <div className={`alert ${importResult.skipped ? "alert-warning" : "alert-success"} border-0 small mt-2 mb-0`}>
              <div className="fw-semibold">
                {importResult.label}: {importResult.added} added, {importResult.updated} updated, {importResult.skipped} skipped.
              </div>
              {importResult.errors?.length > 0 && (
                <ul className="mb-0 mt-1 ps-3">
                  {importResult.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>}

      {manager && records.some((record) => record.approvalStatus === "Pending") && (
        <div className="card shadow-sm border-0 mt-3">
          <div className="card-body">
            <h6 className="fw-bold mb-1">Salary changes awaiting approval</h6>
            <div className="small text-muted mb-3">Finance officers prepare changes; a Finance Manager, HR Manager or executive approves them before payslips use them.</div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 payroll-table payroll-table--compact payroll-table--salary">
                <thead className="table-light"><tr><th>Staff</th><th className="num">Base</th><th className="num">Other earn.</th><th className="num">Other ded.</th><th>Submitted by</th><th className="text-end">Decision</th></tr></thead>
                <tbody>
                  {records.filter((record) => record.approvalStatus === "Pending").map((record) => (
                    <tr key={record.id}>
                      <td><div className="fw-semibold small">{record.user?.firstName} {record.user?.lastName}</div><div className="small text-muted">{record.user?.username}</div></td>
                      <td className="num small">{fmt(record.baseSalary)}</td>
                      <td className="num small text-success">{fmt(record.otherEarnings)}</td>
                      <td className="num small text-danger">{fmt(record.otherDeductions)}</td>
                      <td className="small">{record.submittedBy || "—"}</td>
                      <td className="text-end">
                        {approver ? (
                          <div className="d-inline-flex gap-1">
                            <button className="btn btn-sm btn-outline-success" onClick={() => decideSalary(record, "approve")}>Approve</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => decideSalary(record, "reject")}>Reject</button>
                          </div>
                        ) : <span className="small text-muted">Awaiting approver</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {payslips.length > 0 && (
        <div className="card shadow-sm border-0 mt-3">
          <div className="card-body">
            <h6 className="fw-bold mb-2">
              {manager ? `Generated payslips — ${MONTHS[period.month - 1]} ${period.year}` : "My payslip history"}
            </h6>
            {manager ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 payroll-table payroll-table--compact">
                  <thead className="table-light"><tr><th>Employee</th><th className="num">Net (ETB)</th><th>Status</th><th>Emailed to</th><th className="text-end no-print">Open</th></tr></thead>
                  <tbody>
                    {payslips.map((slip) => (
                      <tr key={slip.id}>
                        <td>{slip.user?.firstName} {slip.user?.lastName}</td>
                        <td className="num">{fmt(slip.net)}</td>
                        <td><span className={`badge ${slip.status === "Sent" ? "bg-success" : "bg-secondary"}`}>{slip.status}</span></td>
                        <td className="small text-muted">{slip.sentTo || "—"}</td>
                        <td className="text-end no-print">
                          <Link className="btn btn-sm btn-outline-primary" to={`/payslips/${slip.id}`}><FileText size={14} /> Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 payroll-table payroll-table--compact payroll-table--personal">
                  <thead className="table-light"><tr><th>Period</th><th className="num">Gross</th><th className="num">Other earn.</th><th className="num">PAYE</th><th className="num">Other ded.</th><th className="num">Net (ETB)</th><th>Status</th><th className="text-end no-print">Open</th></tr></thead>
                  <tbody>
                    {payslips.map((slip) => (
                      <tr key={slip.id}>
                        <td className="fw-semibold">{MONTHS[slip.month - 1]} {slip.year}</td>
                        <td className="num">{fmt(slip.gross)}</td>
                        <td className="num text-success">{fmt(slip.otherEarnings)}</td>
                        <td className="num text-danger">{fmt(slip.tax)}</td>
                        <td className="num text-danger">{fmt(slip.otherDeductions)}</td>
                        <td className="num fw-bold text-success">{fmt(slip.net)}</td>
                        <td><span className={`badge ${slip.status === "Sent" ? "bg-success" : "bg-secondary"}`}>{slip.status}</span></td>
                        <td className="text-end no-print">
                          <Link className="btn btn-sm btn-outline-primary" to={`/payslips/${slip.id}`}><FileText size={14} /> Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!manager && payslips.length === 0 && (
        <div className="alert alert-light border small mt-3">
          No payslip has been issued to you yet. Your salary record appears above; payslips will appear here once Finance generates them.
        </div>
      )}

      {manager && <div className="row g-4 mt-1">
        <div className="col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-1">Add salary record</h5>
              <div className="small text-muted mb-3">
                Saved for {MONTHS[period.month - 1]} {period.year}. Gross = base + allowance + occasional earnings;
                other deductions reduce net after PAYE.
              </div>
              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label small fw-bold">Staff member</label>
                  <select className="form-select" required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                    <option value="">Select…</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.username}){s.position ? ` — ${s.position}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row g-2">
                  <div className="col-sm-6">
                    <label className="form-label small fw-bold">Base salary</label>
                    <input type="number" min="0" step="0.01" className="form-control" required value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-bold">Allowance</label>
                    <input type="number" min="0" step="0.01" className="form-control" required value={form.allowance} onChange={(e) => setForm({ ...form, allowance: e.target.value })} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-bold">Occasional earnings</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={form.otherEarnings} onChange={(e) => setForm({ ...form, otherEarnings: e.target.value })} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-bold">Other deductions</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={form.otherDeductions} onChange={(e) => setForm({ ...form, otherDeductions: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label small fw-bold">Notes</label>
                  <input type="text" className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g., Grade 5, Step 2" />
                </div>
                <button type="submit" className="btn btn-primary">Add record</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-2">Salary register</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 payroll-table payroll-table--compact payroll-table--salary">
                  <thead className="table-light"><tr><th>Staff</th><th className="num">Base (ETB)</th><th className="num">Allowance</th><th className="num">Other earn.</th><th className="num">Other ded.</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr><td colSpan={7} className="text-muted small text-center py-3">No salary records yet.</td></tr>
                    ) : records.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-semibold small">{r.user?.firstName} {r.user?.lastName}</div>
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>{r.user?.department || r.user?.username}</div>
                        </td>
                        <td className="num small">{fmt(r.baseSalary)}</td>
                        <td className="num small">{fmt(r.allowance)}</td>
                        <td className="num small text-success">{fmt(r.otherEarnings)}</td>
                        <td className="num small text-danger">{fmt(r.otherDeductions)}</td>
                        <td><span className={`badge ${r.approvalStatus === "Approved" ? "bg-success" : r.approvalStatus === "Rejected" ? "bg-danger" : "bg-warning text-dark"}`}>{r.approvalStatus || "Approved"}</span></td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r.id)} aria-label="Delete salary record"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}
