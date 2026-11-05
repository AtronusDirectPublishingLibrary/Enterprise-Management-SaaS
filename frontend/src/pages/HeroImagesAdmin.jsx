import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";

export default function HeroImagesAdmin() {
  const [images, setImages] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const loadImages = () => {
    api.get("/hero-images")
      .then(data => { setImages(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => { loadImages(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    try {
      await api.post("/hero-images", { url: newUrl });
      setNewUrl("");
      loadImages();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this image?")) return;
    try {
      await api.del(`/hero-images/${id}`);
      loadImages();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="pb-4">
      <h2 className="page-title mb-4">Manage Hero Images</h2>
      
      <div className="card p-4 mb-4 shadow-sm border-0">
        <h5 className="mb-3">Add New Image</h5>
        <form onSubmit={handleAdd} className="d-flex gap-2">
          <input 
            type="url" 
            className="form-control" 
            placeholder="https://example.com/image.jpg" 
            value={newUrl} 
            onChange={e => setNewUrl(e.target.value)} 
            required
          />
          <button type="submit" className="btn-brand px-4 d-flex align-items-center">
            <Plus size={16} className="me-2" /> Add
          </button>
        </form>
        <small className="text-muted mt-2">Provide a direct URL to a JPG or PNG image.</small>
      </div>

      <div className="row g-3">
        {loading && <div className="spinner-border text-success" />}
        {images.map(img => (
          <div className="col-md-4" key={img.id}>
            <div className="card shadow-sm border-0 h-100">
              <div style={{ height: 180, backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
              <div className="card-body d-flex justify-content-between align-items-center p-3">
                <span className="text-muted" style={{ fontSize: "0.8rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <ImageIcon size={14} className="me-1" /> {img.url}
                </span>
                <button className="btn btn-sm btn-outline-danger py-1 px-2" onClick={() => handleDelete(img.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}