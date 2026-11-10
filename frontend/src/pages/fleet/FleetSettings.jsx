import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Settings, Save, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function FleetSettings() {
  const [settings, setSettings] = useState([]);
  const [original, setOriginal] = useState({});
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  const load = async () => {
    try {
      const rows = await api.get("/fleet/settings");
      setSettings(rows);
      const orig = {};
      const draf = {};
      rows.forEach((r) => {
        orig[r.key] = r.value;
        draf[r.key] = r.value;
      });
      setOriginal(orig);
      setDraft(draf);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (key) => {
    setSavingKey(key);
    setError(null);
    setSavedKey(null);
    try {
      await api.put(`/fleet/settings/${key}`, { value: draft[key] });
      setOriginal({ ...original, [key]: draft[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch (e) {
      setError(`Failed to save ${key}: ${e.message}`);
    } finally {
      setSavingKey(null);
    }
  };

  const hasChange = (key) => draft[key] !== original[key];

  if (loading) return <div className="p-5 text-center">Loading settings...</div>;
  if (error && settings.length === 0) return <div className="p-5 text-center text-danger">{error}</div>;

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "900px" }}>
      <Helmet><title>Fleet Settings | Ethio-Biopharma</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={14} className="me-1" /> Fleet
          </Link>
          <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
            <Settings size={24} className="me-2" /> Fleet Settings
          </h1>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load}>
          <RefreshCw size={14} className="me-1" /> Reload
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={16} className="me-2" /> {error}
        </div>
      )}

      <div className="alert alert-info small">
        These settings control the auto-cleanup job, approval notifications, and default values used throughout
        the fleet module. Changes take effect on the next background job run (every 6 hours).
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: "40%" }}>Setting</th>
                <th style={{ width: "40%" }}>Value</th>
                <th style={{ width: "20%" }} className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.key}>
                  <td>
                    <div className="fw-bold">{s.label}</div>
                    <div className="small text-muted"><code>{s.key}</code></div>
                  </td>
                  <td>
                    {s.type === "boolean" ? (
                      <select
                        className="form-select form-select-sm"
                        value={draft[s.key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : s.type === "number" ? (
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={draft[s.key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={draft[s.key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="text-end">
                    {savedKey === s.key ? (
                      <span className="text-success small">
                        <CheckCircle2 size={14} className="me-1" /> Saved
                      </span>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={!hasChange(s.key) || savingKey === s.key}
                        onClick={() => save(s.key)}
                      >
                        <Save size={14} className="me-1" />
                        {savingKey === s.key ? "Saving..." : "Save"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 small text-muted">
        <strong>Note:</strong> Settings changes are audit-logged under action <code>SETTING_UPDATED</code>.
        View them in the audit log if you need a history of changes.
      </div>
    </div>
  );
}