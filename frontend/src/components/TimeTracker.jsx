import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Clock } from "lucide-react";

export default function TimeTracker({ projectId }) {
  const [entries, setEntries] = useState([]);
  const [hours, setHours] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.get(`/time/${projectId}`);
      setEntries(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!hours) return;
    try {
      await api.post(`/time/${projectId}`, { hours: Number(hours), description: desc });
      setHours(""); setDesc("");
      load();
    } catch (e) { alert(e.message); }
  };

  const total = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="card border-0 shadow-sm p-3 mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Time Tracking</h5>
        <span className="badge bg-primary fs-6">Total Logged: {total} hours</span>
      </div>

      <form onSubmit={submit} className="d-flex gap-2 mb-4">
        <input required type="number" step="0.5" min="0.5" className="form-control form-control-sm" placeholder="Hours (e.g., 2.5)" value={hours} onChange={e => setHours(e.target.value)} style={{ width: "120px" }} />
        <input required className="form-control form-control-sm" placeholder="What did you work on?" value={desc} onChange={e => setDesc(e.target.value)} />
        <button type="submit" className="btn-brand btn-sm d-flex align-items-center gap-1"><Clock size={14}/> Log</button>
      </form>

      {loading ? <div className="text-muted small">Loading entries...</div> : (
        <table className="table table-sm">
          <thead>
            <tr><th>Date</th><th>User</th><th>Description</th><th className="text-end">Hours</th></tr>
          </thead>
          <tbody>
            {entries.map(en => (
              <tr key={en.id}>
                <td>{new Date(en.date).toLocaleDateString()}</td>
                <td>{en.username}</td>
                <td>{en.description}</td>
                <td className="text-end fw-bold">{en.hours}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-3">No time logged yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}