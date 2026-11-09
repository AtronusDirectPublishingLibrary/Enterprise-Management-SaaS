import { useEffect, useState } from "react";
import { api, API_BASE } from "../lib/api";
import PageHeader from "../components/PageHeader";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Film,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const EMPTY_FORM = {
  title: "",
  titleAm: "",
  caption: "",
  captionAm: "",
  videoUrl: "",
  posterUrl: "",
  captionsUrl: "",
  sortOrder: 0,
  isActive: true,
};

const EMPTY_FILES = { video: null, poster: null, captions: null };

export default function ManageMedia() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState(EMPTY_FILES);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/media/all")
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFiles(EMPTY_FILES);
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (video) => {
    setForm({
      title: video.title || "",
      titleAm: video.titleAm || "",
      caption: video.caption || "",
      captionAm: video.captionAm || "",
      videoUrl: video.videoUrl || "",
      posterUrl: video.posterUrl || "",
      captionsUrl: video.captionsUrl || "",
      sortOrder: video.sortOrder ?? 0,
      isActive: video.isActive ?? true,
    });
    setFiles(EMPTY_FILES);
    setEditingId(video.id);
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFiles(EMPTY_FILES);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, String(value ?? "")));
    if (files.video) data.append("video", files.video);
    if (files.poster) data.append("poster", files.poster);
    if (files.captions) data.append("captions", files.captions);

    try {
      const response = await fetch(
        editingId ? `${API_BASE}/media/${editingId}` : `${API_BASE}/media`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          body: data,
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || `Upload failed (${response.status})`);
      closeForm();
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (video) => {
    try {
      await api.put(`/media/${video.id}`, { isActive: !video.isActive });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const remove = async (video) => {
    if (!confirm(`Remove "${video.title}" from the Media section?`)) return;
    try {
      await api.del(`/media/${video.id}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    const reordered = [...videos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await Promise.all(
        reordered.map((video, order) =>
          video.sortOrder === order ? Promise.resolve() : api.put(`/media/${video.id}`, { sortOrder: order })
        )
      );
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="pb-4 media-library-page">
      <PageHeader
        icon={<Film size={20} />}
        kicker="Communications · media library"
        title="Media library"
        subtitle="Videos published in the Media section of the home page. Upload a video file or link to a hosted one, and attach a WebVTT/SRT captions file so every clip is accessible."
        actions={
          <button className="btn-brand d-flex align-items-center gap-2" onClick={openNew}>
            <Plus size={16} /> Add video
          </button>
        }
      />

      {showForm && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">{editingId ? "Edit video" : "New video"}</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeForm}>
              <X size={14} />
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold">Title (English)</label>
                <input
                  className="form-control"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Phase I construction update"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Title (Amharic)</label>
                <input
                  className="form-control"
                  value={form.titleAm}
                  onChange={(e) => setForm({ ...form, titleAm: e.target.value })}
                  placeholder="አማራጭ"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Caption (English)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  placeholder="Short description shown under the video"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Caption (Amharic)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.captionAm}
                  onChange={(e) => setForm({ ...form, captionAm: e.target.value })}
                  placeholder="አማራጭ"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-bold">Video file</label>
                <input
                  type="file"
                  className="form-control"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
                  onChange={(e) => setFiles({ ...files, video: e.target.files?.[0] || null })}
                />
                <div className="form-text">MP4/WebM/OGG · up to 512 MB</div>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Poster image</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={(e) => setFiles({ ...files, poster: e.target.files?.[0] || null })}
                />
                <div className="form-text">Shown before playback starts</div>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Captions file</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".vtt,.srt"
                  onChange={(e) => setFiles({ ...files, captions: e.target.files?.[0] || null })}
                />
                <div className="form-text">WebVTT or SRT</div>
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-bold">Or video URL</label>
                <input
                  className="form-control"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://…/film.mp4"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Or poster URL</label>
                <input
                  className="form-control"
                  value={form.posterUrl}
                  onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                  placeholder="https://…/poster.jpg"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Or captions URL</label>
                <input
                  className="form-control"
                  value={form.captionsUrl}
                  onChange={(e) => setForm({ ...form, captionsUrl: e.target.value })}
                  placeholder="https://…/captions.vtt"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-bold">Display order</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="media-active"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="media-active">
                    Show on the home page
                  </label>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}

            <div className="mt-3 d-flex gap-2">
              <button type="submit" className="btn-brand d-flex align-items-center gap-2" disabled={saving}>
                <Upload size={15} /> {saving ? "Saving…" : editingId ? "Save changes" : "Publish video"}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner-border text-success" />
      ) : videos.length === 0 ? (
        <div className="card border-0 shadow-sm p-4 text-muted">
          No videos yet. The Media section stays hidden on the home page until you publish the first clip.
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {videos.map((video, index) => (
            <div className="card border-0 shadow-sm" key={video.id}>
              <div className="d-flex align-items-center gap-3 p-3 media-row">
                <div
                  style={{
                    width: 120,
                    height: 68,
                    borderRadius: 4,
                    flexShrink: 0,
                    backgroundColor: "#0b2545",
                    backgroundImage: video.posterUrl ? `url(${video.posterUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "grid",
                    placeItems: "center",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {!video.posterUrl && <Film size={22} />}
                </div>

                <div className="flex-grow-1 media-copy">
                  <div className="fw-bold" style={{ color: "var(--brand-primary)" }}>
                    {video.title}
                    {video.titleAm ? <span className="text-muted fw-normal"> · {video.titleAm}</span> : null}
                  </div>
                  <div className="text-muted small text-truncate" style={{ maxWidth: 520 }}>
                    {video.caption || "No caption"}
                  </div>
                  <div className="d-flex gap-2 mt-1 flex-wrap small">
                    <span className={`badge ${video.isActive ? "bg-success" : "bg-secondary"}`}>
                      {video.isActive ? "Published" : "Hidden"}
                    </span>
                    <span className={`badge ${video.captionsUrl ? "bg-info text-dark" : "bg-light text-dark border"}`}>
                      {video.captionsUrl ? "Captions attached" : "No captions"}
                    </span>
                    <span className="badge bg-light text-dark border">Order {video.sortOrder}</span>
                  </div>
                </div>

                <div className="media-actions">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    title="Move down"
                    disabled={index === videos.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className={`btn btn-sm ${video.isActive ? "btn-outline-success" : "btn-outline-secondary"}`}
                    title={video.isActive ? "Hide from the home page" : "Show on the home page"}
                    onClick={() => toggleActive(video)}
                  >
                    {video.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openEdit(video)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => remove(video)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
