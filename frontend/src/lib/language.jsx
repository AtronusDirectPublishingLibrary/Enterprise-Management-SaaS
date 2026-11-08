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

export function LanguageProvider({ children }) {
  const location = useLocation();
  const [lang, setLangState] = useState(() => localStorage.getItem("app_lang") || "en");
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem("app_lang", newLang);
  };

  const reloadTranslations = () => {
    setLoading(true);
    api.get("/translations")
      .then((data) => {
        const dict = {};
        data.forEach((row) => { dict[row.key] = row; });
        setTranslations(dict);
      })
      .catch((err) => console.error("Failed to load translations", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadTranslations();
  }, [location.pathname]);

  const t = (key, fallback) => {
    // 1. Catch dynamic DB text first
    if (lang === "am" && DB_DICT[key]) {
      return DB_DICT[key];
    }

    // 2. Standard database key lookups
    if (!translations[key]) return fallback || key;
    
    if (lang === "am") {
      return translations[key].am || translations[key].en || fallback || key;
    }
    return translations[key].en || fallback || key;
  };

  // Reverse index by English text: lets the public pages pick up whatever the
  // team edits in Admin → Language Settings without hard-coding a key per line.
  const byEnglish = useMemo(() => {
    const map = new Map();
    Object.values(translations).forEach((row) => {
      if (row && row.en) map.set(normalise(row.en), row);
    });
    return map;
  }, [translations]);

  const tText = useCallback(
    (english, amFallback) => {
      const row = byEnglish.get(normalise(english));
      if (lang === "am") return row?.am || amFallback || english;
      return row?.en || english;
    },
    [byEnglish, lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tText, loading, reloadTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}