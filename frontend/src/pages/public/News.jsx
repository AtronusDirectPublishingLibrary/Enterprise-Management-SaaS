import { useEffect, useState } from "react";
import { api, assetUrl } from "../../lib/api";
import { Helmet } from "react-helmet-async";
import { formatEthiopianDate, useLanguage } from "../../lib/language";
import { Video } from "lucide-react";

export default function News() {
  const [items, setItems] = useState([]);
  const { t, tText, lang } = useLanguage();

  useEffect(() => {
    api.get("/news").then((data) => setItems(data)).catch(console.error);
  }, []);

  return (
    <div className="container py-5">
      <Helmet><title>{t("news")} | EBPE</title></Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("news")}</h1>

      {items.length === 0 ? (
        <p className="text-muted">
          {tText("No news articles published yet.", "እስካሁን የታተመ የዜና ጽሑፍ የለም።")}
        </p>
      ) : (
        <div className="row g-4">
          {items.map((item) => {
            const title = lang === "am" && item.titleAm ? item.titleAm : item.title;
            const content = lang === "am" && item.contentAm ? item.contentAm : item.content;

            return (
              <div className="col-md-6 col-lg-4" key={item.id}>
                <div className="card h-100 border-0 shadow-sm">
                  {item.imageUrl && <img src={assetUrl(item.imageUrl)} className="card-img-top" style={{ height: 200, objectFit: "cover" }} alt="" />}
                  <div className="card-body d-flex flex-column">
                    <h5 className="fw-bold" style={{ color: "var(--brand-primary)" }}>{title}</h5>
                    <p className="text-muted small text-truncate">{content}</p>
                    {item.videoUrl ? (
                      <a className="small fw-semibold d-inline-flex align-items-center gap-1 mb-2" href={item.videoUrl} target="_blank" rel="noreferrer">
                        <Video size={14} /> {tText("Watch the video", "ቪዲዮውን ይመልከቱ")}
                      </a>
                    ) : null}
                    <span className="text-muted small mt-auto">
                      {tText("By", "በ")} {item.author} ·{" "}
                      {lang === "am"
                        ? formatEthiopianDate(item.createdAt)
                        : new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
