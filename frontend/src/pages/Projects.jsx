import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api, buildQuery, API_BASE } from "../lib/api";
import { useAuth } from "../lib/auth";
import { FileText, MessageSquare, List, LayoutDashboard, Calendar as CalIcon, Copy, Plus, Edit2, ArrowLeft, Calendar, Filter, Flag, ChevronRight, ChevronDown, Upload, Download, FileSpreadsheet, Users, UserPlus, UserMinus } from "lucide-react";
import KanbanView from "../components/KanbanView";
import TimeTracker from "../components/TimeTracker";
import { Clock } from "lucide-react";
import CalendarView from "../components/CalendarView";
import TimelineView from "../components/TimelineView";
import { AlertTriangle } from "lucide-react";
import ProjectForm from "../components/ProjectForm";
import ItemForm from "../components/ItemForm";
import MilestoneForm from "../components/MilestoneForm";
import CommentThread from "../components/CommentThread";
import MessageFeed from "../components/MessageFeed";
import BriefEditor from "../components/BriefEditor";
import PmsTabs from "../components/PmsTabs";
import ProjectDocuments from "../components/ProjectDocuments";

const STATUSES = ["All", "Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const FUNDS = ["All", "Treasury", "Competitive Grants", "Grand Challenges Eth.", "Other"];

const slug = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, "-");
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString();
const ROLE_LABELS = {
  member: "Member",
  lead: "Work-package lead",
  viewer: "Viewer",
  manager: "Project manager",
  pi: "Principal investigator",
};
const roleLabel = (role) => ROLE_LABELS[role] || role || "Member";

export default function Projects() {
  const [searchParams] = useSearchParams();
  const openDb = searchParams.get("openDb") === "1";
  const { user } = useAuth();
  const canImport = ["admin", "executive", "project_manager"].includes(user?.role);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
  
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [funding, setFunding] = useState("All");
  const [datePreset, setDatePreset] = useState("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [editProject, setEditProject] = useState(null);
  const [showProjForm, setShowProjForm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [importBusy, setImportBusy] = useState(false);
  const importInput = useRef(null);

  const loadProjects = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const qs = buildQuery({ status, search, sourceOfFunds: funding });
      const list = await api.get("/projects" + qs);
      
      let filteredList = Array.isArray(list) ? list : [];
      
      if (datePreset !== "All" || customStart || customEnd) {
        filteredList = filteredList.filter(p => {
          const pStart = new Date(p.startDate).getTime();
          const pEnd = new Date(p.endDate).getTime();
          const now = new Date();
          
          if (datePreset === "This Year") {
            const start = new Date(now.getFullYear(), 0, 1).getTime();
            const end = new Date(now.getFullYear(), 11, 31).getTime();
            return (pStart >= start && pStart <= end) || (pEnd >= start && pEnd <= end);
          }
          if (datePreset === "Last Year") {
            const start = new Date(now.getFullYear() - 1, 0, 1).getTime();
            const end = new Date(now.getFullYear() - 1, 11, 31).getTime();
            return (pStart >= start && pStart <= end) || (pEnd >= start && pEnd <= end);
          }
          if (datePreset === "Custom") {
             const cStart = customStart ? new Date(customStart).getTime() : 0;
             const cEnd = customEnd ? new Date(customEnd).getTime() : Infinity;
             return (pStart >= cStart && pStart <= cEnd) || (pEnd >= cStart && pEnd <= cEnd);
          }
          return true;
        });
      }
      setProjects(filteredList);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [status, search, funding, datePreset, customStart, customEnd]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleSaveProject = async (data) => {
    try {
      if (editProject) await api.put("/projects/" + editProject.projectId, data);
      else await api.post("/projects", data);
      setShowProjForm(false); loadProjects();
    } catch (e) { alert(e.message); }
  };

  const loadImportHistory = async () => {
    try {
      const data = await api.get("/projects/imports");
      setImportHistory(Array.isArray(data) ? data : []);
    } catch { setImportHistory([]); }
  };

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportPreview(null);
    setImportOpen(true);
    loadImportHistory();
  };

  const sendImportCsv = async (endpoint) => {
    const body = new FormData();
    body.append("file", importFile);
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      body,
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  };

  const previewProjects = async (event) => {
    event.preventDefault();
    if (!importFile) return setErr("Choose a CSV file first.");
    setImportBusy(true);
    setErr("");
    setImportResult(null);
    setImportPreview(null);
    try {
      setImportPreview(await sendImportCsv("/projects/import/preview"));
    } catch (e) {
      setErr(e.message || "Could not preview the project CSV.");
    } finally {
      setImportBusy(false);
    }
  };

  const uploadProjects = async () => {
    if (!importFile) return setErr("Choose a CSV file first.");
    setImportBusy(true);
    setErr("");
    try {
      const data = await sendImportCsv("/projects/import");
      setImportResult(data);
      setImportPreview(null);
      setImportFile(null);
      if (importInput.current) importInput.current.value = "";
      await Promise.all([loadProjects(), loadImportHistory()]);
    } catch (e) {
      setErr(e.message || "Could not import the project CSV.");
    } finally {
      setImportBusy(false);
    }
  };

  const rollbackImport = async (batchId) => {
    if (!window.confirm("Undo this import? Projects it created are removed and projects it updated are restored to their previous values.")) return;
    setImportBusy(true);
    setErr("");
    try {
      await api.post(`/projects/imports/${batchId}/rollback`, {});
      await Promise.all([loadProjects(), loadImportHistory()]);
    } catch (e) {
      setErr(e.message || "Could not roll back this import.");
    } finally {
      setImportBusy(false);
    }
  };

  if (selected) {
    return <ProjectDetail project={selected} onBack={() => { setSelected(null); loadProjects(); }} />;
  }

  return (
    <div>
      <PmsTabs />
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="page-title mb-0">Projects {openDb && <span className="badge ms-2" style={{ background: "var(--brand-primary)", fontSize: "0.65rem" }}>Live from DB</span>}</h2>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {canImport && (
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={openImport}>
              <Upload size={14} className="me-1" /> CSV import
            </button>
          )}
          <button className="btn-brand btn-sm px-3 d-flex align-items-center" onClick={() => { setEditProject(null); setShowProjForm(true); }}>
            <Plus size={14} className="me-1" /> New Project
          </button>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} className="me-1" /> Filters
          </button>
          <input className="form-control form-control-sm" style={{ width: 200 }} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {showFilters && (
        <div className="card p-3 mb-3 shadow-sm border-0" style={{ background: "white" }}>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label text-muted mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Source of Funds</label>
              <select className="form-select form-select-sm" value={funding} onChange={(e) => setFunding(e.target.value)}>
                {FUNDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Date Range</label>
              <select className="form-select form-select-sm" value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
                <option value="All">All Time</option>
                <option value="This Year">Current Year</option>
                <option value="Last Year">Last Year</option>
                <option value="Custom">Custom Range...</option>
              </select>
            </div>
            
            {datePreset === "Custom" && (
              <div className="col-md-3 d-flex align-items-end gap-2">
                <div>
                  <label className="form-label text-muted mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>From</label>
                  <input type="date" className="form-control form-control-sm" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                </div>
                <div>
                  <label className="form-label text-muted mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>To</label>
                  <input type="date" className="form-control form-control-sm" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              </div>
            )}
            
            <div className="col-12 text-end mt-2">
              <button className="btn btn-sm btn-outline-danger" onClick={() => {
                setStatus("All"); setSearch(""); setFunding("All"); setDatePreset("All"); setCustomStart(""); setCustomEnd("");
              }}>Clear All Filters</button>
            </div>
          </div>
        </div>
      )}

      {err && <div className="alert alert-danger">{err}</div>}
      {showProjForm && <ProjectForm initialData={editProject} onSave={handleSaveProject} onClose={() => setShowProjForm(false)} />}

      <div className="app-table">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Project ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Source of Funds</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Progress</th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.projectId}>
                <td onClick={() => setSelected(p)} style={{ cursor: "pointer" }}><strong>{p.projectId}</strong></td>
                <td onClick={() => setSelected(p)} style={{ cursor: "pointer" }}>{p.title}</td>
                <td>{p.projectCategory || "-"}</td>
                <td>{p.sourceOfFunds || "-"}</td>
                <td>{p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}</td>
                <td>{p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}</td>
                <td><span className={"badge-status " + slug(p.status)}>{p.status || "Unknown"}</span></td>
                <td style={{ minWidth: 100 }}><div className="progress" style={{ height: 6 }}><div className="progress-bar progress-bar-brand" style={{ width: (p.progress||0) + "%" }} /></div></td>
                <td><button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => { setEditProject(p); setShowProjForm(true); }}><Edit2 size={14} /></button></td>
              </tr>
            ))}
            {projects.length === 0 && !loading && (
              <tr><td colSpan={9} className="text-center text-muted py-4">No projects found matching your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {importOpen && (
        <div className="modal d-block" style={{ background: "rgba(15,23,42,0.5)", zIndex: 1050 }} onClick={() => setImportOpen(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold mb-0">Import PMS projects</h5>
                  <div className="small text-muted">Create new projects or update existing rows by project ID.</div>
                </div>
                <button className="btn-close" onClick={() => setImportOpen(false)} aria-label="Close" />
              </div>
              <form onSubmit={previewProjects}>
                <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 p-2 rounded bg-light">
                    <div className="d-flex align-items-center gap-2 small">
                      <FileSpreadsheet size={17} className="text-success" />
                      <span>Use the template and keep the projectId column empty for new projects.</span>
                    </div>
                    <a className="btn btn-outline-secondary btn-sm" href={`${API_BASE}/projects/template`}>
                      <Download size={14} /> Download template
                    </a>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">CSV file</label>
                    <input
                      ref={importInput}
                      type="file"
                      accept=".csv,text/csv"
                      className="form-control"
                      onChange={(e) => {
                        setImportFile(e.target.files?.[0] || null);
                        setImportPreview(null);
                        setImportResult(null);
                      }}
                      required
                    />
                  </div>
                  <div className="form-text">
                    Existing rows are updated when <code>projectId</code> matches. New rows receive the next available project ID.
                    Dates use <code>YYYY-MM-DD</code>. Nothing is saved until you confirm the preview.
                  </div>
                  {importPreview && !importResult && (
                    <div className={`alert ${importPreview.skipped || importPreview.errors?.length ? "alert-warning" : "alert-info"} border-0 small mt-3 mb-0`}>
                      <div className="fw-semibold mb-1">
                        Preview: {importPreview.created} to add, {importPreview.updated} to update, {importPreview.skipped} to skip.
                      </div>
                      {importPreview.errors?.length > 0 && (
                        <ul className="mb-1 ps-3">
                          {importPreview.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      )}
                      <div className="table-responsive mt-2" style={{ maxHeight: 180 }}>
                        <table className="table table-sm mb-0" style={{ fontSize: "0.78rem" }}>
                          <thead><tr><th>Row</th><th>Action</th><th>Project ID</th><th>Title</th></tr></thead>
                          <tbody>
                            {importPreview.rows?.map((row) => (
                              <tr key={row.line}>
                                <td>{row.line}</td>
                                <td>
                                  <span className={`badge ${row.action === "create" ? "bg-success" : row.action === "update" ? "bg-primary" : "bg-secondary"}`}>
                                    {row.action}
                                  </span>
                                </td>
                                <td>{row.projectId || "—"}</td>
                                <td>{row.title}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {importResult && (
                    <div className={`alert ${importResult.skipped || importResult.errors?.length ? "alert-warning" : "alert-success"} border-0 small mt-3 mb-0`}>
                      <div className="fw-semibold">
                        Imported: {importResult.created} added, {importResult.updated} updated, {importResult.skipped} skipped.
                      </div>
                      {importResult.errors?.length > 0 && (
                        <ul className="mb-0 mt-1 ps-3">
                          {importResult.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-bold small text-uppercase text-muted">Recent imports</div>
                      <button type="button" className="btn btn-link btn-sm p-0" onClick={loadImportHistory}>Refresh</button>
                    </div>
                    {importHistory.length === 0 ? (
                      <div className="small text-muted">No project imports have been recorded yet.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0" style={{ fontSize: "0.8rem" }}>
                          <thead><tr><th>When</th><th>File</th><th>By</th><th>Result</th><th /></tr></thead>
                          <tbody>
                            {importHistory.map((batch) => (
                              <tr key={batch.id}>
                                <td>{new Date(batch.createdAt).toLocaleString("en-GB")}</td>
                                <td>{batch.fileName || "—"}</td>
                                <td>{batch.userName || "—"}</td>
                                <td>
                                  {batch.rolledBackAt ? (
                                    <span className="badge bg-secondary">rolled back</span>
                                  ) : (
                                    <span>
                                      {batch.summary?.created ?? 0} added, {batch.summary?.updated ?? 0} updated, {batch.summary?.skipped ?? 0} skipped
                                    </span>
                                  )}
                                </td>
                                <td className="text-end">
                                  {!batch.rolledBackAt && (
                                    <button type="button" className="btn btn-outline-danger btn-sm" disabled={importBusy} onClick={() => rollbackImport(batch.id)}>
                                      Undo
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setImportOpen(false)}>Close</button>
                  <button type="submit" className="btn btn-outline-primary" disabled={importBusy || !importFile}>
                    <Upload size={15} /> {importBusy ? "Checking…" : "Preview changes"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-brand"
                    disabled={importBusy || !importFile || !importPreview || Boolean(importResult)}
                    onClick={uploadProjects}
                  >
                    <Upload size={15} /> {importBusy ? "Importing…" : `Import ${importPreview ? importPreview.created + importPreview.updated : ""} row(s)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ project, onBack }) {
  const { user } = useAuth();
  const [wps, setWps] = useState([]);
  const [activities, setActivities] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [members, setMembers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [teamPick, setTeamPick] = useState("");
  const [teamRole, setTeamRole] = useState("member");
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedWp, setExpandedWp] = useState(null);
  const [expandedAct, setExpandedAct] = useState(new Set());
  const [wpForm, setWpForm] = useState(null);
  const [actForm, setActForm] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewMode, setViewMode] = useState('list');
  const [msForm, setMsForm] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const [wpsData, actsData, msData, teamData] = await Promise.all([
        api.get("/workpackages/" + project.projectId).catch(() => []),
        api.get("/activities/" + project.projectId).catch(() => []),
        api.get("/milestones/" + project.projectId).catch(() => []),
        api.get("/members/candidates/" + project.projectId).catch(() => null)
      ]);
      setWps(Array.isArray(wpsData) ? wpsData : []);
      setActivities(Array.isArray(actsData) ? actsData : []);
      setMilestones(Array.isArray(msData) ? msData : []);
      if (teamData) {
        setMembers(Array.isArray(teamData.members) ? teamData.members : []);
        setCandidates(Array.isArray(teamData.candidates) ? teamData.candidates : []);
      } else {
        const onlyMembers = await api.get("/members/" + project.projectId).catch(() => []);
        setMembers(Array.isArray(onlyMembers) ? onlyMembers : []);
      }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [project.projectId]);

  useEffect(() => { loadData(); }, [loadData]);

    const cloneProject = async () => {
    if (!window.confirm("Clone this project and all its tasks as a new template?")) return;
    try {
      const newTitle = window.prompt("Enter a name for the new project:", project.title + " (Copy)");
      if (!newTitle) return;
      
      const res = await api.post(`/templates/clone/${project.projectId}`, { title: newTitle });
      alert(`Project cloned successfully! New ID: ${res.newProjectId}`);
      onBack(); // Go back to the list to see the new project
      loadProjects();
    } catch (e) {
      alert("Failed to clone project: " + e.message);
    }
  };

  const canManageTeam =
    ["admin", "executive", "project_manager"].includes(user?.role) ||
    [user?.username, [user?.firstName, user?.lastName].filter(Boolean).join(" ")].filter(Boolean).includes(project?.projectManager || "");

  const memberName = (username) =>
    candidates.find((candidate) => candidate.username === username)?.name || username;

  const teamMembers = members.map((member) => {
    const person = candidates.find((candidate) => candidate.username === member.username);
    return {
      ...member,
      firstName: person?.firstName,
      lastName: person?.lastName,
      name: person?.name,
      position: person?.position,
      department: person?.department,
      roleLabel: roleLabel(member.role),
    };
  });

  const addMember = async () => {
    if (!teamPick) return;
    setTeamBusy(true);
    setTeamError("");
    try {
      await api.post(`/members/${project.projectId}`, { username: teamPick, role: teamRole });
      setTeamPick("");
      setTeamRole("member");
      await loadData();
    } catch (e) {
      setTeamError(e.message || "Could not add that team member.");
    } finally {
      setTeamBusy(false);
    }
  };

  const removeMember = async (username) => {
    if (!window.confirm(`Remove ${memberName(username)} from this project team? Their existing assignments stay visible but unassigned work should be reassigned.`)) return;
    setTeamBusy(true);
    setTeamError("");
    try {
      await api.del(`/members/${project.projectId}/${encodeURIComponent(username)}`);
      await loadData();
    } catch (e) {
      setTeamError(e.message || "Could not remove that team member.");
    } finally {
      setTeamBusy(false);
    }
  };

  const handleSaveWp = async (data) => {
    try {
      if (wpForm.workPackageId) await api.put("/workpackages/" + wpForm.workPackageId, data);
      else await api.post("/workpackages/" + project.projectId, data);
      setWpForm(null); loadData();
    } catch (e) { alert(e.message); }
  };

  const handleSaveAct = async (data) => {
    try {
      if (actForm.activityId) await api.put("/activities/" + actForm.activityId, data);
      else await api.post("/activities/" + project.projectId, data);
      setActForm(null); loadData();
    } catch (e) { alert(e.message); }
  };
  const handleSaveMs = async (data) => {
    try {
      if (msForm.milestoneId) await api.put("/milestones/" + msForm.milestoneId, data);
      else await api.post("/milestones/" + project.projectId, data);
      setMsForm(null); loadData();
    } catch (e) { alert(e.message); }
  };

  const childrenOf = (id) => activities.filter((a) => a?.parentActivityId === id);
  const topLevel = activities.filter((a) => !a?.parentActivityId);

  const totalPlan = activities.reduce((s, a) => s + Number(a?.financialPlan || 0), 0);
  const totalActual = activities.reduce((s, a) => s + Number(a?.actualExpenditure || 0), 0);
  const variance = totalPlan - totalActual;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="breadcrumb-btn" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <div className="d-flex gap-2">
          <button className="btn-brand btn-sm d-flex align-items-center" onClick={() => setMsForm({})}><Flag size={14} className="me-1"/> Add Milestone</button>
          <button className="btn-brand btn-sm d-flex align-items-center" onClick={() => setWpForm({})}><Plus size={14} className="me-1"/> Add Work Package</button>
          <button className="btn-accent btn-sm d-flex align-items-center" onClick={() => setActForm({})}><Plus size={14} className="me-1"/> Add Activity</button>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={cloneProject}><Copy size={14} className="me-1"/> Clone Project</button>
        </div>
      </div>

      <div className="detail-header">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--brand-muted)" }}>{project?.projectId}</div>
            <h3 style={{ color: "var(--brand-primary)", fontWeight: 700, margin: 0 }}>{project?.title}</h3>
            <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>{project?.description}</div>
          </div>
          <div className="text-end">
            <span className={"badge-status " + slug(project?.status)}>{project?.status || "Unknown"}</span>
            <div style={{ fontSize: "0.8rem", color: "var(--brand-muted)", marginTop: 4 }}>Manager: {project?.projectManager || "-"}</div>
          </div>
        </div>
        
        <div className="row g-2 mt-3 pt-3 border-top">
          <div className="col-md-3"><strong>Total Plan:</strong> {fmt(totalPlan)} ETB</div>
          <div className="col-md-3"><strong>Actual Spend:</strong> {fmt(totalActual)} ETB</div>
          <div className="col-md-3"><strong>Variance:</strong> <span className={variance >=0 ? "text-success":"text-danger"}>{fmt(variance)} ETB</span></div>
          <div className="col-md-3 text-end">
             <div className="progress" style={{ height: 8, marginTop: 6 }}><div className="progress-bar progress-bar-brand" style={{ width: (project?.progress || 0) + "%" }} /></div>
             <small className="text-muted">{project?.progress || 0}% Overall Progress</small>
          </div>
        </div>
      </div>

      {msForm && <MilestoneForm initialData={msForm.milestoneId ? msForm : null} onSave={handleSaveMs} onClose={() => setMsForm(null)} />}
      {wpForm && <ItemForm title={wpForm.workPackageId ? "Edit Work Package" : "New Work Package"} initialData={wpForm.workPackageId ? wpForm : null} isWp={true} members={teamMembers} onSave={handleSaveWp} onClose={() => setWpForm(null)} />}
      {actForm && <ItemForm title={actForm.activityId ? "Edit Activity" : "New Activity"} initialData={actForm.activityId ? actForm : {startDate: project?.startDate, endDate: project?.endDate}} isWp={false} members={teamMembers} onSave={handleSaveAct} onClose={() => setActForm(null)} availableActivities={activities.filter(a => a.activityId !== actForm.activityId)} />}

            {/* Collaboration Tabs */}
      <ul className="nav nav-tabs mb-3 mt-2">
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'tasks' ? "active" : "")} onClick={() => setActiveTab('tasks')}>
            <List size={14} className="me-1"/> Tasks & Gantt
          </button>
        </li>
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'brief' ? "active" : "")} onClick={() => setActiveTab('brief')}>
            <FileText size={14} className="me-1"/> Brief
          </button>
        </li>
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'documents' ? "active" : "")} onClick={() => setActiveTab('documents')}>
            <FileText size={14} className="me-1"/> Documents
          </button>
        </li>
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'messages' ? "active" : "")} onClick={() => setActiveTab('messages')}>
            <MessageSquare size={14} className="me-1"/> Messages
          </button>
        </li>
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'comments' ? "active" : "")} onClick={() => setActiveTab('comments')}>
            <MessageSquare size={14} className="me-1"/> Comments</button>
        </li>
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'team' ? "active" : "")} onClick={() => setActiveTab('team')}>
            <Users size={14} className="me-1"/> Team & Workload</button>
        </li>
        <li className="nav-item">
          <button className={"nav-link " + (activeTab === 'time' ? "active" : "")} onClick={() => setActiveTab('time')}>
            <Clock size={14} className="me-1"/> Time Tracking</button>
        </li>

      </ul>

      {activeTab === 'tasks' && (
        <>
      {loading && <div className="spinner-border text-success" />}
      {err && <div className="alert alert-danger">{err}</div>}

      {!loading && !err && (
        <>
          <h5 className="mb-3 mt-4" style={{ color: "var(--brand-primary)", fontWeight: 600 }}><Calendar size={18} className="me-2" /> Project Timeline</h5>
          <AdvancedGantt project={project} activities={activities} milestones={milestones} />

                              {/* View Switcher */}
          <div className="d-flex justify-content-end mb-2 gap-2 mt-4">
            <button className={"btn btn-sm " + (viewMode === 'list' ? "btn-brand" : "btn-outline-secondary")} onClick={() => setViewMode('list')}>List</button>
            <button className={"btn btn-sm " + (viewMode === 'board' ? "btn-brand" : "btn-outline-secondary")} onClick={() => setViewMode('board')}><LayoutDashboard size={14} className="me-1"/> Board</button>
            <button className={"btn btn-sm " + (viewMode === 'calendar' ? "btn-brand" : "btn-outline-secondary")} onClick={() => setViewMode('calendar')}><CalIcon size={14} className="me-1"/> Calendar</button>
            <button className={"btn btn-sm " + (viewMode === 'timeline' ? "btn-brand" : "btn-outline-secondary")} onClick={() => setViewMode('timeline')}><AlertTriangle size={14} className="me-1"/> Timeline</button>
          </div>

          {viewMode === 'board' && <KanbanView activities={activities} onUpdate={loadData} />}
          {viewMode === 'calendar' && <CalendarView activities={activities} />}
          {viewMode === 'timeline' && <TimelineView projectId={project.projectId} />}

          <div className="app-table mt-2" style={{ display: viewMode === 'list' ? 'block' : 'none' }}>
            <table className="table mb-0">
              <thead>
                <tr><th style={{ width: 40 }}></th><th>Work Package / Activity</th><th>Owner</th><th>Status</th><th>Progress</th><th className="text-end">Plan (ETB)</th><th className="text-end">Actual (ETB)</th><th style={{ width: 60 }}>Actions</th></tr>
              </thead>
              <tbody>
                {wps.map(wp => {
                  const isOpen = expandedWp === wp?.workPackageId;
                  const wpActs = topLevel.filter(a => a?.workPackageId === wp?.workPackageId);
                  const wpPlan = wpActs.reduce((s, a) => s + Number(a?.financialPlan || 0), 0);
                  const wpActual = wpActs.reduce((s, a) => s + Number(a?.actualExpenditure || 0), 0);

                  return (
                    <React.Fragment key={wp.workPackageId}>
                      <tr className="table-light">
                        <td className="text-center" onClick={() => setExpandedWp(isOpen ? null : wp.workPackageId)} style={{ cursor: "pointer" }}>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                        <td style={{ cursor: "pointer" }} onClick={() => setExpandedWp(isOpen ? null : wp.workPackageId)}><strong>{wp.workPackageId}</strong>: {wp.title}</td>
                        <td className="small">{wp.ownerName || (wp.ownerUsername ? memberName(wp.ownerUsername) : <span className="text-muted">Unassigned</span>)}</td>
                        <td><span className={"badge-status " + slug(wp.status)}>{wp.status || "Not Started"}</span></td>
                        <td>{wp.progress || 0}%</td>
                        <td className="text-end fw-semibold">{fmt(wpPlan)}</td>
                        <td className="text-end fw-semibold">{fmt(wpActual)}</td>
                        <td><button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setWpForm(wp)}><Edit2 size={14}/></button></td>
                      </tr>
                      
                      {isOpen && wpActs.map(a => {
                        const hasKids = childrenOf(a?.activityId).length > 0;
                        const isActOpen = expandedAct.has(a?.activityId);
                        return (
                          <React.Fragment key={a.activityId}>
                            <tr>
                              <td className="text-center" onClick={() => hasKids && setExpandedAct(prev => { const n = new Set(prev); n.has(a?.activityId) ? n.delete(a?.activityId) : n.add(a?.activityId); return n; })} style={{ cursor: hasKids ? "pointer" : "default" }}>{hasKids ? (isActOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}</td>
                              <td style={{ paddingLeft: "2rem" }}>{a?.title}</td>
                              <td className="small">{a?.assignedTo ? memberName(a.assignedTo) : <span className="text-muted">Unassigned</span>}</td>
                              <td><span className={"badge-status " + slug(a?.status)}>{a?.status || "Unknown"}</span></td>
                              <td>{a?.progress || 0}%</td>
                              <td className="text-end">{fmt(a?.financialPlan)}</td>
                              <td className="text-end">{fmt(a?.actualExpenditure)}</td>
                              <td><button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setActForm(a)}><Edit2 size={14}/></button></td>
                            </tr>
                            
                            {isActOpen && childrenOf(a?.activityId).map(k => (
                              <tr key={k?.activityId}>
                                <td></td><td className="subactivity">{k?.title}</td><td className="small">{k?.assignedTo ? memberName(k.assignedTo) : <span className="text-muted">Unassigned</span>}</td><td><span className={"badge-status " + slug(k?.status)}>{k?.status || "Unknown"}</span></td><td>{k?.progress || 0}%</td><td className="text-end">{fmt(k?.financialPlan)}</td><td className="text-end">{fmt(k?.actualExpenditure)}</td><td></td>
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
                
                {wps.length === 0 && <tr><td colSpan={8} className="text-muted text-center py-4">No Work Packages. Add one to start.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
        </>
      )}

      {activeTab === 'brief' && <BriefEditor projectId={project.projectId} />}
      {activeTab === 'documents' && <ProjectDocuments projectId={project.projectId} />}
      {activeTab === 'messages' && <MessageFeed projectId={project.projectId} />}
      {activeTab === 'comments' && (
        <div className="card border-0 shadow-sm p-3 mt-3">
          <h5 className="fw-bold">Project Comments</h5>
          <p className="text-muted small">Discuss the overall project here. For task-specific comments, open the task.</p>
          <CommentThread targetType="PROJECT" targetId={project.projectId} />
        </div>
      )}

      {activeTab === 'team' && (
        <TeamPanel
          project={project}
          members={teamMembers}
          candidates={candidates}
          workPackages={wps}
          activities={activities}
          canManage={canManageTeam}
          teamPick={teamPick}
          setTeamPick={setTeamPick}
          teamRole={teamRole}
          setTeamRole={setTeamRole}
          teamBusy={teamBusy}
          teamError={teamError}
          addMember={addMember}
          removeMember={removeMember}
        />
      )}

      {activeTab === 'time' && <TimeTracker projectId={project.projectId} />}
      
    </div>
  );
}

function TeamPanel({
  project,
  members,
  candidates,
  workPackages,
  activities,
  canManage,
  teamPick,
  setTeamPick,
  teamRole,
  setTeamRole,
  teamBusy,
  teamError,
  addMember,
  removeMember,
}) {
  const memberSet = new Set(members.map((member) => member.username));
  const available = candidates.filter((candidate) => !memberSet.has(candidate.username));
  const nameOf = (username) =>
    candidates.find((candidate) => candidate.username === username)?.name || username;

  const workload = (username) => {
    const ownedWps = workPackages.filter((wp) => wp.ownerUsername === username);
    const ownedActs = activities.filter((activity) => activity.assignedTo === username);
    const rows = [...ownedWps, ...ownedActs];
    const progress = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / rows.length)
      : 0;
    const overdue = rows.filter(
      (row) => row.endDate && new Date(row.endDate) < new Date() && row.status !== "Completed",
    ).length;
    return { workPackages: ownedWps.length, activities: ownedActs.length, total: rows.length, progress, overdue };
  };

  const unassignedWps = workPackages.filter((wp) => !wp.ownerUsername).length;
  const unassignedActs = activities.filter((activity) => !activity.assignedTo).length;

  return (
    <div className="project-team mt-3">
      <div className="project-team__header card border-0 shadow-sm p-3 mb-3">
        <div>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2"><Users size={18} /> Project team & workload</h5>
          <p className="small text-muted mb-0">
            The project manager assigns work packages and activities to this roster. Each assignment notifies the
            team member and appears in their Team &amp; Tasks workspace.
          </p>
        </div>
        <div className="project-team__counts">
          <span className="badge bg-light text-dark">{members.length} members</span>
          <span className={`badge ${unassignedWps + unassignedActs ? "bg-warning text-dark" : "bg-light text-dark"}`}>
            {unassignedWps + unassignedActs} unassigned
          </span>
        </div>
      </div>

      {teamError ? <div className="alert alert-danger py-2 small">{teamError}</div> : null}

      {canManage ? (
        <div className="card border-0 shadow-sm p-3 mb-3 project-team__add">
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label small fw-bold">Add a staff member</label>
              <select className="form-select form-select-sm" value={teamPick} onChange={(event) => setTeamPick(event.target.value)}>
                <option value="">{available.length ? "Choose a staff member…" : "Every staff member is already on this project"}</option>
                {available.map((candidate) => (
                  <option key={candidate.username} value={candidate.username}>
                    {candidate.name}{candidate.position ? ` · ${candidate.position}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Project role</label>
              <select className="form-select form-select-sm" value={teamRole} onChange={(event) => setTeamRole(event.target.value)}>
                <option value="member">Member</option>
                <option value="lead">Work-package lead</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="col-md-3">
              <button type="button" className="btn btn-brand btn-sm w-100 d-flex align-items-center justify-content-center gap-1" disabled={!teamPick || teamBusy} onClick={addMember}>
                <UserPlus size={14} /> {teamBusy ? "Adding…" : "Add to team"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="row g-3">
        {members.map((member) => {
          const person = candidates.find((candidate) => candidate.username === member.username);
          const load = workload(member.username);
          return (
            <div className="col-xl-4 col-md-6" key={member.username}>
              <div className="project-member-card h-100">
                <div className="project-member-card__top">
                  <span className="project-member-card__avatar">
                    {[person?.firstName, person?.lastName].filter(Boolean).map((part) => part[0]).join("").slice(0, 2) || member.username.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="fw-bold text-truncate">{nameOf(member.username)}</div>
                    <div className="small text-muted text-truncate">{person?.position || person?.department || "Project team"}</div>
                  </div>
                  {canManage ? (
                    <button type="button" className="btn btn-sm btn-link text-danger ms-auto p-0" title="Remove from team" onClick={() => removeMember(member.username)}>
                      <UserMinus size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="project-member-card__role">{member.roleLabel || roleLabel(member.role)}</div>
                <div className="project-member-card__metrics">
                  <div><strong>{load.workPackages}</strong><span>Work packages</span></div>
                  <div><strong>{load.activities}</strong><span>Activities</span></div>
                  <div><strong>{load.progress}%</strong><span>Avg. progress</span></div>
                </div>
                {load.overdue ? <div className="project-member-card__warn"><AlertTriangle size={13} /> {load.overdue} overdue item{load.overdue > 1 ? "s" : ""}</div> : null}
                {load.total === 0 ? <div className="project-member-card__empty">No work assigned yet.</div> : null}
              </div>
            </div>
          );
        })}
        {members.length === 0 ? (
          <div className="col-12"><div className="text-muted small p-4 text-center border rounded bg-white">No team members yet. Add the first person above.</div></div>
        ) : null}
      </div>

      {unassignedWps + unassignedActs > 0 ? (
        <div className="alert alert-warning border-0 mt-3 mb-0 d-flex align-items-start gap-2">
          <AlertTriangle size={17} className="mt-1" />
          <div>
            <strong>{unassignedWps + unassignedActs} delivery item{unassignedWps + unassignedActs > 1 ? "s are" : " is"} unassigned.</strong>
            <div className="small">Open a work package or activity and choose an accountable team member so progress has a clear owner.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdvancedGantt({ project, activities, milestones }) {
  const [view, setView] = useState("All"); 
  
  const parseDate = (d) => {
    if (!d) return { y: 2024, m: 0, d: 1 };
    const parts = String(d).substring(0, 10).split("-");
    return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10) - 1, d: parseInt(parts[2], 10) };
  };

  const pStartObj = parseDate(project?.startDate);
  const pEndObj = parseDate(project?.endDate);
  
  let pStart = new Date(pStartObj.y, pStartObj.m, pStartObj.d).getTime();
  let pEnd = new Date(pEndObj.y, pEndObj.m, pEndObj.d).getTime();
  if (pStart === pEnd) pEnd += 86400000; 

  if (view === "Year") {
    pStart = new Date(pStartObj.y, 0, 1).getTime(); pEnd = new Date(pEndObj.y, 11, 31).getTime();
  } else if (view === "Quarter") {
    const qStart = Math.floor(pStartObj.m / 3) * 3; const qEnd = Math.floor(pEndObj.m / 3) * 3 + 3;
    pStart = new Date(pStartObj.y, qStart, 1).getTime(); pEnd = new Date(pEndObj.y, qEnd, 0).getTime();
  } else if (view === "Month") {
    pStart = new Date(pStartObj.y, pStartObj.m, 1).getTime(); pEnd = new Date(pEndObj.y, pEndObj.m + 1, 0).getTime();
  } else if (view === "Week") {
    const dayStart = new Date(pStart).getDay() || 7; 
    pStart = new Date(pStart).setHours(0,0,0,0) - (dayStart - 1) * 86400000;
    const dayEnd = new Date(pEnd).getDay() || 7;
    pEnd = new Date(pEnd).setHours(23,59,59,999) + (7 - dayEnd) * 86400000;
  }

  const totalMs = pEnd - pStart;
  const cols = [];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const colWidth = view === "Week" ? 45 : view === "Month" ? 60 : view === "Quarter" ? 80 : view === "Year" ? 100 : 60;

  if (view === "All") { for (let i = 0; i < 12; i++) cols.push({ label: "" }); }
  else if (view === "Year") { let c = pStart; let y = 1; while (c < pEnd) { const n = new Date(new Date(c).setFullYear(new Date(c).getFullYear() + 1)).getTime(); cols.push({ label: "Year " + y }); c = n; y++; } }
  else if (view === "Quarter") { let c = pStart; let q = 1; while (c < pEnd) { const n = new Date(new Date(c).setMonth(new Date(c).getMonth() + 3)).getTime(); cols.push({ label: "Q" + q }); c = n; q++; } }
  else if (view === "Month") { let c = pStart; let w = 1; while (c < pEnd) { const n = c + 7 * 86400000; const d = new Date(c); cols.push({ label: `${MONTHS[d.getMonth()]} W${Math.ceil(d.getDate() / 7)}` }); c = n; w++; } }
  else if (view === "Week") { let c = pStart; while (c < pEnd) { const n = c + 86400000; const d = new Date(c); cols.push({ label: `${d.getDate()} ${MONTHS[d.getMonth()]}` }); c = n; } }

  const totalWidth = cols.length * colWidth;

  // Build all items array and map dependencies
  const allItems = [
    ...milestones.map(ms => ({ type: "milestone", id: ms.milestoneId, ...ms })),
    ...activities.filter(a => !a?.parentActivityId).map(a => ({ type: "activity", id: a.activityId, ...a }))
  ].sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());

  const itemYMap = {}; // Map ID -> Row Y position
  allItems.forEach((item, index) => { itemYMap[item.id] = index * 24 + 12; });

  return (
    <div className="bg-white p-3 rounded shadow-sm border mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="btn-group btn-group-sm">
          {["All", "Year", "Quarter", "Month", "Week"].map(v => (
            <button key={v} className={"btn " + (view === v ? "btn-brand" : "btn-outline-secondary")} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        <div className="text-muted small">
          <Calendar size={14} className="me-1" /> {new Date(pStart).toLocaleDateString()} to {new Date(pEnd).toLocaleDateString()}
        </div>
      </div>

      <div style={{ display: "flex", border: "1px solid #eee", borderRadius: "4px" }}>
        {/* Task List */}
        <div style={{ width: "250px", flexShrink: 0, borderRight: "2px solid #ddd", backgroundColor: "#f8f9fa", zIndex: 2 }}>
          <div style={{ height: "35px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", paddingLeft: "10px", fontWeight: "bold", fontSize: "0.75rem", color: "#666" }}>Tasks</div>
          {allItems.map((item) => (
            <div key={item.id} style={{ height: "24px", display: "flex", alignItems: "center", paddingLeft: "10px", fontSize: "0.75rem", borderBottom: "1px solid #eee" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", background: item.type === "milestone" ? "var(--brand-secondary)" : "var(--brand-primary)", transform: item.type === "milestone" ? "rotate(45deg)" : "none", marginRight: "6px", borderRadius: item.type === "activity" ? "50%" : "0" }}></span>
              <span className="text-truncate" title={item.title}>{item.title}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ overflowX: "auto", flexGrow: 1 }}>
          <div style={{ width: `${totalWidth}px`, position: "relative" }}>
            
            <div style={{ height: "35px", borderBottom: "1px solid #ddd", display: "flex" }}>
              {cols.map((c, i) => (
                <div key={i} style={{ width: `${colWidth}px`, flexShrink: 0, textAlign: "center", borderLeft: i > 0 ? "1px solid #ddd" : "none", fontSize: "0.65rem", fontWeight: 600, color: "#666", lineHeight: "35px" }}>{c.label}</div>
              ))}
            </div>

            <div style={{ position: "relative", background: "white" }}>
              {/* Grid */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
                {cols.map((c, i) => (
                  <div key={i} style={{ width: `${colWidth}px`, flexShrink: 0, background: i % 2 === 0 ? "rgba(0,0,0,0.03)" : "transparent", borderLeft: "1px solid #f0f0f0" }} />
                ))}
              </div>

              {/* Task Bars */}
              {allItems.map((item) => {
                const isMs = item.type === "milestone";
                const startT = new Date(item.startDate || 0).getTime();
                const endT = new Date(item.endDate || 0).getTime() || (startT + 86400000);
                
                let leftPx = ((startT - pStart) / totalMs) * totalWidth;
                let widthPx = ((endT - startT) / totalMs) * totalWidth;
                if (leftPx < 0) { widthPx += leftPx; leftPx = 0; }
                if (leftPx + widthPx > totalWidth) widthPx = totalWidth - leftPx;
                if (widthPx < 2) widthPx = 2;

                const isComplete = item.status === "Complete";
                const progressPct = item.progress || (isComplete ? 100 : 0);
                const colorBg = isMs ? "#D4AF37" : (item.status === "Complete" ? "#2ecc71" : item.status === "In Progress" ? "#f39c12" : "var(--brand-primary)");
                const colorFaded = isMs ? "#F1F5F9" : (item.status === "Complete" ? "rgba(46, 204, 113, 0.2)" : item.status === "In Progress" ? "rgba(243, 156, 18, 0.2)" : "rgba(30, 86, 49, 0.2)");

                return (
                  <div key={item.id} style={{ height: "24px", position: "relative", borderBottom: "1px solid #eee" }}>
                    <div style={{ position: "absolute", left: leftPx + "px", width: widthPx + "px", height: "70%", top: "15%", background: colorFaded, border: isMs ? "1px solid #CBD5E1" : "none", borderRadius: isMs ? 3 : 4 }} />
                    <div style={{ 
                      position: "absolute", left: leftPx + "px", width: (widthPx * (progressPct / 100)) + "px", height: "70%", top: "15%", 
                      background: colorBg, borderRadius: isMs ? 3 : 4, opacity: 0.95, display: "flex", alignItems: "center", justifyContent: "center", 
                      color: isMs ? "#000" : "white", fontSize: "0.6rem", fontWeight: 700
                    }}>{widthPx > 30 ? `${progressPct}%` : ""}</div>
                  </div>
                );
              })}

              {/* SVG Arrows for Dependencies */}
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                {allItems.map((item) => {
                  if (!item.predecessors || item.predecessors.length === 0) return null;
                  
                  return item.predecessors.map(pred => {
                    const depId = pred.activityId;
                    const parent = allItems.find(i => i.id === depId);
                    if (!parent) return null;

                    const parentStartT = new Date(parent.startDate || 0).getTime();
                    const parentEndT = new Date(parent.endDate || 0).getTime() || (parentStartT + 86400000);
                    const childStartT = new Date(item.startDate || 0).getTime();

                    const x1 = ((parentEndT - pStart) / totalMs) * totalWidth;
                    const y1 = itemYMap[parent.id];
                    const x2 = ((childStartT - pStart) / totalMs) * totalWidth;
                    const y2 = itemYMap[item.id];

                    // Draw an elegant curved path
                    const pathData = `M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`;

                    return (
                      <g key={`${depId}-${item.id}`}>
                        <path d={pathData} stroke="#9CA3AF" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
                        <polygon points={`${x2},${y2} ${x2-6},${y2-4} ${x2-6},${y2+4}`} fill="#9CA3AF" />
                      </g>
                    );
                  });
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}