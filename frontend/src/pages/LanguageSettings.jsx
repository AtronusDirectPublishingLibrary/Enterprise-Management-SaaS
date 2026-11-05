import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import { Save, Globe, Plus, Trash2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function LanguageSettings() {
  const { reloadTranslations } = useLanguage();
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newAm, setNewAm] = useState("");

  const loadData = () => {
    api.get("/translations")
      .then((data) => setTranslations(data))
      .catch((err) => alert("Failed to load translations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (id, field, value) => {
    setTranslations((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async (id, en, am) => {
    setSavingId(id);
    try {
      await api.put(`/translations/${id}`, { en, am });
      if (reloadTranslations) reloadTranslations();
      reloadTranslations(); // Trigger live update
      // Optionally show a toast here instead of alert
    } catch (e) {
      alert("Error saving: " + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newKey || !newEn || !newAm) return;
    try {
      await api.post("/translations", { key: newKey, en: newEn, am: newAm });
      setNewKey(""); setNewEn(""); setNewAm("");
      loadData();
    } catch (e) {
      alert("Error adding translation: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this translation? This may break the UI.")) return;
    try {
      await api.del(`/translations/${id}`);
      loadData();
    } catch (e) {
      alert("Error deleting: " + e.message);
    }
  };

  if (loading) return <div className="spinner-border text-success mt-5" />;

  return (
    <div className="p-4">
      <Helmet>
        <title>Language Settings | EBPE Admin</title>
      </Helmet>
      
      <div className="d-flex align-items-center gap-2 mb-4">
        <Globe size={28} style={{ color: "var(--brand-primary)" }} />
        <h2 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>Language & Translations</h2>
      </div>

      <div className="alert alert-info border-0 shadow-sm mb-4">
        Manage the English and Amharic text displayed across the public website. Changes save instantly to the database.
      </div>

      {/* Add New Translation Form */}
      <div className="card border-0 shadow-sm p-3 mb-4">
        <h5 className="fw-bold mb-3">Add New Translation Key</h5>
        <form onSubmit={handleAdd} className="row g-2 align-items-end">
          <div className="col-md-2">
            <label className="form-label small fw-semibold">Key</label>
            <input className="form-control form-control-sm" placeholder="e.g., welcomeMsg" value={newKey} onChange={e => setNewKey(e.target.value)} required />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold">English (EN)</label>
            <input className="form-control form-control-sm" placeholder="English text" value={newEn} onChange={e => setNewEn(e.target.value)} required />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Amharic (Ã¡Å Â Ã¡Ë†â€º)</label>
            <input className="form-control form-control-sm" placeholder="Amharic text" value={newAm} onChange={e => setNewAm(e.target.value)} required />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn-brand w-100 d-flex align-items-center justify-content-center gap-1"><Plus size={16}/> Add</button>
          </div>
        </form>
      </div>

      {/* Translation Table */}
      <div className="app-table bg-white shadow-sm rounded p-3">
        <table className="table mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: "20%" }}>Key (Identifier)</th>
              <th style={{ width: "35%" }}>English (EN)</th>
              <th style={{ width: "35%" }}>Amharic (Ã¡Å Â Ã¡Ë†â€º)</th>
              <th style={{ width: "10%" }} className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {translations.map((t) => (
              <tr key={t.id}>
                <td><code>{t.key}</code></td>
                <td>
                  <input 
                    className="form-control form-control-sm" 
                    value={t.en} 
                    onChange={(e) => handleChange(t.id, "en", e.target.value)} 
                  />
                </td>
                <td>
                  <input 
                    className="form-control form-control-sm" 
                    value={t.am} 
                    onChange={(e) => handleChange(t.id, "am", e.target.value)} 
                  />
                </td>
                <td className="text-end d-flex justify-content-end gap-2">
                  <button 
                    className="btn btn-sm btn-brand d-inline-flex align-items-center gap-1" 
                    onClick={() => handleSave(t.id, t.en, t.am)}
                    disabled={savingId === t.id}
                  >
                    <Save size={14} /> {savingId === t.id ? "..." : "Save"}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}