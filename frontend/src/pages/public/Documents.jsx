import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Helmet } from "react-helmet-async";
import { useLanguage } from "../../lib/language";
import { Download } from "lucide-react";

export default function Documents() {
  const [items, setItems] = useState([]);
  const { t } = useLanguage();

  useEffect(() => {
    api.get("/documents").then(data => setItems(data)).catch(console.error);
  }, []);

  return (
    <div className="container py-5">
      <Helmet><title>{t("documents")} | EBPE</title></Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>{t("documents")}</h1>
      
      <div className="app-table bg-white shadow-sm rounded">
        <table className="table mb-0">
          <thead><tr><th>Title</th><th>Type</th><th>Date</th><th className="text-end">Action</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={4} className="text-center py-4 text-muted">No documents available yet.</td></tr> : 
              items.map(item => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.type}</td>
                  <td>{new Date(item.uploadDate).toLocaleDateString()}</td>
                  <td className="text-end">
                    <a href={`http://localhost:5000${item.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success">
                      <Download size={14}/> Download
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