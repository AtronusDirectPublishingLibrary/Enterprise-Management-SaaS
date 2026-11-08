import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Trash2 } from "lucide-react";

// Ethiopian PAYE Tax Calculation (2025 Proclamation No. 1395/2025)
const calculatePaye = (taxableIncome) => {
  if (taxableIncome <= 2000) return 0;
  if (taxableIncome <= 4000) return (taxableIncome * 0.15) - 300;
  if (taxableIncome <= 7000) return (taxableIncome * 0.20) - 500;
  if (taxableIncome <= 10000) return (taxableIncome * 0.25) - 850;
  if (taxableIncome <= 14000) return (taxableIncome * 0.30) - 1350;
  return (taxableIncome * 0.35) - 2050;
};

const calculatePayroll = (base, allowance) => {
  const b = Number(base) || 0;
  const a = Number(allowance) || 0;
  const gross = b + a;
  const pension = b * 0.07;
  const taxable = gross - pension;
  const tax = calculatePaye(taxable);
  const net = gross - pension - tax;
  return { gross, pension, tax, net };
};

export default function Payroll() {
  const [records, setRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ userId: "", baseSalary: "", allowance: 0, currency: "ETB", notes: "" });

  const loadData = () => {
    api.get("/payroll").then(setRecords).catch(console.error);
    api.get("/hr/staff").then(setStaff).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payroll", form);
      setForm({ userId: "", baseSalary: "", allowance: 0, currency: "ETB", notes: "" });
      loadData();
    } catch (err) { alert("Failed to save"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this salary record?")) return;
    try { await api.del(`/payroll/${id}`); loadData(); } catch (err) { alert("Failed"); }
  };

  const totalBase = records.reduce((sum, r) => sum + (Number(r.baseSalary) || 0), 0);
  const totalAllowance = records.reduce((sum, r) => sum + (Number(r.allowance) || 0), 0);
  const totalPension = records.reduce((sum, r) => sum + calculatePayroll(r.baseSalary, r.allowance).pension, 0);
  const totalTax = records.reduce((sum, r) => sum + calculatePayroll(r.baseSalary, r.allowance).tax, 0);
  const totalNet = records.reduce((sum, r) => sum + calculatePayroll(r.baseSalary, r.allowance).net, 0);
  const totalGross = totalBase + totalAllowance;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Payroll | EBPE</title></Helmet>
      <h2 className="h3 fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>Payroll Register</h2>

      <div className="alert alert-info shadow-sm">
        <strong>Total Net Payroll:</strong> {totalNet.toLocaleString()} ETB
        <span className="small ms-3 opacity-75">
          (Gross: {totalGross.toLocaleString()} | Pension: {totalPension.toLocaleString()} | Tax: {totalTax.toLocaleString()})
        </span>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Add Salary Record</h5>
              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label small fw-bold">Staff Member</label>
                  <select className="form-select" required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}>
                    <option value="">Select...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.username})</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label small fw-bold">Base Salary</label>
                  <input type="number" className="form-control" required value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})} />
                </div>
                <div>
                  <label className="form-label small fw-bold">Allowance</label>
                  <input type="number" className="form-control" required value={form.allowance} onChange={e => setForm({...form, allowance: e.target.value})} />
                </div>
                <div>
                  <label className="form-label small fw-bold">Notes</label>
                  <input type="text" className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="e.g., Grade 5, Step 2" />
                </div>
                <button type="submit" className="btn btn-primary">Add Record</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body p-0 table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Staff</th>
                    <th>Base</th>
                    <th>Allowance</th>
                    <th>Gross</th>
                    <th>Pension (7%)</th>
                    <th>Income Tax</th>
                    <th>Net Pay</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const calc = calculatePayroll(r.baseSalary, r.allowance);
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-bold">{r.user.firstName} {r.user.lastName}</div>
                          <div className="small text-muted">{r.user.username}</div>
                        </td>
                        <td>{r.baseSalary.toLocaleString()}</td>
                        <td>{r.allowance.toLocaleString()}</td>
                        <td>{calc.gross.toLocaleString()}</td>
                        <td className="text-danger">-{calc.pension.toLocaleString()}</td>
                        <td className="text-danger">-{calc.tax.toLocaleString()}</td>
                        <td className="fw-bold text-success">{calc.net.toLocaleString()}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r.id)}><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}