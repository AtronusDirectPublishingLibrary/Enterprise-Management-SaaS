import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Mail, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { canManagePayroll } from "../lib/access";

const money = (currency, value) =>
  `${currency} ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayslipPage() {
  const { user } = useAuth();
  const canManage = canManagePayroll(user);
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [error, setError] = useState("");
  const [mailState, setMailState] = useState("");

  useEffect(() => {
    api.get(`/payslips/${id}`)
      .then(setPayslip)
      .catch((e) => setError(e.message || "Could not load this payslip."));
  }, [id]);

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      </div>
    );
  }
  if (!payslip) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  const employee = payslip.user;
  const name = [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || employee?.username;
  const currency = payslip.currency || "ETB";

  const sendEmail = async () => {
    setMailState("Sending…");
    try {
      const result = await api.post(`/payslips/${payslip.id}/send`, {});
      setMailState(result.message || "Done.");
    } catch (e) {
      setMailState(e.message || "Could not send the payslip.");
    }
  };

  const row = (label, value, className = "") => (
    <tr className={className}>
      <td>{label}</td>
      <td className="amount">{value}</td>
    </tr>
  );

  return (
    <>
      <Helmet><title>Payslip — {payslip.label} | EBPE</title></Helmet>
      <div className="payslip-stage">
        <div className="payslip-toolbar no-print d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3" style={{ maxWidth: "210mm", margin: "0 auto" }}>
          <button className="btn btn-light btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>
          <div className="d-flex flex-wrap gap-2">
            {canManage && (
              <button className="btn btn-outline-primary btn-sm" onClick={sendEmail} disabled={!payslip.mailConfigured}>
                <Mail size={15} /> Email payslip
              </button>
            )}
            <button className="btn btn-brand btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> Print / Save as PDF
            </button>
          </div>
        </div>
        {mailState && (
          <div className="alert alert-info no-print mx-auto" style={{ maxWidth: "210mm" }}>{mailState}</div>
        )}

        <article className="payslip-sheet" aria-label={`Payslip for ${name}, ${payslip.label}`}>
          <header className="payslip-brandbar">
            <div>
              <div className="name">{payslip.organisation?.shortName || "Ethio-Biopharma"}</div>
              <div className="tag">{payslip.organisation?.name || "Ethio-Biopharma Enterprise"}</div>
              <div className="tag">{payslip.organisation?.address || "Kilinto Industrial Park, Addis Ababa"}</div>
            </div>
            <div className="doc">
              <div><strong>PAYSLIP</strong></div>
              <div>{payslip.label}</div>
              <div>Ref: {payslip.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </header>

          <div className="payslip-title">
            <div>
              <div className="page-kicker">Confidential — employee copy</div>
              <h1>{name}</h1>
            </div>
            <div className="text-end" style={{ fontSize: "8.5pt", color: "#6b7280" }}>
              <div>Status: {payslip.status}</div>
              <div>Generated: {new Date(payslip.createdAt).toLocaleDateString("en-GB")}</div>
            </div>
          </div>

          <div className="payslip-grid">
            <div><span className="label">Employee number</span>{employee?.employeeNo || "—"}</div>
            <div><span className="label">Position</span>{employee?.position || employee?.jobTitle || "—"}</div>
            <div><span className="label">Department</span>{employee?.department || "—"}</div>
            <div><span className="label">Pay period</span>{payslip.label}</div>
            <div><span className="label">Email</span>{employee?.email || "—"}</div>
            <div><span className="label">Currency</span>{currency}</div>
          </div>

          <table className="payslip-table">
            <thead>
              <tr><th>Earnings</th><th className="amount">Amount</th></tr>
            </thead>
            <tbody>
              {row("Basic salary", money(currency, payslip.baseSalary))}
              {row("Allowances", money(currency, payslip.allowance))}
              {payslip.otherEarnings > 0 && row("Other earnings (occasional)", money(currency, payslip.otherEarnings))}
              {row("Gross pay", money(currency, payslip.gross), "group")}
            </tbody>
          </table>

          <table className="payslip-table mt-2">
            <thead>
              <tr><th>Deductions</th><th className="amount">Amount</th></tr>
            </thead>
            <tbody>
              {row("Pension contribution (employee 7%)", `− ${money(currency, payslip.pension)}`)}
              {row("Income tax (PAYE)", `− ${money(currency, payslip.tax)}`)}
              {payslip.otherDeductions > 0 && row("Other deductions", `− ${money(currency, payslip.otherDeductions)}`)}
              {row("Total deductions", money(currency, payslip.pension + payslip.tax + (payslip.otherDeductions || 0)), "group")}
            </tbody>
          </table>

          <div className="payslip-net">
            <div>
              <div style={{ fontSize: "8pt", letterSpacing: "0.12em", textTransform: "uppercase", color: "#cbd5e1" }}>Net pay for {payslip.label}</div>
              <div style={{ fontSize: "9pt", color: "rgba(255,255,255,0.8)" }}>After pension, PAYE and other deductions</div>
            </div>
            <div className="amount">{money(currency, payslip.net)}</div>
          </div>

          <div className="payslip-note">
            <ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Employer pension contribution (11%) of {money(currency, payslip.employerPension)} is paid separately by the
            employer and is not deducted from your net pay. Tax is computed on the taxable income after the employee
            pension contribution, using the Ethiopian PAYE schedule (Proclamation No. 1395/2025). Please report any
            discrepancy to Human Resource &amp; Administration within five working days of receiving this payslip.
          </div>

          <div className="payslip-sign">
            <div className="line">Prepared by — Finance</div>
            <div className="line">Checked by — HR &amp; Administration</div>
            <div className="line">Employee signature / date</div>
          </div>

          <footer className="payslip-footer">
            <span>{payslip.organisation?.name} · {payslip.organisation?.address}</span>
            <span>Confidential · {payslip.label}</span>
          </footer>
        </article>
      </div>
    </>
  );
}
