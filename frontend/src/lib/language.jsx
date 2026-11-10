import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "./api";

const LanguageContext = createContext(null);

/** Case/space-insensitive key so admin edits match the copy however it is typed. */
const normalise = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

// Dictionary to catch dynamic database text (Plans & Stats)
const DB_DICT = {
  "5-Year Strategic Plan (2026-2030)": "ባለ 5-ዓመት ስትራቴጂካዊ እቅድ (2026-2030)",
  "Ethio-Biopharma Strategic Roadmap 2026-2035": "የኢትዮ-ባዮፋርማ ስትራቴጂካዊ መንገድ ካርታ 2026-2035",
  "Annual Workplan 2019 E.C. (July 2026 – June 2027)": "ዓመታዊ የስራ እቅድ 2019 ዓ.ም (ሐምሌ 2026 – ሰኔ 2027)",
  "Building an Integrated, Digitally Enabled Biopharmaceutical Campus for Ethiopia": "ለኢትዮጵያ የተቀናጀ፣ በዲጂታል የተደገፈ የባዮፋርማሲዩቲካል ካምፓስ መገንባት",
  
  "Infrastructure and Integrated Biopharmaceutical Campus Development": "መሠረተ ልማት እና የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ ልማት",
  "Technology Transfer, Smart Manufacturing, R&D and Innovation": "ቴክኖሎጂ ሽግግር፣ ብልህ ማምረቻ፣ ምርምር እና ፈጠራ",
  "Regulatory Excellence and Quality Assurance": "የቁጥጥር ልቀት እና የጥራት ማረጋገጫ",
  "Human Capital Development and Talent Management": "የሰው ካፒታል ልማት እና የተሰጥኦ አስተዳደር",

  "Phase I — Civil Construction for ShieldVax Project": "ምዕራፍ I — ለShieldVax ፕሮጀክት ሲቪል ግንባታ",
  "Engage TT Partner(s) for Fill-Finish of Priority Vaccines": "ለቅድሚያ ክትባቶች ሙሌት-ማጠናቀቂያ የቴክኖሎጂ ሽግግር አጋሮችን ማሳተፍ",
  "Finalize Preparation for Phase II Project Implementation of ShieldVax": "ለShieldVax ምዕራፍ II ፕሮጀክት ትግበራ ዝግጅትን ማጠናቀቅ",
  "Operationalizing Ethio-BioPharma Enterprise": "የኢትዮ-ባዮፋርማ ኢንተርፕራይዝን ተግባራዊ ማድረግ",

  "Pre-Launch & Foundation": "ከመጀመሩ በፊት እና መሠረት ማውጣት",
  "Groundbreaking & Quick-Win Build-Out": "የመሠረት ጥልቀት እና ፈጣን አሸናፊ ግንባታ",
  "ShieldVax Commissioning & Quick-Win Scale-Up": "የShieldVax ስርዓተ-ስራ እና ፈጣን አሸናፊ መስፋፋት",
  "Integrated Operations & Vertical Expansion": "የተቀናጀ ስራዎች እና ቁመታዊ መስፋፋት",

  "Vaccine doses per year by 2030": "በ2030 በዓመት የሚመረቱ የክትባት ዶዞች",
  "Blended financing for the campus": "ለካምፓሱ የተቀላቀለ ፋይናንስ",
  "Direct jobs created by 2030": "በ2030 የተፈጠሩ ቀጥታ ስራዎች"
};

const ETHIOPIAN_MONTHS = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታህሳስ", "ጥር", "የካቲት", "መጋቢት",
  "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

/** Gregorian → Ethiopian calendar (Amete Mihret). */
export function toEthiopianDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const jd = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000) + 2440588;
  const r = (jd - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jd - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

export function formatEthiopianDate(value) {
  const converted = toEthiopianDate(value);
  if (!converted) return "";
  return `${converted.day} ${ETHIOPIAN_MONTHS[converted.month - 1] || ""} ${converted.year} ዓ.ም.`;
}

/**
 * House style for Amharic copy: ብር instead of ETB, ቢሊዮን/ሚሊዮን instead of
 * bn/m, Ethiopian years with ዓ.ም., በጀት ዓመት instead of E.F.Y., and the
 * Amharic names of WHO and GMP. Safe to run on text that is already Amharic.
 */
export function localizeAmharic(value) {
  if (typeof value !== "string" || !value) return value;
  return value
    .replace(/\bETB\b/g, "ብር")
    .replace(/(\d[\d.,]*)\s?\bbn\b/gi, "$1 ቢሊዮን")
    .replace(/(\d[\d.,]*)\s?\bm\b/g, "$1 ሚሊዮን")
    .replace(/\bE\.F\.Y\.?\b/g, "በጀት ዓመት")
    .replace(/\bWHO\b/g, "የዓለም ጤና ድርጅት")
    .replace(/\bGMP\b/g, "የመልካም አመራረት ስርዓት")
    .replace(/\b(20[2-9]\d)\s*[–-]\s*(20[2-9]\d)\b(?!\s*ዓ\.ም)/g, (_match, from, to) => `${Number(from) - 7}–${Number(to) - 7} ዓ.ም.`)
    // 2020+ are Gregorian years on this site; 2019 and below are Ethiopian
    // years that must be left alone (and prevents re-converting our output).
    .replace(/(?<![/\d])(20[2-9]\d)(?![/\d])(?!\s*ዓ\.ም)/g, (match, year) => `${Number(year) - 7} ዓ.ም.`);
}

const DEFAULT_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", sortOrder: 0 },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", sortOrder: 1 },
];

/** Compact label for the toggle; the full name stays in the tooltip. */
export const languageShortLabel = (language) => {
  if (language.code === "am") return "አማ";
  if (language.code === "en") return "EN";
  if (language.code === "om") return "OM";
  if (language.code === "so") return "SO";
  if (language.code === "ti") return "ትግ";
  if (language.code === "aa") return "AA";
  return language.code.toUpperCase().slice(0, 3);
};

export function LanguageProvider({ children }) {
  const location = useLocation();
  const [lang, setLangState] = useState(() => localStorage.getItem("app_lang") || "en");
  const [translations, setTranslations] = useState({});
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [loading, setLoading] = useState(true);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem("app_lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = "ltr";
  };

  const reloadTranslations = () => {
    setLoading(true);
    Promise.all([
      api.get("/translations"),
      api.get("/languages/enabled").catch(() => null),
    ])
      .then(([data, enabledLanguages]) => {
        const dict = {};
        data.forEach((row) => { dict[row.key] = row; });
        setTranslations(dict);
        if (Array.isArray(enabledLanguages) && enabledLanguages.length) {
          setLanguages(enabledLanguages);
          const codes = enabledLanguages.map((entry) => entry.code);
          if (!codes.includes(lang)) setLangState(codes.includes("en") ? "en" : codes[0]);
        }
      })
      .catch((err) => console.error("Failed to load translations", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadTranslations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const t = (key, fallback) => {
    // 1. Catch dynamic DB text first (Amharic has a curated dictionary)
    if (lang === "am" && DB_DICT[key]) {
      return DB_DICT[key];
    }

    // 2. Standard database key lookups
    const row = translations[key];
    if (!row) return fallback || key;

    if (lang === "am") return localizeAmharic(row.am || row.en || fallback || key);
    if (lang === "en") return row.en || fallback || key;
    return row.values?.[lang] || row.en || fallback || key;
  };

  // Reverse index by English text: lets the public pages pick up whatever the
  // team edits in Admin → Language Settings without hard-coding a key per line.
  const byEnglish = useMemo(() => {
    const map = new Map();
    Object.values(translations).forEach((row) => {
      if (!row || !row.en) return;
      const key = normalise(row.en);
      const current = map.get(key);
      // Some legacy seeds created the same English string under two keys.
      // The most recently edited row wins, so saving either row in Admin →
      // Language Settings immediately changes the public page.
      if (!current || new Date(row.updatedAt || 0) >= new Date(current.updatedAt || 0)) {
        map.set(key, row);
      }
    });
    return map;
  }, [translations]);

  const tText = useCallback(
    (english, amFallback) => {
      const row = byEnglish.get(normalise(english));
      if (lang === "am") return localizeAmharic(row?.am || amFallback || english);
      if (lang === "en") return row?.en || english;
      return row?.values?.[lang] || row?.en || english;
    },
    [byEnglish, lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tText, loading, reloadTranslations, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}