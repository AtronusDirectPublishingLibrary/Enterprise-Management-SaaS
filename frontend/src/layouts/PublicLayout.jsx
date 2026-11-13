import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Download, Menu, QrCode, X } from "lucide-react";
import { API_BASE } from "../lib/api";
import { useLanguage } from "../lib/language";
import { localiseCopy } from "../lib/localiseCopy";
import { useSiteSettings, useVisitorSummary } from "../lib/siteSettings";
import { initAnalytics, logVisitOnce, trackPageView } from "../lib/analytics";
import SocialLinks from "../components/SocialLinks";
import VisitorCounter from "../components/VisitorCounter";
import BrandLogo from "../components/BrandLogo";
import LanguageMenu from "../components/LanguageMenu";

const NAV = [
  { to: "/", en: "Home", am: "መነሻ" },
  { to: "/about", en: "About", am: "ስለ እኛ" },
  { to: "/products", en: "Capabilities", am: "አቅሞች" },
  { to: "/#roadmap", en: "Roadmap", am: "መንገድ ካርታ" },
  { to: "/partners", en: "Partners", am: "አጋሮች" },
  { to: "/news", en: "News", am: "ዜና" },
  { to: "/documents", en: "Documents", am: "ሰነዶች" },
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
    home: "Home",
    news: "Newsroom",
    staff: "Staff login",
    contactLink: "Contact us",
    backToTop: "Back to top",
    follow: "Follow us",
    credit: "Designed and developed by",
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
    home: "መነሻ",
    news: "ዜና ማዕከል",
    staff: "የሰራተኛ መግቢያ",
    contactLink: "ያግኙን",
    backToTop: "ወደ ላይ",
    follow: "ይከተሉን",
    credit: "በዲዛይንና ግንባታ የተዘጋጀው በ",
    rights: "መብቱ በህግ የተጠበቀ ነው።",
    bannerDismiss: "የእንኳን ደህና መጡ ማስታወቂያውን ዝጋ",
  },
};

const BANNER_DISMISSED_KEY = "ebpe_banner_dismissed";

export default function PublicLayout() {
  const { lang, t, tText } = useLanguage();
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
        {tText("Skip to content", "ወደ ዋና ይዘት ዝለል")}
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
            <BrandLogo variant="header" />
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
            <LanguageMenu />
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
                <BrandLogo variant="footer" />
                <strong>Ethio-Biopharma Enterprise</strong>
              </div>
              <p>{copy.description}</p>
            </div>

            <div className="footer-col">
              <h2>{copy.explore}</h2>
              <ul>
                <li>
                  <Link to="/">{copy.home}</Link>
                </li>
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
              {settings?.contact?.email ? (
                <a className="footer-contact-link d-block" href={`mailto:${settings.contact.email}`}>
                  {settings.contact.email}
                </a>
              ) : null}
              {settings?.contact?.phone ? (
                <a className="footer-contact-link d-block" href={`tel:${settings.contact.phone}`}>
                  {settings.contact.phone}
                </a>
              ) : null}
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
          <div className="footer-qr" aria-label={tText("Scan or download our homepage QR code", "የመነሻ ገፃችንን QR ኮድ ይቃኙ ወይም ያውርዱ")}>
            <a className="footer-qr__frame" href="/" aria-label={tText("EBPE homepage", "የEBPE መነሻ ገፅ")}>
              <img src={`${API_BASE}/public/qr`} width="112" height="137" loading="lazy" alt={tText("QR code linking to the EBPE homepage", "ወደ EBPE መነሻ ገፅ የሚያገናኝ QR ኮድ")} />
            </a>
            <div className="footer-qr__copy">
              <span className="footer-qr__eyebrow"><QrCode size={13} /> {tText("Take EBPE with you", "EBPEን አንድዎት")}</span>
              <strong>{tText("Scan to visit our homepage", "ወደ መነሻ ገፃችን ለመግባት ይቃኙ")}</strong>
              <p>{tText("Point any phone camera at the code. The EBPE mark is built into the centre.", "የስልክ ካሜራዎን ኮዱ ላይ ያንጠቁ። የEBPE አርማ በመሃሉ ተካቷል።")}</p>
              <a className="footer-qr__download" href={`${API_BASE}/public/qr?download=1`} download="EBPE-homepage-qr.svg">
                <Download size={13} /> {tText("Download print-ready QR", "ለህትመት የተዘጋጀ QR ያውርዱ")}
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              © {new Date().getFullYear()} Ethio-Biopharma Enterprise. {copy.rights}
            </p>
            <p className="footer-credit">
              {tText("Designed and developed by", "በዲዛይንና ግንባታ የተዘጋጀው በ")}{" "}
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
