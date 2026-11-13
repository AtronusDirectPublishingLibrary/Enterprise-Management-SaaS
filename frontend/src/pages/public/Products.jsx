import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";
import { Shield, Activity, TestTube, Pill } from "lucide-react";

export default function Products() {
  const { t } = useLanguage();
  const items = [
    { icon: <Shield size={32} />, title: t("pillar1Title"), desc: t("pillar1Desc") },
    { icon: <Pill size={32} />, title: t("pillar2Title"), desc: t("pillar2Desc") },
    { icon: <TestTube size={32} />, title: t("pillar3Title"), desc: t("pillar3Desc") },
    { icon: <Activity size={32} />, title: t("heroTitle1"), desc: t("heroSub1") }
  ];

  return (
    <div className="container py-5">
      <Helmet><title>{t("products")} | EBPE</title></Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("products")}</h1>
      <div className="row g-4">
        {items.map((item, i) => (
          <div className="col-md-6" key={i}>
            <div className="card h-100 border-0 shadow-sm p-4 d-flex flex-row align-items-center gap-4">
              <div className="" style={{ color: "var(--brand-primary)" }}>{item.icon}</div>
              <div>
                <h5 className="fw-bold mb-1">{item.title}</h5>
                <p className="text-muted small mb-0">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}