import { useState, useEffect } from "react";

export default function ItemForm({ title, initialData, isWp, onSave, onClose, availableActivities = [], members = [] }) {
  const [data, setData] = useState({
    title: "", description: "", startDate: "", endDate: "", progress: 0, status: "Not Started",
    financialPlan: 0, actualExpenditure: 0, predecessorIds: []
  });

  useEffect(() => {
    const safeDate = (d) => {
      if (!d) return "";
      try { return new Date(d).toISOString().split("T")[0]; } catch { return ""; }
    };

    if (initialData) {
      setData({
        ...initialData,
        startDate: safeDate(initialData.startDate),
        endDate: safeDate(initialData.endDate),
        predecessorIds: initialData.predecessors ? initialData.predecessors.map(p => p.activityId) : []
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (e) => {
    const options = Array.from(e.target.selectedOptions);
    setData({ ...data, predecessorIds: options.map(o => o.value) });
  };

  const assigneeValue = isWp ? data.ownerUsername || "" : data.assignedTo || "";
  const assigneeField = isWp ? "ownerUsername" : "assignedTo";
  const assigneeKnown = !assigneeValue || members.some((member) => member.username === assigneeValue);

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-2">
              <label className="form-label">Title</label>
              <input className="form-control form-control-sm" name="title" value={data.title} onChange={handleChange} />
            </div>
            <div className="mb-2">
              <label className="form-label">Description</label>
              <textarea className="form-control form-control-sm" name="description" rows={2} value={data.description || ""} onChange={handleChange} placeholder="What does this deliver?" />
            </div>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control form-control-sm" name="startDate" value={data.startDate} onChange={handleChange} />
              </div>
              <div className="col-6">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control form-control-sm" name="endDate" value={data.endDate} onChange={handleChange} />
              </div>
            </div>

            <div className="mb-2 p-2 rounded border" style={{ background: "#f8fafc" }}>
              <label className="form-label text-primary fw-semibold mb-1">
                {isWp ? "Accountable team member" : "Assigned team member"}
              </label>
              {members.length ? (
                <select className="form-select form-select-sm" name={assigneeField} value={assigneeValue} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {!assigneeKnown ? <option value={assigneeValue}>{assigneeValue} (not in team)</option> : null}
                  {members.map((member) => (
                    <option key={member.username} value={member.username}>
                      {member.name || [member.firstName, member.lastName].filter(Boolean).join(" ") || member.username}
                      {member.position
                        ? ` · ${member.position}`
                        : member.role && member.role !== "member"
                          ? ` · ${member.roleLabel || member.role}`
                          : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="form-control form-control-sm" name={assigneeField} value={assigneeValue} onChange={handleChange} placeholder="Add team members first (Team tab)" />
              )}
              <div className="form-text">Only project team members appear here. Add people from the Team tab.</div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label">Status</label>
                <select className="form-select form-select-sm" name="status" value={data.status} onChange={handleChange}>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>On Hold</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Progress (%)</label>
                <input type="number" className="form-control form-control-sm" name="progress" value={data.progress} onChange={handleChange} />
              </div>
            </div>

            {!isWp && (
              <>
                <div className="mb-2 mt-2">
                  <label className="form-label text-primary fw-semibold">Predecessor Dependencies</label>
                  <select multiple className="form-select form-select-sm" onChange={handleMultiSelect} value={data.predecessorIds || []} style={{ height: "100px" }}>
                    {availableActivities.map(act => (
                      <option key={act.activityId} value={act.activityId}>{act.activityId} - {act.title}</option>
                    ))}
                  </select>
                  <small className="text-muted">Hold Ctrl/Cmd to select multiple.</small>
                </div>
                <div className="row g-2 mb-2 p-2 bg-light rounded border">
                  <div className="col-6">
                    <label className="form-label text-primary fw-semibold">Financial Plan (ETB)</label>
                    <input type="number" className="form-control form-control-sm" name="financialPlan" value={data.financialPlan} onChange={handleChange} />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-danger fw-semibold">Actual Expenditure (ETB)</label>
                    <input type="number" className="form-control form-control-sm" name="actualExpenditure" value={data.actualExpenditure} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn-brand btn-sm" onClick={() => onSave(data)}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}