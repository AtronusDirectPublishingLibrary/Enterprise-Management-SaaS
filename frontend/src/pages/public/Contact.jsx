import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";
import { useSiteSettings } from "../../lib/siteSettings";
export default function Contact() {
  const { t, tText } = useLanguage();
  const settings = useSiteSettings();
  const contactEmail = settings?.contact?.email || "ebpe@ethiobiopharma.et";
  const contactPhone = settings?.contact?.phone || "";
  return (
    <div className="container py-5">
      <Helmet>
        <title>Contact Us | EBPE</title>
        <meta name="description" content="Get in touch with EBPE for general, partnership, or media inquiries." />
      </Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("contactPageTitle")}</h1>
      <p className="lead text-muted mb-5">{tText("Get in touch with EBPE for general, partnership, or media inquiries.", "ለአጠቃላይ፣ ለአጋርነት ወይም ለሚዲያ ጥያቄዎች ከEBPE ጋር ይገናኙ።")}</p>
      
      <div className="row g-4">
        <div className="col-md-5">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-3">{tText("Head Office", "ዋና መስሪያ ቤት")}</h5>
            <p className="mb-1">{tText("Kazanchis, Bete Berhan Building, 5th floor", "ካዛንቺስ፣ ቤተ ብርሃን ሕንፃ፣ 5ኛ ፎቅ")}</p>
            <p className="mb-1">{tText("Addis Ababa, Ethiopia", "አዲስ አበባ፣ ኢትዮጵያ")}</p>
            <p className="mt-3 mb-1">
              <strong>{tText("Email:", "ኢሜይል፦")}</strong>{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
            {contactPhone ? (
              <p className="mb-1">
                <strong>{tText("Phone:", "ስልክ፦")}</strong>{" "}
                <a href={`tel:${contactPhone}`}>{contactPhone}</a>
              </p>
            ) : null}
            <p><strong>{tText("Production:", "ምርት፦")}</strong> {tText("Kilinto Special Economic Zone", "ኪሊንቶ ልዩ ኢኮኖሚ ዞን")}</p>
          </div>
        </div>
        <div className="col-md-7">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-3">{t("contactPageSubtitle")}</h5>
            <form onSubmit={(e) => { e.preventDefault(); trackEvent("submit", "Contact Form", "Public Inquiry"); alert(tText("Message sent.", "መልእክቱ ተልኳል።")); }}>
              <div className="row g-3 mb-3">
                <div className="col-6"><label className="form-label small fw-semibold">{t("fullName")}</label><input type="text" className="form-control" required /></div>
                <div className="col-6"><label className="form-label small fw-semibold">{t("emailAddress")}</label><input type="email" className="form-control" required /></div>
              </div>
              <div className="mb-3"><label className="form-label small fw-semibold">{t("message")}</label><textarea className="form-control" rows={4} required></textarea></div>
              <button type="submit" className="btn-brand">{t("submitInquiry")}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}