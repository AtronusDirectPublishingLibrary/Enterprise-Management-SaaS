import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import AnimatedNumber from "../components/AnimatedNumber";
import { Helmet } from "react-helmet-async";
import { 
  ShieldCheck, Activity, Building2, TrendingUp, 
  Globe, Users, Target, ArrowRight, Pill, TestTube, Factory, MapPin
} from "lucide-react";

function formatStatValue(kpi) {
  const target = kpi?.target;
  if (target == null) return "—";
  const unit = (kpi.unit || "").toLowerCase();
  if (unit.includes("usd")) return `USD ${target}M`;
  if (unit.includes("million")) return `${target}M`;
  if (unit.includes("%")) return `${target}%`;
  if (unit.includes("staff") || unit.includes("job")) return `${target}+`;
  return `${target}${unit ? ` ${kpi.unit}` : ""}`;
}

const HERO_COPY = {
  title: "Building National Health Security",
  subtitle:
    "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.",
  tagline: "Addis Ababa, Ethiopia",
  cta: "Discover Our Mandate",
};

const PLAN_LABELS = {
  en: {
    eyebrow: "Corporate plans",
    title: "Current plans, targets and KPIs",
    subtitle:
      "Live delivery against our annual operational plan, strategic plan and roadmap - with the major targets and performance indicators of the current period.",
    completion: "Delivery completion",
    targets: "Major targets",
    kpis: "Key performance indicators",
    types: { STRATEGIC: "Strategic Plan", AOP: "Annual Plan", ROADMAP: "Roadmap" },
  },
  am: {
    eyebrow: "የድርጅት ዕቅዶች",
    title: "የአሁኑ ዕቅዶች፣ ግቦችና የአፈጻጸም መለኪያዎች",
    subtitle:
      "በዓመታዊ የተግባር ዕቅድ፣ በስትራቴጂካዊ ዕቅድና በመንገድ ካርታ ላይ ያለው የአፈጻጸም ሁኔታ ከዋና ግቦችና መለኪያዎች ጋር።",
    completion: "የአፈጻጸም መጠን",
    targets: "ዋና ግቦች",
    kpis: "የአፈጻጸም መለኪያዎች",
    types: { STRATEGIC: "ስትራቴጂካዊ ዕቅድ", AOP: "ዓመታዊ ዕቅድ", ROADMAP: "የመንገድ ካርታ" },
  },
};

export default function LandingPage() {
  const [images, setImages] = useState([]);
  const [texts, setTexts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [plans, setPlans] = useState([]);
  const { t, lang } = useLanguage();
  const planLabels = PLAN_LABELS[lang] || PLAN_LABELS.en;
  // Use the admin-managed translation when it exists, otherwise show real copy
  // instead of the raw translation key.
  const copy = (key, fallback) => {
    const value = t(key);
    return !value || value === key ? fallback : value;
  };

  useEffect(() => {
    const loadPlans = () => {
      api
        .get("/plans/public")
        .then((data) => {
          const sorted = Array.isArray(data) ? [...data].sort((a, b) => {
            const order = { "AOP": 1, "STRATEGIC": 2, "ROADMAP": 3 };
            return (order[a.type] || 99) - (order[b.type] || 99);
          }) : [];
          setPlans(sorted);
        })
        .catch(() => setPlans([]));
    };
    loadPlans();
    // Keep the headline figures in step with plan edits made in the admin panel.
    window.addEventListener("focus", loadPlans);
    return () => window.removeEventListener("focus", loadPlans);
  }, []);

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

  const slideList = texts.length
    ? texts.map((text, index) => ({
        id: text.id,
        title: text.title,
        subtitle: text.subtitle || copy("heroSub1", HERO_COPY.subtitle),
        tagline: text.tagline || copy("heroTagline", HERO_COPY.tagline),
        ctaLabel: text.ctaLabel || copy("discoverMandate", HERO_COPY.cta),
        ctaUrl: text.ctaUrl || "/about",
        image: text.imageUrl || images[index % Math.max(images.length, 1)]?.url || null,
      }))
    : images.map((image, index) => ({
        id: image.id,
        title: copy("heroTitle1", HERO_COPY.title),
        subtitle: copy("heroSub1", HERO_COPY.subtitle),
        tagline: copy("heroTagline", HERO_COPY.tagline),
        ctaLabel: copy("discoverMandate", HERO_COPY.cta),
        ctaUrl: "/about",
        image: image.url,
      }));

  if (slideList.length === 0) {
    slideList.push({
      id: "hero-default",
      title: copy("heroTitle1", HERO_COPY.title),
      subtitle: copy("heroSub1", HERO_COPY.subtitle),
      tagline: copy("heroTagline", HERO_COPY.tagline),
      ctaLabel: copy("discoverMandate", HERO_COPY.cta),
      ctaUrl: "/about",
      image: null,
    });
  }

  const activeIndex = currentIndex % slideList.length;
  const activeSlide = slideList[activeIndex];

  // Headline stats come from the current strategic plan's featured targets.
  const strategicPlan = plans.find((plan) => plan.type === "STRATEGIC");
  const planStats = (strategicPlan?.kpis || []).slice(0, 3).map((kpi) => ({
    val: formatStatValue(kpi),
    label: kpi.title,
  }));
  const stats =
    planStats.length === 3
      ? planStats
      : [
          { val: "16M", label: t("Vaccine doses per year by 2030") },
          { val: "USD 207M", label: t("Blended financing for the campus") },
          { val: "400+", label: t("Direct jobs created by 2030") },
        ];

  useEffect(() => {
    if (slideList.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideList.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [slideList.length]);

  const products = [
    {
      icon: <Pill size={36} />,
      title: copy("prod1Title", "Generic Medicines"),
      desc: copy(
        "prod1Desc",
        "Tablets, capsules, oral liquids and injectables for high-demand essential medicines, manufactured to WHO-GMP standards to substitute imports."
      ),
    },
    {
      icon: <ShieldCheck size={36} />,
      title: copy("prod2Title", "Human Vaccines"),
      desc: copy(
        "prod2Desc",
        "ShieldVax fill-finish and formulation capacity at Kilinto, targeting 16 million vaccine doses a year by 2030."
      ),
    },
    {
      icon: <TestTube size={36} />,
      title: copy("prod3Title", "Diagnostics"),
      desc: copy(
        "prod3Desc",
        "Rapid diagnostic tests for HIV, hepatitis, syphilis and typhoid, together with laboratory and quality-control support."
      ),
    },
    {
      icon: <Activity size={36} />,
      title: copy("prod4Title", "PPE & Medical Supplies"),
      desc: copy(
        "prod4Desc",
        "Auto-disable and reuse-prevention syringes plus medical consumables that close critical gaps in Ethiopia's health system."
      ),
    },
  ];

  const steps = [
    {
      num: "01",
      title: copy("step1Title", "Secure blended finance"),
      desc: copy(
        "step1Desc",
        "Mobilize USD 207M+ through equity, concessional loans and development partners, with quick-win units cross-subsidizing the vaccine facility."
      ),
    },
    {
      num: "02",
      title: copy("step2Title", "Build and commission"),
      desc: copy(
        "step2Desc",
        "Construct, validate and commission the Kilinto campus, starting with the Medicines and Diagnostics units that generate early revenue."
      ),
    },
    {
      num: "03",
      title: copy("step3Title", "Transfer technology and certify people"),
      desc: copy(
        "step3Desc",
        "Partner-led technology transfer, EBPE Academy training and a WHO-GMP quality management system build lasting local capability."
      ),
    },
    {
      num: "04",
      title: copy("step4Title", "Manufacture and supply"),
      desc: copy(
        "step4Desc",
        "Register products with EFDA, serve EPSS and regional markets, and reinvest profits into vaccine sovereignty and R&D."
      ),
    },
  ];

  return (
    <div style={{ background: "var(--brand-bg)", minHeight: "100vh", overflowX: "hidden" }}>
      <Helmet>
        <title>Ethio-Biopharma | National Health Security</title>
        <meta name="description" content="A strategic state-owned enterprise building local manufacturing of human vaccines and pharmaceuticals." />
      </Helmet>

      {/* â”€â”€â”€ ANIMATED HERO â”€â”€â”€ */}
      <div style={{ position: "relative", height: "90vh", minHeight: "700px", overflow: "hidden", background: "#000" }}>
        {loaded && slideList.map((slide, idx) => (
          <div key={slide.id} style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: slide.image ? `url(${slide.image})` : undefined,
            backgroundColor: "#3cb4e5",
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: idx === activeIndex ? 1 : 0,
            transform: idx === activeIndex ? "scale(1)" : "scale(1.05)",
            transition: "opacity 2s ease-in-out, transform 8s linear", zIndex: 1
          }} />
        ))}

        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(135deg, rgba(60,180,229,0.45) 0%, rgba(11,37,69,0.85) 40%, rgba(0,0,0,0.3) 100%)",
          zIndex: 2
        }} />

        <div className="container position-relative h-100 d-flex align-items-center" style={{ zIndex: 3 }}>
          <div className="col-lg-10 col-xl-9">
            <div key={activeSlide.id} style={{ animation: "heroTextIn 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}>
              {activeSlide.tagline && (
                <div className="d-flex align-items-center gap-3 mb-4">
                  <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: "rgba(212,175,55,0.2)", color: "var(--brand-secondary)", border: "1px solid var(--brand-secondary)" }}>
                    <MapPin size={14} className="me-1" /> {t(activeSlide.tagline)}
                  </span>
                </div>
              )}
              <h1 className="display-3 fw-bold mb-4" style={{ color: "white", lineHeight: 1.1, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                {t(activeSlide.title)}
              </h1>
              {activeSlide.subtitle && (
                <p className="lead mb-5" style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.25rem", maxWidth: "800px", lineHeight: 1.6 }}>
                  {t(activeSlide.subtitle)}
                </p>
              )}
              {activeSlide.ctaLabel && (
                <div className="d-flex flex-wrap gap-3">
                  {/^https?:\/\//i.test(activeSlide.ctaUrl) ? (
                    <a href={activeSlide.ctaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-brand fw-bold px-5 py-3 d-flex align-items-center gap-2 shadow-lg" style={{ border: "2px solid var(--brand-secondary)" }}>
                      {t(activeSlide.ctaLabel)} <ArrowRight size={20} />
                    </a>
                  ) : (
                    <Link to={activeSlide.ctaUrl} className="btn btn-lg btn-brand fw-bold px-5 py-3 d-flex align-items-center gap-2 shadow-lg" style={{ border: "2px solid var(--brand-secondary)", transition: "all 0.3s" }}>
                      {t(activeSlide.ctaLabel)} <ArrowRight size={20} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {slideList.length > 1 && (
          <div className="d-flex justify-content-center gap-2" style={{ position: "absolute", left: 0, right: 0, bottom: 26, zIndex: 4 }}>
            {slideList.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Show slide ${index + 1}`}
                style={{
                  width: index === activeIndex ? 28 : 9,
                  height: 9,
                  padding: 0,
                  border: 0,
                  borderRadius: 999,
                  background: index === activeIndex ? "var(--brand-secondary)" : "rgba(255,255,255,0.55)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── STATS COUNTER ─── */}
      <div className="container" style={{ marginTop: "-60px", position: "relative", zIndex: 10 }}>
        <div className="row g-4">
          {stats.map((stat, i) => (
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
          <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>{copy("whatWeDoTitle", "What We Do")}</h6>
          <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)", fontSize: "2.8rem" }}>{copy("whatWeDoTitle", "What We Do")}</h2>
          <p className="text-muted mx-auto" style={{ maxWidth: "700px", fontSize: "1.1rem" }}>{copy("whatWeDoDesc", "Full-spectrum biopharmaceutical manufacturing for national health security: essential medicines, vaccines, diagnostics and medical supplies made in Ethiopia.")}</p>
        </div>

        <div className="row g-4">
          {products.map((item, i) => (
            <div className="col-md-6 col-lg-3" key={i}>
              <div className="card h-100 border-0 shadow-sm p-4 card-hover" style={{ transition: "all 0.3s", borderRadius: "16px" }}>
                <div className="rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64, background: "rgba(30,86,49,0.1)", color: "var(--brand-primary)" }}>
                  {item.icon}
                </div>
                <h5 className="fw-bold mb-2" style={{ color: "var(--brand-primary)" }}>{t(item.title)}</h5>
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
            <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>{copy("howWeWorkTitle", "How We Work")}</h6>
            <h2 className="fw-bold mb-3" style={{ color: "white", fontSize: "2.8rem" }}>{copy("howWeWorkTitle", "How We Work")}</h2>
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

      {/* ─── CURRENT PLANS, TARGETS & KPIs ─── */}
      {plans.length > 0 && (
        <div style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
          <div className="container py-5">
            <div className="text-center mb-5">
              <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>
                {t(planLabels.eyebrow)}
              </h6>
              <h2 className="fw-bold mb-3" style={{ color: "var(--brand-primary)", fontSize: "2.8rem" }}>
                {t(planLabels.title)}
              </h2>
              <p className="text-muted mx-auto" style={{ maxWidth: "720px", fontSize: "1.1rem" }}>
                {t(planLabels.subtitle)}
              </p>
            </div>

            <div className="row g-4">
              {plans.map((plan) => (
                <div className="col-lg-4" key={plan.id}>
                  <div className="card border-0 shadow-sm h-100 card-hover" style={{ transition: "transform .3s ease, box-shadow .3s ease", borderTop: "4px solid var(--brand-secondary)" }}>
                    <div className="card-body p-4 d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge rounded-pill" style={{ background: "rgba(15,46,27,0.08)", color: "var(--brand-primary)" }}>
                          {planLabels.types[plan.type] || plan.type}
                        </span>
                        <span className="small text-muted fw-semibold">{plan.periodLabel}</span>
                      </div>
                      <h5 className="fw-bold mb-2" style={{ color: "var(--brand-primary)" }}>{t(plan.title)}</h5>

                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">{t(planLabels.completion)}</span>
                        <span className="fw-bold" style={{ color: "var(--brand-primary)" }}>{Math.round(plan.completion || 0)}%</span>
                      </div>
                      <div className="progress mb-3" style={{ height: 6 }}>
                        <div className="progress-bar" style={{ width: `${Math.min(100, plan.completion || 0)}%`, background: "var(--brand-primary)" }} />
                      </div>

                      {plan.priorities?.length > 0 && (
                        <>
                          <div className="text-uppercase small fw-bold text-muted mb-2" style={{ letterSpacing: 1 }}>{t(planLabels.targets)}</div>
                          <ul className="list-unstyled small mb-3">
                            {plan.priorities.map((priority) => (
                              <li className="d-flex align-items-start gap-2 mb-2" key={priority.id}>
                                <Target size={13} className="mt-1 flex-shrink-0" style={{ color: "var(--brand-secondary)" }} />
                                <span className="flex-grow-1">{priority.title}</span>
                                <span className="text-muted text-nowrap">{Math.round(priority.progress || 0)}%</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {plan.kpis?.length > 0 && (
                        <div className="mt-auto">
                          <div className="text-uppercase small fw-bold text-muted mb-2" style={{ letterSpacing: 1 }}>{t(planLabels.kpis)}</div>
                          {plan.kpis.slice(0, 3).map((kpi) => (
                            <div className="mb-3" key={kpi.id}>
                              <div className="d-flex justify-content-between small">
                                <span className="text-truncate me-2">{kpi.title}</span>
                                <span className="fw-semibold text-nowrap">
                                  {kpi.actual ?? "—"} / {kpi.target ?? "—"} {kpi.unit || ""}
                                </span>
                              </div>
                              <div className="progress mt-1" style={{ height: 5 }}>
                                <div className="progress-bar" style={{ width: `${Math.min(100, kpi.progress || 0)}%`, background: "var(--brand-secondary)" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ABOUT ─── */}
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
            <h6 className="text-uppercase fw-bold mb-3" style={{ color: "var(--brand-secondary)", letterSpacing: "3px" }}>{copy("aboutUs", "About Us")}</h6>
            <h2 className="fw-bold mb-4" style={{ color: "var(--brand-primary)", fontSize: "2.8rem" }}>{copy("aboutTitle", "Ethiopia's platform for health sovereignty")}</h2>
            <p className="lead text-muted mb-4" style={{ fontSize: "1.1rem", lineHeight: 1.8 }}>{copy("aboutDesc", "Ethio-Biopharma was established by Council of Ministers Regulation No. 536/2023 under Ethiopian Investment Holdings. From the Kilinto industrial park we are building an integrated biopharmaceutical campus that manufactures vaccines, essential medicines and diagnostics for Ethiopia and the region.")}</p>
            <div className="d-flex gap-3">
              <Link to="/about" className="btn-brand px-4 py-2 fw-bold">{copy("aboutUs", "About Us")}</Link>
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
        @keyframes heroTextIn {
          from { opacity: 0; transform: translateY(24px); }
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