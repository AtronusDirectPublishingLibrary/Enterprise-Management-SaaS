import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Users, Upload, Save, X, Edit, Trash2, Search, Download, BookOpen, Calendar, Briefcase, Settings , CalendarRange} from "lucide-react";

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("directory");
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [trainings, setTrainings] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: null, firstName: "", lastName: "", username: "", email: "", role: "viewer", department: "", subDepartment: "", password: "", immediateSupervisorId: "" });

  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [balanceFile, setBalanceFile] = useState(null);
  const [balanceUploadStatus, setBalanceUploadStatus] = useState("");

  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [trainingForm, setTrainingForm] = useState({ userId: "", title: "", provider: "", completedAt: "", expiresAt: "" });

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });

  const [balanceForm, setBalanceForm] = useState({ userId: "", entitledDays: 20, rolloverDays: 0 });
  const [newLeaveType, setNewLeaveType] = useState({ name: "", code: "", defaultDays: 20, maxRolloverDays: 5, rolloverExpireYr: 1 });
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });
  const [tsDeadline, setTsDeadline] = useState(25);
  const [trainingAlerts, setTrainingAlerts] = useState({ expired: [], expiringSoon: [], total: 0 });

  const emptyForm = { id: null, firstName: "", lastName: "", username: "", email: "", role: "viewer", department: "", subDepartment: "", password: "", immediateSupervisorId: "" };

  const loadData = () => {
    api.get("/training-alerts").then(setTrainingAlerts).catch(console.error);
    api.get("/hr/staff").then(setStaff).catch(console.error);
    if (activeTab === "training") api.get("/hr/training").then(setTrainings).catch(console.error);
    if (activeTab === "leave") api.get("/hr/leave").then(setLeaves).catch(console.error);
    if (activeTab === "balances") api.get(`/leave-balances?year=${new Date().getFullYear()}`).then(setBalances).catch(console.error);
    if (activeTab === "leave-types") api.get("/leave-types").then(setLeaveTypes).catch(console.error);
    if (activeTab === "holidays") { api.get("/holidays").then(setHolidays).catch(console.error); api.get("/timesheets/settings").then(d => setTsDeadline(d.submissionDay)).catch(console.error); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) await api.put(`/hr/staff/${formData.id}`, formData);
      else await api.post("/hr/staff", formData);
      setIsEditing(false);
      setFormData(emptyForm);
      loadData();
    } catch (err) { alert(err.message || "Failed to save."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this staff member permanently?")) return;
    try { await api.del(`/hr/staff/${id}`); loadData(); } catch (err) { alert("Failed to delete."); }
  };

  const handleEdit = (user) => {
    setFormData({
      id: user.id, firstName: user.firstName || "", lastName: user.lastName || "",
      username: user.username || "", email: user.email || "", role: user.role || "viewer",
      department: user.department || "", subDepartment: user.subDepartment || "",
      password: "", immediateSupervisorId: user.immediateSupervisorId || ""
    });
    setIsEditing(true);
    window.scrollTo(0, 0);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    setUploadStatus("Uploading...");
    try {
      const res = await fetch("http://localhost:5000/api/hr/upload", { method: "POST", body: data, credentials: "include" });
      const result = await res.json();
      setUploadStatus(result.error ? `❌ ${result.error}` : `✅ Added: ${result.added}, Skipped: ${result.skipped}`);
      loadData();
    } catch (err) { setUploadStatus("❌ Upload failed."); }
  };

  const handleBalanceUpload = async (e) => {
    e.preventDefault();
    if (!balanceFile) return;
    const data = new FormData();
    data.append("file", balanceFile);
    setBalanceUploadStatus("Uploading...");
    try {
      const res = await fetch("http://localhost:5000/api/leave-balances/upload", { method: "POST", body: data, credentials: "include" });
      const result = await res.json();
      setBalanceUploadStatus(result.error ? `❌ ${result.error}` : `✅ Added: ${result.added}, Skipped: ${result.skipped}`);
      loadData();
    } catch (err) { setBalanceUploadStatus("❌ Upload failed."); }
  };

  const handleTrainingSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/hr/training", trainingForm);
      setShowTrainingForm(false);
      setTrainingForm({ userId: "", title: "", provider: "", completedAt: "", expiresAt: "" });
      loadData();
    } catch (err) { alert("Failed to save training"); }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/hr/leave", leaveForm);
      setShowLeaveForm(false);
      setLeaveForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
      loadData();
    } catch (err) { alert("Failed to submit leave request"); }
  };

  const handleCreateHoliday = async (e) => {
  const handleSaveTsSettings = async () => {
    try {
      await api.put("/timesheets/settings", { submissionDay: tsDeadline });
      alert("Timesheet deadline updated");
    } catch (err) { alert("Failed to update"); }
  };

    e.preventDefault();
    try {
      await api.post("/holidays", holidayForm);
      setHolidayForm({ name: "", date: "" });
      loadData();
      if (typeof toast !== "undefined") toast.success("Holiday added");
      else alert("Holiday added");
    } catch (err) {
      const msg = err.message || "Failed to add holiday";
      if (typeof toast !== "undefined") toast.error(msg);
      else alert(msg);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;
    try { await api.del(`/holidays/${id}`); loadData(); } catch (err) { alert("Failed to delete"); }
  };

  const handleLeaveAction = async (id, status, rejectionReason = null) => {
    try {
      await api.put(`/hr/leave/${id}`, { status, rejectionReason });
      loadData();
    } catch (err) { alert("Failed to update leave request."); }
  };

  const handleBalanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leave-balances", { ...balanceForm, year: new Date().getFullYear(), leaveType: "ANNUAL" });
      loadData();
      alert("Balance saved");
    } catch (err) { alert("Failed"); }
  };

  const handleCreateLeaveType = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leave-types", newLeaveType);
      setNewLeaveType({ name: "", code: "", defaultDays: 20, maxRolloverDays: 5, rolloverExpireYr: 1 });
      loadData();
    } catch (err) { alert(err.message || "Failed to create leave type"); }
  };

  const handleDeleteLeaveType = async (id) => {


    if (!window.confirm("Delete this leave type?")) return;
    try { await api.del(`/leave-types/${id}`); loadData(); } catch (err) { alert("Failed to delete"); }
  };

  const handleToggleLeaveType = async (type) => {
    try {
      await api.put(`/leave-types/${type.id}`, { ...type, isActive: !type.isActive });
      loadData();
    } catch (err) { alert("Failed to toggle"); }
  };

  const filteredStaff = staff.filter(s =>
    ((s.firstName || '') + ' ' + (s.lastName || '') + ' ' + (s.username || '') + ' ' + (s.email || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
      <Helmet><title>HR Suite | EBPE</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>HR Dashboard</h1>
      </div>

      {/* TAB BAR - TWO ROWS */}
      <div className="mb-4">
        {/* ROW 1 */}
        <div className="d-flex flex-wrap gap-2 mb-2">
          <button className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('directory')}><Users size={16} className="me-2"/> Staff Directory</button>
          <button className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('upload')}><Upload size={16} className="me-2"/> Bulk CSV</button>
          <button className={`btn ${activeTab === 'training' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('training')}><BookOpen size={16} className="me-2"/> Training</button>
          <button className={`btn ${activeTab === 'leave' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('leave')}><Calendar size={16} className="me-2"/> Leave Requests</button>
        </div>
        
        {/* ROW 2 */}
        <div className="d-flex flex-wrap gap-2 pb-3 border-bottom">
          <button className={`btn ${activeTab === 'balances' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('balances')}><Briefcase size={16} className="me-2"/> Leave Balances</button>
          <button className={`btn ${activeTab === 'leave-types' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('leave-types')}><Settings size={16} className="me-2"/> Leave Types</button>
          <button className={`btn ${activeTab === 'holidays' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveTab('holidays')}><CalendarRange size={16} className="me-2"/> Holidays</button>
        </div>
      </div>

      {/* STAFF DIRECTORY */}
      {activeTab === "directory" && (
        <div className="row g-4">
          <div className="col-lg-3">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">{isEditing ? "Edit Staff" : "Add New Staff"}</h5>
                <form onSubmit={handleSave} className="d-flex flex-column gap-3">
                  <div className="row g-2">
                    <div className="col-6"><label className="form-label small fw-bold">First Name *</label><input type="text" className="form-control" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></div>
                    <div className="col-6"><label className="form-label small fw-bold">Last Name *</label><input type="text" className="form-control" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
                  </div>
                  <div><label className="form-label small fw-bold">Username *</label><input type="text" className="form-control" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                  <div><label className="form-label small fw-bold">Email</label><input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                  {!isEditing && <div><label className="form-label small fw-bold">Password</label><input type="text" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Default: Password123!" /></div>}
                  <div><label className="form-label small fw-bold">Role</label>
                    <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="viewer">Viewer</option><option value="admin">Admin</option><option value="project_manager">Project Manager</option><option value="executive">Executive</option>
                    </select>
                  </div>
                  <div><label className="form-label small fw-bold">Department</label><input type="text" className="form-control" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} /></div>
                  <div><label className="form-label small fw-bold">Sub-department</label><input type="text" className="form-control" value={formData.subDepartment} onChange={e => setFormData({...formData, subDepartment: e.target.value})} /></div>
                  <div><label className="form-label small fw-bold">Supervisor</label>
                    <select className="form-select" value={formData.immediateSupervisorId} onChange={e => setFormData({...formData, immediateSupervisorId: e.target.value})}>
                      <option value="">-- None --</option>
                      {staff.filter(s => s.id !== formData.id).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button type="submit" className="btn btn-primary flex-grow-1"><Save size={16} /> {isEditing ? "Update" : "Save"}</button>
                    {isEditing && <button type="button" className="btn btn-secondary" onClick={() => { setIsEditing(false); setFormData(emptyForm); }}><X size={16} /></button>}
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <div className="p-3 border-bottom">
                  <input type="text" className="form-control form-control-sm" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light"><tr><th>Name</th><th>Username</th><th>Role</th><th>Department</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {filteredStaff.map(s => (
                        <tr key={s.id}>
                          <td><div className="fw-bold">{s.firstName} {s.lastName}</div><div className="small text-muted">{s.email || "—"}</div></td>
                          <td><code>{s.username}</code></td>
                          <td><span className="badge bg-secondary">{s.role}</span></td>
                          <td>{s.department || "—"}</td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(s)}><Edit size={14}/></button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK CSV */}
      {activeTab === "upload" && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-5 text-center">
            <h4 className="fw-bold mb-3">Bulk Import Staff via CSV</h4>
            <div className="d-flex justify-content-center gap-3 mb-4">
              <a href="http://localhost:5000/api/hr/template" className="btn btn-outline-primary" download><Download size={16}/> Download Template</a>
            </div>
            <form onSubmit={handleUpload} className="d-flex flex-column align-items-center gap-3">
              <input type="file" accept=".csv" className="form-control w-50" onChange={(e) => setFile(e.target.files[0])} />
              <button type="submit" className="btn btn-primary px-4 py-2">Upload File</button>
            </form>
            {uploadStatus && <p className="mt-4 fw-bold">{uploadStatus}</p>}
          </div>
        </div>
      )}

      {/* TRAINING */}
      {activeTab === "training" && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary" onClick={() => setShowTrainingForm(!showTrainingForm)}>
              {showTrainingForm ? "Cancel" : "+ Add Training Record"}
            </button>
          </div>
          {showTrainingForm && (
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Add Training Record</h5>
                <form onSubmit={handleTrainingSubmit} className="row g-3">
                  <div className="col-md-4"><label className="form-label small fw-bold">Staff</label>
                    <select className="form-select" required value={trainingForm.userId} onChange={e => setTrainingForm({...trainingForm, userId: e.target.value})}>
                      <option value="">Select Staff...</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4"><label className="form-label small fw-bold">Title</label><input type="text" className="form-control" required value={trainingForm.title} onChange={e => setTrainingForm({...trainingForm, title: e.target.value})} /></div>
                  <div className="col-md-4"><label className="form-label small fw-bold">Provider</label><input type="text" className="form-control" required value={trainingForm.provider} onChange={e => setTrainingForm({...trainingForm, provider: e.target.value})} /></div>
                  <div className="col-md-4"><label className="form-label small fw-bold">Completed</label><input type="date" className="form-control" required value={trainingForm.completedAt} onChange={e => setTrainingForm({...trainingForm, completedAt: e.target.value})} /></div>
                  <div className="col-md-4"><label className="form-label small fw-bold">Expires</label><input type="date" className="form-control" value={trainingForm.expiresAt} onChange={e => setTrainingForm({...trainingForm, expiresAt: e.target.value})} /></div>
                  <div className="col-md-4 d-flex align-items-end"><button type="submit" className="btn btn-success w-100">Save</button></div>
                </form>
              </div>
            </div>
          )}
          <div className="card shadow-sm border-0">
            <div className="card-body p-0 table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr><th>Staff</th><th>Title</th><th>Provider</th><th>Completed</th><th>Expires</th></tr></thead>
                <tbody>
                  {trainings.length === 0 ? <tr><td colSpan="5" className="text-center py-4 text-muted">No training records yet.</td></tr> :
                    trainings.map(t => (
                      <tr key={t.id}>
                        <td>{t.user?.firstName} {t.user?.lastName}</td>
                        <td>{t.title}</td>
                        <td>{t.provider}</td>
                        <td>{new Date(t.completedAt).toLocaleDateString()}</td>
                        <td>{t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE REQUESTS */}
      {activeTab === "leave" && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary" onClick={() => setShowLeaveForm(!showLeaveForm)}>
              {showLeaveForm ? "Cancel" : "+ Request Leave"}
            </button>
          </div>
          {showLeaveForm && (
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Request Leave</h5>
                <form onSubmit={handleLeaveSubmit} className="row g-3">
                  <div className="col-md-3"><label className="form-label small fw-bold">Type</label>
                    <select className="form-select" required value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}>
                      {leaveTypes.map(lt => <option key={lt.id} value={lt.code}>{lt.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3"><label className="form-label small fw-bold">Start</label><input type="date" className="form-control" required value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} /></div>
                  <div className="col-md-3"><label className="form-label small fw-bold">End</label><input type="date" className="form-control" required value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} /></div>
                  <div className="col-md-3"><label className="form-label small fw-bold">Reason</label><input type="text" className="form-control" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} /></div>
                  <div className="col-12 text-end"><button type="submit" className="btn btn-success px-4">Submit</button></div>
                </form>
              </div>
            </div>
          )}
          <div className="card shadow-sm border-0">
            <div className="card-body p-0 table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr><th>Staff</th><th>Type</th><th>Dates</th><th>Supervisor</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {leaves.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted">No leave requests yet.</td></tr> :
                    leaves.map(l => (
                      <tr key={l.id}>
                        <td>{l.user?.firstName} {l.user?.lastName}</td>
                        <td><span className="badge bg-info text-dark">{l.type}</span></td>
                        <td className="small">{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</td>
                        <td className="small">{l.supervisor ? `${l.supervisor.firstName} ${l.supervisor.lastName}` : "—"}</td>
                        <td>
                          <span className={`badge bg-${l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}`}>{l.status}</span>
                          {l.status === 'REJECTED' && l.rejectionReason && <div className="small text-danger mt-1">Reason: {l.rejectionReason}</div>}
                        </td>
                        <td>
                          {l.status === 'PENDING' && (
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-success" onClick={() => handleLeaveAction(l.id, 'APPROVED')}>Approve</button>
                              <button className="btn btn-sm btn-danger" onClick={() => {
                                const reason = window.prompt("Reason for rejection:");
                                if (reason) handleLeaveAction(l.id, 'REJECTED', reason);
                              }}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE BALANCES */}
      {activeTab === "balances" && (
        <div>
          <div className="d-flex gap-2 mb-3">
            <a href="http://localhost:5000/api/hr-reports/balances" className="btn btn-sm btn-outline-secondary" download>Export Balances (CSV)</a>
            <a href="http://localhost:5000/api/hr-reports/training" className="btn btn-sm btn-outline-secondary" download>Export Training (CSV)</a>
          </div>
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3">Set Initial Balance</h5>
                  <form onSubmit={handleBalanceSubmit} className="d-flex flex-column gap-3">
                    <div><label className="form-label small fw-bold">Staff</label>
                      <select className="form-select" required value={balanceForm.userId} onChange={e => setBalanceForm({...balanceForm, userId: e.target.value})}>
                        <option value="">Select...</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label small fw-bold">Entitled Days</label><input type="number" className="form-control" required value={balanceForm.entitledDays} onChange={e => setBalanceForm({...balanceForm, entitledDays: Number(e.target.value)})} /></div>
                    <div><label className="form-label small fw-bold">Rollover Days</label><input type="number" className="form-control" required value={balanceForm.rolloverDays} onChange={e => setBalanceForm({...balanceForm, rolloverDays: Number(e.target.value)})} /></div>
                    <button type="submit" className="btn btn-primary">Save Balance</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="card shadow-sm border-0 mb-3">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <div>
                      <h6 className="fw-bold mb-1">Bulk Import Balances (CSV)</h6>
                      <small className="text-muted">Columns: username, year, entitledDays, rolloverDays</small>
                    </div>
                    <a href="http://localhost:5000/api/leave-balances/template" className="btn btn-sm btn-outline-primary" download>Download Template</a>
                  </div>
                  <form onSubmit={handleBalanceUpload} className="d-flex gap-2">
                    <input type="file" accept=".csv" className="form-control form-control-sm" onChange={(e) => setBalanceFile(e.target.files[0])} />
                    <button type="submit" className="btn btn-sm btn-primary">Upload</button>
                  </form>
                  {balanceUploadStatus && <div className="mt-2 small fw-bold">{balanceUploadStatus}</div>}
                </div>
              </div>
              <div className="card shadow-sm border-0">
                <div className="card-body p-0 table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light"><tr><th>Staff</th><th>Entitled</th><th>Used</th><th>Rollover</th><th>Remaining</th></tr></thead>
                    <tbody>
                      {balances.length === 0 ? <tr><td colSpan="5" className="text-center py-4 text-muted">No balance records yet.</td></tr> :
                        balances.map(b => (
                          <tr key={b.id}>
                            <td>{b.user?.firstName} {b.user?.lastName}</td>
                            <td>{b.entitledDays}</td>
                            <td>{b.usedDays}</td>
                            <td>{b.rolloverDays}</td>
                            <td className="fw-bold text-success">{(b.entitledDays + b.rolloverDays) - b.usedDays}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE TYPES */}
      {activeTab === "leave-types" && (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Create Leave Type</h5>
                <form onSubmit={handleCreateLeaveType} className="d-flex flex-column gap-3">
                  <div><label className="form-label small fw-bold">Name</label><input type="text" className="form-control" required value={newLeaveType.name} onChange={e => setNewLeaveType({...newLeaveType, name: e.target.value})} placeholder="e.g., Sick Leave" /></div>
                  <div><label className="form-label small fw-bold">Code</label><input type="text" className="form-control" required value={newLeaveType.code} onChange={e => setNewLeaveType({...newLeaveType, code: e.target.value.toUpperCase()})} placeholder="e.g., SICK" /></div>
                  <div><label className="form-label small fw-bold">Default Days</label><input type="number" className="form-control" required value={newLeaveType.defaultDays} onChange={e => setNewLeaveType({...newLeaveType, defaultDays: Number(e.target.value)})} /></div>
                  <div><label className="form-label small fw-bold">Max Rollover</label><input type="number" className="form-control" required value={newLeaveType.maxRolloverDays} onChange={e => setNewLeaveType({...newLeaveType, maxRolloverDays: Number(e.target.value)})} /></div>
                  <button type="submit" className="btn btn-primary">Create</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0 table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light"><tr><th>Name</th><th>Code</th><th>Default Days</th><th>Max Rollover</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                  <tbody>
                    {leaveTypes.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted">No leave types defined yet.</td></tr> :
                      leaveTypes.map(lt => (
                        <tr key={lt.id}>
                          <td className="fw-bold">{lt.name}</td>
                          <td><code>{lt.code}</code></td>
                          <td>{lt.defaultDays} days</td>
                          <td>{lt.maxRolloverDays} days</td>
                          <td>
                            <span className={`badge bg-${lt.isActive ? 'success' : 'secondary'}`} style={{ cursor: "pointer" }} onClick={() => handleToggleLeaveType(lt)}>
                              {lt.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteLeaveType(lt.id)}><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOLIDAYS TAB */}
      {activeTab === "holidays" && (
        <div>
        <div className="card shadow-sm border-0 bg-light mb-3">
          <div className="card-body d-flex align-items-center gap-3 flex-wrap">
            <h5 className="mb-0 fw-bold">⏱️ Timesheet Deadline</h5>
            <span className="text-muted small">Staff must submit by day</span>
            <input type="number" className="form-control form-control-sm" style={{ width: "80px" }} min="1" max="31" value={tsDeadline} onChange={e => setTsDeadline(Number(e.target.value))} />
            <span className="text-muted small">of each month.</span>
            <button className="btn btn-sm btn-primary ms-auto" onClick={handleSaveTsSettings}>Save Deadline</button>
          </div>
        </div>
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Add Public Holiday</h5>
                <form onSubmit={handleCreateHoliday} className="d-flex flex-column gap-3">
                  <div>
                    <label className="form-label small fw-bold">Holiday Name</label>
                    <input type="text" className="form-control" required value={holidayForm.name} onChange={e => setHolidayForm({...holidayForm, name: e.target.value})} placeholder="e.g., Ethiopian New Year" />
                  </div>
                  <div>
                    <label className="form-label small fw-bold">Date</label>
                    <input type="date" className="form-control" required value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary">Add Holiday</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0 table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr><th>Date</th><th>Holiday Name</th><th className="text-end">Actions</th></tr>
                  </thead>
                  <tbody>
                    {holidays.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-4 text-muted">No holidays defined yet.</td></tr>
                    ) : (
                      holidays.map(h => (
                        <tr key={h.id}>
                          <td>{new Date(h.date).toLocaleDateString()}</td>
                          <td className="fw-bold">{h.name}</td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteHoliday(h.id)}><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}