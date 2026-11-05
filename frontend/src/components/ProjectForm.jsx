import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

export default function ProjectForm({ initialData, onSave, onClose }) {
  const [data, setData] = useState({
    title: "",
    description: "",
    sourceOfFunds: "Treasury",
    status: "Not Started",
    priority: "Medium",
    projectCategory: "",
    projectManager: "",
    startDate: "",
    endDate: ""
  });

  const [milestones, setMilestones] = useState([]);
  const [options, setOptions] = useState({
    "Status": ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    "Source of Funds": ["Treasury", "Competitive Grants", "Grand Challenges Eth.", "Other"],
    "Priority": ["Low", "Medium", "High", "Critical"],
    "Project Category": ["Basic Biomedical Science", "Preclinical", "Clinical Trial", "Translational", "Public Health", "Other Specify"]
  });

  useEffect(() => {
    api.get("/dropdowns")
      .then(res => {
        if (res && typeof res === 'object') {
          setOptions(prev => ({
            "Status": res["Status"]?.map(o => o.value) || prev["Status"],
            "Source of Funds": res["Source of Funds"]?.map(o => o.value) || prev["Source of Funds"],
            "Priority": res["Priority"]?.map(o => o.value) || prev["Priority"],
            "Project Category": res["Project Category"]?.map(o => o.value) || prev["Project Category"]
          }));
        }
      })
      .catch(err => console.warn("Could not load dynamic dropdowns, using defaults.", err));
  }, []);

  useEffect(() => {
    if (initialData) {
      const safeDate = (d) => {
        if (!d) return "";
        try { return new Date(d).toISOString().split("T")[0]; } catch { return ""; }
      };

      setData({
        title: initialData.title || "",
        description: initialData.description || "",
        sourceOfFunds: initialData.sourceOfFunds || "Treasury",
        status: initialData.status || "Not Started",
        priority: initialData.priority || "Medium",
        projectCategory: initialData.projectCategory || "",
        projectManager: initialData.projectManager || "",
        startDate: safeDate(initialData.startDate),
        endDate: safeDate(initialData.endDate),
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleAddMilestone = () => {
    setMilestones([...milestones, { title: "", startDate: "", endDate: "" }]);
  };

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const handleRemoveMilestone = (index) => {
    const updated = [...milestones];
    updated.splice(index, 1);
    setMilestones(updated);
  };

  const handleSubmit = () => {
    onSave({ ...data, milestones });
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{initialData ? "Edit Project" : "Add Project"}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label">Title</label>
                <input className="form-control form-control-sm" name="title" value={data.title} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control form-control-sm" name="description" value={data.description} onChange={handleChange} rows={2} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Source of Funds</label>
                <select className="form-select form-select-sm" name="sourceOfFunds" value={data.sourceOfFunds} onChange={handleChange}>
                  {options["Source of Funds"].map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select form-select-sm" name="status" value={data.status} onChange={handleChange}>
                  {options["Status"].map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control form-control-sm" name="startDate" value={data.startDate} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control form-control-sm" name="endDate" value={data.endDate} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Priority</label>
                <select className="form-select form-select-sm" name="priority" value={data.priority} onChange={handleChange}>
                  {options["Priority"].map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Project Category</label>
                <select className="form-select form-select-sm" name="projectCategory" value={data.projectCategory} onChange={handleChange}>
                  <option value="">Select category</option>
                  {options["Project Category"].map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-12 mt-2">
                <label className="form-label">Project Manager</label>
                <input className="form-control form-control-sm" name="projectManager" value={data.projectManager} onChange={handleChange} />
              </div>

              {/* MILESTONES SECTION */}
              {!initialData && (
                <div className="col-12 mt-4 border-top pt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0 fw-bold" style={{ color: "var(--brand-primary)" }}>Milestones</h6>
                    <button type="button" className="btn btn-sm btn-outline-success" onClick={handleAddMilestone}>
                      <Plus size={14} className="me-1"/> Add Milestone
                    </button>
                  </div>
                  
                  {milestones.map((ms, index) => (
                    <div key={index} className="d-flex gap-2 mb-2 align-items-end bg-light p-2 rounded border">
                      <div className="flex-grow-1">
                        <label className="form-label mb-0" style={{ fontSize: "0.75rem" }}>Milestone Title</label>
                        <input className="form-control form-control-sm" value={ms.title} onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)} />
                      </div>
                      <div style={{ width: "130px" }}>
                        <label className="form-label mb-0" style={{ fontSize: "0.75rem" }}>Start</label>
                        <input type="date" className="form-control form-control-sm" value={ms.startDate} onChange={(e) => handleMilestoneChange(index, 'startDate', e.target.value)} />
                      </div>
                      <div style={{ width: "130px" }}>
                        <label className="form-label mb-0" style={{ fontSize: "0.75rem" }}>End</label>
                        <input type="date" className="form-control form-control-sm" value={ms.endDate} onChange={(e) => handleMilestoneChange(index, 'endDate', e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger mb-1" onClick={() => handleRemoveMilestone(index)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {milestones.length === 0 && <div className="text-muted text-center py-2" style={{ fontSize: "0.85rem" }}>No milestones added yet.</div>}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn-brand btn-sm" onClick={handleSubmit}>Save Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}