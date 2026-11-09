import { useState } from "react";
import PositionSelect from "./PositionSelect";

export default function UserForm({ user, onSave, onClose }) {
  const [data, setData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
    password: "",
    role: user?.role || "viewer",
    email: user?.email || "",
    department: user?.department || user?.assignedDirectorate || "",
    position: user?.position || "",
  });

  const handleChange = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user && !data.password) return alert("Password is required for new users.");
    onSave(data);
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{user ? "Edit User" : "Add User"}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">First Name</label>
                  <input className="form-control form-control-sm" name="firstName" value={data.firstName} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Last Name</label>
                  <input className="form-control form-control-sm" name="lastName" value={data.lastName} onChange={handleChange} />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Username *</label>
                  <input className="form-control form-control-sm" name="username" value={data.username} onChange={handleChange} disabled={!!user} required />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Password {user ? "(Leave blank to keep current)" : "*"}</label>
                  <input type="password" className="form-control form-control-sm" name="password" value={data.password} onChange={handleChange} required={!user} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Role</label>
                  <select className="form-select form-select-sm" name="role" value={data.role} onChange={handleChange}>
                    <option value="admin">Admin</option>
                    <option value="executive">Executive</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="pi">PI</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Department</label>
                  <input className="form-control form-control-sm" name="department" value={data.department} onChange={handleChange} />
                </div>
                <div className="col-md-12">
                  <PositionSelect
                    id="user-position"
                    value={data.position}
                    onChange={(position) => setData({ ...data, position })}
                    required
                  />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control form-control-sm" name="email" value={data.email} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-brand btn-sm">Save User</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}