import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";
import { Target, Eye, ShieldCheck, CheckCircle2, Factory, Users, LineChart, Shield, Landmark, MapPin, TrendingUp, Stethoscope, Building2, Network, Briefcase } from "lucide-react";

export default function About() {
  const { t } = useLanguage();
  return (
    <div className="container py-5">
      <Helmet><title>About Us - Ethio-Biopharma</title></Helmet>
      
      {/* OVERVIEW */}
      <section id="overview" className="mb-5 fly-in">
        <div className="text-center mb-5">
          <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{t("aboutPageTitle")}</h1>
          <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>
            {t("aboutPageSubtitle")}
          </p>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section id="mission" className="mb-5 pt-5 fly-in">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{t("missionVisionHeading")}</h2>
        </div>
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm" style={{ borderTop: "4px solid var(--brand-secondary)" }}>
              <div className="card-body p-4 text-center">
                <Eye size={40} className="mb-3 mx-auto" style={{ color: "var(--brand-secondary)" }} />
                <h3 className="h4 fw-bold mb-3">{t("vision2035")}</h3>
                <p className="text-muted">{t("visionText")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm" style={{ borderTop: "4px solid var(--brand-primary)" }}>
              <div className="card-body p-4 text-center">
                <Target size={40} className="mb-3 mx-auto" style={{ color: "var(--brand-primary)" }} />
                <h3 className="h4 fw-bold mb-3">{t("missionHeading")}</h3>
                <p className="text-muted">{t("missionText")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h3 className="h5 fw-bold mb-4 d-flex align-items-center"><ShieldCheck className="me-2" style={{ color: "var(--brand-primary)" }} /> {t("coreValues")}</h3>
            <div className="row g-4">
              {[
                { t: "Quality", d: "Adherence to the highest national and international standards (WHO-GMP, ISO)." },
                { t: "Integrity", d: "Operating with transparency, accountability, and ethical conduct." },
                { t: "Innovation", d: "Embracing advanced technologies, continuous improvement, and R&D." },
                { t: "Collaboration", d: "Building strong partnerships with government and the private sector." },
                { t: "Sustainability", d: "Ensuring long-term financial, operational, and environmental viability." },
                { t: "People-Centricity", d: "Investing in our workforce and improving community health." }
              ].map((v, i) => (
                <div className="col-md-4" key={i}>
                  <h6 className="fw-bold mb-1" style={{ color: "var(--brand-primary)" }}>{t(v.t.toLowerCase()) !== v.t.toLowerCase() ? t(v.t.toLowerCase()) : v.t}</h6>
                  <p className="small text-muted mb-0">{t(v.t.toLowerCase() + "Desc") !== v.t.toLowerCase() + "Desc" ? t(v.t.toLowerCase() + "Desc") : v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OBJECTIVES */}
      <section id="objectives" className="mb-5 pt-5 fly-in">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{t("strategicObjectivesHeading")}</h2>
          <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>The core of the 2026-2030 plan is defined by five {t("strategicObjectivesHeading")} (SOs).</p>
        </div>
        <div className="row g-4">
          {[
            { i: <Factory size={32} />, t: "so1Title", d: "so1Desc" },
            { i: <Shield size={32} />, t: "so2Title", d: "so2Desc" },
            { i: <Users size={32} />, t: "so3Title", d: "so3Desc" },
            { i: <LineChart size={32} />, t: "so4Title", d: "so4Desc" },
            { i: <CheckCircle2 size={32} />, t: "so5Title", d: "so5Desc" }
          ].map((o, idx) => (
            <div className="col-md-6 col-lg-4" key={idx}>
              <div className="card h-100 border-0 shadow-sm hover-float">
                <div className="card-body p-4">
                  <div className="mb-3" style={{ color: "var(--brand-secondary)" }}>{o.i}</div>
                  <h5 className="fw-bold mb-2">{t(o.t)}</h5>
                  <p className="text-muted small mb-0">{t(o.d)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDATION */}
      <section className="mb-5 pt-5 fly-in">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{t("foundationHeading", "Our Foundation & Mandate")}</h2>
        </div>
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><Landmark className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("instMandateHeading", "Institutional Mandate")}</h4>
                <p className="text-muted">{t("instMandateDesc", "EBPE serves as the primary vehicle for transforming Ethiopia from an import-dependent nation into a regional biopharmaceutical manufacturing hub—addressing the vulnerabilities exposed by the global COVID-19 pandemic.")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><MapPin className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("campusHeading", "The Integrated Campus")}</h4>
                <p className="text-muted">{t("campusDesc", "Located in Kilinto Industrial Park, the campus co-locates multiple synergistic business units including human vaccine production (ShieldVax), generic medicines, diagnostics, and PPE manufacturing.")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><TrendingUp className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("crossSubHeading", "Cross-Subsidization Model")}</h4>
                <p className="text-muted">{t("crossSubDesc", "A tiered launch strategy. The \"Quick-Win\" units (PPE, Diagnostics, and Medicines) are engineered for rapid commissioning and early revenue generation. Profits are reinvested into ShieldVax vaccine facility CAPEX.")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><Stethoscope className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("natHealthHeading", "National Health Security")}</h4>
                <p className="text-muted">{t("natHealthDesc", "By establishing a fully integrated biopharmaceutical campus, EBPE aims to transform Ethiopia into a self-reliant producer and a leading exporter within the African Continental Free Trade Area (AfCFTA).")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GOVERNANCE */}
      <section id="governance" className="mb-5 pt-5 fly-in">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{t("governanceHeading")}</h2>
        </div>
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><Landmark className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("eihHeading", "Ethiopian Investment Holdings")}</h4>
                <p className="text-muted">{t("eihDesc", "As Ethiopia's sovereign wealth fund and EBPE's parent organization, EIH provides high-level strategic oversight. EIH functions as an active owner, enforcing modern corporate governance standards and evaluating enterprise performance against both commercial and national benchmarks.")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><Briefcase className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("boardHeading", "The Board of Directors")}</h4>
                <p className="text-muted">{t("boardDesc", "The Board serves as the primary governing body of EBPE, reporting directly to EIH. It provides strategic guidance on the enterprise's roadmap and commercial trajectory while ensuring accountability through adherence to national and international quality standards.")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><Building2 className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("ebpeHeading", "Ethio-Bio Pharma Enterprise")}</h4>
                <p className="text-muted">{t("ebpeDesc", "The Enterprise Office functions as the corporate holding entity, delivering centralized leadership and shared services across the integrated campus. It sets the overall strategic direction and financial policy for the group.")}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3 d-flex align-items-center"><Network className="me-2" style={{ color: "var(--brand-secondary)" }} /> {t("buHeading", "Business Unit Structure")}</h4>
                <ul className="text-muted small mb-0">
                  <li>{t("buShieldVax", "ShieldVax Unit (Vaccine Production)")}</li>
                  <li>{t("buMedicines", "Medicines and Input Production Unit")}</li>
                  <li>{t("buDiagnostics", "Diagnostic, PPE and Medical Supplies Unit")}</li>
                  <li>{t("buTraining", "Training & Capacity Building Unit")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}