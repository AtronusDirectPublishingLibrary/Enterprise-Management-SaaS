import { NavLink, Outlet, Link } from "react-router-dom";
import { Building2, Globe, Menu, Search } from "lucide-react";
import { useLanguage } from "../lib/language";

export default function PublicLayout() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div style={{ background: "var(--brand-bg)", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark shadow-sm sticky-top py-3" style={{ background: "var(--brand-primary)", borderBottom: "3px solid var(--brand-secondary)" }}>
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold" to="/" style={{ color: "var(--brand-secondary)", fontSize: "1.25rem", letterSpacing: "1px" }}>
            <Building2 size={24} /> {t("brandName")}
          </Link>
          
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNav">
            <Menu size={24} />
          </button>
          
          <div className="collapse navbar-collapse" id="publicNav">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3 align-items-center">
              
              {/* Nav Links */}
              {["about", "products", "news", "partners", "investors", "documents", "contact"].map((key) => (
                <li className="nav-item" key={key}>
                  <NavLink 
                    to={`/${key}`} 
                    className="nav-link fw-semibold px-2 py-1 rounded"
                    style={({ isActive }) => ({
                      color: isActive ? "var(--brand-dark)" : "rgba(255,255,255,0.85)",
                      background: isActive ? "var(--brand-secondary)" : "transparent",
                      fontWeight: isActive ? 700 : 500,
                      transition: "all 0.2s"
                    })}
                  >
                    {t(key).charAt(0).toUpperCase() + t(key).slice(1)}
                  </NavLink>
                </li>
              ))}

              {/* Language Toggle & Search */}
              <li className="nav-item ms-2 d-flex align-items-center gap-2 text-white border-start border-secondary ps-3">
                <Globe size={16} />
                <span className={lang === 'en' ? "fw-bold text-white" : "opacity-50 text-white"} style={{ cursor: "pointer" }} onClick={() => setLang('en')}>EN</span>
                <span className="opacity-50">|</span>
                <span className={lang === 'am' ? "fw-bold text-white" : "opacity-50 text-white"} style={{ cursor: "pointer" }} onClick={() => setLang('am')}>አማ</span>
                <Search size={18} className="ms-2" style={{ cursor: "pointer" }} />
              </li>

              {/* Staff Login */}
              <li className="nav-item ms-2">
                <Link to="/login" className="btn btn-sm fw-bold px-3 py-2" style={{ background: "var(--brand-secondary)", color: "var(--brand-dark)", border: "none" }}>
                  {t("staffLogin")}
                </Link>
              </li>

            </ul>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-grow-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-dark text-light py-5 mt-auto">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-5">
              <h5 className="fw-bold mb-3" style={{ color: "var(--brand-secondary)" }}>{t("brandName")}</h5>
              <p className="small opacity-75">{t("footerDesc")}</p>
            </div>
            <div className="col-md-4">
              <h6 className="fw-bold mb-3">{t("quickLinks")}</h6>
              <ul className="list-unstyled small opacity-75 d-flex flex-column gap-2">
                <li><Link to="/about" className="text-light text-decoration-none">{t("aboutUs")}</Link></li>
                <li><Link to="/products" className="text-light text-decoration-none">{t("productsCapabilities")}</Link></li>
                <li><Link to="/news" className="text-light text-decoration-none">{t("newsAnnouncements")}</Link></li>
              </ul>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold mb-3">{t("headOffice")}</h6>
              <p className="small opacity-75 mb-1">{t("headOfficeAddress1")}</p>
              <p className="small opacity-75">{t("headOfficeAddress2")}</p>
            </div>
          </div>
          <div className="border-top border-secondary mt-4 pt-3 text-center small opacity-75">
            © 2026 {t("brandName")}. {t("footerRights")}
          </div>
        </div>
      </footer>
    </div>
  );
}