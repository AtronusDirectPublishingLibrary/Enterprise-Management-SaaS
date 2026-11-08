import { Helmet } from "react-helmet-async";
import { Building2, Landmark, Network, Briefcase } from "lucide-react";

export default function AboutBoard() {
  return (
    <div className="container py-5">
      <Helmet><title>Board & Governance - Ethio-Biopharma</title></Helmet>
      
      <div className="text-center mb-5 fly-in">
        <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>Board & Governance</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>
          EBPE operates under a tiered governance structure designed to ensure commercial discipline, national strategic alignment, and operational efficiency.
        </p>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-6 fly-in">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3 d-flex align-items-center">
                <Landmark className="me-2" style={{ color: "var(--brand-secondary)" }} /> Ethiopian Investment Holdings (EIH)
              </h4>
              <p className="text-muted">
                As Ethiopia's sovereign wealth fund and EBPE's parent organization, EIH provides high-level strategic oversight. EIH functions as an active owner, enforcing modern corporate governance standards and evaluating enterprise performance against both commercial and national benchmarks.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 fly-in">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3 d-flex align-items-center">
                <Briefcase className="me-2" style={{ color: "var(--brand-secondary)" }} /> The Board of Directors
              </h4>
              <p className="text-muted">
                The Board serves as the primary governing body of EBPE, reporting directly to EIH. It provides strategic guidance on the enterprise's roadmap and commercial trajectory while ensuring accountability through adherence to national and international quality standards (e.g., WHO-GMP, ISO).
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 fly-in">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3 d-flex align-items-center">
                <Building2 className="me-2" style={{ color: "var(--brand-secondary)" }} /> Ethio-Bio Pharma Enterprise
              </h4>
              <p className="text-muted">
                The Enterprise Office functions as the corporate holding entity, delivering centralized leadership and shared services across the integrated campus. It sets the overall strategic direction and financial policy for the group.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 fly-in">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3 d-flex align-items-center">
                <Network className="me-2" style={{ color: "var(--brand-secondary)" }} /> Business Unit Structure
              </h4>
              <p className="text-muted mb-2">
                Each business unit operates with operational autonomy while remaining strategically aligned with the corporate office:
              </p>
              <ul className="text-muted small mb-0">
                <li>ShieldVax Unit (Vaccine Production)</li>
                <li>Medicines and Input Production Unit</li>
                <li>Diagnostic, PPE and Medical Supplies Unit</li>
                <li>Training & Capacity Building Unit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}