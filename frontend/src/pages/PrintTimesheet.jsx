import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Printer, X } from "lucide-react";
import { api, assetUrl } from "../lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const keyOf = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.username || "";

const isWeekday = (date) => date.getDay() !== 0 && date.getDay() !== 6;

export default function PrintTimesheet() {
  const { id } = useParams();
  const [ts, setTs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/timesheets/${id}`).then(setTs).catch((e) => setError(e.message || "Timesheet not found."));
  }, [id]);

  const grid = useMemo(() => {
    if (!ts) return null;
    const month = Number(ts.month);
    const year = Number(ts.year);
    const dayCount = new Date(year, month, 0).getDate();
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(year, month - 1, index + 1);
      return { date, day: index + 1, weekday: WEEKDAYS[date.getDay()], workday: isWeekday(date), key: keyOf(date) };
    });

    const entryMap = new Map();
    (ts.entries || []).forEach((entry) => {
      const key = keyOf(entry.date);
      if (!entryMap.has(key)) entryMap.set(key, []);
      entryMap.get(key).push(entry);
    });

    const projectSet = new Set((ts.entries || []).map((entry) => entry.projectName || "Regular"));
    projectSet.add("Regular");
    const projects = [...projectSet];

    const rows = projects.map((project) => {
      const cells = days.map((day) => {
        const dayEntries = entryMap.get(day.key) || [];
        if (dayEntries.length === 0) {
          return {
            display: day.workday && project === "Regular" ? "8" : "",
            hours: day.workday && project === "Regular" ? 8 : 0,
          };
        }
        const matching = dayEntries.filter((entry) => (entry.projectName || "Regular") === project);
        if (!matching.length) return { display: "", hours: 0 };
        const leave = matching.find((entry) => entry.leaveCode);
        if (leave) return { display: leave.leaveCode, hours: 0, leave: true };
        const hours = matching.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
        return { display: hours ? String(hours) : "", hours };
      });
      return { project, cells, total: cells.reduce((sum, cell) => sum + cell.hours, 0) };
    });

    const dayTotals = days.map((_, index) => rows.reduce((sum, row) => sum + row.cells[index].hours, 0));
    const totalHours = dayTotals.reduce((sum, value) => sum + value, 0);
    return { days, rows, dayTotals, totalHours, month, year };
  }, [ts]);

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-outline-secondary" onClick={() => window.close()}>Close</button>
      </div>
    );
  }

  if (!ts || !grid) {
    return <div className="p-5 text-center"><div className="spinner-border text-success" role="status" /></div>;
  }

  const employee = fullName(ts.user);
  const hrSigner = fullName(ts.hrAdmin) || "Human Resource & Administration";
  const monthLabel = `${MONTHS[grid.month - 1]} ${grid.year}`;
  const periodLabel = `${String(grid.month).padStart(2, "0")}/${grid.year}`;
  const statusTone = ts.status === "APPROVED" ? "approved" : ts.status === "REJECTED" ? "rejected" : "pending";
  const statusLabel =
    ts.status === "SUBMITTED" ? "With HR & Admin" : ts.status === "FORWARDED" ? "With supervisor" : ts.status;

  return (
    <div className="timesheet-print-page">
      <Helmet>
        <title>{`Timesheet ${periodLabel} - ${employee}`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="timesheet-print-actions no-print">
        <button type="button" className="btn btn-brand d-flex align-items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} /> Print / save as PDF
        </button>
        <button type="button" className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={() => window.close()}>
          <X size={16} /> Close
        </button>
        <span className="timesheet-print-actions__hint">Landscape A4 · choose “Save as PDF” in the print dialog to file a copy.</span>
      </div>

      <article className="timesheet-sheet">
        <header className="timesheet-sheet__header">
          <div className="timesheet-sheet__brand">
            <span className="timesheet-sheet__mark">EB</span>
            <div>
              <div className="timesheet-sheet__org">Ethio-Biopharma Enterprise</div>
              <div className="timesheet-sheet__dept">Human Resource &amp; Admin. Dept.</div>
            </div>
          </div>
          <div className="timesheet-sheet__title">
            <h1>Monthly Timesheet</h1>
            <div>Attendance, project time &amp; leave record</div>
          </div>
          <div className={`timesheet-sheet__status timesheet-sheet__status--${statusTone}`}>
            <span>Status</span>
            <strong>{statusLabel}</strong>
            <small>Period {periodLabel}</small>
          </div>
        </header>

        <section className="timesheet-sheet__meta">
          <div><span>Employee</span><strong>{employee}</strong></div>
          <div><span>Employee No.</span><strong>{ts.user.employeeNo || "—"}</strong></div>
          <div><span>Position</span><strong>{ts.user.position || "—"}</strong></div>
          <div><span>Department</span><strong>{ts.user.department || "—"}</strong></div>
          <div><span>HR &amp; Admin signatory</span><strong>{hrSigner}</strong></div>
          <div><span>Reporting month</span><strong>{monthLabel}</strong></div>
        </section>

        <div className="timesheet-sheet__table-wrap">
          <table className="timesheet-sheet__table">
            <thead>
              <tr>
                <th className="timesheet-sheet__project-col">Project / activity</th>
                {grid.days.map((day) => (
                  <th key={day.key} className={day.workday ? "" : "is-weekend"}>
                    <span className="timesheet-sheet__weekday">{day.weekday}</span>
                    <span className="timesheet-sheet__date">{String(day.day).padStart(2, "0")}</span>
                  </th>
                ))}
                <th className="timesheet-sheet__total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row) => (
                <tr key={row.project}>
                  <td className="timesheet-sheet__project-col">{row.project}</td>
                  {row.cells.map((cell, index) => (
                    <td
                      key={grid.days[index].key}
                      className={`${cell.leave ? "is-leave" : ""} ${grid.days[index].workday ? "" : "is-weekend"}`}
                    >
                      {cell.display}
                    </td>
                  ))}
                  <td className="timesheet-sheet__total-col">{row.total || ""}</td>
                </tr>
              ))}
              <tr className="timesheet-sheet__totals">
                <td className="timesheet-sheet__project-col">Daily total</td>
                {grid.dayTotals.map((value, index) => (
                  <td key={grid.days[index].key} className={grid.days[index].workday ? "" : "is-weekend"}>
                    {value || ""}
                  </td>
                ))}
                <td className="timesheet-sheet__total-col">{grid.totalHours}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="timesheet-sheet__legend">
          <div>
            <strong>Basis of preparation:</strong> weekdays without a recorded entry are shown as <em>Regular · 8 hours</em>.
            Leave codes replace hours for the day (AL annual, SL sick, AB absence). Weekend columns are excluded from defaults.
          </div>
          <div className="timesheet-sheet__summary">
            <span>Working days <strong>{grid.days.filter((day) => day.workday).length}</strong></span>
            <span>Recorded hours <strong>{grid.totalHours}</strong></span>
            <span>Projects <strong>{grid.rows.length}</strong></span>
          </div>
        </section>

        <section className="timesheet-sheet__signatures">
          <div className="timesheet-sheet__signature">
            <div className="timesheet-sheet__signature-label">Employee signature</div>
            <div className="timesheet-sheet__signature-space">
              {ts.user.signatureUrl ? <img src={assetUrl(ts.user.signatureUrl)} alt="" /> : null}
            </div>
            <div className="timesheet-sheet__signature-line" />
            <div className="timesheet-sheet__signature-name">{employee}</div>
            <div className="timesheet-sheet__signature-date">Date: ____________________</div>
          </div>
          <div className="timesheet-sheet__signature">
            <div className="timesheet-sheet__signature-label">HR &amp; Admin approval</div>
            <div className="timesheet-sheet__signature-space">
              {ts.hrAdmin?.signatureUrl || ts.hrAdmin?.initialsUrl ? (
                <img src={assetUrl(ts.hrAdmin.signatureUrl || ts.hrAdmin.initialsUrl)} alt="" />
              ) : null}
            </div>
            <div className="timesheet-sheet__signature-line" />
            <div className="timesheet-sheet__signature-name">{hrSigner}</div>
            <div className="timesheet-sheet__signature-date">Date: ____________________</div>
          </div>
        </section>

        <footer className="timesheet-sheet__footer">
          <span>Ethio-Biopharma Enterprise · Human Resource &amp; Admin. Dept. · Confidential personnel record</span>
          <span>Generated {new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
        </footer>
      </article>
    </div>
  );
}
