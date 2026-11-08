import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";
export default function Partners() {
  const { t } = useLanguage();
  return (
    <div className="container py-5">
      <Helmet>
        <title>Partners & Stakeholders | EBPE</title>
        <meta name="description" content="Collaborating with government counterparts, international health organizations, and technology transfer partners." />
      </Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("partnersPageTitle")}</h1>
      <p className="lead text-muted mb-5">Collaborating with government counterparts, international health organizations, and technology transfer partners.</p>
      
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold " style={{ color: "#0B2545" }}>{t("techTransferPartners")}</h5>
            <p className="text-muted small mt-2">We work closely with international manufacturers to transfer technology, ensuring domestic self-reliance in biopharmaceutical production.</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold " style={{ color: "#0B2545" }}>{t("govMultilateral")}</h5>
            <p className="text-muted small mt-2">EBPE engages regularly with the Ministry of Health, the Industrial Parks Development Corporation, and multilateral development partners.</p>
          </div>
        </div>
      </div>
    </div>
  );
}