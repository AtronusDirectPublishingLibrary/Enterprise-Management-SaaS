import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";

export default function About() {
  const { t } = useLanguage();
  return (
    <div className="container py-5">
      <Helmet><title>{t("about")} | EBPE</title></Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("about")}</h1>
      <p className="lead text-muted mb-5">{t("brandName")}</p>
      
      <div className="row g-4 mb-5">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100 p-4">
            <h3 className="fw-bold text-success">{t("pillar1Title")}</h3>
            <p>{t("pillar1Desc")}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100 p-4">
            <h3 className="fw-bold text-success">{t("heroTitle1")}</h3>
            <p>{t("heroSub1")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}