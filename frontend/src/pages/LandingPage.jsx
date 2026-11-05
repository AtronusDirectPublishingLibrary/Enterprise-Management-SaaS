import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import { Helmet } from "react-helmet-async";
import { 
  ShieldCheck, Activity, Building2, TrendingUp, 
  Globe, Users, Target, ArrowRight, Pill, TestTube, Factory, MapPin
} from "lucide-react";

export default function LandingPage() {
  const [images, setImages] = useState([]);
  const [texts, setTexts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    Promise.all([
      api.get("/hero-images").catch(() => []),
      api.get("/hero-texts").catch(() => [])
    ]).then(([imgs, txts]) => {
      setImages(Array.isArray(imgs) ? imgs : []);
      setTexts(Array.isArray(txts) ? txts : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [images]);

  const products = [
    { icon: <Pill size={36} />, title: t("prod1Title"), desc: t("prod1Desc") },
    { icon: <ShieldCheck size={36} />, title: t("prod2Title"), desc: t("prod2Desc") },
    { icon: <TestTube size={36} />, title: t("prod3Title"), desc: t("prod3Desc") },
    { icon: <Activity size={36} />, title: t("prod4Title"), desc: t("prod4Desc") }
  ];

  const steps = [
    { num: "01", title: t("step1Title"), desc: t("step1Desc") },
    { num: "02", title: t("step2Title"), desc: t("step2Desc") },
    { num: "03", title: t("step3Title"), desc: t("step3Desc") },
    { num: "04", title: t("step4Title"), desc: t("step4Desc") }
  ];

  return (
    <div style={{ background: "var(--brand-bg)", minHeight: "100vh", overflowX: "hidden" }}>
      <Helmet>
        <title>Ethio-Biopharma Enterprise | National Health Security</title>
        <meta name="description" content="A strategic state-owned enterprise building local manufacturing of human vaccines and pharmaceuticals." />
      </Helmet>

      {/* â”€â”€â”€ ANIMATED HERO â”€â”€â”€ */}
      <div style={{ position: "relative", height: "90vh", minHeight: "700px", overflow: "hidden", background: "#000" }}>
        {loaded && images.map((img, idx) => (
          <div key={img.id} style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url(${img.url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: idx === currentIndex ? 1 : 0,
            transform: idx === currentIndex ? "scale(1)" : "scale(1.05)",
            transition: "opacity 2s ease-in-out, transform 8s linear", zIndex: 1
          }} />
        ))}

        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(135deg, rgba(15,46,27,0.95) 0%, rgba(15,46,27,0.7) 40%, rgba(0,0,0,0.3) 100%)",
          zIndex: 2
        }} />

        <div className="container position-relative h-100 d-flex align-items-center" style={{ zIndex: 3 }}>
          <div className="col-lg-10 col-xl-9">
            <div style={{ animation: "slideUp 1s ease-out" }}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: "rgba(212,175,55,0.2)", color: "var(--brand-secondary)", border: "1px solid var(--brand-secondary)" }}>
                  <MapPin size={14} className="me-1" /> {t("heroTagline")}
                </span>
              </div>
              <h1 className="display-3 fw-bold mb-4" style={{ color: "white", lineHeight: 1.1, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                {t("heroTitle1")}
              </h1>
              <p className="lead mb-5" style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.25rem", maxWidth: "800px", lineHeight: 1.6 }}>
                {t("heroSub1")}
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/about" className="btn btn-lg btn-brand fw-bold px-5 py-3 d-flex align-items-center gap-2 shadow-lg" style={{ border: "2px solid var(--brand-secondary)", transition: "all 0.3s" }}>
                  {t("discoverMandate")} <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ STATS COUNTER (CSS Grid) â”€â”€â”€ */}
      <div className="container" style={{ marginTop: "-60px", position: "relative", zIndex: 10 }}>
        <div className="row g-4">
          {[
            { val: t("stat1Val"), label: t("stat1Label") },
            { val: t("stat2Val"), label: t("stat2Label") },
            { val: t("stat3Val"), label: t("stat3Label") }
          ].map((stat, i) => (
            <div className="col-md-4" key={i}>
              <div className="card border-0 shadow-lg text-center p-4 card-hover" style={{ borderRadius: "16px", borderTop: "4px solid var(--brand-secondary)" }}>
                <h1 className="fw-bold mb-2" style={{ color: "var(--brand-primary)", fontSize: "3rem" }}>{stat.val}</h1>
                <p className="text-muted fw-semibold mb-0">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* â”€â”€â”€ WHAT WE DO â”€â”€â”€ */}
      <div className="container py-5 mt-5">
        <div className="text-center mb-5">
          <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>{t("whatWeDoTitle")}</h6>
          <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)", fontSize: "2.8rem" }}>{t("whatWeDoTitle")}</h2>
          <p className="text-muted mx-auto" style={{ maxWidth: "700px", fontSize: "1.1rem" }}>{t("whatWeDoDesc")}</p>
        </div>

        <div className="row g-4">
          {products.map((item, i) => (
            <div className="col-md-6 col-lg-3" key={i}>
              <div className="card h-100 border-0 shadow-sm p-4 card-hover" style={{ transition: "all 0.3s", borderRadius: "16px" }}>
                <div className="rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64, background: "rgba(30,86,49,0.1)", color: "var(--brand-primary)" }}>
                  {item.icon}
                </div>
                <h5 className="fw-bold mb-2" style={{ color: "var(--brand-primary)" }}>{item.title}</h5>
                <p className="text-muted small mb-0">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* â”€â”€â”€ HOW WE WORK â”€â”€â”€ */}
      <div style={{ background: "var(--brand-primary)", color: "white" }} className="py-5 mt-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>{t("howWeWorkTitle")}</h6>
            <h2 className="fw-bold mb-3" style={{ color: "white", fontSize: "2.8rem" }}>{t("howWeWorkTitle")}</h2>
          </div>
          <div className="row g-4">
            {steps.map((step, i) => (
              <div className="col-md-6 col-lg-3" key={i}>
                <div className="p-4 h-100 rounded step-card" style={{ background: "rgba(255,255,255,0.05)", borderLeft: "3px solid var(--brand-secondary)", transition: "all 0.3s" }}>
                  <h1 className="fw-bold mb-3" style={{ color: "var(--brand-secondary)", fontSize: "3rem", opacity: 0.5 }}>{step.num}</h1>
                  <h5 className="fw-bold mb-2">{step.title}</h5>
                  <p className="small" style={{ color: "rgba(255,255,255,0.7)" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ ABOUT â”€â”€â”€ */}
      <div className="container py-5 my-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6 order-lg-2">
            <div className="rounded shadow-lg" style={{ 
              height: "450px", 
              backgroundImage: "url(https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop)",
              backgroundSize: "cover", backgroundPosition: "center",
              border: "8px solid white"
            }} />
          </div>
          <div className="col-lg-6 order-lg-1">
            <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>{t("aboutUs")}</h6>
            <h2 className="fw-bold mb-4" style={{ color: "var(--brand-primary)", fontSize: "2.8rem" }}>{t("aboutTitle")}</h2>
            <p className="lead text-muted mb-4" style={{ fontSize: "1.1rem", lineHeight: 1.8 }}>{t("aboutDesc")}</p>
            <div className="d-flex gap-3">
              <Link to="/about" className="btn-brand px-4 py-2 fw-bold">{t("aboutUs")}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ CSS ANIMATIONS â”€â”€â”€ */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
        }
        .step-card:hover {
          background: rgba(255,255,255,0.1) !important;
          transform: translateX(8px);
        }
      `}</style>
    </div>
  );
}