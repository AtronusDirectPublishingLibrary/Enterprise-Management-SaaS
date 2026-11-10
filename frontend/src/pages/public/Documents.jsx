import { useEffect, useState } from "react";
import { api, assetUrl } from "../../lib/api";
import { Helmet } from "react-helmet-async";
import { formatEthiopianDate, useLanguage } from "../../lib/language";
import { Download } from "lucide-react";

export default function Documents() {
  const [items, setItems] = useState([]);
  const { t, tText, lang } = useLanguage();

  useEffect(() => {
    api.get("/documents/public").then(data => setItems(data)).catch(console.error);
  }, []);

  return (
    <div className="container py-5">
      <Helmet><title>{t("documents")} | EBPE</title></Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("documents")}</h1>
      
      <div className="app-table bg-white shadow-sm rounded">
        <table className="table mb-0">
          <thead><tr><th>{tText("Title", "ርዕስ")}</th><th>{tText("Reference", "መለያ ቁጥር")}</th><th>{tText("Type", "ዓይነት")}</th><th>{tText("Date", "ቀን")}</th><th className="text-end">{tText("Action", "እርምጃ")}</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">{t("documentsNoData")}</td></tr> :
              items.map(item => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td><code className="doc-number">{item.docNumber || "—"}</code></td>
                  <td>{item.type === "Other" ? item.typeOther || "Other" : item.type}</td>
                  <td>
                    {lang === "am"
                      ? formatEthiopianDate(item.uploadDate)
                      : new Date(item.uploadDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="text-end">
                    <a href={assetUrl(item.fileUrl)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success">
                      <Download size={14}/> {tText("Download", "አውርድ")}
                    </a>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}