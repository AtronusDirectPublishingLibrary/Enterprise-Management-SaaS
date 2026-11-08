import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Briefcase, Building2, CalendarClock, MapPin, Send, Upload } from "lucide-react";
import { api, API_BASE } from "../lib/api";
import { useLanguage } from "../lib/language";

const COPY = {
  en: {
    eyebrow: "Careers",
    title: "Build Ethiopia's health security with us.",
    lede:
      "We are assembling the team that will manufacture vaccines, essential medicines and diagnostics for the country. If you want your work to matter at national scale, start here.",
    openRoles: "Open roles",
    departments: "Departments",
    search: "Search roles",
    allDepartments: "All departments",
    noRoles: "No vacancies match that filter right now — check back soon.",
    view: "View role",
    about: "About the role",
    responsibilities: "What you will do",
    requirements: "What we are looking for",
    apply: "Apply for this role",
    name: "Full name",
    email: "Email",
    phone: "Phone (optional)",
    cover: "Why this role? (optional)",
    cv: "Attach your CV (PDF or Word, max 5 MB)",
    send: "Submit application",
    sending: "Sending…",
    success: "Application received. Our HR team reviews every submission and will contact shortlisted candidates.",
    another: "Back to all vacancies",
    closing: "Closes",
    openings: "opening",
    openingsPlural: "openings",
    location: "Location",
    type: "Type",
    error: "We could not send your application. Please try again.",
    duplicate: "You have already applied for this vacancy.",
  },
  am: {
    eyebrow: "የስራ ዕድሎች",
    title: "የኢትዮጵያን የጤና ዋስትና ከእኛ ጋር ይገንቡ።",
    lede:
      "ክትባቶችን፣ አስፈላጊ መድሃኒቶችንና የምርመራ መሳሪያዎችን በሀገር ውስጥ የሚያመርተውን ቡድን እየገነባን ነው። ስራዎ በብሔራዊ ደረጃ ትርጉም እንዲኖረው ከፈለጉ ከዚህ ይጀምሩ።",
    openRoles: "ክፍት የስራ ዕድሎች",
    departments: "ክፍሎች",
    search: "የስራ ዕድል ይፈልጉ",
    allDepartments: "ሁሉም ክፍሎች",
    noRoles: "በአሁኑ ጊዜ ከዚህ ማጣሪያ ጋር የሚስማማ ክፍት የስራ ዕድል የለም።",
    view: "ዝርዝሩን ይመልከቱ",
    about: "ስለ ስራው",
    responsibilities: "የሚሰሩት ስራ",
    requirements: "የሚፈለጉ ብቃቶች",
    apply: "ለዚህ ስራ ያመልክቱ",
    name: "ሙሉ ስም",
    email: "ኢሜይል",
    phone: "ስልክ (አማራጭ)",
    cover: "ለምን ይህ ስራ? (አማራጭ)",
    cv: "ሲቪዎን ያያዙ (PDF ወይም Word፣ ከ5MB በታች)",
    send: "ማመልከቻ ያስገቡ",
    sending: "በመላክ ላይ…",
    success: "ማመልከቻዎ ደርሶናል። የሰው ኃይል ቡድናችን ሁሉንም ማመልከቻዎች ይገመግማል፤ የተመረጡ እጩዎችን ያገኛል።",
    another: "ወደ ሁሉም የስራ ዕድሎች ተመለስ",
    closing: "የሚዘጋበት",
    openings: "ክፍት ቦታ",
    openingsPlural: "ክፍት ቦታዎች",
    location: "አካባቢ",
    type: "የስራ ዓይነት",
    error: "ማመልከቻዎን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    duplicate: "ለዚህ ስራ አስቀድመው አመልክተዋል።",
  },
};

const TYPE_LABEL = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

export default function Careers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;

  const [jobs, setJobs] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [department, setDepartment] = useState("All");
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({ name: "", email: "", phone: "", coverLetter: "", notes: "" });
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      setLoading(true);
      api
        .get(`/careers/${id}`)
        .then(setJob)
        .catch(() => setJob(null))
        .finally(() => setLoading(false));
    } else {
      api.get("/careers").then(setJobs).catch(() => setJobs([]));
    }
  }, [id]);

  const departments = useMemo(() => [...new Set(jobs.map((item) => item.department))], [jobs]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return jobs.filter((item) => {
      const matchesDepartment = department === "All" || item.department === department;
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.summary || "").toLowerCase().includes(term) ||
        item.department.toLowerCase().includes(term);
      return matchesDepartment && matchesTerm;
    });
  }, [jobs, department, query]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("email", form.email.trim());
      body.append("phone", form.phone.trim());
      body.append("coverLetter", form.coverLetter.trim());
      body.append("notes", form.notes.trim());
      if (file) body.append("resume", file);

      const response = await fetch(`${API_BASE}/careers/${id}/apply`, { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409) throw new Error(copy.duplicate);
      if (!response.ok) throw new Error(payload.error || copy.error);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || copy.error);
    } finally {
      setBusy(false);
    }
  };

  if (id) {
    return (
      <div className="careers-page">
        <Helmet>
          <title>{job ? `${job.title} | Careers at Ethio-Biopharma` : "Careers | Ethio-Biopharma"}</title>
        </Helmet>

        <section className="careers-hero">
          <div className="container-wide">
            <button type="button" className="btn btn-sm btn-outline-light mb-3" onClick={() => navigate("/careers")}>
              <ArrowLeft size={15} className="me-1" /> {copy.another}
            </button>
            <p className="hrx-eyebrow">{copy.eyebrow}</p>
            <h1>{job ? job.title : loading ? "…" : copy.noRoles}</h1>
            {job ? (
              <div className="job-meta" style={{ color: "rgba(255,255,255,0.75)" }}>
                <span><Building2 size={14} /> {job.department}</span>
                <span><MapPin size={14} /> {job.location || "Kilinto, Addis Ababa"}</span>
                <span><Briefcase size={14} /> {TYPE_LABEL[job.employmentType] || job.employmentType}</span>
                {job.closesAt ? <span><CalendarClock size={14} /> {copy.closing} {formatDate(job.closesAt)}</span> : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className="container-wide py-5">
          {!job ? (
            <div className="alert alert-secondary">{loading ? "…" : copy.noRoles}</div>
          ) : (
            <div className="row g-4">
              <div className="col-lg-7">
                <article className="job-detail">
                  {job.summary ? <p className="lead">{job.summary}</p> : null}
                  {job.description ? (
                    <>
                      <h2>{copy.about}</h2>
                      {job.description.split(/\n+/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </>
                  ) : null}
                  {job.responsibilities ? (
                    <>
                      <h2>{copy.responsibilities}</h2>
                      {job.responsibilities.split(/\n+/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </>
                  ) : null}
                  {job.requirements ? (
                    <>
                      <h2>{copy.requirements}</h2>
                      {job.requirements.split(/\n+/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </>
                  ) : null}
                </article>
              </div>

              <div className="col-lg-5">
                <aside className="apply-panel">
                  {submitted ? (
                    <div>
                      <h2 className="h5 fw-bold" style={{ color: "var(--hrx-navy)" }}>
                        {copy.success}
                      </h2>
                      <Link to="/careers" className="btn btn-brand mt-3">
                        {copy.another}
                      </Link>
                    </div>
                  ) : (
                    <>
                      <h2 className="h6 fw-bold mb-3" style={{ color: "var(--hrx-navy)" }}>
                        {copy.apply}
                      </h2>
                      <form className="hrx-form" onSubmit={submit}>
                        <div className="mb-3">
                          <label className="form-label" htmlFor="apply-name">{copy.name}</label>
                          <input
                            id="apply-name"
                            className="form-control"
                            required
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label" htmlFor="apply-email">{copy.email}</label>
                          <input
                            id="apply-email"
                            type="email"
                            className="form-control"
                            required
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label" htmlFor="apply-phone">{copy.phone}</label>
                          <input
                            id="apply-phone"
                            className="form-control"
                            placeholder="+251 9• •• •• ••"
                            value={form.phone}
                            onChange={(event) => setForm({ ...form, phone: event.target.value })}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label" htmlFor="apply-cover">{copy.cover}</label>
                          <textarea
                            id="apply-cover"
                            className="form-control"
                            rows={4}
                            value={form.coverLetter}
                            onChange={(event) => setForm({ ...form, coverLetter: event.target.value })}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label d-flex align-items-center gap-2" htmlFor="apply-cv">
                            <Upload size={14} /> {copy.cv}
                          </label>
                          <input
                            id="apply-cv"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="form-control"
                            onChange={(event) => setFile(event.target.files?.[0] || null)}
                          />
                        </div>
                        {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
                        <button className="btn btn-brand w-100 d-flex align-items-center justify-content-center gap-2" disabled={busy}>
                          <Send size={15} /> {busy ? copy.sending : copy.send}
                        </button>
                      </form>
                    </>
                  )}
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="careers-page">
      <Helmet>
        <title>Careers | Ethio-Biopharma Enterprise</title>
      </Helmet>

      <section className="careers-hero">
        <div className="container-wide">
          <p className="hrx-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.lede}</p>
          <div className="careers-hero-stats">
            <div>
              <strong>{jobs.length}</strong>
              <span>{copy.openRoles}</span>
            </div>
            <div>
              <strong>{departments.length}</strong>
              <span>{copy.departments}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide py-5">
        <div className="d-flex flex-wrap gap-3 align-items-end justify-content-between mb-4">
          <div style={{ minWidth: 260, flex: "1 1 320px" }}>
            <label className="form-label small fw-semibold" htmlFor="careers-search">{copy.search}</label>
            <input
              id="careers-search"
              className="form-control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Quality, laboratory, finance…"
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <label className="form-label small fw-semibold" htmlFor="careers-department">{copy.departments}</label>
            <select
              id="careers-department"
              className="form-select"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="All">{copy.allDepartments}</option>
              {departments.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="alert alert-secondary">{copy.noRoles}</div>
        ) : (
          <div className="row g-4">
            {visible.map((item) => (
              <div className="col-md-6 col-xl-4" key={item.id}>
                <article className="job-card">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <h3>{item.title}</h3>
                    <span className="hrx-chip hrx-chip--good">{item.openings || 1} {item.openings === 1 ? copy.openings : copy.openingsPlural}</span>
                  </div>
                  <div className="job-meta">
                    <span><Building2 size={13} /> {item.department}</span>
                    <span><MapPin size={13} /> {item.location || "Kilinto"}</span>
                    <span><Briefcase size={13} /> {TYPE_LABEL[item.employmentType] || item.employmentType}</span>
                  </div>
                  <p className="job-summary">{item.summary || (item.description || "").slice(0, 140)}</p>
                  <div className="d-flex justify-content-between align-items-center mt-auto pt-2">
                    <span className="small text-muted">
                      {item.closesAt ? `${copy.closing} ${formatDate(item.closesAt)}` : ""}
                    </span>
                    <Link className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1" to={`/careers/${item.id}`}>
                      {copy.view} <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
