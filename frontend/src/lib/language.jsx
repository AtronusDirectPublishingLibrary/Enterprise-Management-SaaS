import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

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
  }, []);

  const t = (key) => {
    if (!translations[key]) return key;
    return translations[key][lang] || translations[key]["en"] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, loading, reloadTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}