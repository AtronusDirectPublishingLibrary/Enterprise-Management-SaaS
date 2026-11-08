import { Helmet } from "react-helmet-async";
import { CheckCircle2, Factory, Users, LineChart, Shield } from "lucide-react";

export default function AboutObjectives() {
  return (
    <div className="container py-5">
      <Helmet><title>Objectives - Ethio-Biopharma</title></Helmet>
      
      <div className="text-center mb-5 fly-in">
        <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>Strategic Objectives</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>
          The core of the 2026-2030 plan is defined by five Strategic Objectives (SOs) that cover infrastructure, operational readiness, workforce, finance, and quality.
        </p>
      </div>

      <div className="row g-4">
        {[
          { icon: <Factory size={28} />, title: "SO1: Rapid Infrastructure Development", desc: "Deliver and commission the Diagnostics, Generic Medicines, and PPE units within 18-24 months of groundbreaking." },
          { icon: <Shield size={28} />, title: "SO2: ShieldVax Facility Construction", desc: "Complete the construction and validation of the vaccine fill-finish facility, preparing it for commercial manufacturing by 2029." },
          { icon: <Users size={28} />, title: "SO3: Workforce and Capacity Building", desc: "Recruit and train a workforce of over 400 staff by 2030, establishing the EBPE Workforce Development Center." },
          { icon: <LineChart size={28} />, title: "SO4: Financial Sustainability Foundation", desc: "Secure $207M+ in blended financing and activate the cross-subsidization mechanism from Quick-Win units." },
          { icon: <CheckCircle2 size={28} />, title: "SO5: Regulatory and Quality Systems", desc: "Implement WHO-GMP compliant Quality Management Systems (QMS) across all campus units to ensure EFDA approval and future WHO-PQ." }
        ].map((obj, i) => (
          <div className="col-md-6 col-lg-4 fly-in" key={i}>
            <div className="card h-100 border-0 shadow-sm hover-float">
              <div className="card-body p-4">
                <div className="mb-3" style={{ color: "var(--brand-secondary)" }}>{obj.icon}</div>
                <h5 className="fw-bold mb-3">{obj.title}</h5>
                <p className="text-muted small mb-0">{obj.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}