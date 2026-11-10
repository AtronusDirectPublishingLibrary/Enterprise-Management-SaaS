import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Target, Eye, ShieldCheck } from "lucide-react";
import { useLanguage } from "../../lib/language";
import { localiseCopy } from "../../lib/localiseCopy";

const COPY = {
  en: {
    metaTitle: "Mission & Vision - Ethio-Biopharma",
    title: "Our Mission & Vision",
    lede: "The strategic direction for the 2026-2030 period is aligned with the 10-year roadmap and guided by a clear vision to position EBPE as a cornerstone of Ethiopia's health security.",
    visionTitle: "Vision 2035",
    visionBody: "To be among the leading integrated biopharmaceutical campuses in Africa, ensuring health security and pharmaceutical sovereignty for Ethiopia and the continent through self-reliant, sustainable manufacturing.",
    missionTitle: "Mission",
    missionBody: "To develop, manufacture, and deliver high-quality, affordable essential medicines, vaccines, diagnostics, and medical supplies to meet public health needs through building a self-sustaining ecosystem of manufacturing businesses, fostering innovation, building local capacity, and creating strategic partnerships.",
    valuesTitle: "Our Core Values",
    values: [
      { title: "Quality", desc: "Adherence to the highest national and international standards (WHO-GMP, ISO) in all our processes and products." },
      { title: "Integrity", desc: "Operating with transparency, accountability, and ethical conduct in all our endeavors." },
      { title: "Innovation", desc: "Embracing advanced technologies, continuous improvement, and R&D to address evolving health challenges." },
      { title: "Collaboration", desc: "Building strong partnerships with government, international organizations, academia, and the private sector." },
      { title: "Sustainability", desc: "Ensuring the long-term financial, operational, and environmental viability of our enterprise." },
      { title: "People-Centricity", desc: "Investing in our workforce and committed to improving the health and well-being of the communities we serve." },
    ],
  },
  am: {
    metaTitle: "ተልዕኮ እና ራዕይ - ኢትዮ-ባዮፋርማ",
    title: "ተልዕኮአችን እና ራዕያችን",
    lede: "የ2019–2023 ዓ.ም ስትራቴጂካዊ አቅጣጫ ከ10 ዓመት መንገድ ካርታ ጋር ይጣጣማል፤ EBPE የኢትዮጵያ የጤና ዋስትና መሠረት እንዲሆን በግልጽ ራዕይ ይመራል።",
    visionTitle: "ራዕይ 2028 ዓ.ም",
    visionBody: "በአፍሪካ ካሉ ግንባር ቀደም የተቀናጀ የባዮፋርማሲዩቲካል ካምፓሶች አንዱ ለመሆን፣ ራስን በራስ በሚያስችልና ዘላቂ በሆነ ምርት ለኢትዮጵያና ለአፍሪካ የጤና ዋስትናንና የመድሃኒት ሉዓላዊነትን ማረጋገጥ።",
    missionTitle: "ተልዕኮ",
    missionBody: "ጥራት ያላቸውን፣ ተመጣጣኝ አስፈላጊ መድሃኒቶችን፣ ክትባቶችን፣ የምርመራ መሳሪያዎችንና የህክምና ቁሳቁሶችን በማዘጋጀት፣ በማምረትና በማቅረብ የህዝብ ጤና ፍላጎትን ማሟላት፤ ራሱን የቻለ የምርት ሥርዓት በመገንባት፣ ፈጠራን በማበረታታት፣ የአገር ውስጥ አቅምን በማሳደግና ስትራቴጂካዊ አጋርነቶችን በመፍጠር።",
    valuesTitle: "ዋና እሴቶቻችን",
    values: [
      { title: "ጥራት", desc: "በሁሉም ሂደቶችና ምርቶች ከፍተኛ ብሔራዊና ዓለም አቀፍ መስፈርቶችን (WHO-GMP፣ ISO) ማክበር።" },
      { title: "ታማኝነት", desc: "በሁሉም ተግባራት ግልጽነት፣ ተጠያቂነትና ሥነ ምግባራዊ አሠራር።" },
      { title: "ፈጠራ", desc: "የላቀ ቴክኖሎጂ፣ ቀጣይ መሻሻልና ምርምርን በመቀበል የሚቀያየሩ የጤና ተግዳሮቶችን መፍታት።" },
      { title: "ትብብር", desc: "ከመንግስት፣ ከዓለም አቀፍ ድርጅቶች፣ ከአካዳሚና ከግሉ ዘርፍ ጋር ጠንካራ አጋርነት መገንባት።" },
      { title: "ዘላቂነት", desc: "የድርጅቱን የፋይናንስ፣ የአሠራርና የአካባቢ ዘላቂነት ማረጋገጥ።" },
      { title: "ሰው-ተኮርነት", desc: "በሠራተኞቻችን ላይ ኢንቨስት ማድረግና የምናገለግላቸውን ማህበረሰቦች ጤናና ደኅንነት ለማሻሻል ቁርጠኝነት።" },
    ],
  },
};

export default function AboutMission() {
  const { lang, tText } = useLanguage();
  const copy = useMemo(() => localiseCopy(COPY.en, COPY[lang] || COPY.en, tText), [lang, tText]);

  return (
    <div className="container py-5">
      <Helmet><title>{copy.metaTitle}</title></Helmet>

      <div className="text-center mb-5 fly-in">
        <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{copy.title}</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>{copy.lede}</p>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-6 fly-in">
          <div className="card h-100 border-0 shadow-sm" style={{ borderTop: "4px solid var(--brand-secondary)" }}>
            <div className="card-body p-4 text-center">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64, background: "rgba(201, 162, 39, 0.1)" }}>
                <Eye size={32} style={{ color: "var(--brand-secondary)" }} />
              </div>
              <h3 className="h4 fw-bold mb-3">{copy.visionTitle}</h3>
              <p className="text-muted">{copy.visionBody}</p>
            </div>
          </div>
        </div>

        <div className="col-md-6 fly-in">
          <div className="card h-100 border-0 shadow-sm" style={{ borderTop: "4px solid var(--brand-primary)" }}>
            <div className="card-body p-4 text-center">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64, background: "rgba(11, 37, 69, 0.1)" }}>
                <Target size={32} style={{ color: "var(--brand-primary)" }} />
              </div>
              <h3 className="h4 fw-bold mb-3">{copy.missionTitle}</h3>
              <p className="text-muted">{copy.missionBody}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm fly-in">
        <div className="card-body p-5">
          <h3 className="h4 fw-bold mb-4 d-flex align-items-center">
            <ShieldCheck className="me-2" style={{ color: "var(--brand-primary)" }} /> {copy.valuesTitle}
          </h3>
          <div className="row g-4">
            {copy.values.map((value) => (
              <div className="col-md-4" key={value.title}>
                <h5 className="fw-bold mb-2" style={{ color: "var(--brand-primary)" }}>{value.title}</h5>
                <p className="small text-muted">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
