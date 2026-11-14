import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api } from "../lib/api";
import { useBranding } from "../components/BrandingProvider";

const FIELDS = [
  { key: "branding.orgName", label: "Organization name", type: "text", placeholder: "Acme Biopharma" },
  { key: "branding.orgNameAm", label: "Organization name (Amharic)", type: "text", placeholder: "" },
  { key: "branding.primaryColor", label: "Primary color", type: "color" },
  { key: "branding.secondaryColor", label: "Secondary color", type: "color" },
  { key: "branding.logoUrl", label: "Logo URL", type: "text", placeholder: "https://..." },
  { key: "branding.faviconUrl", label: "Favicon URL", type: "text", placeholder: "https://..." },
  { key: "branding.timezone", label: "Timezone", type: "text", placeholder: "Africa/Addis_Ababa" },
  { key: "branding.dateFormat", label: "Date format", type: "text", placeholder: "DD/MM/YYYY" },
];

export default function TenantSettings() {
  const { settings, refresh } = useBranding();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { setForm(settings); }, [settings]);

  const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      await api.put("/tenant/settings", { settings: form });
      await refresh();
      setMsg("Branding settings saved.");
    } catch (err) {
      setMsg(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid" style={{ maxWidth: 820 }}>
      <h4 className="mb-1">Tenant Branding & Settings</h4>
      <p className="text-muted mb-4">Customize your organization's branding. Changes apply to your tenant only.</p>
      {msg && <div className={`alert ${msg.includes("Failed") ? "alert-danger" : "alert-success"} py-2`}>{msg}</div>}
      <form onSubmit={onSave} className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            {FIELDS.map((f) => (
              <div className={f.type === "color" ? "col-md-6" : "col-12"} key={f.key}>
                <label className="form-label fw-semibold">{f.label}</label>
                {f.type === "color" ? (
                  <div className="d-flex align-items-center gap-2">
                    <input type="color" className="form-control form-control-color" value={form[f.key] || "#000000"} onChange={(e) => onChange(f.key, e.target.value)} />
                    <input type="text" className="form-control" value={form[f.key] || ""} onChange={(e) => onChange(f.key, e.target.value)} />
                  </div>
                ) : (
                  <input type="text" className="form-control" value={form[f.key] || ""} placeholder={f.placeholder} onChange={(e) => onChange(f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end">
          <button className="btn btn-brand d-flex align-items-center gap-2" disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
