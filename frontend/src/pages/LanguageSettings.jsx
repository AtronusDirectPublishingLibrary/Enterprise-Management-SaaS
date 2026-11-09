import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import { Save, Globe, Plus, Trash2, Upload, Download, CheckCircle2, Languages, RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet-async";
import PageHeader from "../components/PageHeader";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const BASE_CODES = ["en", "am"];

const flagFor = (code) =>
  ({ en: "🇬🇧", am: "🇪🇹", om: "🇪🇹", so: "🇪🇹", ti: "🇪🇹", aa: "🇪🇹" }[code] || "🌐");

async function downloadFile(path, fallbackName) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    let message = `Download failed (${res.status})`;
    try { message = JSON.parse(text)?.message || message; } catch { /* plain text */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const name = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function LanguageSettings() {
  const { reloadTranslations } = useLanguage();
  const [translations, setTranslations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newAm, setNewAm] = useState("");
  const [newValues, setNewValues] = useState({});
  const [newLanguage, setNewLanguage] = useState({ code: "", name: "", nativeName: "" });
  const [importFile, setImportFile] = useState(null);
  const [importState, setImportState] = useState({ busy: false, message: "", error: "", details: null });
  const [banner, setBanner] = useState("");

  const loadData = async () => {
    try {
      const [rows, langs] = await Promise.all([api.get("/translations"), api.get("/languages")]);
      setTranslations(rows);
      setLanguages(langs);
    } catch (e) {
      setBanner(e.message || "Failed to load translations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const extraLanguages = useMemo(
    () => languages.filter((language) => !BASE_CODES.includes(language.code)),
    [languages]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return translations;
    return translations.filter((row) =>
      [row.key, row.en, row.am, ...Object.values(row.values || {})]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [translations, search]);

  const handleChange = (id, field, value) => {
    setTranslations((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleValueChange = (id, lang, value) => {
    setTranslations((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, values: { ...(row.values || {}), [lang]: value } } : row
      )
    );
  };

  const handleSave = async (row) => {
    setSavingId(row.id);
    try {
      const saved = await api.put(`/translations/${row.id}`, {
        en: row.en,
        am: row.am,
        values: row.values || {},
      });
      setTranslations((prev) => prev.map((entry) => (entry.id === row.id ? saved : entry)));
      reloadTranslations();
      setBanner(`Saved “${row.key}”.`);
    } catch (e) {
      setBanner(e.message || "Could not save this translation.");
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !newEn.trim()) return;
    try {
      await api.post("/translations", {
        key: newKey.trim(),
        en: newEn.trim(),
        am: (newAm || newEn).trim(),
        values: newValues,
      });
      setNewKey(""); setNewEn(""); setNewAm(""); setNewValues({});
      await loadData();
      reloadTranslations();
      setBanner("Translation key added and published.");
    } catch (e) {
      setBanner(e.message || "Could not add the translation key.");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete “${row.key}”? Any page using it will fall back to its English text.`)) return;
    try {
      await api.del(`/translations/${row.id}`);
      setTranslations((prev) => prev.filter((entry) => entry.id !== row.id));
      reloadTranslations();
    } catch (e) {
      setBanner(e.message || "Could not delete the key.");
    }
  };

  const handleAddLanguage = async (e) => {
    e.preventDefault();
    try {
      await api.post("/languages", newLanguage);
      setNewLanguage({ code: "", name: "", nativeName: "" });
      await loadData();
      reloadTranslations();
      setBanner("Language created. It is live in the public language toggle.");
    } catch (err) {
      setBanner(err.message || "Could not create the language.");
    }
  };

  const toggleLanguage = async (language) => {
    try {
      const updated = await api.put(`/languages/${language.code}`, { isEnabled: !language.isEnabled });
      setLanguages((prev) => prev.map((entry) => (entry.code === language.code ? { ...entry, ...updated } : entry)));
      reloadTranslations();
      setBanner(`${language.name} ${updated.isEnabled ? "enabled" : "hidden"} in the language toggle.`);
    } catch (err) {
      setBanner(err.message || "Could not update the language.");
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    const data = new FormData();
    data.append("file", importFile);
    setImportState({ busy: true, message: "Uploading and applying translations…", error: "", details: null });
    try {
      const res = await fetch(`${API_BASE}/languages/import`, {
        method: "POST",
        body: data,
        credentials: "include",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || `Import failed (${res.status})`);
      setImportState({
        busy: false,
        message: `Imported ${result.rows} rows — ${result.translationsCreated} new keys, ${result.translationsUpdated} updated.`,
        error: "",
        details: result,
      });
      setImportFile(null);
      await loadData();
      reloadTranslations();
    } catch (err) {
      setImportState({ busy: false, message: "", error: err.message || "Import failed.", details: null });
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  const languageColumns = languages.length
    ? languages
    : [
        { code: "en", name: "English" },
        { code: "am", name: "Amharic", nativeName: "አማርኛ" },
      ];

  return (
    <div className="language-settings-page">
      <Helmet><title>Language &amp; Translations | EBPE Admin</title></Helmet>

      <PageHeader
        icon={<Globe size={20} />}
        kicker="Communications · multilingual"
        title="Language & Translations"
        subtitle="One table, every language the public site offers. Add a CSV column and the language appears in the toggle as soon as the import is saved."
        actions={
          <>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => downloadFile("/languages/template.csv", "language_template.csv").catch((e) => setBanner(e.message))}>
              <Download size={15} /> CSV template
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => downloadFile("/languages/export.csv", "translations_export.csv").catch((e) => setBanner(e.message))}>
              <Download size={15} /> Export all
            </button>
            <button type="button" className="btn btn-light btn-sm" onClick={() => { loadData(); reloadTranslations(); }}>
              <RefreshCw size={15} /> Refresh
            </button>
          </>
        }
      />

      {banner && (
        <div className="alert alert-info border-0 shadow-sm d-flex justify-content-between align-items-start gap-2">
          <span>{banner}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setBanner("")} />
        </div>
      )}

      {/* Language registry + CSV import */}
      <div className="row g-3 mb-4">
        <div className="col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                <Languages size={18} /> Languages in the toggle
              </h5>
              <p className="small text-muted mb-3">
                Switch a language on and it appears in the public header immediately. New CSV columns create
                languages automatically; a column with translations is enabled on save.
              </p>
              <div className="language-chip-grid">
                {languageColumns.map((language) => {
                  const isBase = BASE_CODES.includes(language.code);
                  const translated = isBase ? null : language.translatedKeys;
                  return (
                    <div key={language.code} className={`language-chip${language.isEnabled === false ? " is-off" : ""}`}>
                      <span className="language-flag" aria-hidden="true">{flagFor(language.code)}</span>
                      <div className="language-chip-body">
                        <strong>{language.name}</strong>
                        <span className="language-native">{language.nativeName || language.name}</span>
                        {translated != null && (
                          <span className="language-count">{translated} translated key{translated === 1 ? "" : "s"}</span>
                        )}
                      </div>
                      {language.isEnabled !== undefined ? (
                        <button
                          type="button"
                          className={`btn btn-sm ${language.isEnabled ? "btn-success" : "btn-outline-secondary"}`}
                          onClick={() => toggleLanguage(language)}
                          title={language.isEnabled ? "Hide from the public toggle" : "Show in the public toggle"}
                        >
                          {language.isEnabled ? "Live" : "Off"}
                        </button>
                      ) : (
                        <span className="badge bg-light text-dark">built in</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <form className="row g-2 align-items-end mt-3" onSubmit={handleAddLanguage}>
                <div className="col-sm-3">
                  <label className="form-label small fw-semibold">Code</label>
                  <input className="form-control form-control-sm" placeholder="om" maxLength={12} value={newLanguage.code} onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value.toLowerCase() })} required />
                </div>
                <div className="col-sm-4">
                  <label className="form-label small fw-semibold">Language</label>
                  <input className="form-control form-control-sm" placeholder="Afan Oromo" value={newLanguage.name} onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })} required />
                </div>
                <div className="col-sm-3">
                  <label className="form-label small fw-semibold">Native name</label>
                  <input className="form-control form-control-sm" placeholder="Afaan Oromoo" value={newLanguage.nativeName} onChange={(e) => setNewLanguage({ ...newLanguage, nativeName: e.target.value })} />
                </div>
                <div className="col-sm-2">
                  <button type="submit" className="btn btn-brand btn-sm w-100"><Plus size={15} /> Add</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-1 d-flex align-items-center gap-2"><Upload size={18} /> Upload a CSV language pack</h5>
              <p className="small text-muted">
                Keep <code>key, en, am</code> and add one column per language — for example
                <code> om, so, ti, aa</code>. New columns become new languages and go live as soon as the
                import finishes.
              </p>
              <form onSubmit={handleImport} className="d-flex flex-column gap-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="form-control form-control-sm"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!importFile || importState.busy}>
                  {importState.busy ? "Importing…" : "Upload & apply"}
                </button>
              </form>
              {importState.message && (
                <div className="alert alert-success mt-3 mb-0 small d-flex gap-2">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <div>
                    {importState.message}
                    {importState.details?.createdLanguages?.length > 0 && (
                      <div>New languages: {importState.details.createdLanguages.join(", ")}</div>
                    )}
                    {importState.details?.enabledLanguages?.length > 0 && (
                      <div>Enabled in the toggle: {importState.details.enabledLanguages.join(", ")}</div>
                    )}
                  </div>
                </div>
              )}
              {importState.error && <div className="alert alert-danger mt-3 mb-0 small">{importState.error}</div>}
              <div className="small text-muted mt-3">
                Tip: download the CSV template first. It already contains the current languages and any
                extra columns you have created, so it round-trips safely.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New key */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Add a translation key</h5>
          <form onSubmit={handleAdd} className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Key</label>
              <input className="form-control form-control-sm" placeholder="e.g., welcomeMsg" value={newKey} onChange={(e) => setNewKey(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">English (EN)</label>
              <input className="form-control form-control-sm" placeholder="English text" value={newEn} onChange={(e) => setNewEn(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Amharic (አማርኛ)</label>
              <input className="form-control form-control-sm" placeholder="Amharic text" value={newAm} onChange={(e) => setNewAm(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-brand w-100 d-flex align-items-center justify-content-center gap-1">
                <Plus size={16} /> Add key
              </button>
            </div>
            {extraLanguages.filter((language) => language.isEnabled).length > 0 && (
              <div className="col-12">
                <div className="row g-2 mt-1">
                  {extraLanguages.filter((language) => language.isEnabled).map((language) => (
                    <div className="col-md-3" key={language.code}>
                      <label className="form-label small fw-semibold">{flagFor(language.code)} {language.name} ({language.code})</label>
                      <input
                        className="form-control form-control-sm"
                        value={newValues[language.code] || ""}
                        onChange={(e) => setNewValues({ ...newValues, [language.code]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Translation matrix */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 className="fw-bold mb-0">Translation matrix</h5>
            <input
              className="form-control form-control-sm translation-search"
              placeholder="Search keys or text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="translation-matrix-wrap">
            <table className="table align-middle translation-matrix mb-0">
              <thead>
                <tr>
                  <th className="matrix-key">Key</th>
                  {languageColumns.map((language) => (
                    <th key={language.code} className={language.isEnabled === false ? "is-off" : ""}>
                      {flagFor(language.code)} {language.name}
                      {language.code !== "en" && language.code !== "am" && (
                        <div className="th-code">{language.code}</div>
                      )}
                    </th>
                  ))}
                  <th className="text-end matrix-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={languageColumns.length + 2} className="text-center text-muted py-4">No translation keys match your search.</td></tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="matrix-key"><code>{row.key}</code></td>
                      <td>
                        <input className="form-control form-control-sm" value={row.en} onChange={(e) => handleChange(row.id, "en", e.target.value)} />
                      </td>
                      <td>
                        <input className="form-control form-control-sm" value={row.am} onChange={(e) => handleChange(row.id, "am", e.target.value)} />
                      </td>
                      {extraLanguages.map((language) => (
                        <td key={language.code} className={language.isEnabled === false ? "is-off" : ""}>
                          <input
                            className="form-control form-control-sm"
                            placeholder={language.isEnabled ? "" : "language is off"}
                            value={row.values?.[language.code] || ""}
                            onChange={(e) => handleValueChange(row.id, language.code, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button className="btn btn-sm btn-brand" onClick={() => handleSave(row)} disabled={savingId === row.id}>
                            <Save size={14} /> {savingId === row.id ? "…" : "Save"}
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(row)} title="Delete key">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="small text-muted mt-2">
            {filtered.length} of {translations.length} keys · {languageColumns.length} language columns
          </div>
        </div>
      </div>
    </div>
  );
}
