import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { languageShortLabel, useLanguage } from "../lib/language";
import { localiseCopy } from "../lib/localiseCopy";
import { useSiteSettings, useVisitorSummary } from "../lib/siteSettings";
import { initAnalytics, logVisitOnce, trackPageView } from "../lib/analytics";
import SocialLinks from "../components/SocialLinks";
import VisitorCounter from "../components/VisitorCounter";

const NAV = [
  { to: "/about", en: "About", am: "ስለ እኛ" },
  { to: "/products", en: "Capabilities", am: "አቅሞች" },
  { to: "/#roadmap", en: "Roadmap", am: "መንገድ ካርታ" },
  { to: "/partners", en: "Partners", am: "አጋሮች" },
  { to: "/news", en: "News", am: "ዜና" },
  { to: "/documents", en: "Documents", am: "ሰነዶች" },
  { to: "/investors", en: "Investors", am: "ባለሀብቶች" },
];

const FOOTER = {
  en: {
    description:
      "A state-owned biopharmaceutical enterprise under Ethiopian Investment Holdings, building domestic manufacturing of vaccines, essential medicines, diagnostics and medical supplies.",
    explore: "Explore",
    resources: "Resources",
    contact: "Head office",
    address1: "Kilinto Special Economic Zone",
    address2: "Addis Ababa, Ethiopia",
    about: "About EBPE",
    capabilities: "Capabilities",
    roadmap: "2026–2035 roadmap",
    partners: "Partners",
    documents: "Document library",
    careers: "Careers",
    investors: "Investor relations",
    news: "Newsroom",
    staff: "Staff login",
    contactLink: "Contact us",
    backToTop: "Back to top",
    follow: "Follow us",
    rights: "All rights reserved.",
    bannerDismiss: "Dismiss welcome banner",
  },
  am: {
    description:
      "በኢትዮጵያ ኢንቨስትመንት ሀልዲንግስ ስር የሚሰራ የመንግስት የባዮፋርማሲዩቲካል ተቋም፤ ክትባቶችን፣ አስፈላጊ መድሃኒቶችን፣ የምርመራ መሳሪያዎችንና የህክምና ቁሳቁሶችን በሀገር ውስጥ ለማምረት ይገነባል።",
    explore: "ያስሱ",
    resources: "መረጃዎች",
    contact: "ዋና መስሪያ ቤት",
    address1: "ኪሊንቶ ልዩ ኢኮኖሚ ዞን",
    address2: "አዲስ አበባ፣ ኢትዮጵያ",
    about: "ስለ EBPE",
    capabilities: "አቅሞች",
    roadmap: "የ2026–2035 መንገድ ካርታ",
    partners: "አጋሮች",
    documents: "የሰነድ መዝገብ",
    careers: "የስራ ዕድሎች",
    investors: "የባለሀብት ግንኙነት",
    news: "ዜና ማዕከል",
    staff: "የሰራተኛ መግቢያ",
    contactLink: "ያግኙን",
    backToTop: "ወደ ላይ",
    follow: "ይከተሉን",
    rights: "መብቱ በህግ የተጠበቀ ነው።",
    bannerDismiss: "የእንኳን ደህና መጡ ማስታወቂያውን ዝጋ",
  },
};

const BANNER_DISMISSED_KEY = "ebpe_banner_dismissed";

export default function PublicLayout() {
  const { lang, setLang, t, tText, languages } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = useMemo(
    () => NAV.map((item) => ({ ...item, label: tText(item.en, item.am) })),
    [tText]
  );
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(BANNER_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const isHome = location.pathname === "/";
  const copy = useMemo(
    () => localiseCopy(FOOTER.en, FOOTER[lang] || FOOTER.en, tText),
    [lang, tText]
  );
  // The head-office address is maintained in Admin → Language Settings.
  const address1 = t("headOfficeAddress1", copy.address1);
  const address2 = t("headOfficeAddress2", copy.address2);
  const settings = useSiteSettings();
  const visitorSummary = useVisitorSummary(Boolean(settings?.visitors?.display));

  const banner = settings?.banner;
  const showBanner = Boolean(isHome && banner?.enabled && !bannerDismissed);
  const bannerMessage = lang === "am" ? banner?.messageAm || banner?.message : banner?.message;
  const bannerLinkLabel = lang === "am" ? banner?.linkLabelAm || banner?.linkLabel : banner?.linkLabel;
  const bannerLink = (banner?.linkUrl || "").trim();
  const bannerHeight = showBanner ? "44px" : "0px";
  const socialLinks = settings?.social?.enabled
    ? (settings.social.links || []).filter((link) => link && link.enabled !== false && (link.url || "").trim())
    : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    // Land on the top of each page unless the link targets a section.
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // GA4 bootstrap + one page_view per public route change.
  useEffect(() => {
    const measurementId = settings?.visitors?.measurementId;
    if (measurementId) initAnalytics(measurementId);
  }, [settings]);

  useEffect(() => {
    trackPageView(location.pathname);
    logVisitOnce();
  }, [location.pathname, settings]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      window.sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
    } catch {
      /* sessionStorage can be unavailable in private mode */
    }
  };

  const headerClass = [
    "site-header",
    isHome ? "is-over-hero" : "is-solid",
    scrolled ? "is-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`public-site${isHome ? " is-home" : ""}${showBanner ? " has-banner" : ""}`}
      style={{ "--banner-h": bannerHeight }}
    >
      <a className="skip-link" href="#main-content">
        {lang === "am" ? "ወደ ዋና ይዘት ዝለል" : "Skip to content"}
      </a>

      {showBanner && (
        <div className="welcome-banner" role="region" aria-label={bannerMessage || "Welcome"}>
          <div className="welcome-banner-inner">
            <span className="welcome-banner-mark" aria-hidden="true">
              EBPE
            </span>
            <p className="welcome-banner-text">{bannerMessage}</p>
            {bannerLink && bannerLinkLabel ? (
              bannerLink.startsWith("http") ? (
                <a className="welcome-banner-link" href={bannerLink} target="_blank" rel="noopener noreferrer">
                  {bannerLinkLabel}
                </a>
              ) : (
                <Link className="welcome-banner-link" to={bannerLink}>
                  {bannerLinkLabel}
                </Link>
              )
            ) : null}
            <button
              type="button"
              className="welcome-banner-close"
              aria-label={copy.bannerDismiss}
              title={copy.bannerDismiss}
              onClick={dismissBanner}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <header className={headerClass}>
        <div className="site-header-inner">
          <Link className="brand" to="/" aria-label="Ethio-Biopharma Enterprise — home">
            <span className="brand-mark" aria-hidden="true">
              EB
            </span>
            <span className="brand-text">
              <strong>Ethio-Biopharma</strong>
              <small>Enterprise</small>
            </span>
          </Link>

          <nav id="site-nav" className={`site-nav${menuOpen ? " is-open" : ""}`} aria-label="Primary">
            {navItems.map((item) =>
              item.to.includes("#") ? (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ) : (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              )
            )}
            <span className="nav-login-mobile">
              <Link to="/login">{copy.staff}</Link>
            </span>
          </nav>

          <div className="header-actions">
            <div className="lang-switch" role="group" aria-label="Language">
              {(languages?.length ? languages : [{ code: "en", name: "English" }, { code: "am", name: "Amharic", nativeName: "አማርኛ" }]).map(
                (language) => (
                  <button
                    key={language.code}
                    type="button"
                    aria-pressed={lang === language.code}
                    title={language.nativeName || language.name}
                    onClick={() => setLang(language.code)}
                  >
                    {languageShortLabel(language)}
                  </button>
                )
              )}
            </div>
            <Link className="btn-login" to="/login">
              {copy.staff}
            </Link>
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="site-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      {settings?.visitors?.display && visitorSummary ? (
        <VisitorCounter summary={visitorSummary} lang={lang} />
      ) : null}

      <footer className="site-footer">
        <div className="container-wide">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-brand">
                <span className="brand-mark" aria-hidden="true">
                  EB
                </span>
                <strong>Ethio-Biopharma Enterprise</strong>
              </div>
              <p>{copy.description}</p>
            </div>

            <div className="footer-col">
              <h2>{copy.explore}</h2>
              <ul>
                <li>
                  <Link to="/about">{copy.about}</Link>
                </li>
                <li>
                  <Link to="/products">{copy.capabilities}</Link>
                </li>
                <li>
                  <Link to="/#roadmap">{copy.roadmap}</Link>
                </li>
                <li>
                  <Link to="/partners">{copy.partners}</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h2>{copy.resources}</h2>
              <ul>
                <li>
                  <Link to="/careers">{copy.careers}</Link>
                </li>
                <li>
                  <Link to="/documents">{copy.documents}</Link>
                </li>
                <li>
                  <Link to="/investors">{copy.investors}</Link>
                </li>
                <li>
                  <Link to="/news">{copy.news}</Link>
                </li>
                <li>
                  <Link to="/login">{copy.staff}</Link>
                </li>
                <li>
                  <a href="#main-content">{copy.backToTop} ↑</a>
                </li>
              </ul>
            </div>

            <div className="footer-col footer-contact">
              <h2>{copy.contact}</h2>
              <address>
                {address1}
                <br />
                {address2}
              </address>
              <Link className="footer-contact-link" to="/contact">
                {copy.contactLink} →
              </Link>
              {socialLinks.length ? (
                <div className="footer-social">
                  <p className="footer-social-label">{copy.follow}</p>
                  <SocialLinks links={socialLinks} />
                </div>
              ) : null}
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              © {new Date().getFullYear()} Ethio-Biopharma Enterprise. {copy.rights}
            </p>
            <p className="footer-credit">
              Designed and developed by{" "}
              <a href="https://www.linkedin.com/in/dessalew-adane" target="_blank" rel="noreferrer">
                Dessalew Adane
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
