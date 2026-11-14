import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

export default function OnboardingWizard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [state, setState] = useState(null);
  const [branding, setBranding] = useState({ primaryColor: "#0B2545", secondaryColor: "#C9A227", logoUrl: "", orgName: "" });
  const [invites, setInvites] = useState([{ email: "", role: "staff" }]);

  useEffect(() => {
    let alive = true;
    api.get(`/portals/onboarding/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!alive) return;
        setState(data);
        const b = data?.onboarding?.branding || {};
        setBranding({ primaryColor: b.primaryColor || "#0B2545", secondaryColor: b.secondaryColor || "#C9A227", logoUrl: b.logoUrl || "", orgName: b.orgName || data?.tenant?.name || "" });
        if (data?.tenant?.onboardingComplete) navigate("/dashboard", { replace: true });
      })
      .catch((e) => setErr(e?.message || "Failed to load onboarding"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [slug, navigate]);

  const saveStep = async (s, body) => {
    setSaving(true); setErr("");
    try { await api.post(`/portals/onboarding/${encodeURIComponent(slug)}/step/${s}`, body); setStep(s + 1); }
    catch (e) { setErr(e?.message || "Failed to save step"); }
    finally { setSaving(false); }
  };

  const complete = async () => {
    setSaving(true); setErr("");
    try {
      await api.post(`/portals/onboarding/${encodeURIComponent(slug)}/step/2`, branding);
      await api.post(`/portals/onboarding/${encodeURIComponent(slug)}/complete`, {});
      navigate(`/org/${slug}/login`, { replace: true });
    } catch (e) { setErr(e?.message || "Failed to complete onboarding"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-primary" /></div>;
  if (!state) return <div className="container py-5"><div className="alert alert-danger">{err || "Not found"}</div></div>;

  const ob = state.onboarding || {};
  return (
    <div className="min-vh-100 bg-light"><div className="container py-5" style={{ maxWidth: 900 }}>
      <div className="card shadow-sm"><div className="card-body p-4">
        <h3 className="mb-1">Set up {state.tenant?.name}</h3>
        <p className="text-muted">Complete onboarding to reach your dashboard.</p>
        {err ? <div className="alert alert-danger py-2">{err}</div> : null}
        <div className="mb-3 small text-muted">Step {step} of 4</div>

        {step === 1 && (
          <div>
            <h5>Confirm structure</h5>
            <p>Departments: {(ob.departments || []).join(", ") || "(none)"}</p>
            <p>Modules: {(ob.defaultModules || []).join(", ") || "(none)"}</p>
            <p>Approval/workflows captured during registration are ready.</p>
            <button className="btn btn-primary" disabled={saving} onClick={() => saveStep(1, { departments: ob.departments || [], roles: ob.roles || [], modules: ob.defaultModules || [], workflows: ob.workflows || {} })}>Looks right</button>
          </div>
        )}
        {step === 2 && (
          <div className="row g-3">
            <div className="col-12"><h5>Logo & colors</h5></div>
            <div className="col-md-6"><label className="form-label">Organization name</label><input className="form-control" value={branding.orgName} onChange={e=>setBranding(b=>({...b, orgName:e.target.value}))} /></div>
            <div className="col-md-6"><label className="form-label">Logo URL</label><input className="form-control" value={branding.logoUrl} onChange={e=>setBranding(b=>({...b, logoUrl:e.target.value}))} placeholder="https://..." /></div>
            <div className="col-md-3"><label className="form-label">Primary color</label><input type="color" className="form-control form-control-color" value={branding.primaryColor} onChange={e=>setBranding(b=>({...b, primaryColor:e.target.value}))} /></div>
            <div className="col-md-3"><label className="form-label">Secondary color</label><input type="color" className="form-control form-control-color" value={branding.secondaryColor} onChange={e=>setBranding(b=>({...b, secondaryColor:e.target.value}))} /></div>
            <div className="col-md-6"><div className="p-3 rounded text-white" style={{ background: branding.primaryColor }}><span className="badge" style={{ background: branding.secondaryColor, color: "#0B2545" }}>Preview</span> <span className="ms-2">{branding.orgName || state.tenant?.name}</span></div></div>
            <div className="col-12 d-flex gap-2"><button className="btn btn-outline-secondary" onClick={()=>setStep(3)}>Skip</button><button className="btn btn-primary" disabled={saving} onClick={()=>saveStep(2, branding)}>Save & continue</button></div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h5>Invite team (optional)</h5>
            {invites.map((inv, idx) => (
              <div className="row g-2 mb-2" key={idx}>
                <div className="col-md-7"><input className="form-control" placeholder="email@company.com" value={inv.email} onChange={e=>setInvites(arr=>arr.map((x,i)=>i===idx?{...x,email:e.target.value}:x))} /></div>
                <div className="col-md-5"><select className="form-select" value={inv.role} onChange={e=>setInvites(arr=>arr.map((x,i)=>i===idx?{...x,role:e.target.value}:x))}><option value="staff">staff</option><option value="manager">manager</option><option value="admin">admin</option></select></div>
              </div>
            ))}
            <button className="btn btn-link px-0" onClick={()=>setInvites(a=>[...a,{email:"",role:"staff"}])}>+ Add another</button>
            <div className="d-flex gap-2 mt-2"><button className="btn btn-outline-secondary" onClick={()=>setStep(4)}>Skip</button><button className="btn btn-primary" disabled={saving} onClick={()=>saveStep(3, { invites })}>Continue</button></div>
          </div>
        )}
        {step === 4 && (
          <div className="text-center py-3">
            <h4>Your platform is ready</h4>
            <p className="text-muted">Sign in to your organization dashboard to start working.</p>
            <button className="btn btn-success btn-lg" disabled={saving} onClick={complete}>{saving ? "Finishing..." : "Go to sign in"}</button>
            <div className="mt-2"><Link to={`/org/${slug}/login`}>Skip to login</Link></div>
          </div>
        )}
      </div></div>
    </div></div>
  );
}
