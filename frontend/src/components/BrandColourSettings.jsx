import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Eye, Palette, RotateCcw, Save, Send, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { invalidateSiteSettings } from "../lib/siteSettings";
import {
  DEFAULT_COLORS,
  THEME_TOKENS,
  applyThemeColors,
  contrastRatio,
  isHex,
  readableText,
  useTheme,
} from "../lib/theme";

const GROUPS = ["Brand", "Surfaces", "Text", "Semantic"];

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * One palette, two states: a working draft that can be previewed safely and a
 * published palette that every visitor and staff screen receives. Publishing is
 * an explicit act, so colours can be reviewed before the branding is approved.
 */
export default function BrandColourSettings() {
  const { apply } = useTheme();
  const [draft, setDraft] = useState(DEFAULT_COLORS);
  const [saved, setSaved] = useState(DEFAULT_COLORS);
  const [published, setPublished] = useState(DEFAULT_COLORS);
  const [publishedAt, setPublishedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savedRef = useRef(saved);

  savedRef.current = saved;

  const loadPalette = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/site-settings/admin");
      const theme = data?.theme || {};
      const draftColors = { ...DEFAULT_COLORS, ...(theme.colors || {}) };
      const liveColors = { ...DEFAULT_COLORS, ...(theme.published || {}) };
      setDraft(draftColors);
      setSaved(draftColors);
      setPublished(liveColors);
      setPublishedAt(theme.publishedAt || "");
      setUpdatedAt(theme.updatedAt || "");
    } catch (e) {
      setError(e.message || "Could not load the brand palette.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPalette();
  }, [loadPalette]);

  // Leaving the screen without saving restores the last saved draft so an
  // abandoned experiment never lingers in this browser.
  useEffect(() => {
    return () => applyThemeColors({ ...DEFAULT_COLORS, ...savedRef.current });
  }, []);

  const setColour = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      applyThemeColors({ ...DEFAULT_COLORS, ...next });
      return next;
    });
  };

  const dirty = useMemo(
    () => THEME_TOKENS.some((token) => String(draft[token.key]).toUpperCase() !== String(saved[token.key]).toUpperCase()),
    [draft, saved],
  );
  const unpublished = useMemo(
    () => THEME_TOKENS.some((token) => String(saved[token.key]).toUpperCase() !== String(published[token.key]).toUpperCase()),
    [saved, published],
  );
  const invalidKeys = THEME_TOKENS.filter((token) => !isHex(draft[token.key])).map((token) => token.label);

  const saveDraft = async () => {
    if (invalidKeys.length) {
      setError(`Enter a six-digit hex value for: ${invalidKeys.join(", ")}.`);
      return;
    }
    setBusy("save");
    setError("");
    try {
      await api.put("/site-settings", { theme: { colors: draft } });
      setSaved({ ...draft });
      setUpdatedAt(new Date().toISOString());
      invalidateSiteSettings();
      setNotice("Palette saved as a draft. Publish it to repaint the platform.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const publishPalette = async () => {
    if (invalidKeys.length) {
      setError(`Enter a six-digit hex value for: ${invalidKeys.join(", ")}.`);
      return;
    }
    setBusy("publish");
    setError("");
    try {
      await api.put("/site-settings", { theme: { colors: draft } });
      const result = await api.post("/site-settings/theme/publish", {});
      const theme = result?.theme || {};
      const liveColors = { ...DEFAULT_COLORS, ...(theme.published || draft) };
      setSaved({ ...draft });
      setPublished(liveColors);
      setPublishedAt(theme.publishedAt || new Date().toISOString());
      invalidateSiteSettings();
      apply(liveColors);
      setNotice("Palette published. The website and every workspace screen now use these colours.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const resetDefaults = () => {
    setDraft({ ...DEFAULT_COLORS });
    applyThemeColors({ ...DEFAULT_COLORS });
    setNotice("Approved defaults restored in the preview. Save or publish to keep them.");
  };

  const preview = (key) => ({ ...DEFAULT_COLORS, ...draft })[key];

  return (
    <section className="card border-0 shadow-sm p-4 mb-4 brand-colours">
      <div className="brand-colours__head">
        <div>
          <h4 className="mb-1 d-flex align-items-center gap-2" style={{ color: "var(--brand-primary)", fontWeight: 700 }}>
            <Palette size={22} /> Brand colours
          </h4>
          <p className="small text-muted mb-0 brand-colours__lede">
            The platform palette: the brand, surface, text and semantic colours that the website, tabs, forms, tables,
            reports and print views read from. Change a value to preview it live, then save and publish to apply it
            everywhere.
          </p>
        </div>
        <div className="brand-colours__status">
          <span className={`brand-palette-pill ${unpublished || dirty ? "is-draft" : "is-live"}`}>
            <span />
            {unpublished || dirty ? "Draft palette" : "Live palette"}
          </span>
          <div className="small text-muted">
            {publishedAt ? `Published ${formatDate(publishedAt)}` : "Using approved defaults"}
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-danger py-2 small mt-3">{error}</div> : null}
      {notice ? (
        <div className="alert alert-success py-2 small mt-3 d-flex justify-content-between align-items-center">
          <span className="d-flex align-items-center gap-2"><CheckCircle2 size={14} /> {notice}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} />
        </div>
      ) : null}

      <div className="brand-colours__actions">
        <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={resetDefaults}>
          <RotateCcw size={13} /> Approved defaults
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
          onClick={saveDraft}
          disabled={busy !== "" || !dirty}
        >
          <Save size={13} /> {busy === "save" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          className="btn-brand btn-sm d-flex align-items-center gap-1"
          onClick={publishPalette}
          disabled={busy !== ""}
        >
          <Send size={13} /> {busy === "publish" ? "Publishing…" : "Publish to platform"}
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center"><div className="spinner-border text-success" role="status" /></div>
      ) : (
        <>
          {GROUPS.map((group) => (
            <div className="brand-colours__group" key={group}>
              <div className="brand-colours__group-head">
                <h5>{group}</h5>
                <span>{THEME_TOKENS.filter((token) => token.group === group).length} tokens</span>
              </div>
              <div className="brand-colour-grid">
                {THEME_TOKENS.filter((token) => token.group === group).map((token) => {
                  const value = draft[token.key];
                  const valid = isHex(value);
                  const onWhite = contrastRatio(value, "#FFFFFF");
                  const onCream = contrastRatio(value, "#F5F2EA");
                  const isPublished = String(published[token.key]).toUpperCase() === String(value).toUpperCase();
                  return (
                    <article className="brand-colour" key={token.key}>
                      <div
                        className="brand-colour__swatch"
                        style={{ background: valid ? value : "#d1d5db", color: readableText(valid ? value : "#d1d5db") }}
                      >
                        <span className="brand-colour__sample">Aa</span>
                        <span className="brand-colour__var">{token.cssVar}</span>
                      </div>
                      <div className="brand-colour__body">
                        <div className="brand-colour__title">
                          <strong>{token.label}</strong>
                          {isPublished ? (
                            <span className="brand-colour__live" title="This value is live">
                              <Eye size={11} /> Live
                            </span>
                          ) : (
                            <span className="brand-colour__draft">Preview</span>
                          )}
                        </div>
                        <p className="brand-colour__usage">{token.usage}</p>
                        <div className="brand-colour__input">
                          <input
                            type="color"
                            aria-label={`${token.label} colour picker`}
                            value={valid ? value : (DEFAULT_COLORS[token.key] || "#000000")}
                            onChange={(event) => setColour(token.key, event.target.value.toUpperCase())}
                          />
                          <input
                            type="text"
                            className={`form-control form-control-sm ${valid ? "" : "is-invalid"}`}
                            value={value}
                            spellCheck={false}
                            onChange={(event) => setColour(token.key, event.target.value.toUpperCase())}
                            aria-label={`${token.label} hex value`}
                          />
                        </div>
                        <div className="brand-colour__contrast">
                          <span className={onWhite >= 4.5 ? "is-ok" : onWhite >= 3 ? "is-mid" : "is-low"}>
                            White {onWhite}:1
                          </span>
                          <span className={onCream >= 4.5 ? "is-ok" : onCream >= 3 ? "is-mid" : "is-low"}>
                            Cream {onCream}:1
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="brand-preview">
            <div className="brand-preview__head">
              <div>
                <h5 className="mb-1">Component preview</h5>
                <p className="small text-muted mb-0">How the draft palette reads across the workspace.</p>
              </div>
              <span className="small text-muted d-flex align-items-center gap-1">
                <ShieldCheck size={13} /> Applied to CSS variables only; nothing is stored until you save.
              </span>
            </div>
            <div className="brand-preview__grid">
              <div className="brand-preview__surface" style={{ background: preview("surface") }}>
                <div className="brand-preview__bar" style={{ background: preview("primary"), color: preview("secondarySoft") }}>
                  Workspace header
                </div>
                <div className="brand-preview__body" style={{ background: preview("background"), color: preview("text") }}>
                  <strong style={{ color: preview("primary") }}>Page title</strong>
                  <p className="mb-2" style={{ color: preview("muted") }}>
                    Muted supporting copy sits next to a form field.
                  </p>
                  <div className="brand-preview__field" style={{ background: preview("surface"), borderColor: preview("primary") }}>
                    Form input focus
                  </div>
                  <div className="brand-preview__buttons">
                    <span style={{ background: preview("primary"), color: "#fff" }}>Primary</span>
                    <span style={{ background: preview("secondary"), color: preview("primaryDark") }}>Gold</span>
                    <span style={{ background: preview("accent"), color: "#fff" }}>Accent</span>
                  </div>
                </div>
              </div>
              <div className="brand-preview__surface" style={{ background: preview("surface") }}>
                <table className="brand-preview__table">
                  <thead>
                    <tr style={{ background: preview("primary"), color: "#fff" }}>
                      <th>Report</th>
                      <th>Status</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: preview("text") }}>
                    <tr>
                      <td>Annual operational plan</td>
                      <td><span className="brand-preview__chip" style={{ background: preview("success") }}>On track</span></td>
                      <td>82%</td>
                    </tr>
                    <tr>
                      <td>Strategic plan</td>
                      <td><span className="brand-preview__chip" style={{ background: preview("warning") }}>At risk</span></td>
                      <td>54%</td>
                    </tr>
                    <tr>
                      <td>Overdue report</td>
                      <td><span className="brand-preview__chip" style={{ background: preview("danger") }}>Overdue</span></td>
                      <td>12%</td>
                    </tr>
                  </tbody>
                </table>
                <div className="brand-preview__progress" style={{ background: preview("background") }}>
                  <span style={{ width: "72%", background: preview("primary") }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
