import AnimatedNumber from "./AnimatedNumber";

const COPY = {
  en: {
    title: "Website visitors",
    today: "Today",
    month: "This month",
    year: "This year",
    allTime: "All time",
    ga4: "Live figures from Google Analytics 4",
    internal: "Figures recorded by this site · Google Analytics 4 not connected yet",
  },
  am: {
    title: "የድር ጣቢያው ጎብኚዎች",
    today: "ዛሬ",
    month: "በዚህ ወር",
    year: "በዚህ ዓመት",
    allTime: "ከመጀመሪያው ጀምሮ",
    ga4: "ቀጥታ ከGoogle Analytics 4 የተወሰደ",
    internal: "በዚህ ጣቢያ የተመዘገበ · Google Analytics 4 ገና አልተገናኘም",
  },
};

export default function VisitorCounter({ summary, lang = "en" }) {
  if (!summary) return null;
  const copy = COPY[lang] || COPY.en;

  const items = [
    { key: "today", label: copy.today, value: summary.today },
    { key: "month", label: copy.month, value: summary.month },
    { key: "year", label: copy.year, value: summary.year },
    { key: "allTime", label: copy.allTime, value: summary.allTime },
  ];

  return (
    <section className="visitor-band" aria-label={copy.title}>
      <div className="container-wide visitor-band-inner">
        <div className="visitor-band-head">
          <p className="visitor-title">{copy.title}</p>
          <p className="visitor-source">{summary.source === "ga4" ? copy.ga4 : copy.internal}</p>
        </div>
        <div className="visitor-stats">
          {items.map((item) => (
            <div className="visitor-stat" key={item.key}>
              <p className="visitor-value">
                <AnimatedNumber value={String(item.value ?? 0)} duration={1200} />
              </p>
              <p className="visitor-label">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
