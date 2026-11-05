import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Trash2, Plus } from "lucide-react";

export default function AutomationBuilder({ projectId }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [triggerValue, setTriggerValue] = useState("Complete");
  const [actionTarget, setActionTarget] = useState("admin");
  const [actionValue, setActionValue] = useState("");

  const loadRules = () => {
    api.get(`/automation/${projectId}`)
      .then(data => setRules(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRules(); }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/automation/${projectId}`, {
        name,
        triggerEvent: "STATUS_CHANGE",
        triggerValue,
        actionType: "NOTIFY",
        actionTarget,
        actionValue,
      });
      setShowForm(false);
      setName(""); setActionValue("");
      loadRules();
    } catch (e) { alert(e.message); }
  };

  const deleteRule = async (id) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await api.del(`/automation/${id}`);
      loadRules();
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="text-muted small">Loading rules...</div>;

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <h6 className="fw-bold mb-0">Workflow Automation</h6>
        <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-3 mb-3 border-0 shadow-sm bg-light">
          <div className="mb-2">
            <label className="form-label small fw-semibold">Rule Name</label>
            <input className="form-control form-control-sm" required placeholder="e.g., Notify PM on completion" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="row g-2 mb-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">When status changes to:</label>
              <select className="form-select form-select-sm" value={triggerValue} onChange={e => setTriggerValue(e.target.value)}>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Notify User:</label>
              <input className="form-control form-control-sm" required value={actionTarget} onChange={e => setActionTarget(e.target.value)} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Notification Message</label>
            <input className="form-control form-control-sm" placeholder="e.g., Task is done!" value={actionValue} onChange={e => setActionValue(e.target.value)} />
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-outline-danger btn-sm me-2" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-brand btn-sm">Save Rule</button>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <div className="text-muted small fst-italic">No automation rules set up yet.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rules.map(r => (
            <div key={r.id} className="d-flex justify-content-between align-items-center p-2 bg-white border rounded small">
              <div>
                <strong>{r.name}</strong> <br />
                <span className="text-muted">When status → {r.triggerValue}, notify {r.actionTarget}</span>
              </div>
              <button className="btn btn-sm btn-link text-danger p-0" onClick={() => deleteRule(r.id)}><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}