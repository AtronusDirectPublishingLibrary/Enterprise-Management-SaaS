import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Landmark, Network, Handshake, TrendingUp } from "lucide-react";
import { useLanguage } from "../../lib/language";

export default function Partners() {
  const { t, tText } = useLanguage();

  const groups = [
    {
      icon: <Handshake size={26} />,
      title: t("techTransferPartners"),
      body: tText(
        "We work closely with international manufacturers to transfer technology, ensuring domestic self-reliance in biopharmaceutical production.",
        "ሀገር ውስጥ የባዮፋርማሲዩቲካል ምርትን ራስን በራስ ለማስቻል ከዓለም አቀፍ አምራቾች ጋር በቴክኖሎጂ ሽግግር በቅርበት እንሰራለን።"
      ),
    },
    {
      icon: <Landmark size={26} />,
      title: t("govMultilateral"),
      body: tText(
        "EBPE engages regularly with the Ministry of Health, the Industrial Parks Development Corporation, and multilateral development partners.",
        "EBPE ከጤና ሚኒስቴር፣ ከኢንዱስትሪያል ፓርኮች ልማት ኮርፖሬሽን እና ከብዝሃ-ሀገር ልማት አጋሮች ጋር በየጊዜው ይሰራል።"
      ),
    },
    {
      icon: <Network size={26} />,
      title: tText("Research and academic partners", "የምርምርና የትምህርት አጋሮች"),
      body: tText(
        "Universities, regulatory bodies and research institutes support product development, testing and the training of the workforce that will run the campus.",
        "ዩኒቨርሲቲዎች፣ የቁጥጥር አካላትና የምርምር ተቋማት የምርት ልማትን፣ ምርመራንና ካምፓሱን የሚያስተዳድረውን የሰው ኃይል ስልጠና ይደግፋሉ።"
      ),
    },
  ];

  return (
    <div className="container py-5">
      <Helmet>
        <title>{t("partnersPageTitle")} | EBPE</title>
        <meta name="description" content={tText("Collaborating with government counterparts, international health organizations, technology transfer partners and investors.", "ከመንግስት አካላት፣ ከዓለም አቀፍ የጤና ድርጅቶች፣ ከቴክኖሎጂ ሽግግር አጋሮችና ከባለሀብቶች ጋር በመተባበር።")} />
      </Helmet>

      <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{t("partnersPageTitle")}</h1>
      <p className="lead text-muted mb-5" style={{ maxWidth: 860 }}>
        {tText(
          "Collaborating with government counterparts, international health organizations, technology transfer partners and investors.",
          "ከመንግስት አካላት፣ ከዓለም አቀፍ የጤና ድርጅቶች፣ ከቴክኖሎጂ ሽግግር አጋሮችና ከባለሀብቶች ጋር በመተባበር።"
        )}
      </p>

      <div className="row g-4 mb-5">
        {groups.map((group) => (
          <div className="col-md-4" key={group.title}>
            <div className="card border-0 shadow-sm p-4 h-100">
              <div className="mb-3" style={{ color: "var(--brand-secondary)" }}>{group.icon}</div>
              <h5 className="fw-bold" style={{ color: "var(--brand-primary)" }}>{group.title}</h5>
              <p className="text-muted small mt-2 mb-0">{group.body}</p>
            </div>
          </div>
        ))}
      </div>

      <section id="investors" className="pt-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <TrendingUp size={26} style={{ color: "var(--brand-secondary)" }} />
          <h2 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
            {t("investorsPageTitle")}
          </h2>
        </div>
        <p className="text-muted mb-4" style={{ maxWidth: 860 }}>
          {tText(
            "Financial reports, strategic direction, and investment opportunities with EBPE.",
            "የፋይናንስ ሪፖርቶች፣ ስትራቴጂካዊ አቅጣጫ እና ከEBPE ጋር ያሉ የኢንቨስትመንት ዕድሎች።"
          )}
        </p>

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h4 className="fw-bold mb-3">{t("investorsPageSubtitle")}</h4>
              <p className="text-muted mb-3">
                {tText(
                  "EBPE is at an active stage of institutional build-out, advancing towards domestic self-reliance in health security. We welcome engagement with prospective investors and development finance institutions.",
                  "EBPE ተቋሙን በንቃት እየገነባ ሲሆን በጤና ዋስትና ራስን በራስ ወደማስቻል እየተመራ ነው። ከባለሀብቶችና ከልማት ፋይናንስ ተቋማት ጋር መስራት እንፈልጋለን።"
                )}
              </p>
              <ul className="text-muted small mb-0 ps-3 d-flex flex-column gap-2">
                <li>{tText("Blended finance and co-investment for campus Phase II.", "ለካምፓስ ምዕራፍ II የተቀላቀለ ፋይናንስና የጋራ ኢንቨስትመንት።")}</li>
                <li>{tText("Technology transfer and licensing partnerships.", "የቴክኖሎጂ ሽግግርና የፈቃድ አጋርነት።")}</li>
                <li>{tText("Offtake and supply agreements for priority health products.", "ለቅድሚያ የጤና ምርቶች የግዥና የአቅርቦት ስምምነቶች።")}</li>
              </ul>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h5 className="fw-bold mb-3">{tText("Investor resources", "የባለሀብት መረጃዎች")}</h5>
              <p className="text-muted small">
                {tText(
                  "Board papers, approved plans and financial reports are published in the document library as they are approved.",
                  "የቦርድ ሰነዶች፣ የጸደቁ ዕቅዶችና የፋይናንስ ሪፖርቶች ሲጸድቁ በሰነድ መዝገቡ ይታተማሉ።"
                )}
              </p>
              <div className="d-flex flex-wrap gap-2 mt-auto">
                <Link className="btn-brand btn-sm" to="/documents">{tText("Document library", "የሰነድ መዝገብ")}</Link>
                <Link className="btn btn-outline-secondary btn-sm" to="/contact">{t("contact")}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
