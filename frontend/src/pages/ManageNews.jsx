import { useCallback, useEffect, useMemo, useState } from "react";
import { api, assetUrl } from "../lib/api";
import {
  CheckCircle2,
  Edit2,
  Globe2,
  Newspaper,
  Plus,
  RefreshCw,
  Send,
  Share2,
  SlidersHorizontal,
  Trash2,
  AlertCircle,
} from "lucide-react";

const CHANNEL_LABELS = {
  facebook: "Facebook Page",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  telegram: "Telegram",
  webhook: "Automation webhook",
};

const EMPTY_FORM = {
  title: "",
  content: "",
  titleAm: "",
  contentAm: "",
  videoUrl: "",
  socialCaption: "",
  autoShare: true,
};

const statusTone = (status) => {
  if (status === "SENT") return "bg-success";
  if (status === "FAILED") return "bg-danger";
  if (status === "SKIPPED") return "bg-secondary";
  if (status === "SENDING") return "bg-info text-dark";
  return "bg-warning text-dark";
};

export default function ManageNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [social, setSocial] = useState(null);
  const [queue, setQueue] = useState([]);
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");
  const [socialError, setSocialError] = useState("");

  const loadNews = useCallback(async () => {
    try {
      setItems(await api.get("/news"));
    } catch (e) {
      setSocialError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSocial = useCallback(async () => {
    try {
      const [settings, posts] = await Promise.all([api.get("/social/settings"), api.get("/social/queue?limit=30")]);
      setSocial(settings);
      setQueue(Array.isArray(posts) ? posts : []);
    } catch (e) {
      setSocialError(e.message);
    }
  }, []);

  useEffect(() => {
    loadNews();
    loadSocial();
  }, [loadNews, loadSocial]);

  const configuredCount = useMemo(
    () => Object.values(social?.configured || {}).filter(Boolean).length,
    [social],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImage(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("content", form.content);
    formData.append("titleAm", form.titleAm);
    formData.append("contentAm", form.contentAm);
    formData.append("videoUrl", form.videoUrl.trim());
    formData.append("socialCaption", form.socialCaption.trim());
    formData.append("autoShare", form.autoShare ? "true" : "false");
    if (image) formData.append("image", image);

    try {
      const shouldShare = form.autoShare;
      const distributionOn = Boolean(social?.settings?.enabled && social?.settings?.autoPost);
      if (editingId) await api.upload(`/news/${editingId}`, formData, "PUT");
      else await api.upload("/news", formData);
      resetForm();
      await loadNews();
      await loadSocial();
      setSocialNotice(
        shouldShare && distributionOn
          ? "Article saved. Social posts were queued."
          : shouldShare
            ? "Article saved. Social distribution is off, so no posts were queued."
            : "Article saved without social distribution.",
      );
    } catch (e) {
      setSocialError(e.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this article? Queued social posts for it will also be removed.")) return;
    try {
      await api.del(`/news/${id}`);
      await loadNews();
      await loadSocial();
    } catch (e) {
      setSocialError(e.message);
    }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title,
      content: item.content,
      titleAm: item.titleAm || "",
      contentAm: item.contentAm || "",
      videoUrl: item.videoUrl || "",
      socialCaption: item.socialCaption || "",
      autoShare: item.autoShare !== false,
    });
    setEditingId(item.id);
    setImage(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveSettings = async (patch) => {
    if (!social) return;
    setSocialBusy(true);
    setSocialError("");
    try {
      const nextSettings = {
        ...social.settings,
        ...patch,
        channels: { ...social.settings.channels, ...(patch.channels || {}) },
      };
      const response = await api.put("/social/settings", {
        enabled: nextSettings.enabled,
        autoPost: nextSettings.autoPost,
        includeImage: nextSettings.includeImage,
        hashtags: nextSettings.hashtags,
        channels: nextSettings.channels,
      });
      setSocial({ ...social, ...response, settings: response.settings });
      setSocialNotice("Social distribution settings saved.");
    } catch (e) {
      setSocialError(e.message);
    } finally {
      setSocialBusy(false);
    }
  };

  const runQueue = async () => {
    setSocialBusy(true);
    setSocialError("");
    try {
      const summary = await api.post("/social/run", {});
      setSocialNotice(`Queue run: ${summary.sent} sent, ${summary.failed} failed, ${summary.skipped} skipped.`);
      await loadSocial();
    } catch (e) {
      setSocialError(e.message);
    } finally {
      setSocialBusy(false);
    }
  };

  const retryPost = async (post) => {
    try {
      await api.post(`/social/queue/${post.id}/retry`, {});
      setSocialNotice("Post returned to the queue.");
      await loadSocial();
    } catch (e) {
      setSocialError(e.message);
    }
  };

  const shareNow = async (article) => {
    try {
      const channels = Object.entries(social?.settings?.channels || {}).filter(([, enabled]) => enabled).map(([channel]) => channel);
      if (!channels.length) throw new Error("Choose at least one channel in Social distribution first.");
      await api.post(`/social/news/${article.id}`, { channels });
      setSocialNotice(`Queued “${article.title}” for ${channels.length} channel${channels.length === 1 ? "" : "s"}.`);
      await loadSocial();
      await runQueue();
    } catch (e) {
      setSocialError(e.message);
    }
  };

  return (
    <div className="p-4 news-studio">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="page-kicker">Public site · editorial and distribution</div>
          <h2 className="fw-bold d-flex align-items-center gap-2 mb-1" style={{ color: "var(--brand-primary)" }}>
            <Newspaper size={28} /> News studio
          </h2>
          <p className="small text-muted mb-0">
            Publish to the website and distribute to social channels from the same article. Every destination gets its own delivery receipt and retry history.
          </p>
        </div>
        <button className="btn-brand btn-sm d-flex align-items-center gap-2" onClick={() => { resetForm(); setShowForm((open) => !open); }}>
          <Plus size={16} /> {showForm ? "Close editor" : "New article"}
        </button>
      </div>

      {socialError ? <div className="alert alert-danger py-2 small d-flex justify-content-between"><span>{socialError}</span><button className="btn-close" onClick={() => setSocialError("")} /></div> : null}
      {socialNotice ? <div className="alert alert-success py-2 small d-flex justify-content-between"><span>{socialNotice}</span><button className="btn-close" onClick={() => setSocialNotice("")} /></div> : null}

      <section className="social-studio-card mb-4">
        <div className="social-studio-head">
          <div className="social-studio-title">
            <span className="social-studio-mark"><Share2 size={19} /></span>
            <div>
              <h3>Social distribution</h3>
              <p>Automatic posting runs when an article is saved. Unconfigured destinations are recorded as skipped, never silently lost.</p>
            </div>
          </div>
          <div className="social-studio-status">
            <span className={`social-live-pill ${social?.settings?.enabled && social?.settings?.autoPost ? "is-live" : ""}`}>
              <span /> {social?.settings?.enabled && social?.settings?.autoPost ? "Auto-post on" : "Auto-post off"}
            </span>
            <button className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" onClick={runQueue} disabled={socialBusy}>
              <RefreshCw size={13} className={socialBusy ? "spin" : ""} /> Run queue
            </button>
          </div>
        </div>

        {social ? (
          <>
            <div className="social-studio-body">
              <div className="social-panel">
                <div className="social-panel__head">
                  <SlidersHorizontal size={14} />
                  <span>Automation</span>
                </div>
                <div className="social-option-stack">
                  <label className={`social-option ${social.settings.enabled ? "is-on" : ""}`}>
                    <input type="checkbox" checked={social.settings.enabled} onChange={(e) => saveSettings({ enabled: e.target.checked })} />
                    <span className="social-option__copy">
                      <strong>Enable distribution</strong>
                      <small>Master switch for every social destination.</small>
                    </span>
                  </label>
                  <label className={`social-option ${social.settings.autoPost ? "is-on" : ""}`}>
                    <input type="checkbox" checked={social.settings.autoPost} onChange={(e) => saveSettings({ autoPost: e.target.checked })} />
                    <span className="social-option__copy">
                      <strong>Auto-post new articles</strong>
                      <small>Queue a post for every destination the moment an article is saved.</small>
                    </span>
                  </label>
                  <label className={`social-option ${social.settings.includeImage ? "is-on" : ""}`}>
                    <input type="checkbox" checked={social.settings.includeImage} onChange={(e) => saveSettings({ includeImage: e.target.checked })} />
                    <span className="social-option__copy">
                      <strong>Attach article image</strong>
                      <small>Include the lead image where the channel supports media.</small>
                    </span>
                  </label>
                </div>
                <label className="social-hashtags">
                  <span>Default hashtags</span>
                  <input
                    value={social.settings.hashtags}
                    placeholder="#EthioBiopharma #HealthSecurity"
                    onChange={(e) => setSocial({ ...social, settings: { ...social.settings, hashtags: e.target.value } })}
                    onBlur={(e) => saveSettings({ hashtags: e.target.value })}
                  />
                  <small>Appended to every post, saved when the field loses focus.</small>
                </label>
              </div>

              <div className="social-panel social-panel--channels">
                <div className="social-panel__head">
                  <Globe2 size={14} />
                  <span>Destinations</span>
                  <em>{configuredCount} of {social.channels.length} ready</em>
                </div>
                <div className="social-channel-grid">
                  {social.channels.map((channel) => (
                    <label key={channel.key} className={`social-channel ${social.settings.channels[channel.key] ? "is-on" : ""} ${social.configured[channel.key] ? "is-ready" : "is-unconfigured"}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(social.settings.channels[channel.key])}
                        onChange={(e) => saveSettings({ channels: { [channel.key]: e.target.checked } })}
                      />
                      <span className="social-channel-copy">
                        <strong>{channel.label}</strong>
                        <small>{channel.hint}</small>
                      </span>
                      <span className="social-channel-state">{social.configured[channel.key] ? "Ready" : "Needs credentials"}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="social-studio-foot">
              <span><CheckCircle2 size={13} /> {configuredCount} of {social.channels.length} destinations configured</span>
              <span><Globe2 size={13} /> Credentials stay in <code>backend/.env</code>; they are never shown in this screen.</span>
            </div>
          </>
        ) : <div className="small text-muted">Loading social settings…</div>}
      </section>

      {showForm ? (
        <div className="card border-0 shadow-sm p-4 mb-4 news-editor">
          <form onSubmit={handleSubmit}>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div><h5 className="fw-bold mb-1">{editingId ? "Edit article" : "New article"}</h5><div className="small text-muted">The article is saved first; social delivery runs independently.</div></div>
              <button type="button" className="btn-close" onClick={resetForm} />
            </div>
            <div className="news-editor-grid">
              <div className="news-editor-main">
                <div className="news-field-grid">
                  <div className="news-field"><label className="form-label small fw-semibold">Title (English) *</label><input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="news-field"><label className="form-label small fw-semibold">Title (Amharic)</label><input className="form-control" value={form.titleAm} onChange={(e) => setForm({ ...form, titleAm: e.target.value })} /></div>
                  <div className="news-field"><label className="form-label small fw-semibold">Content (English) *</label><textarea className="form-control" rows={6} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                  <div className="news-field"><label className="form-label small fw-semibold">Content (Amharic)</label><textarea className="form-control" rows={6} value={form.contentAm} onChange={(e) => setForm({ ...form, contentAm: e.target.value })} /></div>
                </div>
              </div>
              <aside className="news-editor-side">
                <div className="news-field"><label className="form-label small fw-semibold">Article image</label><input type="file" accept="image/*" className="form-control" onChange={(e) => setImage(e.target.files[0])} /><div className="form-text">Used on the website card and attached to social posts when enabled.</div></div>
                <div className="news-field"><label className="form-label small fw-semibold">Video link (optional)</label><input type="url" className="form-control" placeholder="https://www.youtube.com/watch?v=…" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} /></div>
                <div className="social-caption-box">
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                    <label className="form-label small fw-semibold mb-0">Social caption (optional)</label>
                    <label className="social-switch mb-0"><input type="checkbox" checked={form.autoShare} onChange={(e) => setForm({ ...form, autoShare: e.target.checked })} /><span>Share when saved</span></label>
                  </div>
                  <textarea className="form-control" rows={4} placeholder="Leave blank to use the article title and opening text." value={form.socialCaption} onChange={(e) => setForm({ ...form, socialCaption: e.target.value })} />
                  <div className="form-text">The public news link and your default hashtags are appended automatically.</div>
                </div>
              </aside>
            </div>
            <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button><button type="submit" className="btn-brand">Save article</button></div>
          </form>
        </div>
      ) : null}

      <div className="row g-4 mb-4">
        {loading ? <div className="col-12 text-center py-4"><div className="spinner-border text-success" /></div> : items.length === 0 ? <div className="col-12 text-muted">No articles yet.</div> : items.map((item) => (
          <div className="col-md-6 col-xl-4" key={item.id}>
            <div className="card h-100 border-0 shadow-sm news-card">
              {item.imageUrl ? <img src={assetUrl(item.imageUrl)} className="card-img-top" alt="" style={{ height: 155, objectFit: "cover" }} /> : <div className="news-card-placeholder"><Newspaper size={26} /></div>}
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <h5 className="fw-bold mb-1">{item.title}</h5>
                  {item.autoShare ? <span className="badge bg-light text-dark border">Social</span> : null}
                </div>
                <p className="text-muted small flex-grow-1">{item.content?.slice(0, 145)}{item.content?.length > 145 ? "…" : ""}</p>
                <div className="small text-muted mb-2">{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {item.author}</div>
                <div className="d-flex flex-wrap gap-1">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(item)} title="Edit"><Edit2 size={14} /></button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => shareNow(item)} title="Queue for social"><Share2 size={14} /></button>
                  <button className="btn btn-sm btn-danger d-flex align-items-center gap-1 text-white ms-auto" onClick={() => handleDelete(item.id)}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="social-queue-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div><h3 className="h6 fw-bold mb-0"><Send size={15} className="me-1" /> Delivery queue</h3><div className="small text-muted">Newest first. Failed posts retry automatically up to three times.</div></div>
          <div className="d-flex gap-2 small text-muted">{social?.queue ? Object.entries(social.queue).map(([status, count]) => <span key={status} className="social-queue-count"><strong>{count}</strong> {status.toLowerCase()}</span>) : null}</div>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 social-queue-table">
            <thead><tr><th>Article</th><th>Channel</th><th>Status</th><th>Attempts</th><th>Detail</th><th className="text-end">Action</th></tr></thead>
            <tbody>
              {queue.length === 0 ? <tr><td colSpan="6" className="text-center text-muted py-4 small">No social deliveries yet. Save an article with sharing enabled.</td></tr> : queue.map((post) => (
                <tr key={post.id}>
                  <td><div className="fw-semibold small">{post.news?.title || "Deleted article"}</div><div className="small text-muted">{new Date(post.createdAt).toLocaleString("en-GB")}</div></td>
                  <td className="small">{CHANNEL_LABELS[post.channel] || post.channel}</td>
                  <td><span className={`badge ${statusTone(post.status)}`}>{post.status}</span></td>
                  <td className="small">{post.attempts}</td>
                  <td className="small text-muted">{post.externalUrl ? <a href={post.externalUrl} target="_blank" rel="noreferrer">Open post</a> : post.error || "—"}</td>
                  <td className="text-end">{["FAILED", "SKIPPED"].includes(post.status) ? <button className="btn btn-sm btn-outline-primary" onClick={() => retryPost(post)}><RefreshCw size={13} /> Retry</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="social-credential-note mt-3">
        <AlertCircle size={14} />
        <span>To activate a channel, set its credentials on the server and restart the API. Facebook: FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN. LinkedIn: LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN. X: X_BEARER_TOKEN. Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. Automation: SOCIAL_WEBHOOK_URL. Public link base: PUBLIC_SITE_URL.</span>
      </div>
    </div>
  );
}
