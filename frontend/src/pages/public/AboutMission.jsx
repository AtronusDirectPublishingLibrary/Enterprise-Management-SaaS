import { Helmet } from "react-helmet-async";
import { Target, Eye, ShieldCheck } from "lucide-react";

export default function AboutMission() {
  return (
    <div className="container py-5">
      <Helmet><title>Mission & Vision - Ethio-Biopharma</title></Helmet>
      
      <div className="text-center mb-5 fly-in">
        <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>Our Mission & Vision</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>
          The strategic direction for the 2026-2030 period is aligned with the 10-year roadmap and guided by a clear vision to position EBPE as a cornerstone of Ethiopia's health security.
        </p>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-6 fly-in">
          <div className="card h-100 border-0 shadow-sm" style={{ borderTop: "4px solid var(--brand-secondary)" }}>
            <div className="card-body p-4 text-center">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64, background: "rgba(201, 162, 39, 0.1)" }}>
                <Eye size={32} style={{ color: "var(--brand-secondary)" }} />
              </div>
              <h3 className="h4 fw-bold mb-3">Vision 2035</h3>
              <p className="text-muted">
                To be among the leading integrated biopharmaceutical campuses in Africa, ensuring health security and pharmaceutical sovereignty for Ethiopia and the continent through self-reliant, sustainable manufacturing.
              </p>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 fly-in">
          <div className="card h-100 border-0 shadow-sm" style={{ borderTop: "4px solid var(--brand-primary)" }}>
            <div className="card-body p-4 text-center">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64, background: "rgba(11, 37, 69, 0.1)" }}>
                <Target size={32} style={{ color: "var(--brand-primary)" }} />
              </div>
              <h3 className="h4 fw-bold mb-3">Mission</h3>
              <p className="text-muted">
                To develop, manufacture, and deliver high-quality, affordable essential medicines, vaccines, diagnostics, and medical supplies to meet public health needs through building a self-sustaining ecosystem of manufacturing businesses, fostering innovation, building local capacity, and creating strategic partnerships.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm fly-in">
        <div className="card-body p-5">
          <h3 className="h4 fw-bold mb-4 d-flex align-items-center">
            <ShieldCheck className="me-2" style={{ color: "var(--brand-primary)" }} /> Our Core Values
          </h3>
          <div className="row g-4">
            {[
              { title: "Quality", desc: "Adherence to the highest national and international standards (WHO-GMP, ISO) in all our processes and products." },
              { title: "Integrity", desc: "Operating with transparency, accountability, and ethical conduct in all our endeavors." },
              { title: "Innovation", desc: "Embracing advanced technologies, continuous improvement, and R&D to address evolving health challenges." },
              { title: "Collaboration", desc: "Building strong partnerships with government, international organizations, academia, and the private sector." },
              { title: "Sustainability", desc: "Ensuring the long-term financial, operational, and environmental viability of our enterprise." },
              { title: "People-Centricity", desc: "Investing in our workforce and committed to improving the health and well-being of the communities we serve." }
            ].map((val, i) => (
              <div className="col-md-4" key={i}>
                <h5 className="fw-bold mb-2" style={{ color: "var(--brand-primary)" }}>{val.title}</h5>
                <p className="small text-muted">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}