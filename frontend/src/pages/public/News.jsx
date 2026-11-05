import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";

export default function News() {
  const [items, setItems] = useState([]);
  const { t, lang } = useLanguage();

  useEffect(() => {
    api.get("/news").then(data => setItems(data)).catch(console.error);
  }, []);

  return (
    <div className="container py-5">
      <Helmet><title>{t("news")} | EBPE</title></Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("news")}</h1>
      
      {items.length === 0 ? <p className="text-muted">No news articles published yet.</p> : (
        <div className="row g-4">
          {items.map(item => {
            const title = lang === 'am' && item.titleAm ? item.titleAm : item.title;
            const content = lang === 'am' && item.contentAm ? item.contentAm : item.content;
            
            return (
              <div className="col-md-6 col-lg-4" key={item.id}>
                <div className="card h-100 border-0 shadow-sm">
                  {item.imageUrl && <img src={`http://localhost:5000${item.imageUrl}`} className="card-img-top" style={{ height: 200, objectFit: "cover" }} />}
                  <div className="card-body">
                    <h5 className="fw-bold" style={{ color: "var(--brand-primary)" }}>{title}</h5>
                    <p className="text-muted small text-truncate">{content}</p>
                    <span className="text-muted small">By {item.author} · {new Date(item.createdAt).toLocaleDateString()}</span>
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