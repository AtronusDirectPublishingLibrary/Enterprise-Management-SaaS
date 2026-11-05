import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Target, Plus } from "lucide-react";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", targetDate: "" });
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");

  const loadData = async () => {
    try {
      const [g, p] = await Promise.all([api.get("/goals"), api.get("/projects")]);
      setGoals(g);
      setProjects(p);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/goals", form);
      setShowForm(false);
      setForm({ title: "", description: "", targetDate: "" });
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleLink = async (goalId) => {
    if (!selectedProject) return;
    try {
      await api.post(`/goals/${goalId}/link/${selectedProject}`, {});
      setSelectedGoal(null);
      setSelectedProject("");
      loadData();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title mb-0 d-flex align-items-center gap-2"><Target size={28} /> Organizational Goals</h2>
        <button className="btn-brand btn-sm d-flex align-items-center" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="me-1" /> New Goal
        </button>
      </div>

      {showForm && (
        <div className="card p-3 mb-4 border-0 shadow-sm">
          <form onSubmit={handleCreate}>
            <div className="row g-2">
              <div className="col-md-5">
                <input required className="form-control form-control-sm" placeholder="Goal Title (e.g., Expand Vaccine Access)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="col-md-4">
                <input required type="date" className="form-control form-control-sm" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
              </div>
              <div className="col-md-3 text-end">
                <button type="submit" className="btn-brand btn-sm w-100">Save Goal</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="row g-4">
        {goals.map(g => (
          <div className="col-md-6 col-lg-4" key={g.id}>
            <div className="card border-0 shadow-sm h-100 p-3" style={{ borderTop: "4px solid var(--brand-primary)" }}>
              <h5 className="fw-bold">{g.title}</h5>
              <p className="text-muted small">{g.description || "No description provided."}</p>
              <div className="mb-3">
                <span className="badge bg-secondary me-2">Target: {new Date(g.targetDate).toLocaleDateString()}</span>
                <span className="badge bg-success">{g.status}</span>
              </div>
              
              <div className="mt-auto border-top pt-3">
                <h6 className="small fw-bold text-muted mb-2">Linked Projects ({g.projects.length})</h6>
                <ul className="list-unstyled mb-3">
                  {g.projects.map(p => (
                    <li key={p.projectId} className="small text-truncate">📁 {p.project.title}</li>
                  ))}
                  {g.projects.length === 0 && <li className="small text-muted fst-italic">None linked yet</li>}
                </ul>
                
                {selectedGoal === g.id ? (
                  <div className="d-flex gap-2">
                    <select className="form-select form-select-sm" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                      <option value="">Select Project...</option>
                      {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.title}</option>)}
                    </select>
                    <button className="btn btn-sm btn-success" onClick={() => handleLink(g.id)}>Link</button>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => setSelectedGoal(g.id)}>+ Link Project</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}