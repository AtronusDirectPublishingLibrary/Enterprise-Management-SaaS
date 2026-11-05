import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarView({ activities }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white p-3 rounded shadow-sm border mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">{monthNames[month]} {year}</h5>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-secondary" onClick={prevMonth}><ChevronLeft size={14} /></button>
          <button className="btn btn-outline-secondary" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn btn-outline-secondary" onClick={nextMonth}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", backgroundColor: "#dee2e6", border: "1px solid #dee2e6" }}>
        {dayNames.map((d) => (
          <div key={d} style={{ padding: "8px", textAlign: "center", fontWeight: "bold", fontSize: "0.8rem", backgroundColor: "#f8f9fa" }}>{d}</div>
        ))}

        {blanks.map((b) => (
          <div key={`blank-${b}`} style={{ minHeight: "100px", backgroundColor: "#f8f9fa" }} />
        ))}

        {days.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayActivities = activities.filter((a) => a.startDate && a.startDate.startsWith(dateStr));

          return (
            <div key={day} style={{ minHeight: "100px", backgroundColor: "white", padding: "4px", display: "flex", flexDirection: "column" }}>
              <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>{day}</span>
              {dayActivities.map((a) => (
                <div key={a.activityId} className="badge bg-primary text-start text-truncate mb-1" style={{ fontSize: "0.65rem", padding: "4px" }} title={a.title}>
                  {a.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}