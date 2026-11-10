import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Factory, Users, LineChart, Shield } from "lucide-react";
import { useLanguage } from "../../lib/language";
import { localiseCopy } from "../../lib/localiseCopy";

const COPY = {
  en: {
    metaTitle: "Objectives - Ethio-Biopharma",
    title: "Strategic Objectives",
    lede: "The core of the 2026-2030 plan is defined by five Strategic Objectives (SOs) that cover infrastructure, operational readiness, workforce, finance, and quality.",
    objectives: [
      {
        title: "SO1: Rapid Infrastructure Development",
        desc: "Deliver and commission the Diagnostics, Generic Medicines, and PPE units within 18-24 months of groundbreaking.",
      },
      {
        title: "SO2: ShieldVax Facility Construction",
        desc: "Complete the construction and validation of the vaccine fill-finish facility, preparing it for commercial manufacturing by 2029.",
      },
      {
        title: "SO3: Workforce and Capacity Building",
        desc: "Recruit and train a workforce of over 400 staff by 2030, establishing the EBPE Workforce Development Center.",
      },
      {
        title: "SO4: Financial Sustainability Foundation",
        desc: "Secure $207M+ in blended financing and activate the cross-subsidization mechanism from Quick-Win units.",
      },
      {
        title: "SO5: Regulatory and Quality Systems",
        desc: "Implement WHO-GMP compliant Quality Management Systems (QMS) across all campus units to ensure EFDA approval and future WHO-PQ.",
      },
    ],
  },
  am: {
    metaTitle: "ግቦች - ኢትዮ-ባዮፋርማ",
    title: "ስትራቴጂካዊ ግቦች",
    lede: "የ2019–2023 ዓ.ም ዕቅድ ዋና ይዘት መሠረተ ልማትን፣ የአሠራር ዝግጁነትን፣ የሰው ኃይልን፣ ፋይናንስንና ጥራትን የሚሸፍኑ አምስት ስትራቴጂካዊ ግቦች (SOs) ነው።",
    objectives: [
      {
        title: "SO1፦ ፈጣን የመሠረተ ልማት ልማት",
        desc: "የምርመራ፣ የጄኔሪክ መድሃኒትና የPPE ክፍሎችን ከመሠረት ጥልቀት በኋላ በ18–24 ወራት ውስጥ ማጠናቀቅና ማስጀመር።",
      },
      {
        title: "SO2፦ የShieldVax ፋሲሊቲ ግንባታ",
        desc: "የክትባት ሙሌት-ማጠናቀቂያ ፋሲሊቲ ግንባታና ማረጋገጫ ማጠናቀቅ፤ በ2022 ዓ.ም ለንግድ ምርት ዝግጁ ማድረግ።",
      },
      {
        title: "SO3፦ የሰው ኃይልና አቅም ግንባታ",
        desc: "በ2023 ዓ.ም ከ400 በላይ ሠራተኞችን መቅጠርና ማሰልጠን፤ የEBPE የሰው ኃይል ልማት ማዕከል ማቋቋም።",
      },
      {
        title: "SO4፦ የፋይናንስ ዘላቂነት መሠረት",
        desc: "ከ207 ሚሊዮን ዶላር በላይ የተቀላቀለ ፋይናንስ ማስተላለፍና ከፈጣን ስኬት ክፍሎች የጋራ ድጋፍ ሥርዓቱን ማስጀመር።",
      },
      {
        title: "SO5፦ የቁጥጥርና ጥራት ሥርዓቶች",
        desc: "በሁሉም የካምፓስ ክፍሎች WHO-GMP ተስማሚ የጥራት አስተዳደር ሥርዓት (QMS) ተግባራዊ ማድረግ፤ የEFDA ፍቃድና የወደፊት WHO-PQ ማረጋገጥ።",
      },
    ],
  },
};

const ICONS = [Factory, Shield, Users, LineChart, CheckCircle2];

export default function AboutObjectives() {
  const { lang, tText } = useLanguage();
  const copy = useMemo(() => localiseCopy(COPY.en, COPY[lang] || COPY.en, tText), [lang, tText]);

  return (
    <div className="container py-5">
      <Helmet><title>{copy.metaTitle}</title></Helmet>

      <div className="text-center mb-5 fly-in">
        <h1 className="fw-bold mb-3" style={{ color: "var(--brand-primary)" }}>{copy.title}</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "800px" }}>{copy.lede}</p>
      </div>

      <div className="row g-4">
        {copy.objectives.map((objective, index) => {
          const Icon = ICONS[index] || CheckCircle2;
          return (
            <div className="col-md-6 col-lg-4 fly-in" key={objective.title}>
              <div className="card h-100 border-0 shadow-sm hover-float">
                <div className="card-body p-4">
                  <div className="mb-3" style={{ color: "var(--brand-secondary)" }}><Icon size={28} /></div>
                  <h5 className="fw-bold mb-3">{objective.title}</h5>
                  <p className="text-muted small mb-0">{objective.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
