import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { invalidateSiteSettings } from "../lib/siteSettings";
import { SOCIAL_LABELS, SOCIAL_PLATFORMS, SocialIcon } from "../components/SocialLinks";
import { BarChart3, Megaphone, Save, Share2 } from "lucide-react";

const EMPTY = {
  banner: {
    enabled: true,
    message: "",
    messageAm: "",
    linkLabel: "",
    linkLabelAm: "",
    linkUrl: "",
  },
  social: { enabled: true, links: [] },
  visitors: { display: true, measurementId: "", propertyId: "" },
};

function normalise(data) {
  if (!data) return EMPTY;
  const storedLinks = data.social?.links || [];
  return {
    banner: { ...EMPTY.banner, ...(data.banner || {}) },
    social: {
      enabled: data.social?.enabled ?? true,
      links: SOCIAL_PLATFORMS.map((platform) => {
        const existing = storedLinks.find((link) => link.platform === platform);
        return { platform, url: existing?.url || "", enabled: existing?.enabled ?? true };
      }),
    },
    visitors: { ...EMPTY.visitors, ...(data.visitors || {}) },
  };
}

export default function PublicSiteSettings() {
  const [settings, setSettings] = useState(EMPTY);
  const [serviceAccountConfigured, setServiceAccountConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/site-settings/admin")
      .then((data) => {
        setSettings(normalise(data));
        setServiceAccountConfigured(Boolean(data?.analytics?.serviceAccountConfigured));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (section) => {
    setSaving(section);
    setError("");
    setSaved(null);
    try {
      const updated = await api.put("/site-settings", { [section]: settings[section] });
      invalidateSiteSettings();
      setSettings(normalise(updated.settings));
      setSaved(section);
      window.setTimeout(() => setSaved(null), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const updateBanner = (patch) => setSettings((s) => ({ ...s, banner: { ...s.banner, ...patch } }));

  const updateSocialLink = (platform, patch) =>
    setSettings((s) => ({
      ...s,
      social: {
        ...s.social,
        links: s.social.links.map((link) => (link.platform === platform ? { ...link, ...patch } : link)),
      },
    }));

  const updateVisitors = (patch) =>
    setSettings((s) => ({ ...s, visitors: { ...s.visitors, ...patch } }));

  if (loading) return <div className="spinner-border text-success m-4" />;

  return (
    <div className="pb-4">
      <div className="d-flex align-items-start gap-3 mb-4">
        <Megaphone size={28} style={{ color: "var(--brand-primary)" }} />
        <div>
          <h2 className="page-title mb-0">Public site</h2>
          <div className="small text-muted">
            Components shown on the corporate site: the welcome banner above the home page header, the
            footer social links and the visitor counter.
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Welcome banner */}
      <div className="card border-0 shadow-sm p-4 mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Megaphone size={18} /> Welcome banner
          </h5>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="banner-enabled"
              checked={settings.banner.enabled}
              onChange={(e) => updateBanner({ enabled: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="banner-enabled">
              Show the banner on the home page
            </label>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-bold">Message (English)</label>
            <input
              className="form-control"
              value={settings.banner.message}
              onChange={(e) => updateBanner({ message: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-bold">Message (Amharic)</label>
            <input
              className="form-control"
              value={settings.banner.messageAm}
              onChange={(e) => updateBanner({ messageAm: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold">Link label (English)</label>
            <input
              className="form-control"
              value={settings.banner.linkLabel}
              onChange={(e) => updateBanner({ linkLabel: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold">Link label (Amharic)</label>
            <input
              className="form-control"
              value={settings.banner.linkLabelAm}
              onChange={(e) => updateBanner({ linkLabelAm: e.target.value })}
              placeholder="አማራጭ"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold">Link target</label>
            <input
              className="form-control"
              value={settings.banner.linkUrl}
              onChange={(e) => updateBanner({ linkUrl: e.target.value })}
              placeholder="/news or https://…"
            />
          </div>
        </div>

        <div className="mt-3 d-flex align-items-center gap-3">
          <button
            className="btn-brand d-flex align-items-center gap-2"
            onClick={() => save("banner")}
            disabled={saving === "banner"}
          >
            <Save size={15} /> {saving === "banner" ? "Saving…" : "Save banner"}
          </button>
          {saved === "banner" && <span className="text-success small">Saved</span>}
        </div>

        {settings.banner.enabled && settings.banner.message ? (
          <div className="mt-3">
            <div className="small text-muted mb-1">Preview</div>
            <div
              className="d-flex align-items-center gap-3 px-3 py-2"
              style={{ background: "var(--gold)", color: "var(--navy-deep)", borderRadius: 4, fontWeight: 600 }}
            >
              <span style={{ fontSize: "0.8rem" }}>{settings.banner.message}</span>
              {settings.banner.linkUrl && settings.banner.linkLabel ? (
                <span className="text-decoration-underline" style={{ fontSize: "0.78rem" }}>
                  {settings.banner.linkLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Social links */}
      <div className="card border-0 shadow-sm p-4 mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Share2 size={18} /> Social media links
          </h5>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="social-enabled"
              checked={settings.social.enabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, social: { ...s.social, enabled: e.target.checked } }))
              }
            />
            <label className="form-check-label" htmlFor="social-enabled">
              Show the social icons in the footer
            </label>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <span className="small text-muted">Footer preview</span>
          <span
            className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded"
            style={{ background: "#071a31" }}
          >
            {settings.social.links.filter((link) => link.enabled && link.url.trim()).length ? (
              settings.social.links
                .filter((link) => link.enabled && link.url.trim())
                .map((link) => (
                  <span key={link.platform} style={{ color: "#fff" }} title={SOCIAL_LABELS[link.platform]}>
                    <SocialIcon platform={link.platform} size={16} />
                  </span>
                ))
            ) : (
              <span className="small" style={{ color: "rgba(255,255,255,0.6)" }}>
                No icons — add a profile URL below
              </span>
            )}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: 170 }}>Platform</th>
                <th>Profile URL</th>
                <th style={{ width: 110 }} className="text-end">
                  Visible
                </th>
              </tr>
            </thead>
            <tbody>
              {settings.social.links.map((link) => (
                <tr key={link.platform}>
                  <td>
                    <span className="d-inline-flex align-items-center gap-2 fw-semibold">
                      <SocialIcon platform={link.platform} size={16} />
                      {SOCIAL_LABELS[link.platform]}
                    </span>
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={link.url}
                      placeholder={
                        link.platform === "x" ? "https://x.com/your-handle" : `https://${link.platform}.com/…`
                      }
                      onChange={(e) => updateSocialLink(link.platform, { url: e.target.value })}
                    />
                  </td>
                  <td className="text-end">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) => updateSocialLink(link.platform, { enabled: e.target.checked })}
                      aria-label={`Show ${SOCIAL_LABELS[link.platform]} in the footer`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 d-flex align-items-center gap-3">
          <button
            className="btn-brand d-flex align-items-center gap-2"
            onClick={() => save("social")}
            disabled={saving === "social"}
          >
            <Save size={15} /> {saving === "social" ? "Saving…" : "Save links"}
          </button>
          {saved === "social" && <span className="text-success small">Saved</span>}
        </div>
        <div className="form-text mt-2">
          The icons appear in one horizontal row at the bottom of every page. Platforms with an
          empty URL are never shown, even when marked visible — the current links are placeholders
          until you paste the real profile URLs here.
        </div>
      </div>

      {/* Visitor counter */}
      <div className="card border-0 shadow-sm p-4 mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <BarChart3 size={18} /> Website visitor counter
          </h5>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="visitors-enabled"
              checked={settings.visitors.display}
              onChange={(e) => updateVisitors({ display: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="visitors-enabled">
              Show the counter above the footer
            </label>
          </div>
        </div>

        <p className="small text-muted">
          Today, this month, this year and all time are read from Google Analytics 4 through the Data
          API. Until the property and service account are configured, the counter uses the visit log this
          site records itself.
        </p>

        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small fw-bold">GA4 measurement ID</label>
            <input
              className="form-control"
              value={settings.visitors.measurementId}
              onChange={(e) => updateVisitors({ measurementId: e.target.value })}
              placeholder="G-XXXXXXXXXX"
            />
            <div className="form-text">Loads gtag.js and sends page views.</div>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold">GA4 property ID</label>
            <input
              className="form-control"
              value={settings.visitors.propertyId}
              onChange={(e) => updateVisitors({ propertyId: e.target.value })}
              placeholder="123456789"
            />
            <div className="form-text">Numeric property id used for the report.</div>
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold">Read-only service account</label>
            <div
              className={`alert py-2 mb-0 small ${serviceAccountConfigured ? "alert-success" : "alert-warning"}`}
            >
              {serviceAccountConfigured
                ? "GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY are set on the server."
                : "Add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY to backend/.env so the server can read GA4."}
            </div>
          </div>
        </div>

        <div className="mt-3 d-flex align-items-center gap-3">
          <button
            className="btn-brand d-flex align-items-center gap-2"
            onClick={() => save("visitors")}
            disabled={saving === "visitors"}
          >
            <Save size={15} /> {saving === "visitors" ? "Saving…" : "Save counter settings"}
          </button>
          {saved === "visitors" && <span className="text-success small">Saved</span>}
        </div>
      </div>
    </div>
  );
}
