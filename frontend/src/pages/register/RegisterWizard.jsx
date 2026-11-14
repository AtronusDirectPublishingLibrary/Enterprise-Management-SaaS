import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Sparkles } from "lucide-react";

const STEPS = ["Organization", "Industry & scale", "Structure", "Modules", "Workflows", "Admin account"];

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica",
  "Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland",
  "France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
  "Guinea-Bissau","Guyana","Haiti","Holy See","Honduras","Hungary","Iceland","India","Indonesia","Iran",
  "Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati",
  "Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
  "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
  "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia",
  "Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands",
  "Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
  "Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey",
  "Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];
const MODULE_OPTIONS = [
  { key: "pms", label: "Project & Performance (PMS)" },
  { key: "planning", label: "Planning" },
  { key: "aop", label: "Annual Operating Plan (AOP)" },
  { key: "strategic", label: "Strategic Planning" },
  { key: "roadmap", label: "Roadmap" },
  { key: "hr", label: "Human Resources" },
  { key: "recruitment", label: "Recruitment" },
  { key: "payroll", label: "Payroll" },
  { key: "supply_chain", label: "Supply Chain (Assets & Inventory)" },
  { key: "finance", label: "Financial Management" },
  { key: "procurement", label: "Procurement & Vendor Management" },
  { key: "warehouse", label: "Inventory & Warehouse Management (WMS)" },
  { key: "accounting", label: "Accounting & Financials (GL/AP/AR)" },
  { key: "maintenance", label: "Asset & Maintenance Management (EAM/CMMS)" },
  { key: "crm", label: "CRM & Sales / Order Management" },
  { key: "portals", label: "Customer / Partner / Vendor Portals" },
  { key: "helpdesk", label: "Helpdesk & Service Management" },
  { key: "dms", label: "Enterprise Document & Records Management" },
  { key: "grc", label: "Risk, Compliance & Audit (GRC)" },
  { key: "bi", label: "BI & Advanced Analytics" },
  { key: "resources", label: "Resource & Capacity Management" },
  { key: "contracts", label: "Contracts & Legal Management" },
  { key: "ehs", label: "EHS / Safety Management" },
  { key: "fleet", label: "Fleet & Logistics" },
  { key: "qms", label: "Quality Management (QMS)" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "projects", label: "Projects" },
  { key: "public_site", label: "Public Site / CMS" },
];

const INDUSTRY_MODULES = {
  biopharma: ["pms","hr","qms","fleet","planning","reports","supply_chain","finance"],
  manufacturing: ["pms","hr","qms","fleet","reports","supply_chain","finance"],
  healthcare: ["pms","hr","qms","fleet","reports","supply_chain","finance"],
  logistics: ["pms","hr","fleet","reports","supply_chain","finance"],
  education: ["pms","hr","planning","reports","finance"],
  government: ["pms","hr","planning","reports","finance"],
  other: ["pms","hr","reports","finance"],
};

export default function RegisterWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [slugState, setSlugState] = useState({ checking: false, available: null, reason: "" });
  const [data, setData] = useState(() => {
    const defaults = {
      organization: { legalName: "", displayName: "", slug: "", type: "PROFIT", country: "Ethiopia", city: "", primaryEmail: "", industryType: "biopharma", orgSize: "small", primaryMarket: "national", fiscalYearStart: 7, currency: "ETB", languages: ["en"] },
      structure: { departments: ["QA", "Production", "HR", "Finance"], reportingLevels: 2 },
      modules: ["pms","hr","qms","fleet","reports"],
      workflows: { approvalDepth: 2, leaveTypes: ["ANNUAL", "SICK", "MATERNITY"], primaryLanguage: "en" },
      admin: { firstName: "", lastName: "", email: "", password: "" },
    };
    try {
      const saved = JSON.parse(sessionStorage.getItem("ebems.register") || "null");
      if (saved && saved.organization) {
        const org = { ...defaults.organization, ...saved.organization };
        // migrate legacy country code default
        if (org.country === "ET") org.country = "Ethiopia";
        return { ...defaults, ...saved, organization: org };
      }
    } catch {}
    return defaults;
  });
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");

  useEffect(() => { try { sessionStorage.setItem("ebems.register", JSON.stringify(data)); } catch {} }, [data]);
  useEffect(() => {
    const name = data.organization.displayName || data.organization.legalName;
    if (!data.organization.slug && name) {
      const s = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setData(d => ({ ...d, organization: { ...d.organization, slug: s } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.organization.displayName]);

  useEffect(() => {
    const slug = data.organization.slug;
    if (!slug) { setSlugState({ checking: false, available: null, reason: "" }); return; }
    const t = setTimeout(async () => {
      setSlugState(s => ({ ...s, checking: true }));
      try {
        const r = await api.get(`/portals/check-slug?slug=${encodeURIComponent(slug)}`);
        setSlugState({ checking: false, available: r.available, reason: r.reason || "" });
        if (r.slug && r.slug !== slug) setData(d => ({ ...d, organization: { ...d.organization, slug: r.slug } }));
      } catch { setSlugState({ checking: false, available: null, reason: "error" }); }
    }, 350);
    return () => clearTimeout(t);
  }, [data.organization.slug]);

  useEffect(() => {
    const country = data.organization.country;
    if (!country) { setCities([]); setCitiesError(""); return; }
    let cancelled = false;
    const load = async () => {
      setCitiesLoading(true); setCitiesError("");
      try {
        const res = await fetch("https://countriesnow.space/api/v0.1/countries/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country }),
        });
        const json = await res.json();
        const list = !json?.error && Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) setCities(list);
      } catch {
        if (!cancelled) { setCities([]); setCitiesError("Could not load cities. You can type your city."); }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [data.organization.country]);

  const setOrg = (k, v) => setData(d => ({ ...d, organization: { ...d.organization, [k]: v } }));
  const setStruct = (k, v) => setData(d => ({ ...d, structure: { ...d.structure, [k]: v } }));
  const setWf = (k, v) => setData(d => {
    const workflows = { ...d.workflows, [k]: v };
    // keep language settings consistent to avoid conflicting setup
    if (k === "primaryLanguage") {
      const languages = v === "am" ? ["am"] : v === "both" ? ["en", "am"] : ["en"];
      return { ...d, workflows, organization: { ...d.organization, languages } };
    }
    return { ...d, workflows };
  });
  const setAdmin = (k, v) => setData(d => ({ ...d, admin: { ...d.admin, [k]: v } }));

  const canNext = useMemo(() => {
    if (step === 0) return data.organization.legalName && data.organization.displayName && data.organization.slug && data.organization.primaryEmail && data.organization.country && slugState.available !== false;
    if (step === 1) {
      const fy = Number(data.organization.fiscalYearStart);
      return data.organization.industryType && data.organization.orgSize && data.organization.primaryMarket && data.organization.currency && Number.isInteger(fy) && fy >= 1 && fy <= 12;
    }
    if (step === 2) return Number(data.structure.reportingLevels) >= 1 && Number(data.structure.reportingLevels) <= 5;
    if (step === 3) return Array.isArray(data.modules); // allow defaults fallback on empty
    if (step === 4) {
      const fy = Number(data.organization.fiscalYearStart);
      const depth = Number(data.workflows.approvalDepth);
      return Number.isInteger(fy) && fy >= 1 && fy <= 12 && depth >= 1 && depth <= 5 && Array.isArray(data.workflows.leaveTypes) && data.workflows.leaveTypes.length > 0 && !!data.workflows.primaryLanguage;
    }
    if (step === 5) return data.admin.firstName && data.admin.lastName && data.admin.email && data.admin.password.length >= 8;
    return true;
  }, [step, data, slugState.available]);

  const toggleArray = (path, value) => {
    setData(d => {
      const arr = path === "modules" ? d.modules : path === "workflows.leaveTypes" ? d.workflows.leaveTypes : path === "structure.departments" ? d.structure.departments : [];
      const next = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
      if (path === "modules") return { ...d, modules: next };
      if (path === "workflows.leaveTypes") return { ...d, workflows: { ...d.workflows, leaveTypes: next } };
      if (path === "structure.departments") return { ...d, structure: { ...d.structure, departments: next } };
      return d;
    });
  };

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const fy = Math.min(12, Math.max(1, parseInt(data.organization.fiscalYearStart, 10) || 1));
      const approvalDepth = Math.min(5, Math.max(1, parseInt(data.workflows.approvalDepth, 10) || 1));
      const reportingLevels = Math.min(5, Math.max(1, parseInt(data.structure.reportingLevels, 10) || 2));
      const primaryLanguage = data.workflows.primaryLanguage || "en";
      const languages = primaryLanguage === "am" ? ["am"] : primaryLanguage === "both" ? ["en", "am"] : (Array.isArray(data.organization.languages) && data.organization.languages.length ? data.organization.languages : ["en"]);
      const leaveTypes = Array.isArray(data.workflows.leaveTypes) && data.workflows.leaveTypes.length ? data.workflows.leaveTypes : ["ANNUAL", "SICK"];
      const payload = {
        ...data,
        organization: {
          ...data.organization,
          fiscalYearStart: fy,
          languages,
        },
        structure: {
          ...data.structure,
          reportingLevels,
        },
        workflows: {
          ...data.workflows,
          approvalDepth,
          primaryLanguage,
          leaveTypes,
        },
      };
      const res = await api.post("/portals/register", payload);
      try { sessionStorage.removeItem("ebems.register"); } catch {}
      navigate(res.onboardingUrl || `/org/${res.slug}/onboarding`, { replace: true });
    } catch (e) {
      const issues = e?.data?.issues;
      const detail = Array.isArray(issues) && issues.length
        ? `: ${issues.map(i => `${i.path || "field"} ${i.message}`).join("; ")}`
        : "";
      setErr((e?.data?.message || e?.message || "Registration failed") + detail);
    } finally { setBusy(false); }
  };

  const onIndustry = (v) => {
    setOrg("industryType", v);
    const mods = INDUSTRY_MODULES[v] || INDUSTRY_MODULES.other;
    setData(d => ({ ...d, modules: mods, organization: { ...d.organization, industryType: v } }));
  };

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-vh-100" style={{ background: "linear-gradient(180deg, #0B2545 0%, #0B2545 220px, var(--brand-bg, #F5F2EA) 220px)" }}>
      <div className="container py-4 py-lg-5" style={{ maxWidth: 1120 }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 text-white">
          <div>
            <Link to="/register" className="text-decoration-none d-inline-flex align-items-center gap-2 mb-2" style={{ color: "rgba(255,255,255,.85)" }}>
              <ArrowLeft size={16} /> Back to overview
            </Link>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2" style={{ background: "rgba(201,162,39,.14)", border: "1px solid rgba(201,162,39,.35)", color: "#f3d98b", fontSize: ".85rem", fontWeight: 600 }}>
              <Sparkles size={14} /> Beshilo Enterprise Management System
            </div>
            <h2 className="fw-bold mb-1">Create your organization</h2>
            <div style={{ color: "rgba(255,255,255,.78)" }}>A guided setup to configure your tenant, modules, and workflows.</div>
          </div>
          <div className="text-lg-end">
            <div className="small mb-1" style={{ color: "rgba(255,255,255,.75)" }}>Step {step + 1} of {STEPS.length}</div>
            <div className="fw-semibold" style={{ color: "#e8c766" }}>{progress}% complete</div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-3">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-2 mb-3 fw-semibold" style={{ color: "#0B2545" }}>
                  <Building2 size={18} /> Registration steps
                </div>
                <div className="progress mb-3" style={{ height: 6 }}>
                  <div className="progress-bar" role="progressbar" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#C9A227,#e0b93a)" }} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" />
                </div>
                <ol className="list-unstyled m-0 d-grid gap-2">
                  {STEPS.map((s, i) => (
                    <li key={s} className="p-2 rounded-3 d-flex align-items-center gap-2" style={{
                      background: i === step ? '#0B2545' : i < step ? 'rgba(46,125,50,.1)' : '#f6f7f9',
                      color: i === step ? '#fff' : '#243447',
                      fontWeight: i === step ? 600 : 500,
                      border: i === step ? '1px solid #0B2545' : '1px solid rgba(11,37,69,.06)'
                    }}>
                      <span className="d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: 22, height: 22, fontSize: 12, background: i === step ? 'rgba(255,255,255,.18)' : i < step ? '#2e7d32' : 'rgba(11,37,69,.1)', color: i < step || i === step ? '#fff' : '#0B2545', flexShrink: 0 }}>
                        {i < step ? <CheckCircle2 size={14} /> : i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="col-lg-9">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-body p-4 p-lg-5">
                <div className="mb-4">
                  <div className="text-uppercase small fw-semibold mb-1" style={{ color: "#8a6a12", letterSpacing: ".08em" }}>Step {step + 1}</div>
                  <h4 className="mb-1" style={{ color: "#0B2545", fontWeight: 700 }}>{STEPS[step]}</h4>
                  <div className="text-muted" style={{ fontSize: ".95rem" }}>
                    {step === 0 && "Tell us about your organization so we can create your tenant workspace."}
                    {step === 1 && "Your industry and scale help BEMS suggest the right defaults and modules."}
                    {step === 2 && "Define how your organization is structured for reporting and collaboration."}
                    {step === 3 && "Choose the capabilities to enable for this tenant."}
                    {step === 4 && "Set workflow and policy defaults that match how you operate."}
                    {step === 5 && "Create the first administrator account for your organization."}
                  </div>
                </div>

                {err ? <div className="alert alert-danger py-2">{err}</div> : null}

                {step === 0 && (
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Organization legal name</label><input className="form-control" value={data.organization.legalName} onChange={e=>setOrg("legalName", e.target.value)} placeholder="e.g. Acme Industries Ltd" /></div>
                    <div className="col-md-6"><label className="form-label">Display name</label><input className="form-control" value={data.organization.displayName} onChange={e=>setOrg("displayName", e.target.value)} placeholder="Name shown in the app" /></div>
                    <div className="col-md-6"><label className="form-label">Desired slug</label><input className="form-control" value={data.organization.slug} onChange={e=>setOrg("slug", e.target.value)} placeholder="your-organization" /><div className={`form-text ${slugState.available === true ? "text-success" : slugState.available === false ? "text-danger" : ""}`}>{slugState.checking ? "Checking availability..." : slugState.available === true ? "✓ Available" : slugState.available === false ? `Unavailable (${slugState.reason})` : "Used for your org URL"}</div></div>
                    <div className="col-md-6"><label className="form-label">Organization type</label><select className="form-select" value={data.organization.type} onChange={e=>setOrg("type", e.target.value)}><option value="PROFIT">PROFIT</option><option value="NON_PROFIT">NON_PROFIT</option></select></div>
                    <div className="col-md-6"><label className="form-label">Primary contact email</label><input type="email" className="form-control" value={data.organization.primaryEmail} onChange={e=>setOrg("primaryEmail", e.target.value)} placeholder="contact@company.com" /></div>
                    <div className="col-md-6">
                      <label className="form-label">Country</label>
                      <select className="form-select" value={data.organization.country} onChange={e=>{ const c = e.target.value; setData(d => ({ ...d, organization: { ...d.organization, country: c, city: "" } })); }}>
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        {data.organization.country && !COUNTRIES.includes(data.organization.country) ? <option value={data.organization.country}>{data.organization.country}</option> : null}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">City</label>
                      <input
                        className="form-control"
                        list="org-city-list"
                        value={data.organization.city || ""}
                        onChange={e=>setOrg("city", e.target.value)}
                        placeholder={citiesLoading ? "Loading cities..." : (cities.length ? "Select or type a city" : "Type your city")}
                        disabled={!data.organization.country}
                      />
                      <datalist id="org-city-list">
                        {cities.slice(0, 5000).map((c) => <option key={c} value={c} />)}
                      </datalist>
                      <div className="form-text">
                        {citiesLoading ? "Loading cities..." : citiesError ? citiesError : (cities.length ? `${cities.length.toLocaleString()} cities available` : (data.organization.country ? "You can type your city name." : "Select a country first."))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Industry type</label><select className="form-select" value={data.organization.industryType} onChange={e=>onIndustry(e.target.value)}>{["biopharma","manufacturing","healthcare","logistics","education","government","other"].map(x=> <option key={x} value={x}>{x}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">Organization size</label><select className="form-select" value={data.organization.orgSize} onChange={e=>setOrg("orgSize", e.target.value)}>{["micro","small","medium","large","enterprise"].map(x=> <option key={x} value={x}>{x}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">Primary market</label><select className="form-select" value={data.organization.primaryMarket} onChange={e=>setOrg("primaryMarket", e.target.value)}>{["national","regional","global"].map(x=> <option key={x} value={x}>{x}</option>)}</select></div>
                    <div className="col-md-3"><label className="form-label">Fiscal year start (month)</label><input type="number" min={1} max={12} className="form-control" value={data.organization.fiscalYearStart} onChange={e=>setOrg("fiscalYearStart", e.target.value === "" ? "" : Number(e.target.value))} onBlur={e=>{ const n = Math.min(12, Math.max(1, parseInt(e.target.value,10) || 1)); setOrg("fiscalYearStart", n); }} /></div>
                    <div className="col-md-3"><label className="form-label">Currency</label><input className="form-control" value={data.organization.currency} onChange={e=>setOrg("currency", e.target.value)} /></div>
                    <div className="col-12"><div className="alert alert-light border mb-0 py-2 small">Industry and scale drive module defaults, labels, and workflow suggestions. You can adjust modules in the next steps.</div></div>
                  </div>
                )}

                {step === 2 && (
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Reporting levels</label><select className="form-select" value={data.structure.reportingLevels} onChange={e=>setStruct("reportingLevels", Number(e.target.value))}><option value={1}>Flat</option><option value={2}>Two-level (manager → staff)</option><option value={3}>Multi-level (director → manager → staff)</option></select></div>
                    <div className="col-12"><label className="form-label">Departments (comma-separated)</label><textarea className="form-control" rows={4} value={data.structure.departments.join(", ")} onChange={e=>setStruct("departments", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} placeholder="QA, Production, HR, Finance" /></div>
                  </div>
                )}

                {step === 3 && (
                  <div className="row g-2">
                    {MODULE_OPTIONS.map(({ key, label }) => (
                      <div className="col-md-6 col-lg-4" key={key}>
                        <label className="border rounded-3 p-3 d-flex gap-2 align-items-start h-100" style={{ cursor: "pointer", background: data.modules.includes(key) ? "rgba(11,37,69,.04)" : "#fff", borderColor: data.modules.includes(key) ? "#0B2545" : "rgba(11,37,69,.12)" }}>
                          <input type="checkbox" className="form-check-input mt-1" checked={data.modules.includes(key)} onChange={()=>toggleArray("modules", key)} />
                          <span>
                            <span className="fw-medium d-block" style={{ color: "#0B2545" }}>{label}</span>
                            <span className="text-muted small">{key}</span>
                          </span>
                        </label>
                      </div>
                    ))}
                    <div className="col-12 text-muted small mt-1">Selected modules determine visible sections and API/module gating for this tenant. You can include Supply Chain Management (Assets & Inventory) and Financial Management as needed.</div>
                  </div>
                )}

                {step === 4 && (
                  <div className="row g-3">
                    <div className="col-md-4"><label className="form-label">Approval chain depth</label><select className="form-select" value={data.workflows.approvalDepth} onChange={e=>setWf("approvalDepth", Number(e.target.value))}><option value={1}>1 - direct manager</option><option value={2}>2 - manager + director</option><option value={3}>3 - manager + director + executive</option></select></div>
                    <div className="col-md-4"><label className="form-label">Primary language</label><select className="form-select" value={data.workflows.primaryLanguage} onChange={e=>setWf("primaryLanguage", e.target.value)}><option value="en">English</option><option value="am">Amharic</option><option value="both">Both</option></select></div>
                    <div className="col-md-4"><label className="form-label">Fiscal year start (month)</label><input type="number" min={1} max={12} className="form-control" value={data.organization.fiscalYearStart} onChange={e=>setOrg("fiscalYearStart", e.target.value === "" ? "" : Number(e.target.value))} onBlur={e=>{ const n = Math.min(12, Math.max(1, parseInt(e.target.value,10) || 1)); setOrg("fiscalYearStart", n); }} /></div>
                    <div className="col-12"><label className="form-label">Default leave types</label><div className="d-flex flex-wrap gap-2">{["ANNUAL","SICK","MATERNITY","PATERNITY","STUDY","UNPAID"].map(t => (<label key={t} className="border rounded-3 px-3 py-2 d-flex gap-2 align-items-center" style={{ cursor: "pointer", background: data.workflows.leaveTypes.includes(t) ? "rgba(11,37,69,.04)" : "#fff" }}><input type="checkbox" className="form-check-input mt-0" checked={data.workflows.leaveTypes.includes(t)} onChange={()=>toggleArray("workflows.leaveTypes", t)} /> {t}</label>))}</div></div>
                  </div>
                )}

                {step === 5 && (
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Admin first name</label><input className="form-control" value={data.admin.firstName} onChange={e=>setAdmin("firstName", e.target.value)} /></div>
                    <div className="col-md-6"><label className="form-label">Admin last name</label><input className="form-control" value={data.admin.lastName} onChange={e=>setAdmin("lastName", e.target.value)} /></div>
                    <div className="col-md-6"><label className="form-label">Admin email</label><input type="email" className="form-control" value={data.admin.email} onChange={e=>setAdmin("email", e.target.value)} /></div>
                    <div className="col-md-6"><label className="form-label">Admin password</label><input type="password" className="form-control" value={data.admin.password} onChange={e=>setAdmin("password", e.target.value)} /><div className="form-text">Minimum 8 characters.</div></div>
                    <div className="col-12"><label className="d-flex gap-2 align-items-center"><input type="checkbox" className="form-check-input" required /> I agree to the terms and confirm I’m authorized to create this organization.</label></div>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                  <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" disabled={step===0 || busy} onClick={()=>setStep(s=>Math.max(0,s-1))}><ArrowLeft size={16} /> Back</button>
                  {step < STEPS.length - 1 ? (
                    <button className="btn text-white d-inline-flex align-items-center gap-2" style={{ background: "#0B2545" }} disabled={!canNext || busy} onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}>Next <ArrowRight size={16} /></button>
                  ) : (
                    <button className="btn d-inline-flex align-items-center gap-2" style={{ background: "linear-gradient(135deg,#C9A227,#e0b93a)", color: "#081a30", fontWeight: 700, border: "none" }} disabled={!canNext || busy} onClick={submit}>{busy ? "Creating..." : "Create organization"} {!busy && <ArrowRight size={16} />}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
