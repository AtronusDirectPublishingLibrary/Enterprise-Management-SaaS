import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  ChevronLeft,
  FileText,
  ExternalLink,
  PauseCircle,
  Plus,
  Send,
  Star,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api, API_BASE } from "../lib/api";
import RecruitmentRequestsPanel from "../components/RecruitmentRequestsPanel";
import JobDescriptionsPanel from "../components/JobDescriptionsPanel";
import RecruitmentProcedurePanel from "../components/RecruitmentProcedurePanel";

const STAGES = [
  { key: "APPLIED", label: "Applied" },
  { key: "SCREENING", label: "Screening" },
  { key: "INTERVIEW", label: "Interview" },
  { key: "OFFER", label: "Offer" },
  { key: "HIRED", label: "Hired" },
  { key: "ON_HOLD", label: "On hold" },
  { key: "REJECTED", label: "Rejected" },
];

const EMPTY_JOB = {
  title: "",
  department: "",
  summary: "",
  description: "",
  requirements: "",
  responsibilities: "",
  location: "Kilinto, Addis Ababa",
  employmentType: "FULL_TIME",
  openings: 1,
  closesAt: "",
  targetHire: "",
  status: "DRAFT",
};

const statusChip = (status) => {
  if (status === "OPEN") return "hrx-chip--good";
  if (status === "FILLED") return "hrx-chip--info";
  if (status === "CLOSED") return "hrx-chip--muted";
  return "hrx-chip--warn";
};

export default function Recruitment() {
  const [view, setView] = useState("pipeline");
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [jobFilter, setJobFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_JOB);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [hireForm, setHireForm] = useState({ username: "", startDate: "", jobTitle: "", department: "" });
  const [hired, setHired] = useState(null);

  const load = useCallback(async () => {
    const [jobList, applicantList] = await Promise.all([
      api.get("/recruitment/jobs"),
      api.get("/recruitment/applicants"),
    ]);
    setJobs(jobList);
    setApplicants(applicantList);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  const flash = (message) => {
    setNotice(message);
    setError("");
    window.setTimeout(() => setNotice(""), 3500);
  };

  const openJob = (job) => {
    setEditing(job.id);
    setForm({
      title: job.title || "",
      department: job.department || "",
      summary: job.summary || "",
      description: job.description || "",
      requirements: job.requirements || "",
      responsibilities: job.responsibilities || "",
      location: job.location || "",
      employmentType: job.employmentType || "FULL_TIME",
      openings: job.openings || 1,
      closesAt: job.closesAt ? job.closesAt.slice(0, 10) : "",
      targetHire: job.targetHire ? job.targetHire.slice(0, 10) : "",
      status: job.status || "DRAFT",
    });
  };

  const newJob = () => {
    setEditing("new");
    setForm(EMPTY_JOB);
  };

  const saveJob = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        openings: Number(form.openings) || 1,
        closesAt: form.closesAt || null,
        targetHire: form.targetHire || null,
      };
      if (editing === "new") await api.post("/recruitment/jobs", payload);
      else await api.put(`/recruitment/jobs/${editing}`, payload);
      await load();
      flash(editing === "new" ? "Vacancy created" : "Vacancy updated");
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setJobStatus = async (job, status) => {
    try {
      await api.put(`/recruitment/jobs/${job.id}`, { status });
      await load();
      flash(`Vacancy ${status.toLowerCase()}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeJob = async (job) => {
    if (!window.confirm(`Delete "${job.title}" and its ${job.applicantCount} applications?`)) return;
    try {
      await api.del(`/recruitment/jobs/${job.id}`);
      await load();
      flash("Vacancy deleted");
      if (selected?.jobId === job.id) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const patchApplicant = async (applicant, patch, message) => {
    try {
      const updated = await api.put(`/recruitment/applicants/${applicant.id}`, patch);
      setSelected((current) => (current && current.id === updated.id ? { ...current, ...updated } : current));
      await load();
      if (message) flash(message);
    } catch (err) {
      setError(err.message);
    }
  };

  const hire = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api.post(`/recruitment/applicants/${selected.id}/hire`, {
        username: hireForm.username || undefined,
        startDate: hireForm.startDate || undefined,
        jobTitle: hireForm.jobTitle || undefined,
        department: hireForm.department || undefined,
      });
      setHired(result);
      await load();
      flash("Candidate deployed — account and induction created");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () => (jobFilter === "ALL" ? applicants : applicants.filter((applicant) => applicant.jobId === jobFilter)),
    [applicants, jobFilter]
  );

  const byStage = useMemo(() => {
    const map = {};
    STAGES.forEach((stage) => {
      map[stage.key] = filtered.filter((applicant) => applicant.stage === stage.key);
    });
    return map;
  }, [filtered]);

  const openRoles = jobs.filter((job) => job.status === "OPEN").length;

  return (
    <div className="pb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="hrx-eyebrow">Talent acquisition</div>
          <h2 className="page-title mb-1">Recruitment</h2>
          <div className="small text-muted">
            Publish vacancies to the website, run the pipeline and deploy a hire straight into the staff portal.
          </div>
        </div>
        <div className="d-flex gap-2">
          <div className="hrx-stat" style={{ "--hrx-accent": "#2f8f6b", minWidth: 120 }}>
            <div className="hrx-stat-label"><Briefcase size={13} /> Open roles</div>
            <div className="hrx-stat-value">{openRoles}</div>
          </div>
          <div className="hrx-stat" style={{ "--hrx-accent": "#c9a227", minWidth: 120 }}>
            <div className="hrx-stat-label"><Users size={13} /> Applicants</div>
            <div className="hrx-stat-value">{applicants.length}</div>
          </div>
        </div>
      </div>

      <div className="recruit-tabs mb-4" role="tablist" aria-label="Recruitment sections">
        {[
          { key: "pipeline", label: "Vacancies & pipeline", icon: Briefcase },
          { key: "requests", label: "Requisitions", icon: FileSignature },
          { key: "descriptions", label: "Job descriptions", icon: FileText },
          { key: "procedure", label: "Procedure", icon: ClipboardList },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            className={view === key ? "is-active" : ""}
            onClick={() => setView(key)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {notice ? <div className="alert alert-success py-2">{notice}</div> : null}
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      {view === "pipeline" ? (
        <>
      <div className="hrx-card mb-4">
        <div className="hrx-card-head">
          <h2 className="d-flex align-items-center gap-2"><Briefcase size={16} /> Vacancies</h2>
          <button type="button" className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1" onClick={newJob}>
            <Plus size={14} /> New vacancy
          </button>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Role</th>
                <th className="d-none d-md-table-cell">Department</th>
                <th>Status</th>
                <th className="text-center d-none d-sm-table-cell">Openings</th>
                <th className="text-center d-none d-sm-table-cell">Applicants</th>
                <th className="d-none d-lg-table-cell">Closes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4 small">
                    No vacancies yet — create one and publish it to the Careers page.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="fw-semibold small">{job.title}</div>
                      <div className="text-muted" style={{ fontSize: "0.74rem" }}>{job.location}</div>
                    </td>
                    <td className="small d-none d-md-table-cell">{job.department}</td>
                    <td><span className={`hrx-chip ${statusChip(job.status)}`}>{job.status}</span></td>
                    <td className="text-center small d-none d-sm-table-cell">{job.openings}</td>
                    <td className="text-center small fw-semibold d-none d-sm-table-cell">{job.applicantCount}</td>
                    <td className="small text-muted d-none d-lg-table-cell">{job.closesAt ? job.closesAt.slice(0, 10) : "—"}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {job.status !== "OPEN" ? (
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setJobStatus(job, "OPEN")}>
                            Publish
                          </button>
                        ) : (
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setJobStatus(job, "CLOSED")}>
                            Close
                          </button>
                        )}
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openJob(job)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeJob(job)} aria-label="Delete vacancy">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="hrx-card mb-4">
          <div className="hrx-card-head">
            <h2>{editing === "new" ? "New vacancy" : "Edit vacancy"}</h2>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(null)}>
              <X size={14} />
            </button>
          </div>
          <form className="hrx-card-body hrx-form" onSubmit={saveJob}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Job title</label>
                <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Department</label>
                <input className="form-control" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Openings</label>
                <input type="number" min="1" max="99" className="form-control" value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Location</label>
                <input className="form-control" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Employment type</label>
                <select className="form-select" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                  <option value="FULL_TIME">Full time</option>
                  <option value="PART_TIME">Part time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="OPEN">Published</option>
                  <option value="CLOSED">Closed</option>
                  <option value="FILLED">Filled</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Applications close</label>
                <input type="date" className="form-control" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Target hire date</label>
                <input type="date" className="form-control" value={form.targetHire} onChange={(e) => setForm({ ...form, targetHire: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label">Short summary (shown on the careers card)</label>
                <textarea className="form-control" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Role description</label>
                <textarea className="form-control" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Responsibilities</label>
                <textarea className="form-control" rows={5} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label">Requirements</label>
                <textarea className="form-control" rows={3} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-brand" disabled={busy}>{busy ? "Saving…" : "Save vacancy"}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="hrx-card">
        <div className="hrx-card-head">
          <h2 className="d-flex align-items-center gap-2"><Users size={16} /> Pipeline</h2>
          <select className="form-select form-select-sm w-auto" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
            <option value="ALL">All vacancies ({applicants.length})</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title} ({job.applicantCount})</option>
            ))}
          </select>
        </div>

        <div className="hrx-card-body">
          <div className="pipeline-board">
            {STAGES.map((stage) => (
              <div className="pipeline-col" key={stage.key}>
                <h3>{stage.label} <span>{byStage[stage.key].length}</span></h3>
                {byStage[stage.key].map((applicant) => (
                  <button
                    type="button"
                    key={applicant.id}
                    className={`pipeline-card w-100 text-start ${selected?.id === applicant.id ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelected(applicant);
                      setHired(null);
                      setHireForm({ username: "", startDate: "", jobTitle: applicant.job?.title || "", department: applicant.job?.department || "" });
                    }}
                  >
                    <div className="pipeline-name">{applicant.name}</div>
                    <div className="pipeline-sub">{applicant.job?.title}</div>
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <span className="pipeline-sub">{applicant.source || "Website"}</span>
                      {applicant.rating ? (
                        <span className="small text-warning d-inline-flex align-items-center gap-1">
                          <Star size={11} fill="currentColor" /> {applicant.rating}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
                {byStage[stage.key].length === 0 ? <div className="text-muted small px-1">—</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected ? (
        <div className="hrx-card mt-4">
          <div className="hrx-card-head">
            <div>
              <h2>{selected.name}</h2>
              <div className="small text-muted">
                {selected.job?.title} · {selected.email} {selected.phone ? `· ${selected.phone}` : ""}
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(null)}>
              <X size={14} />
            </button>
          </div>

          <div className="hrx-card-body">
            <div className="row g-4">
              <div className="col-lg-7">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <a className="btn btn-sm btn-outline-secondary" href={`mailto:${selected.email}`}>
                    <Send size={14} /> Email
                  </a>
                  {selected.resumeUrl ? (
                    <a className="btn btn-sm btn-outline-primary" href={`${API_BASE.replace(/\/api$/, "")}${selected.resumeUrl}`} target="_blank" rel="noreferrer">
                      <FileText size={14} /> CV <ExternalLink size={12} />
                    </a>
                  ) : <span className="small text-muted align-self-center">No CV attached</span>}
                  <span className="small text-muted align-self-center">
                    Applied {new Date(selected.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </div>

                {selected.coverLetter ? (
                  <div className="mb-3">
                    <div className="hrx-eyebrow mb-1">Cover note</div>
                    <p className="small mb-0" style={{ whiteSpace: "pre-line" }}>{selected.coverLetter}</p>
                  </div>
                ) : null}

                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label">Stage</label>
                    <select
                      className="form-select form-select-sm"
                      value={selected.stage}
                      onChange={(e) => patchApplicant(selected, { stage: e.target.value }, `Moved to ${e.target.value.toLowerCase()}`)}
                    >
                      {STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                    </select>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Rating</label>
                    <select
                      className="form-select form-select-sm"
                      value={selected.rating || ""}
                      onChange={(e) => patchApplicant(selected, { rating: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">Not rated</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
                    </select>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Interview</label>
                    <input
                      type="datetime-local"
                      className="form-control form-control-sm"
                      value={selected.interviewAt ? selected.interviewAt.slice(0, 16) : ""}
                      onChange={(e) => patchApplicant(selected, { interviewAt: e.target.value || null })}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Rejection reason</label>
                    <input
                      className="form-control form-control-sm"
                      value={selected.rejectionReason || ""}
                      onChange={(e) => setSelected({ ...selected, rejectionReason: e.target.value })}
                      onBlur={() => patchApplicant(selected, { rejectionReason: selected.rejectionReason || null })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Internal notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={selected.notes || ""}
                      onChange={(e) => setSelected({ ...selected, notes: e.target.value })}
                      onBlur={() => patchApplicant(selected, { notes: selected.notes || null })}
                      placeholder="Interview feedback, references…"
                    />
                  </div>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="p-3 rounded" style={{ background: "#f5f8fb", border: "1px solid var(--hrx-line)" }}>
                  <div className="hrx-eyebrow mb-2">Deploy a hire</div>
                  {hired ? (
                    <div className="small">
                      <div className="d-flex align-items-center gap-2 mb-2 text-success fw-semibold">
                        <CheckCircle2 size={16} /> Account created and induction opened
                      </div>
                      <div>Username: <strong>{hired.user.username}</strong></div>
                      <div>Temporary password: <strong>Welcome123!</strong> (must change at first sign-in)</div>
                      <div className="text-muted mt-1">{hired.induction.tasks} induction tasks assigned.</div>
                    </div>
                  ) : selected.stage === "HIRED" ? (
                    <div className="small text-muted">This candidate has already been deployed.</div>
                  ) : (
                    <form className="hrx-form" onSubmit={hire}>
                      <div className="mb-2">
                        <label className="form-label">Username</label>
                        <input
                          className="form-control form-control-sm"
                          value={hireForm.username}
                          onChange={(e) => setHireForm({ ...hireForm, username: e.target.value })}
                          placeholder="first.last"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Start date</label>
                        <input type="date" className="form-control form-control-sm" value={hireForm.startDate} onChange={(e) => setHireForm({ ...hireForm, startDate: e.target.value })} />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Job title</label>
                        <input className="form-control form-control-sm" value={hireForm.jobTitle} onChange={(e) => setHireForm({ ...hireForm, jobTitle: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Department</label>
                        <input className="form-control form-control-sm" value={hireForm.department} onChange={(e) => setHireForm({ ...hireForm, department: e.target.value })} />
                      </div>
                      <button className="btn btn-brand btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-2" disabled={busy}>
                        <UserCheck size={15} /> {busy ? "Deploying…" : "Create staff account"}
                      </button>
                      <div className="form-text mt-2">
                        Creates the staff login, opens the induction checklist and marks the vacancy filled when all openings are taken.
                      </div>
                    </form>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="btn btn-sm btn-outline-success" onClick={() => patchApplicant(selected, { stage: "OFFER" }, "Offer stage")}>
                    <Send size={14} /> Move to offer
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => patchApplicant(selected, { stage: "ON_HOLD" }, "Adjourned")}>
                    <PauseCircle size={14} /> Adjourn
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => patchApplicant(selected, { stage: "REJECTED", rejectionReason: selected.rejectionReason || "Not successful" }, "Candidate rejected")}>
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

        </>
      ) : null}

      {view === "requests" ? <RecruitmentRequestsPanel onChanged={load} /> : null}
      {view === "descriptions" ? <JobDescriptionsPanel /> : null}
      {view === "procedure" ? <RecruitmentProcedurePanel onStart={() => setView("requests")} /> : null}

    </div>
  );
}
