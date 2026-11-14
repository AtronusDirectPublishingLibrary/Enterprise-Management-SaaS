import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Zap,
  LayoutGrid,
  Users,
  BarChart3,
  Globe2,
  BadgeCheck,
  Lock,
  Workflow,
  Layers,
  Sparkles,
  CheckCircle2,
  Factory,
  Stethoscope,
  Truck,
  GraduationCap,
  Landmark,
  Briefcase,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Context-aware setup",
    desc: "Modules, labels, approvals, and workflows adapt to your industry, size, and operating structure from day one.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade isolation",
    desc: "Every organization runs in a securely isolated tenant with scoped data, branding, roles, and permissions.",
  },
  {
    icon: Zap,
    title: "Fast, guided onboarding",
    desc: "Capture departments, defaults, and admin access in a streamlined flow and reach your dashboard in minutes.",
  },
  {
    icon: LayoutGrid,
    title: "Modular by design",
    desc: "Enable only what you need—PMS, HR, QMS, Fleet, Planning, Reports, and more—without clutter or complexity.",
  },
  {
    icon: Workflow,
    title: "Workflows that fit",
    desc: "Configurable approval depth, leave policies, fiscal settings, and language preferences aligned to how you work.",
  },
  {
    icon: BarChart3,
    title: "Insight-ready operations",
    desc: "Bring plans, people, quality, and resources into one system designed for visibility and accountable execution.",
  },
];

const modules = [
  "Project & Performance (PMS)",
  "Strategic & Annual Planning",
  "Human Resources & Payroll",
  "Quality Management (QMS)",
  "Fleet & Logistics",
  "Recruitment & Onboarding",
  "Consolidated Reporting",
  "Portfolios & Roadmaps",
];

const industries = [
  { icon: Factory, label: "Manufacturing & Biopharma" },
  { icon: Stethoscope, label: "Healthcare" },
  { icon: Truck, label: "Logistics & Fleet" },
  { icon: GraduationCap, label: "Education" },
  { icon: Landmark, label: "Government & NGOs" },
  { icon: Briefcase, label: "Professional Services" },
];

const steps = [
  {
    n: "01",
    title: "Define your organization",
    desc: "Set your identity, slug, industry, and scale so BEMS can tailor the right defaults.",
  },
  {
    n: "02",
    title: "Shape structure & modules",
    desc: "Choose departments, reporting levels, modules, and workflow policies that match reality.",
  },
  {
    n: "03",
    title: "Launch your workspace",
    desc: "Create your admin account, complete onboarding, and start operating securely.",
  },
];

const trust = [
  { icon: Lock, text: "Tenant-isolated data & settings" },
  { icon: BadgeCheck, text: "Role-based access control" },
  { icon: Layers, text: "Centralized, fail-closed enforcement" },
  { icon: Globe2, text: "Branded, context-aware portals" },
];

export default function RegisterLanding() {
  const loc = useLocation();
  const msg = loc.state?.message;

  return (
    <div className="min-vh-100" style={{ background: "var(--brand-bg, #F5F2EA)", color: "var(--brand-text, #1A1A1A)" }}>
      <style>{`
        .reg-hero {
          position: relative;
          overflow: hidden;
          background: radial-gradient(1200px 500px at 10% -10%, rgba(201,162,39,0.18), transparent 60%),
                      linear-gradient(135deg, #0B2545 0%, #0e2f57 45%, #081a30 100%);
          color: #fff;
        }
        .reg-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.25;
          pointer-events: none;
        }
        .reg-badge {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .35rem .75rem; border-radius: 999px;
          border: 1px solid rgba(201,162,39,.45);
          background: rgba(201,162,39,.12);
          color: #f3d98b; font-weight: 600; font-size: .85rem;
        }
        .reg-card {
          background: #fff; border: 1px solid rgba(11,37,69,.08);
          border-radius: 16px; height: 100%;
          box-shadow: 0 6px 24px rgba(11,37,69,.06);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .reg-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(11,37,69,.12); }
        .reg-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(11,37,69,.1), rgba(201,162,39,.18));
          color: #0B2545;
        }
        .reg-section-title { color: #0B2545; font-weight: 800; letter-spacing: -.02em; }
        .reg-kicker { color: #8a6a12; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; font-size: .78rem; }
        .reg-cta-primary {
          background: linear-gradient(135deg, #C9A227, #e0b93a); color: #081a30; border: none;
          font-weight: 700; border-radius: 999px; padding: .75rem 1.35rem;
        }
        .reg-cta-primary:hover { filter: brightness(1.03); color: #081a30; }
        .reg-cta-secondary { border-radius: 999px; padding: .75rem 1.25rem; font-weight: 600; }
        .reg-pill {
          border: 1px solid rgba(11,37,69,.12); background: #fff; color: #0B2545;
          border-radius: 999px; padding: .45rem .8rem; font-size: .9rem; font-weight: 500;
        }
        .reg-step-num {
          font-size: 2rem; font-weight: 800; line-height: 1;
          background: linear-gradient(135deg,#C9A227,#e8c766);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .reg-dark {
          background: linear-gradient(135deg, #0B2545 0%, #081a30 100%); color: #fff; border-radius: 24px;
        }
        .reg-trust-chip {
          display: inline-flex; align-items: center; gap: .5rem;
          padding: .55rem .8rem; border-radius: 12px;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
          color: #eaf0f8; font-size: .92rem;
        }
      `}</style>

      {/* HERO */}
      <section className="reg-hero">
        <div className="container position-relative" style={{ maxWidth: 1140, zIndex: 1, paddingTop: "5rem", paddingBottom: "4.5rem" }}>
          <div className="row align-items-center g-4">
            <div className="col-lg-7 fly-in">
              <div className="reg-badge mb-3">
                <Sparkles size={16} /> Beshilo Enterprise Management System (BEMS)
              </div>
              <h1 className="fw-bold mb-3" style={{ fontSize: "clamp(2.1rem, 4vw, 3.4rem)", lineHeight: 1.08, letterSpacing: "-.03em" }}>
                Run your enterprise on a platform built for <span style={{ color: "#e8c766" }}>clarity, control, and scale</span>
              </h1>
              <p className="lead mb-4" style={{ color: "rgba(255,255,255,.86)", maxWidth: 680 }}>
                BEMS brings planning, people, quality, fleet, and reporting into one secure, multi-tenant workspace—configured to your industry, structure, and workflows in minutes.
              </p>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
                <Link to="/register/start" className="btn reg-cta-primary d-inline-flex align-items-center gap-2">
                  Create your organization <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-outline-light reg-cta-secondary">
                  Sign in to existing organization
                </Link>
              </div>
              <div className="d-flex flex-wrap gap-3" style={{ color: "rgba(255,255,255,.8)", fontSize: ".95rem" }}>
                <span className="d-inline-flex align-items-center gap-2"><CheckCircle2 size={16} color="#e8c766" /> Guided setup</span>
                <span className="d-inline-flex align-items-center gap-2"><CheckCircle2 size={16} color="#e8c766" /> Modular & scalable</span>
                <span className="d-inline-flex align-items-center gap-2"><CheckCircle2 size={16} color="#e8c766" /> Isolated per tenant</span>
              </div>
              {msg ? <div className="alert alert-info mt-4 mb-0 py-2" style={{ maxWidth: 680 }}>{msg}</div> : null}
            </div>

            <div className="col-lg-5 fly-in">
              <div className="p-4 p-lg-4" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 20, backdropFilter: "blur(6px)" }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="fw-semibold">Your workspace, your way</div>
                  <span className="badge rounded-pill" style={{ background: "rgba(201,162,39,.22)", color: "#ffe9a8", border: "1px solid rgba(201,162,39,.35)" }}>BEMS</span>
                </div>
                <div className="d-grid gap-2">
                  {[
                    ["Industry-aware defaults", "Biopharma, manufacturing, healthcare, logistics & more"],
                    ["Structure & roles", "Departments, reporting levels, approval depth"],
                    ["Modules you control", "Enable PMS, HR, QMS, Fleet, Reports as needed"],
                    ["Secure by design", "Tenant isolation, RBAC, and scoped access"],
                  ].map(([t, d]) => (
                    <div key={t} className="p-3 rounded-3" style={{ background: "rgba(8,26,48,.45)", border: "1px solid rgba(255,255,255,.08)" }}>
                      <div className="fw-semibold mb-1 d-flex align-items-center gap-2"><CheckCircle2 size={16} color="#C9A227" /> {t}</div>
                      <div style={{ color: "rgba(255,255,255,.72)", fontSize: ".92rem" }}>{d}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.75)", fontSize: ".9rem" }}>
                  Trusted foundation: <strong style={{ color: "#fff" }}>Ethio-Biopharma</strong> operates as the first tenant on BEMS.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="py-4" style={{ background: "#0f2f57", color: "#fff" }}>
        <div className="container" style={{ maxWidth: 1140 }}>
          <div className="row g-2 align-items-center">
            <div className="col-lg-3 fw-semibold d-flex align-items-center gap-2" style={{ color: "#e8c766" }}>
              <ShieldCheck size={18} /> Built for secure operations
            </div>
            <div className="col-lg-9">
              <div className="d-flex flex-wrap gap-2">
                {trust.map(({ icon: Icon, text }) => (
                  <span key={text} className="reg-trust-chip"><Icon size={16} color="#C9A227" /> {text}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-5">
        <div className="container" style={{ maxWidth: 1140 }}>
          <div className="text-center mb-4 fly-in">
            <div className="reg-kicker mb-2">Why organizations choose BEMS</div>
            <h2 className="reg-section-title mb-2">A modern operating system for your enterprise</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: 720 }}>
              Replace scattered tools with one configurable platform that aligns strategy, execution, people, quality, and resources.
            </p>
          </div>
          <div className="row g-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div className="col-md-6 col-lg-4 fly-in" key={title}>
                <div className="reg-card p-4">
                  <div className="reg-icon mb-3"><Icon size={22} /></div>
                  <h5 className="fw-bold" style={{ color: "#0B2545" }}>{title}</h5>
                  <p className="text-muted mb-0">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES + INDUSTRIES */}
      <section className="py-5" style={{ background: "#fff" }}>
        <div className="container" style={{ maxWidth: 1140 }}>
          <div className="row g-4 align-items-start">
            <div className="col-lg-6 fly-in">
              <div className="reg-kicker mb-2">Modular platform</div>
              <h2 className="reg-section-title mb-3">Enable the capabilities you need</h2>
              <p className="text-muted mb-3">Pick modules during registration and evolve as you grow—each tenant gets the right experience with consistent access controls.</p>
              <div className="d-flex flex-wrap gap-2">
                {modules.map((m) => (
                  <span key={m} className="reg-pill d-inline-flex align-items-center gap-2"><CheckCircle2 size={15} color="#2e7d32" /> {m}</span>
                ))}
              </div>
            </div>
            <div className="col-lg-6 fly-in">
              <div className="reg-kicker mb-2">Built for diverse sectors</div>
              <h2 className="reg-section-title mb-3">Adapts to your industry context</h2>
              <p className="text-muted mb-3">Defaults, labels, and workflows are shaped around how your organization operates.</p>
              <div className="row g-2">
                {industries.map(({ icon: Icon, label }) => (
                  <div className="col-sm-6" key={label}>
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ border: "1px solid rgba(11,37,69,.1)", background: "var(--brand-bg, #F5F2EA)" }}>
                      <span className="reg-icon" style={{ width: 40, height: 40 }}><Icon size={18} /></span>
                      <span className="fw-semibold" style={{ color: "#0B2545" }}>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-5">
        <div className="container" style={{ maxWidth: 1140 }}>
          <div className="text-center mb-4 fly-in">
            <div className="reg-kicker mb-2">How it works</div>
            <h2 className="reg-section-title mb-2">From signup to operational in minutes</h2>
          </div>
          <div className="row g-3">
            {steps.map((s) => (
              <div className="col-md-4 fly-in" key={s.n}>
                <div className="reg-card p-4 h-100">
                  <div className="reg-step-num mb-2">{s.n}</div>
                  <h5 className="fw-bold" style={{ color: "#0B2545" }}>{s.title}</h5>
                  <p className="text-muted mb-0">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-5">
        <div className="container" style={{ maxWidth: 1140 }}>
          <div className="reg-dark p-4 p-lg-5 fly-in">
            <div className="row align-items-center g-4">
              <div className="col-lg-8">
                <div className="reg-badge mb-3" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.18)", color: "#fff" }}>
                  <Users size={16} /> Ready for your team
                </div>
                <h2 className="fw-bold mb-2">Create your BEMS organization today</h2>
                <p className="mb-0" style={{ color: "rgba(255,255,255,.8)", maxWidth: 720 }}>
                  Set up a secure, branded, and context-aware workspace for your enterprise. Start with the modules you need and scale with confidence.
                </p>
              </div>
              <div className="col-lg-4 text-lg-end">
                <div className="d-grid gap-2 d-sm-flex justify-content-lg-end">
                  <Link to="/register/start" className="btn reg-cta-primary d-inline-flex align-items-center justify-content-center gap-2">
                    Start registration <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" className="btn btn-outline-light reg-cta-secondary">Sign in</Link>
                </div>
                <div className="mt-2" style={{ color: "rgba(255,255,255,.65)", fontSize: ".85rem" }}>No clutter. No guesswork. Just a guided setup.</div>
              </div>
            </div>
          </div>
          <div className="text-center text-muted small mt-4">
            © {new Date().getFullYear()} Beshilo Enterprise Management System (BEMS). Multi-tenant platform; each organization’s data remains isolated.
          </div>
        </div>
      </section>
    </div>
  );
}
