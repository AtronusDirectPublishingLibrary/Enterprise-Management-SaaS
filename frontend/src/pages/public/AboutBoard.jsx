import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Building2, Landmark, Network, Briefcase } from "lucide-react";
import { useLanguage } from "../../lib/language";
import { localiseCopy } from "../../lib/localiseCopy";

const COPY = {
  en: {
    metaTitle: "Board & Governance - Ethio-Biopharma",
    title: "Board & Governance",
    lede: "EBPE operates under a tiered governance structure designed to ensure commercial discipline, national strategic alignment, and operational efficiency.",
    cards: [
      {
        title: "Ethiopian Investment Holdings (EIH)",
        body: "As Ethiopia's sovereign wealth fund and EBPE's parent organization, EIH provides high-level strategic oversight. EIH functions as an active owner, enforcing modern corporate governance standards and evaluating enterprise performance against both commercial and national benchmarks.",
      },
      {
        title: "The Board of Directors",
        body: "The Board serves as the primary governing body of EBPE, reporting directly to EIH. It provides strategic guidance on the enterprise's roadmap and commercial trajectory while ensuring accountability through adherence to national and international quality standards (e.g., WHO-GMP, ISO).",
      },
      {
        title: "Ethio-Bio Pharma Enterprise",
        body: "The Enterprise Office functions as the corporate holding entity, delivering centralized leadership and shared services across the integrated campus. It sets the overall strategic direction and financial policy for the group.",
      },
      {
        title: "Business Unit Structure",
        body: "Each business unit operates with operational autonomy while remaining strategically aligned with the corporate office:",
      },
    ],
    units: [
      "ShieldVax Unit (Vaccine Production)",
      "Medicines and Input Production Unit",
      "Diagnostic, PPE and Medical Supplies Unit",
      "Training & Capacity Building Unit",
    ],
  },
  am: {
    metaTitle: "ቦርድ እና አስተዳደር - ኢትዮ-ባዮፋርማ",
    title: "ቦርድ እና አስተዳደር",
    lede: "EBPE የንግድ ተግሣጽን፣ ከብሔራዊ ስትራቴጂ ጋር መጣጣምንና የአሠራር ቅልጥፍናን ለማረጋገጥ በተዘጋጀ ደረጃቸው የተለያዩ የአስተዳደር መዋቅር ስር ይሠራል።",
    cards: [
      {
        title: "የኢትዮጵያ ኢንቨስትመንት ሀልዲንግስ (EIH)",
        body: "EIH የኢትዮጵያ ሉዓላዊ ሀብት ፈንድና የEBPE ወላጅ ድርጅት እንደመሆኑ ከፍተኛ ስትራቴጂካዊ ቁጥጥር ያደርጋል። EIH እንደ ንቁ ባለቤት ሆኖ ዘመናዊ የኮርፖሬት አስተዳደር መስፈርቶችን ያስፈጽማል፤ የድርጅቱን አፈጻጸም በንግድና በብሔራዊ መለኪያዎች ይገመግማል።",
      },
      {
        title: "የዳይሬክተሮች ቦርድ",
        body: "ቦርዱ የEBPE ዋና የአስተዳደር አካል ሆኖ ለEIH በቀጥታ ሪፖርት ያደርጋል። በድርጅቱ መንገድ ካርታና የንግድ አቅጣጫ ላይ ስትራቴጂካዊ መመሪያ ይሰጣል፤ ብሔራዊና ዓለም አቀፍ የጥራት መስፈርቶችን (ለምሳሌ WHO-GMP፣ ISO) በማክበር ተጠያቂነትን ያረጋግጣል።",
      },
      {
        title: "የኢትዮ-ባዮ ፋርማ ኢንተርፕራይዝ",
        body: "የድርጅቱ ጽ/ቤት የተቀናጀ ካምፓሱን የሚያስተባብር የኮርፖሬት ማዕቀፍ ሆኖ ማእከላዊ አመራርና የጋራ አገልግሎቶችን ይሰጣል። ለቡድኑ አጠቃላይ ስትራቴጂካዊ አቅጣጫና የፋይናንስ ፖሊሲ ያወጣል።",
      },
      {
        title: "የንግድ ክፍሎች መዋቅር",
        body: "እያንዳንዱ የንግድ ክፍል በራሱ በአሠራር ራስን የሚያስተዳድር ሆኖ ከኮርፖሬት ጽ/ቤቱ ጋር በስትራቴጂ ይጣጣማል፦",
      },
    ],
    units: [
      "የShieldVax ክፍል (የክትባት ምርት)",
      "የመድሃኒትና የግብዓት ምርት ክፍል",
      "የምርመራ፣ የPPE እና የህክምና ቁሳቁስ ክፍል",
      "የስልጠናና አቅም ግንባታ ክፍል",
    ],
  },
};

const ICONS = [Landmark, Briefcase, Building2, Network];

export default function AboutBoard() {
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
        {copy.cards.map((card, index) => {
          const Icon = ICONS[index] || Landmark;
          return (
            <div className="col-md-6 fly-in" key={card.title}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-3 d-flex align-items-center">
                    <Icon className="me-2" style={{ color: "var(--brand-secondary)" }} /> {card.title}
                  </h4>
                  <p className={`text-muted${index === 3 ? " mb-2" : ""}`}>{card.body}</p>
                  {index === 3 ? (
                    <ul className="text-muted small mb-0">
                      {copy.units.map((unit) => <li key={unit}>{unit}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
