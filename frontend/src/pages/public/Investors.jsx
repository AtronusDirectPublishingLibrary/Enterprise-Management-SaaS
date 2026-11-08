import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";
export default function Investors() {
  const { t } = useLanguage();
  return (
    <div className="container py-5">
      <Helmet>
        <title>Investor Information | EBPE</title>
        <meta name="description" content="Financial reports, strategic direction, and investment opportunities with EBPE." />
      </Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("investorsPageTitle")}</h1>
      <p className="lead text-muted mb-5">Financial reports, strategic direction, and investment opportunities with EBPE.</p>
      
      <div className="card border-0 shadow-sm p-5">
        <h4 className="fw-bold mb-3">{t("investorsPageSubtitle")}</h4>
        <p className="text-muted">EBPE is at an active stage of institutional build-out, advancing towards domestic self-reliance in health security. We welcome engagement with prospective investors and development finance institutions.</p>
      </div>
    </div>
  );
}