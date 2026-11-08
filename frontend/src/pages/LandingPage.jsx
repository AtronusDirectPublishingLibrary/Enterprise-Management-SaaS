import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ArrowUpRight, Factory, Pause, Pill, Play, ShieldCheck, TestTube, Syringe } from "lucide-react";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import { localiseCopy } from "../lib/localiseCopy";
import AnimatedNumber from "../components/AnimatedNumber";

const FALLBACK_STATS = {
  programme: { value: 13118732359, periodLabel: "2026/27 EFY", majorActivities: 7 },
  roadmap: { startYear: 2026, endYear: 2035, dosesTarget: 55, dosesUnit: "million doses" },
};

const COPY = {
  en: {
    kicker: "Ethio-Biopharma Enterprise · Addis Ababa",
    title: "Manufacturing Ethiopia's",
    accent: "health security.",
    lede: "A state-owned enterprise under Ethiopian Investment Holdings, building an integrated biopharmaceutical campus at Kilinto — vaccines, essential medicines, diagnostics and medical supplies made in Ethiopia.",
    heroPrimary: "Read the mandate",
    heroSecondary: "Explore the roadmap",
    heroNote: "Programme value ETB 13.1 billion · 2019 E.F.Y. annual plan",
    slidesLabel: "Home page highlights",
    showSlide: "Show slide",
    pauseSlides: "Pause the highlights",
    playSlides: "Play the highlights",
    factsNote: "Figures from the approved corporate plans",
    updated: "Updated",
    facts: [
      { key: "budget", label: "Value of the 2019 E.F.Y. (2026/27) annual plan" },
      { key: "activities", label: "Major activities in the annual plan" },
      { key: "doses", label: "Vaccine doses a year targeted by 2035" },
      { key: "horizon", label: "Ten-year strategic roadmap" },
    ],
    mandateEyebrow: "The mandate",
    mandateTitle: "One campus. Four capabilities.",
    mandateLede:
      "EBPE is being built to reduce dependence on imported medicines and secure the country's supply of essential health products — from routine vaccines to rapid diagnostics.",
    capabilities: [
      {
        icon: "vaccine",
        title: "Human vaccines",
        body: "ShieldVax fill-finish and formulation capacity at Kilinto, starting with priority vaccines for routine immunisation.",
        meta: "16m doses a year by 2030 · 55m by 2035",
      },
      {
        icon: "pill",
        title: "Essential medicines",
        body: "Tablets, capsules, oral liquids and injectables for high-demand essential medicines, manufactured to WHO-GMP standards.",
        meta: "Import substitution for priority products",
      },
      {
        icon: "test",
        title: "Diagnostics",
        body: "Rapid diagnostic tests for HIV, hepatitis, syphilis and typhoid, with laboratory and quality-control support.",
        meta: "Commercial launch planned for 2028",
      },
      {
        icon: "ppe",
        title: "PPE & medical supplies",
        body: "Auto-disable and reuse-prevention syringes plus medical consumables that close critical gaps in the health system.",
        meta: "Integrated into the Kilinto campus",
      },
    ],
    roadmapEyebrow: "The roadmap",
    horizonNote: "Ten-year horizon",
    roadmapTitle: "From groundbreaking to global competitiveness.",
    roadmapLede:
      "A ten-year roadmap in five phases, sequencing construction, technology transfer, commissioning and expansion so each capability is proven before the next is added.",
    phases: [
      {
        years: "2025–2026",
        title: "Pre-launch & foundation",
        body: "Governance, financing and partnerships secured; designs, safeguards and the delivery unit put in place.",
      },
      {
        years: "2026–2028",
        title: "Groundbreaking & quick-win build-out",
        body: "Phase I civil works across six blocks at Kilinto, with long-lead equipment procurement and technical recruitment.",
      },
      {
        years: "2028–2030",
        title: "ShieldVax commissioning & scale-up",
        body: "Installation and qualification of fill-finish equipment, validation and the first commercial vaccine batches.",
      },
      {
        years: "2030–2032",
        title: "Integrated operations & expansion",
        body: "Medicines and input-material lines commissioned; quick-win units reach 40% capacity and operating profit.",
      },
      {
        years: "2032–2035",
        title: "R&D, innovation & global competitiveness",
        body: "Biopharma R&D centre, WHO-PQ products, three API products and export revenue at 10% of sales.",
      },
    ],
    campusEyebrow: "The campus",
    campusTitle: "Built at Kilinto, to GMP standard.",
    campusLede:
      "The campus is being delivered in phases so that manufacturing can start while later capacity is still under construction. Phase I covers the civil works; Phase II adds cleanrooms, HVAC, mechanical, electrical and process systems.",
    campusFacts: [
      ["Location", "Kilinto Special Economic Zone"],
      ["Phase I", "Six blocks · ETB 7.07bn"],
      ["Phase II", "Cleanrooms, HVAC & MEP · ETB 5.92bn"],
      ["Civil works", "Complete in 2027"],
      ["Quality", "Designed for WHO-GMP / WHO-PQ readiness"],
    ],
    campusCaption: "Phase I civil construction under way at the Kilinto campus.",
    plansEyebrow: "Accountability",
    plansTitle: "The plans and targets we publish.",
    plansLede:
      "Roadmap, strategic plan and annual operational plan are maintained as living documents. This site reports the targets they set; performance against them is published through the annual and quarterly reports.",
    plansAside: "Targets, not results — delivery is reported separately.",
    mediaEyebrow: "Media",
    mediaTitle: "Watch the programme take shape.",
    mediaLede:
      "Films and site footage from the Kilinto campus, published as they are produced — each with captions so the record is accessible to everyone.",
    mediaCaptions: "Captions",
    planTypes: { ROADMAP: "Roadmap", STRATEGIC: "Strategic plan", AOP: "Annual plan" },
    targets: "targets and KPIs",
    openDocuments: "Open the document library",
    partnersEyebrow: "Who we work with",
    partnersTitle: "Accountable to the public system.",
    partners: [
      {
        name: "Ethiopian Investment Holdings",
        role: "Owner and oversight",
        body: "EBPE is a strategic enterprise under EIH, reporting through its board and corporate governance framework.",
      },
      {
        name: "Federal Ministry of Health",
        role: "Policy and public health mandate",
        body: "The ministry sets the national health priorities the enterprise is built to serve, from immunisation to diagnostics.",
      },
      {
        name: "World Bank · HEPRR",
        role: "Financing partner",
        body: "The Health Equity and Pandemic Preparedness project finances Phase II systems and the technical training programme.",
      },
    ],
    ctaTitle: "Follow the programme as it is built.",
    ctaBody: "Board papers, annual plans, environmental and social safeguards, and procurement notices are published as they are approved.",
    ctaPrimary: "Browse the document library",
    ctaSecondary: "Partner with us",
    amharicNote: "",
  },
  am: {
    kicker: "የኢትዮ-ባዮፋርማ ኢንተርፕራይዝ · አዲስ አበባ",
    title: "ለኢትዮጵያ የጤና ዋስትና",
    accent: "እያመረትን።",
    lede: "በኢትዮጵያ ኢንቨስትመንት ሀልዲንግስ ስር የሚሰራ የመንግስት ተቋም፤ በኪሊንቶ የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ በመገንባት ክትባቶችን፣ አስፈላጊ መድሃኒቶችን፣ የምርመራ መሳሪያዎችንና የህክምና ቁሳቁሶችን በኢትዮጵያ ውስጥ ያመርታል።",
    heroPrimary: "ስልጣኑን ይመልከቱ",
    heroSecondary: "ፍኖተ ካርታውን ይመልከቱ",
    heroNote: "የፕሮግራሙ ዋጋ 13.1 ቢሊዮን ብር · የ2019 ዓ.ም ዓመታዊ ዕቅድ",
    slidesLabel: "የመነሻ ገጽ ዋና ይዘቶች",
    showSlide: "ተንሸራታች አሳይ",
    pauseSlides: "ተንሸራታቾቹን አቁም",
    playSlides: "ተንሸራታቾቹን አጫውት",
    factsNote: "ቁጥሮቹ ከጸደቁት የድርጅት ዕቅዶች የተወሰዱ ናቸው",
    updated: "የተሻሻለበት",
    facts: [
      { key: "budget", label: "የ2019 ዓ.ም (2026/27) ዓመታዊ ዕቅድ ዋጋ" },
      { key: "activities", label: "በዓመታዊ ዕቅዱ ውስጥ ያሉ ዋና ተግባራት" },
      { key: "doses", label: "በ2035 በዓመት የሚጠበቅ የክትባት ዶዝ" },
      { key: "horizon", label: "የአስር ዓመት ስትራቴጂካዊ መንገድ ካርታ" },
    ],
    mandateEyebrow: "ስልጣኑ",
    mandateTitle: "አንድ ካምፓስ። አራት አቅሞች።",
    mandateLede:
      "EBPE በውጭ ሀገር የሚመጡ መድሃኒቶችን ጥገኝነት ለመቀነስና የሀገሪቱን አስፈላጊ የጤና ምርቶች አቅርቦት ለማረጋገጥ ይገነባል — ከመደበኛ ክትባቶች እስከ ፈጣን የምርመራ መሳሪያዎች።",
    capabilities: [
      {
        icon: "vaccine",
        title: "የሰው ክትባቶች",
        body: "በኪሊንቶ የShieldVax ሙሌት-ማጠናቀቂያና ቀመር ማዘጋጃ አቅም፤ ከመደበኛ ክትባት ፍላጎቶች ይጀምራል።",
        meta: "በ2030 16 ሚሊዮን ዶዝ · በ2035 55 ሚሊዮን",
      },
      {
        icon: "pill",
        title: "አስፈላጊ መድሃኒቶች",
        body: "ታብሌቶች፣ ካፕሱሎች፣ ፈሳሽ መድሃኒቶችና መርፌዎች በWHO-GMP መስፈርት ለከፍተኛ ፍላጎት ያላቸው መድሃኒቶች።",
        meta: "ለቅድሚያ ምርቶች የማስመጣት ምትክ",
      },
      {
        icon: "test",
        title: "የምርመራ መሳሪያዎች",
        body: "ለኤች.አይ.ቪ፣ ለሄፓታይተስ፣ ለቂጥኝና ለተይፎይድ ፈጣን ምርመራዎች፣ ከላብራቶሪና የጥራት ድጋፍ ጋር።",
        meta: "የንግድ ስራ በ2028 እንዲጀመር ታቅዷል",
      },
      {
        icon: "ppe",
        title: "የጥበቃ መሳሪያዎችና የህክምና ቁሳቁሶች",
        body: "ራስን የሚያጠፉ መርፌዎችና የህክምና ቁሳቁሶች በጤና ስርዓቱ ውስጥ ያሉ ክፍተቶችን ይሞላሉ።",
        meta: "በኪሊንቶ ካምፓስ የተቀናጀ",
      },
    ],
    roadmapEyebrow: "መንገድ ካርታው",
    horizonNote: "የአስር ዓመት አድማስ",
    roadmapTitle: "ከመሠረት ጥልቀት እስከ ዓለም አቀፍ ተወዳዳሪነት።",
    roadmapLede:
      "የአስር ዓመት መንገድ ካርታ በአምስት ምዕራፎች፤ ግንባታ፣ ቴክኖሎጂ ሽግግር፣ ስርዓተ-ስራና መስፋፋት ተከታታይ ሆነው ይከናወናሉ።",
    phases: [
      {
        years: "2025–2026",
        title: "ቅድመ-ምጅምርና መሠረት",
        body: "አስተዳደር፣ ፋይናንስና አጋርነት ተረጋግጠዋል፤ ንድፎችና የማስፈጸሚያ ቡድን ተቋቁመዋል።",
      },
      {
        years: "2026–2028",
        title: "የመሠረት ጥልቀትና ፈጣን ግንባታ",
        body: "በኪሊንቶ በስድስት ሕንፃዎች ላይ የምዕራፍ I ሲቪል ስራዎች፣ የረጅም ጊዜ መሳሪያ ግዥና ቴክኒካዊ ቅጥር።",
      },
      {
        years: "2028–2030",
        title: "የShieldVax ስርዓተ-ስራና መስፋፋት",
        body: "የሙሌት-ማጠናቀቂያ መሳሪያዎች መግጠምና ማረጋገጥ፣ ማረጋገጫና የመጀመሪያ የንግድ ክትባት ምርት።",
      },
      {
        years: "2030–2032",
        title: "የተቀናጀ ስራና መስፋፋት",
        body: "የመድሃኒትና የግብዓት መስመሮች ስርዓተ-ስራ፤ ፈጣን አሸናፊ ክፍሎች 40% አቅምና ትርፋሪነት ይደርሳሉ።",
      },
      {
        years: "2032–2035",
        title: "ምርምር፣ ፈጠራና ዓለም አቀፍ ተወዳዳሪነት",
        body: "የባዮፋርማ ምርምር ማዕከል፣ የWHO-PQ ምርቶች፣ ሶስት API ምርቶችና 10% የውጭ ገቢ ድርሻ።",
      },
    ],
    campusEyebrow: "ካምፓሱ",
    campusTitle: "በኪሊንቶ፣ በGMP መስፈርት የተገነባ።",
    campusLede:
      "ካምፓሱ በደረጃዎች ይገነባል፤ ምርት እየተጀመረ ተጨማሪ አቅም መገንባቱ ይቀጥላል። ምዕራፍ I ሲቪል ስራዎችን ያካትታል፤ ምዕራፍ II ንጹህ ክፍሎችን፣ HVAC፣ ሜካኒካል፣ ኤሌክትሪክና የሂደት ስርዓቶችን ይጨምራል።",
    campusFacts: [
      ["አካባቢ", "ኪሊንቶ ልዩ ኢኮኖሚ ዞን"],
      ["ምዕራፍ I", "ስድስት ሕንፃዎች · 7.07 ቢሊዮን ብር"],
      ["ምዕራፍ II", "ንጹህ ክፍሎችና MEP · 5.92 ቢሊዮን ብር"],
      ["ሲቪል ስራዎች", "በ2027 ይጠናቀቃሉ"],
      ["ጥራት", "ለWHO-GMP / WHO-PQ ዝግጁ ተብሎ የተነደፈ"],
    ],
    campusCaption: "በኪሊንቶ ካምፓስ የምዕራፍ I ሲቪል ግንባታ በሂደት ላይ።",
    plansEyebrow: "ተጠያቂነት",
    plansTitle: "የምናትምባቸው ዕቅዶችና ግቦች።",
    plansLede:
      "የመንገድ ካርታው፣ ስትራቴጂካዊ ዕቅዱና ዓመታዊ የተግባር ዕቅዱ ቀጣይ ሰነዶች ናቸው። ይህ ገጽ የሚያሳየው የተቀመጡትን ግቦች ነው፤ አፈጻጸሙ በዓመታዊና በሩብ ዓመት ሪፖርቶች ይታተማል።",
    plansAside: "ግቦች እንጂ ውጤቶች አይደሉም — አፈጻጸም ለየብቻ ይዘገባል።",
    mediaEyebrow: "ሚዲያ",
    mediaTitle: "ፕሮግራሙ ሲስፋፋ ይመልከቱ።",
    mediaLede:
      "ከኪሊንቶ ካምፓስ የተዘጋጁ ፊልሞችና ቀረፃዎች ሲዘጋጁ ይታተማሉ — ሁሉም ሰው እንዲያገኛቸው በግርጌ ጽሑፍ።",
    mediaCaptions: "ግርጌ ጽሑፍ",
    planTypes: { ROADMAP: "መንገድ ካርታ", STRATEGIC: "ስትራቴጂካዊ ዕቅድ", AOP: "ዓመታዊ ዕቅድ" },
    targets: "ግቦችና መለኪያዎች",
    openDocuments: "የሰነድ መዝገቡን ይክፈቱ",
    partnersEyebrow: "ከማን ጋር እንሰራለን",
    partnersTitle: "ለህዝባዊ ስርዓቱ ተጠያቂ።",
    partners: [
      {
        name: "የኢትዮጵያ ኢንቨስትመንት ሀልዲንግስ",
        role: "ባለቤትና ቁጥጥር",
        body: "EBPE በEIH ስር የሚሰራ ስትራቴጂካዊ ተቋም ሲሆን በቦርዱና በኮርፖሬት አስተዳደር ማዕቀፍ ይመራል።",
      },
      {
        name: "የፌዴራል ጤና ሚኒስቴር",
        role: "ፖሊሲና የህዝብ ጤና ስልጣን",
        body: "ሚኒስቴሩ ተቋሙ ሊያገለግላቸው የሚገቡትን ብሔራዊ የጤና ቅድሚያዎች ይወስናል።",
      },
      {
        name: "የዓለም ባንክ · HEPRR",
        role: "የፋይናንስ አጋር",
        body: "የጤና ፍትሃዊነትና ወረርሽኝ ዝግጁነት ፕሮጀክት የምዕራፍ II ስርዓቶችንና የቴክኒክ ስልጠና ፕሮግራሙን ይሸፍናል።",
      },
    ],
    ctaTitle: "ፕሮግራሙ ሲገነባ ይከታተሉ።",
    ctaBody: "የቦርድ ሰነዶች፣ ዓመታዊ ዕቅዶች፣ የአካባቢና ማህበራዊ ጥበቃ ሰነዶችና የግዥ ማስታወቂያዎች ሲጸድቁ ይታተማሉ።",
    ctaPrimary: "የሰነድ መዝገቡን ይመልከቱ",
    ctaSecondary: "አብረን እንስራ",
    amharicNote: "",
  },
};

const ICONS = {
  vaccine: Syringe,
  pill: Pill,
  test: TestTube,
  ppe: ShieldCheck,
};

const HERO_INTERVAL = 7000;
const FALLBACK_HERO = "/media/campus-hero-1800.webp";

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function videoType(url) {
  const extension = String(url || "").split("?")[0].split(".").pop().toLowerCase();
  if (extension === "webm") return "video/webm";
  if (extension === "ogg" || extension === "ogv") return "video/ogg";
  return VIDEO_TYPES[0];
}

function formatBudget(value) {
  if (!value) return "—";
  const billions = value / 1_000_000_000;
  return `ETB ${billions.toFixed(1)}bn`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value)
  );
}

export default function LandingPage() {
  const { lang, t, tText } = useLanguage();
  const copy = useMemo(
    () => localiseCopy(COPY.en, COPY[lang] || COPY.en, tText),
    [lang, tText]
  );
  const location = useLocation();
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [asOf, setAsOf] = useState(null);
  const [plans, setPlans] = useState([]);
  const [videos, setVideos] = useState([]);
  const [heroImages, setHeroImages] = useState([]);
  const [slides, setSlides] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    api
      .get("/public/at-a-glance")
      .then((data) => {
        if (data?.programme) setStats(data);
        if (data?.asOf) setAsOf(data.asOf);
        if (Array.isArray(data?.plans)) setPlans(data.plans);
      })
      .catch(() => {});

    api
      .get("/media")
      .then((data) => {
        if (Array.isArray(data)) setVideos(data);
      })
      .catch(() => {});

    api
      .get("/hero-images")
      .then((images) => {
        if (Array.isArray(images)) {
          setHeroImages(images.filter((image) => typeof image?.url === "string" && image.url));
        }
      })
      .catch(() => {});

    api
      .get("/hero-texts")
      .then((data) => {
        if (Array.isArray(data)) setSlides(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Rotate the hero image and its copy together.
  useEffect(() => {
    if (slides.length < 2 || !autoPlay || pageHidden) return undefined;
    const timer = window.setTimeout(
      () => setActiveSlide((index) => (index + 1) % slides.length),
      HERO_INTERVAL
    );
    return () => window.clearTimeout(timer);
  }, [activeSlide, slides.length, autoPlay, pageHidden]);

  useEffect(() => {
    setActiveSlide((index) => (slides.length ? Math.min(index, slides.length - 1) : 0));
  }, [slides.length]);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const facts = useMemo(() => {
    const programme = stats.programme || FALLBACK_STATS.programme;
    const roadmap = stats.roadmap || FALLBACK_STATS.roadmap;
    return [
      { value: formatBudget(programme.value), label: copy.facts[0].label, animate: true },
      { value: String(programme.majorActivities ?? 7), label: copy.facts[1].label, animate: true },
      { value: `${roadmap.dosesTarget ?? 55}m`, label: copy.facts[2].label, animate: true },
      { value: `${roadmap.startYear}–${roadmap.endYear}`, label: copy.facts[3].label, animate: false },
    ];
  }, [stats, copy]);

  const planCards = useMemo(() => {
    const labels = copy.planTypes;
    const fallback = [
      { type: "ROADMAP", title: "Strategic Roadmap 2026–2035", periodLabel: "2026–2035" },
      { type: "STRATEGIC", title: "5-Year Strategic Plan", periodLabel: "2026–2030" },
      { type: "AOP", title: "Annual Workplan 2019 E.C.", periodLabel: "2026/27 EFY" },
    ];
    const source = plans.length ? plans.slice(0, 3) : fallback;
    return source.map((plan) => ({
      type: plan.type,
      typeLabel: labels[plan.type] || plan.type,
      title: t(plan.title, plan.title),
      period: plan.periodLabel,
      targets: typeof plan.targets === "number" ? plan.targets : null,
    }));
  }, [plans, copy, t]);

  const slide = slides.length ? slides[activeSlide] : null;
  const heroBackgrounds = useMemo(
    () =>
      slides.map(
        (item, index) =>
          item.imageUrl ||
          (heroImages.length ? heroImages[index % heroImages.length].url : FALLBACK_HERO)
      ),
    [slides, heroImages]
  );
  const isAmharic = lang === "am";
  const slideTitle = slide ? (isAmharic ? slide.titleAm || slide.title : slide.title) : "";
  const slideSubtitle = slide ? (isAmharic ? slide.subtitleAm || slide.subtitle : slide.subtitle) || "" : "";
  const slideTagline = slide ? (isAmharic ? slide.taglineAm || slide.tagline : slide.tagline) || "" : "";
  const slideCtaLabel = slide ? (isAmharic ? slide.ctaLabelAm || slide.ctaLabel : slide.ctaLabel) || "" : "";
  const slideshowRunning = autoPlay && !pageHidden;

  return (
    <>
      <Helmet>
        <title>Ethio-Biopharma Enterprise | Building Ethiopia's biopharmaceutical capability</title>
        <meta
          name="description"
          content="Ethio-Biopharma Enterprise is building an integrated biopharmaceutical campus at Kilinto, Ethiopia — vaccines, essential medicines, diagnostics and medical supplies."
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Ethio-Biopharma Enterprise" />
        <meta
          property="og:description"
          content="Building Ethiopia's capability to manufacture vaccines, essential medicines, diagnostics and medical supplies."
        />
        <meta property="og:image" content="/media/campus-hero-1800.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ethio-Biopharma Enterprise",
            description:
              "State-owned biopharmaceutical enterprise building domestic manufacturing of vaccines, essential medicines, diagnostics and medical supplies in Ethiopia.",
            parentOrganization: { "@type": "Organization", name: "Ethiopian Investment Holdings" },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Addis Ababa",
              addressCountry: "ET",
            },
          })}
        </script>
      </Helmet>

      <section className={`hero${slides.length > 1 ? " hero--slideshow" : ""}`}>
        <div className="hero-media" aria-hidden="true">
          {slides.length ? (
            slides.map((item, index) => (
              <img
                key={item.id}
                className={`hero-slide${index === activeSlide ? " is-active" : ""}`}
                src={heroBackgrounds[index]}
                alt=""
                sizes="100vw"
                fetchpriority={index === 0 ? "high" : "low"}
                decoding="async"
              />
            ))
          ) : (
            <img
              src={FALLBACK_HERO}
              srcSet="/media/campus-hero-900.webp 900w, /media/campus-hero-1800.webp 1800w"
              sizes="100vw"
              alt=""
              fetchpriority="high"
              decoding="async"
            />
          )}
        </div>
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-inner">
          {slide ? (
            <div className="hero-copy" key={slide.id}>
              <p className="hero-kicker">{slideTagline || copy.kicker}</p>
              <h1>{slideTitle}</h1>
              {slideSubtitle ? <p className="lede">{slideSubtitle}</p> : null}
              <div className="hero-actions">
                {slideCtaLabel && slide.ctaUrl ? (
                  isExternalUrl(slide.ctaUrl) ? (
                    <a className="btn-solid" href={slide.ctaUrl} target="_blank" rel="noopener noreferrer">
                      {slideCtaLabel} <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  ) : (
                    <Link className="btn-solid" to={slide.ctaUrl}>
                      {slideCtaLabel} <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  )
                ) : (
                  <Link className="btn-solid" to="/about">
                    {copy.heroPrimary} <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
                <Link className="btn-outline" to="/#roadmap">
                  {copy.heroSecondary}
                </Link>
              </div>
              <p className="hero-note">{copy.heroNote}</p>
            </div>
          ) : (
            <div className="hero-copy">
              <p className="hero-kicker">{copy.kicker}</p>
              <h1>
                {copy.title} <em>{copy.accent}</em>
              </h1>
              <p className="lede">{copy.lede}</p>
              <div className="hero-actions">
                <Link className="btn-solid" to="/about">
                  {copy.heroPrimary} <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link className="btn-outline" to="/#roadmap">
                  {copy.heroSecondary}
                </Link>
              </div>
              <p className="hero-note">{copy.heroNote}</p>
            </div>
          )}
        </div>

        {slides.length > 1 ? (
          <div className="hero-controls">
            <div className="hero-dots" role="group" aria-label={copy.slidesLabel}>
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={index === activeSlide ? "true" : undefined}
                  aria-label={`${copy.showSlide} ${index + 1}`}
                  className={`hero-dot${index === activeSlide ? " is-active" : ""}`}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
            </div>
            <button
              type="button"
              className="hero-toggle"
              aria-pressed={!autoPlay}
              aria-label={autoPlay ? copy.pauseSlides : copy.playSlides}
              title={autoPlay ? copy.pauseSlides : copy.playSlides}
              onClick={() => setAutoPlay((value) => !value)}
            >
              {slideshowRunning ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
            </button>
          </div>
        ) : null}
      </section>

      <section className="facts" aria-label={copy.factsNote}>
        <div className="container-wide">
          <div className="facts-grid">
            {facts.map((fact) => (
              <div className="fact" key={fact.label}>
                <p className="fact-value">
                  {fact.animate ? <AnimatedNumber value={fact.value} duration={1800} /> : fact.value}
                </p>
                <p className="fact-label">{fact.label}</p>
              </div>
            ))}
          </div>
          <p className="facts-note">
            {copy.factsNote}
            {asOf ? ` · ${copy.updated} ${formatDate(asOf)}` : ""}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-wide">
          <div className="section-head">
            <div>
              <p className="eyebrow">{copy.mandateEyebrow}</p>
              <h2 className="display">{copy.mandateTitle}</h2>
              <p className="lede">{copy.mandateLede}</p>
            </div>
          </div>
          <div className="capabilities">
            {copy.capabilities.map((capability, index) => {
              const Icon = ICONS[capability.icon] || Factory;
              return (
                <article className="capability" key={capability.title}>
                  <div className="capability-top">
                    <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                    <span className="capability-index">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{capability.title}</h3>
                  <p>{capability.body}</p>
                  <p className="capability-meta">{capability.meta}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--navy" id="roadmap">
        <div className="container-wide">
          <div className="section-head">
            <div>
              <p className="eyebrow">{copy.roadmapEyebrow}</p>
              <h2 className="display">{copy.roadmapTitle}</h2>
              <p className="lede">{copy.roadmapLede}</p>
            </div>
            <p className="section-head__aside" style={{ color: "rgba(255,255,255,0.6)" }}>
              2026–2035 · {copy.horizonNote}
            </p>
          </div>
          <div className="roadmap">
            {copy.phases.map((phase, index) => (
              <div className="phase" key={phase.title}>
                <p className="phase-years">
                  {String(index).padStart(2, "0")} · {phase.years}
                </p>
                <h3>{phase.title}</h3>
                <p>{phase.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-wide">
          <div className="campus">
            <figure className="campus-media">
              <img
                src="/media/construction-1200.webp"
                alt={copy.campusCaption}
                width="1200"
                height="675"
                loading="lazy"
                decoding="async"
              />
              <figcaption>{copy.campusCaption}</figcaption>
            </figure>
            <div className="campus-copy">
              <p className="eyebrow">{copy.campusEyebrow}</p>
              <h2 className="display">{copy.campusTitle}</h2>
              <p className="lede">{copy.campusLede}</p>
              <dl className="fact-list">
                {copy.campusFacts.map(([term, detail]) => (
                  <div className="fact-row" key={term}>
                    <dt>{term}</dt>
                    <dd>{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {videos.length > 0 && (
        <section className="section" id="media">
          <div className="container-wide">
            <div className="section-head">
              <div>
                <p className="eyebrow">{copy.mediaEyebrow}</p>
                <h2 className="display">{copy.mediaTitle}</h2>
                <p className="lede">{copy.mediaLede}</p>
              </div>
            </div>
            <div className="media-grid">
              {videos.map((video) => {
                const title = lang === "am" ? video.titleAm || video.title : video.title;
                const caption = lang === "am" ? video.captionAm || video.caption : video.caption;
                return (
                  <article className="media-card" key={video.id}>
                    <div className="media-frame">
                      <video
                        controls
                        preload="metadata"
                        playsInline
                        poster={video.posterUrl || undefined}
                      >
                        <source src={video.videoUrl} type={videoType(video.videoUrl)} />
                        {video.captionsUrl ? (
                          <track
                            kind="captions"
                            src={video.captionsUrl}
                            srcLang="en"
                            label={copy.mediaCaptions}
                            default
                          />
                        ) : null}
                      </video>
                    </div>
                    <div className="media-body">
                      <h3>{title}</h3>
                      {caption ? <p>{caption}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section section--ivory-2">
        <div className="container-wide">
          <div className="section-head">
            <div>
              <p className="eyebrow">{copy.plansEyebrow}</p>
              <h2 className="display">{copy.plansTitle}</h2>
              <p className="lede">{copy.plansLede}</p>
            </div>
            <p className="section-head__aside">{copy.plansAside}</p>
          </div>
          <div className="plan-grid">
            {planCards.map((plan) => (
              <article className="plan-card" key={`${plan.type}-${plan.period}`}>
                <span className="plan-type">{plan.typeLabel}</span>
                <h3>{plan.title}</h3>
                <p className="plan-period">{plan.period}</p>
                <div className="plan-meta">
                  <span>
                    {plan.targets === null ? (
                      copy.plansEyebrow
                    ) : (
                      <>
                        <AnimatedNumber value={String(plan.targets)} duration={1200} /> {copy.targets}
                      </>
                    )}
                  </span>
                  <Link className="link-arrow" to="/documents">
                    {copy.openDocuments} <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-wide">
          <p className="eyebrow">{copy.partnersEyebrow}</p>
          <h2 className="display" style={{ marginBottom: "2.5rem" }}>
            {copy.partnersTitle}
          </h2>
          <div className="partners">
            {copy.partners.map((partner) => (
              <article className="partner" key={partner.name}>
                <h3>{partner.name}</h3>
                <p style={{ color: "var(--gold-ink)", fontWeight: 600, fontSize: "0.78rem", marginBottom: "0.6rem" }}>
                  {partner.role}
                </p>
                <p>{partner.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight cta-band">
        <div className="container-wide">
          <div className="cta-inner">
            <div>
              <h2 className="display">{copy.ctaTitle}</h2>
              <p className="lede" style={{ marginTop: "0.9rem" }}>
                {copy.ctaBody}
              </p>
            </div>
            <div className="cta-actions">
              <Link className="btn-solid" to="/documents">
                {copy.ctaPrimary} <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="btn-outline btn-outline--ink" to="/contact">
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
