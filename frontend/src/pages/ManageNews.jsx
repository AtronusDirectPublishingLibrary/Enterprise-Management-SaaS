import { useEffect, useState } from "react";
import { api, assetUrl } from "../lib/api";
import { Newspaper, Plus, Trash2, Edit2 } from "lucide-react";

export default function ManageNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", content: "", titleAm: "", contentAm: "", videoUrl: "" });
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    api.get("/news").then(setItems).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("content", form.content);
    formData.append("titleAm", form.titleAm);
    formData.append("contentAm", form.contentAm);
    formData.append("videoUrl", form.videoUrl.trim());
    if (image) formData.append("image", image);

    try {
      if (editingId) await api.upload(`/news/${editingId}`, formData, "PUT");
      else await api.upload("/news", formData);

      setForm({ title: "", content: "", titleAm: "", contentAm: "", videoUrl: "" });
      setImage(null);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (e) { alert(e.message || "Failed to save"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this article?")) return;
    await api.del(`/news/${id}`);
    load();
  };

  const handleEdit = (item) => {
    setForm({ 
      title: item.title, 
      content: item.content,
      titleAm: item.titleAm || "",
      contentAm: item.contentAm || "",
      videoUrl: item.videoUrl || ""
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold d-flex align-items-center gap-2" style={{ color: "var(--brand-primary)" }}>
          <Newspaper size={28} /> Manage News
        </h2>
        <button className="btn-brand btn-sm d-flex align-items-center gap-2" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({title:"",content:"",titleAm:"",contentAm:"",videoUrl:""}); setImage(null); }}>
          <Plus size={16} /> New Article
        </button>
      </div>

      {showForm && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <form onSubmit={handleSubmit}>
            <h5 className="fw-bold mb-3">{editingId ? "Edit Article" : "New Article"}</h5>
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Title (English)</label>
                <input className="form-control" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Title (Amharic)</label>
                <input className="form-control" value={form.titleAm} onChange={e => setForm({...form, titleAm: e.target.value})} />
              </div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Content (English)</label>
                <textarea className="form-control" rows={4} required value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Content (Amharic)</label>
                <textarea className="form-control" rows={4} value={form.contentAm} onChange={e => setForm({...form, contentAm: e.target.value})} />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Video link (optional)</label>
              <input type="url" className="form-control" placeholder="https://www.youtube.com/watch?v=…" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} />
              <div className="form-text">Shown with the article as a “Watch the video” link.</div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Image Upload</label>
              <input type="file" accept="image/*" className="form-control" onChange={e => setImage(e.target.files[0])} />
            </div>
            <button type="submit" className="btn-brand me-2">Save</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        </div>
      )}

      {loading ? <div className="spinner-border" /> : (
        <div className="row g-4">
          {items.map(item => (
            <div className="col-md-6 col-lg-4" key={item.id}>
              <div className="card h-100 border-0 shadow-sm">
                {item.imageUrl && <img src={assetUrl(item.imageUrl)} className="card-img-top" style={{ height: 150, objectFit: "cover" }} />}
                <div className="card-body">
                  <h5 className="fw-bold">{item.title}</h5>
                  <p className="text-muted small text-truncate">{item.content}</p>
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(item)}><Edit2 size={14}/></button>
                    <button className="btn btn-sm btn-danger d-flex align-items-center gap-1 text-white" onClick={() => handleDelete(item.id)}><Trash2 size={14}/> Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}