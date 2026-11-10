import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { Users, Upload, Save, X, Edit, Trash2, Search, Download, BookOpen, Calendar, Briefcase, Settings , CalendarRange, ShieldCheck, UserMinus} from "lucide-react";
import PositionSelect from "../components/PositionSelect";
import PageHeader from "../components/PageHeader";
import Avatar from "../components/Avatar";
import OffboardingPanel from "../components/OffboardingPanel";
import { POSITION_ACCESS, POSITIONS, TAB_KEYS } from "../lib/access";

const HR_TABS = [
  { key: "directory", label: "Staff directory", icon: Users },
  { key: "offboarding", label: "Offboarding", icon: UserMinus },
  { key: "upload", label: "Bulk CSV", icon: Upload },
  { key: "training", label: "Training", icon: BookOpen },
  { key: "leave", label: "Leave requests", icon: Calendar },
  { key: "balances", label: "Leave balances", icon: Briefcase },
  { key: "leave-types", label: "Leave types", icon: Settings },
  { key: "holidays", label: "Holidays", icon: CalendarRange },
  { key: "access", label: "Access matrix", icon: ShieldCheck },
];

const TAB_LABELS = {
  pms: "PMS", aop: "Annual", strategic: "Strategic", roadmap: "Roadmap", progress: "Progress",
  reports: "Reports", calendar: "Calendar", archive: "Archive", myhr: "My HR", approvals: "Approvals",
  hr: "HR Suite", hrAnalytics: "Exec. HR", recruitment: "Recruitment", hrOps: "Induction",
  payroll: "Payroll", languages: "Languages", alerts: "Alerts", news: "News", documents: "Documents",
  media: "Media", publicSite: "Public Site", users: "Users", settings: "Settings",
};

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("directory");
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [trainings, setTrainings] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, firstName: "", lastName: "", username: "", email: "", role: "viewer", department: "", subDepartment: "", password: "", immediateSupervisorId: "", position: "", employmentType: "Regular", employmentTypeOther: "", hireDate: "", contractEnd: "" });

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
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });
  const [tsDeadline, setTsDeadline] = useState(25);
  const [trainingAlerts, setTrainingAlerts] = useState({ expired: [], expiringSoon: [], total: 0 });

  const emptyForm = { id: null, firstName: "", lastName: "", username: "", email: "", role: "viewer", department: "", subDepartment: "", password: "", immediateSupervisorId: "", position: "", employmentType: "Regular", employmentTypeOther: "", hireDate: "", contractEnd: "" };

  const loadData = () => {
    api.get("/training-alerts").then(setTrainingAlerts).catch(console.error);
    api.get("/hr/staff").then(setStaff).catch(console.error);
    if (activeTab === "training") api.get("/hr/training").then(setTrainings).catch(console.error);
    if (activeTab === "leave") api.get("/hr/leave").then(setLeaves).catch(console.error);
    if (activeTab === "balances") api.get(`/leave-balances?year=${new Date().getFullYear()}`).then(setBalances).catch(console.error);
    if (activeTab === "leave-types") api.get("/leave-types").then(setLeaveTypes).catch(console.error);
    if (activeTab === "holidays") { api.get(`/holidays?year=${holidayYear}`).then(setHolidays).catch(console.error); api.get("/timesheets/settings").then(d => setTsDeadline(d.submissionDay)).catch(console.error); }
  };

  useEffect(() => { loadData(); }, [activeTab, holidayYear]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        employmentType: formData.employmentType === "Other"
          ? `Other: ${formData.employmentTypeOther || ""}`.trim()
          : formData.employmentType,
        contractEnd: formData.employmentType === "Regular" ? null : (formData.contractEnd || null),
        hireDate: formData.hireDate || null,
      };
      delete payload.employmentTypeOther;
      if (isEditing) await api.put(`/hr/staff/${formData.id}`, payload);
      else await api.post("/hr/staff", payload);
      setIsEditing(false);
      setShowStaffForm(false);
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
      password: "", immediateSupervisorId: user.immediateSupervisorId || "",
      position: user.position || "",
      employmentType: (user.employmentType || "Regular").startsWith("Other") ? "Other" : (user.employmentType || "Regular"),
      employmentTypeOther: (user.employmentType || "").startsWith("Other:")
        ? user.employmentType.replace(/^Other:\s*/, "")
        : "",
      hireDate: user.hireDate ? String(user.hireDate).slice(0, 10) : "",
      contractEnd: user.contractEnd ? String(user.contractEnd).slice(0, 10) : "",
    });
    setIsEditing(true);
    setShowStaffForm(true);
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

  const handleSaveTsSettings = async () => {
    try {
      await api.put("/timesheets/settings", { submissionDay: tsDeadline });
      alert("Timesheet deadline updated");
    } catch (err) { alert("Failed to update"); }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    try {
      await api.post("/holidays", holidayForm);
      setHolidayForm({ name: "", date: "" });
      loadData();
      alert("Holiday added");
    } catch (err) {
      alert(err.message || "Failed to add holiday");
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

  const openNewStaff = () => {
    setIsEditing(false);
    setFormData(emptyForm);
    setShowStaffForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeStaffForm = () => {
    setIsEditing(false);
    setFormData(emptyForm);
    setShowStaffForm(false);
  };

  const filteredStaff = staff.filter(s =>
    ((s.firstName || '') + ' ' + (s.lastName || '') + ' ' + (s.username || '') + ' ' + (s.email || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid py-4 hr-dashboard hr-suite">
      <Helmet><title>HR Suite | EBPE</title></Helmet>

      <PageHeader
        icon={<Users size={20} />}
        kicker="People · HR operations"
        title="HR Suite"
        subtitle="Staff directory, offboarding, training, leave, balances, leave types and public holidays — one branded workspace for the people function."
      />

      {/* SECTION TABS */}
      <div className="hr-tabs mb-4" role="tablist" aria-label="HR Suite sections">
        {HR_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={activeTab === key ? "is-active" : ""}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* STAFF DIRECTORY */}
      {activeTab === "directory" && (
        <div className="d-flex flex-column gap-3">
          {showStaffForm && (
            <div className="card hr-form-card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">{isEditing ? "Edit staff record" : "Add staff record"}</h5>
                    <p className="small text-muted mb-0">
                      Identity, account, position and employment details in one place.
                    </p>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeStaffForm} aria-label="Close staff form">
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleSave}>
                  <div className="hr-form-section">Personal & account</div>
                  <div className="row g-3">
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">First name *</label>
                      <input className="form-control" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Last name *</label>
                      <input className="form-control" required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Username *</label>
                      <input className="form-control" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Password</label>
                      {isEditing ? (
                        <div className="form-text mt-0">Leave unchanged unless resetting the account.</div>
                      ) : (
                        <>
                          <input type="text" className="form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Password123!" />
                          <div className="form-text">Defaults to Password123! if left blank.</div>
                        </>
                      )}
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Role</label>
                      <select className="form-select" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="executive">Executive</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="hr-form-section mt-4">Position & organisation</div>
                  <div className="row g-3">
                    <div className="col-md-6 col-xl-4">
                      <PositionSelect value={formData.position} onChange={(position) => setFormData({ ...formData, position })} />
                    </div>
                    <div className="col-md-6 col-xl-4">
                      <label className="form-label">Department</label>
                      <input className="form-control" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-4">
                      <label className="form-label">Sub-department</label>
                      <input className="form-control" value={formData.subDepartment} onChange={e => setFormData({ ...formData, subDepartment: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-4">
                      <label className="form-label">Supervisor</label>
                      <select className="form-select" value={formData.immediateSupervisorId} onChange={e => setFormData({ ...formData, immediateSupervisorId: e.target.value })}>
                        <option value="">— None —</option>
                        {staff.filter(s => s.id !== formData.id).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="hr-form-section mt-4">Employment</div>
                  <div className="row g-3">
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Employment type</label>
                      <select className="form-select" value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value, contractEnd: e.target.value === "Regular" ? "" : formData.contractEnd })}>
                        <option value="Regular">Regular</option>
                        <option value="Contract">Contract</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Other">Other (Specify)</option>
                      </select>
                    </div>
                    {formData.employmentType === "Other" && (
                      <div className="col-md-6 col-xl-3">
                        <label className="form-label">Specify employment type</label>
                        <input className="form-control" value={formData.employmentTypeOther} onChange={e => setFormData({ ...formData, employmentTypeOther: e.target.value })} placeholder="e.g., Internship" />
                      </div>
                    )}
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Hire date</label>
                      <input type="date" className="form-control" value={formData.hireDate} onChange={e => setFormData({ ...formData, hireDate: e.target.value })} />
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <label className="form-label">Contract end date</label>
                      {formData.employmentType === "Regular" ? (
                        <input className="form-control" value="Indefinite" disabled readOnly />
                      ) : (
                        <input type="date" className="form-control" value={formData.contractEnd} onChange={e => setFormData({ ...formData, contractEnd: e.target.value })} />
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeStaffForm}>Cancel</button>
                    <button type="submit" className="btn-brand btn-sm d-inline-flex align-items-center gap-1">
                      <Save size={15} /> {isEditing ? "Update staff" : "Save staff"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card hr-table-card">
            <div className="card-body border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="fw-bold mb-1">Staff directory</h5>
                <div className="small text-muted">{staff.length} record{staff.length === 1 ? "" : "s"} · positions, roles and employment status</div>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="hr-search">
                  <Search size={15} aria-hidden="true" />
                  <input className="form-control form-control-sm" placeholder="Search staff…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button type="button" className="btn-brand btn-sm d-inline-flex align-items-center gap-1" onClick={openNewStaff}>
                  <Users size={15} /> Add staff
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle hr-table">
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Position</th><th>Role</th><th>Employment</th><th>Department</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-5 text-muted">No staff match this search.</td></tr>
                  ) : filteredStaff.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar name={`${s.firstName || ""} ${s.lastName || ""}`.trim() || s.username} src={s.avatarUrl} size={34} />
                          <div>
                            <div className="fw-semibold">{s.firstName} {s.lastName}</div>
                            <div className="small text-muted">{s.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td><code className="hr-username">{s.username}</code></td>
                      <td className="small">{s.position || "—"}</td>
                      <td><span className="badge hr-badge">{s.role}</span></td>
                      <td className="small">{s.employmentType ? s.employmentType.replace("Other: ", "Other – ") : "Regular"}</td>
                      <td className="small">{s.department || "—"}</td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(s)} title="Edit staff"><Edit size={14}/></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)} title="Delete staff"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <button type="submit" className="btn-brand btn-sm px-4">Upload file</button>
            </form>
            {uploadStatus && <p className="mt-4 fw-bold">{uploadStatus}</p>}
          </div>
        </div>
      )}

      {/* TRAINING */}
      {activeTab === "training" && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn-brand btn-sm" onClick={() => setShowTrainingForm(!showTrainingForm)}>
              {showTrainingForm ? "Cancel" : "+ Add Training Record"}
            </button>
          </div>
          {showTrainingForm && (
            <div className="card shadow-sm border-0 mb-4 hr-form-card">
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
                  <div className="col-md-4 d-flex align-items-end"><button type="submit" className="btn-brand btn-sm w-100">Save training record</button></div>
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
            <button className="btn-brand btn-sm" onClick={() => setShowLeaveForm(!showLeaveForm)}>
              {showLeaveForm ? "Cancel" : "+ Request Leave"}
            </button>
          </div>
          {showLeaveForm && (
            <div className="card shadow-sm border-0 mb-4 hr-form-card">
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
                  <div className="col-12 text-end"><button type="submit" className="btn-brand btn-sm px-4">Submit request</button></div>
                </form>
              </div>
            </div>
          )}
          <div className="card shadow-sm border-0 leave-requests-card">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle leave-table">
                  <thead className="table-light"><tr><th>Staff</th><th>Type</th><th>Dates</th><th>Supervisor</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                  <tbody>
                    {leaves.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted leave-empty">No leave requests yet.</td></tr> :
                      leaves.map(l => (
                        <tr key={l.id}>
                          <td data-label="Staff"><span className="fw-semibold">{l.user?.firstName} {l.user?.lastName}</span></td>
                          <td data-label="Type"><span className="badge bg-info text-dark">{l.type}</span></td>
                          <td data-label="Dates" className="small leave-dates">
                            <span className="leave-date-range">
                              <span className="text-nowrap">{new Date(l.startDate).toLocaleDateString()}</span>
                              <span className="text-muted mx-1">to</span>
                              <span className="text-nowrap">{new Date(l.endDate).toLocaleDateString()}</span>
                            </span>
                          </td>
                          <td data-label="Supervisor" className="small">{l.supervisor ? `${l.supervisor.firstName} ${l.supervisor.lastName}` : "—"}</td>
                          <td data-label="Status">
                            <span className={`badge bg-${l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}`}>{l.status}</span>
                            {l.status === 'REJECTED' && l.rejectionReason && <div className="small text-danger mt-1">Reason: {l.rejectionReason}</div>}
                          </td>
                          <td data-label="Actions" className="text-end leave-actions">
                            {l.status === 'PENDING' && (
                              <div className="d-flex gap-1 justify-content-end flex-nowrap">
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
              <div className="card shadow-sm border-0 hr-form-card">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3">Set initial balance</h5>
                  <form onSubmit={handleBalanceSubmit} className="d-flex flex-column gap-3">
                    <div><label className="form-label small fw-bold">Staff</label>
                      <select className="form-select" required value={balanceForm.userId} onChange={e => setBalanceForm({...balanceForm, userId: e.target.value})}>
                        <option value="">Select...</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label small fw-bold">Entitled Days</label><input type="number" className="form-control" required value={balanceForm.entitledDays} onChange={e => setBalanceForm({...balanceForm, entitledDays: Number(e.target.value)})} /></div>
                    <div><label className="form-label small fw-bold">Rollover Days</label><input type="number" className="form-control" required value={balanceForm.rolloverDays} onChange={e => setBalanceForm({...balanceForm, rolloverDays: Number(e.target.value)})} /></div>
                    <button type="submit" className="btn-brand btn-sm w-100">Save balance</button>
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
            <div className="card shadow-sm border-0 hr-form-card">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Create leave type</h5>
                <form onSubmit={handleCreateLeaveType} className="d-flex flex-column gap-3">
                  <div><label className="form-label small fw-bold">Name</label><input type="text" className="form-control" required value={newLeaveType.name} onChange={e => setNewLeaveType({...newLeaveType, name: e.target.value})} placeholder="e.g., Sick Leave" /></div>
                  <div><label className="form-label small fw-bold">Code</label><input type="text" className="form-control" required value={newLeaveType.code} onChange={e => setNewLeaveType({...newLeaveType, code: e.target.value.toUpperCase()})} placeholder="e.g., SICK" />
                  <div className="form-text">A two-letter timesheet code is created automatically (e.g. Sick Leave → SL).</div></div>
                  <div><label className="form-label small fw-bold">Default Days</label><input type="number" className="form-control" required value={newLeaveType.defaultDays} onChange={e => setNewLeaveType({...newLeaveType, defaultDays: Number(e.target.value)})} /></div>
                  <div><label className="form-label small fw-bold">Max Rollover</label><input type="number" className="form-control" required value={newLeaveType.maxRolloverDays} onChange={e => setNewLeaveType({...newLeaveType, maxRolloverDays: Number(e.target.value)})} /></div>
                  <button type="submit" className="btn-brand btn-sm w-100">Create leave type</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0 table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light"><tr><th>Name</th><th>Code</th><th>Sheet code</th><th>Default Days</th><th>Max Rollover</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                  <tbody>
                    {leaveTypes.length === 0 ? <tr><td colSpan="7" className="text-center py-4 text-muted">No leave types defined yet.</td></tr> :
                      leaveTypes.map(lt => (
                        <tr key={lt.id}>
                          <td className="fw-bold">{lt.name}</td>
                          <td><code>{lt.code}</code></td>
                          <td><span className="badge bg-dark">{lt.shortCode || "—"}</span></td>
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

      {/* POSITION ACCESS PROPOSAL */}
      {activeTab === "access" && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="fw-bold mb-1">Position → left-pane access proposal</h5>
            <p className="text-muted small mb-3">
              Shows which left-pane tabs each real position receives. Administrators always have full access;
              payroll, HR records and planning reports are limited to the positions that need them.
              A dot means the tab is available for that position.
            </p>
            <div className="table-responsive" style={{ maxHeight: "65vh" }}>
              <table className="table table-sm table-bordered align-middle" style={{ minWidth: `${TAB_KEYS.length * 52 + 260}px` }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: "250px", position: "sticky", left: 0, background: "#f8f9fa", zIndex: 2 }}>Position</th>
                    {TAB_KEYS.map((key) => (
                      <th key={key} className="text-center small" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "120px" }}>
                        {TAB_LABELS[key] || key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {POSITIONS.map((position) => {
                    const allowed = POSITION_ACCESS[position] || [];
                    return (
                      <tr key={position}>
                        <td className="small fw-semibold" style={{ position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>{position}</td>
                        {TAB_KEYS.map((key) => (
                          <td key={key} className="text-center" style={{ color: allowed.includes("*") || allowed.includes(key) ? "#1a7f37" : "#d0d5dd" }}>
                            {allowed.includes("*") || allowed.includes(key) ? "●" : "·"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="small text-muted mt-2">
              Hypothetical users for each position are seeded with <code>npm run seed:hr-suite</code> (password <code>Demo12345!</code>).
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
            <button className="btn-brand btn-sm ms-auto" onClick={handleSaveTsSettings}>Save deadline</button>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div className="small text-muted">Public holidays for the selected year</div>
          <select
            className="form-select form-select-sm w-auto"
            value={holidayYear}
            onChange={(e) => setHolidayYear(Number(e.target.value))}
            aria-label="Holiday year"
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 hr-form-card">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Add public holiday</h5>
                <form onSubmit={handleCreateHoliday} className="d-flex flex-column gap-3">
                  <div>
                    <label className="form-label small fw-bold">Holiday Name</label>
                    <input type="text" className="form-control" required value={holidayForm.name} onChange={e => setHolidayForm({...holidayForm, name: e.target.value})} placeholder="e.g., Ethiopian New Year" />
                  </div>
                  <div>
                    <label className="form-label small fw-bold">Date</label>
                    <input type="date" className="form-control" required value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} />
                  </div>
                  <button type="submit" className="btn-brand btn-sm w-100">Add holiday</button>
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

      {activeTab === "offboarding" && <OffboardingPanel />}

    </div>
  );
}