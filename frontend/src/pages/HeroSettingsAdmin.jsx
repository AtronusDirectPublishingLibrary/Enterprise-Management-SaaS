import { useEffect, useState } from "react";
import { api } from "../lib/api";
import DropdownManager from "../components/DropdownManager";
import { Plus, Trash2, Image as ImageIcon, Type, LayoutTemplate, SlidersHorizontal } from "lucide-react";

export default function HeroSettingsAdmin() {
  // --- Hero Data State ---
  const [images, setImages] = useState([]);
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");

  // --- Dropdown Manager State ---
  const [dropdownData, setDropdownData] = useState({});
  const [newOptionValue, setNewOptionValue] = useState("");
  const [activeCategory, setActiveCategory] = useState("Status");

  const loadHeroData = async () => {
    setLoading(true);
    try {
      const [imgData, txtData, dropData] = await Promise.all([
        api.get("/hero-images").catch(() => []),
        api.get("/hero-texts").catch(() => []),
        api.get("/dropdowns").catch(() => ({}))
      ]);
      setImages(imgData || []);
      setTexts(txtData || []);
      setDropdownData(dropData || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadHeroData(); }, []);

  // --- Hero Handlers ---
  const handleAddImage = async (e) => {
    e.preventDefault();
    if (!newImgUrl) return;
    try {
      await api.post("/hero-images", { url: newImgUrl });
      setNewImgUrl("");
      loadHeroData();
    } catch (e) { alert(e.message); }
  };

  const handleDeleteImage = async (id) => {
    if (!confirm("Remove this image?")) return;
    try { await api.del(`/hero-images/${id}`); loadHeroData(); } catch (e) { alert(e.message); }
  };

  const handleAddText = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    try {
      await api.post("/hero-texts", { title: newTitle, subtitle: newSubtitle });
      setNewTitle("");
      setNewSubtitle("");
      loadHeroData();
    } catch (e) { alert(e.message); }
  };

  const handleDeleteText = async (id) => {
    if (!confirm("Remove this text?")) return;
    try { await api.del(`/hero-texts/${id}`); loadHeroData(); } catch (e) { alert(e.message); }
  };

  // --- Dropdown Handlers ---
  const handleAddOption = async (e) => {
    e.preventDefault();
    if (!newOptionValue.trim()) return;
    try {
      await api.post("/dropdowns", { category: activeCategory, value: newOptionValue.trim() });
      setNewOptionValue("");
      loadHeroData();
    } catch (e) { alert(e.message); }
  };

  const handleDeleteOption = async (id) => {
    if (!confirm("Delete this option?")) return;
    try {
      await api.del(`/dropdowns/${id}`);
      loadHeroData();
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="spinner-border text-success m-4" />;

  const categories = ["Status", "Source of Funds", "Priority", "Project Category"];

  return (
    <div className="pb-4">
      <div className="d-flex align-items-center mb-4">
        <LayoutTemplate size={28} className="me-3" style={{ color: "var(--brand-primary)" }} />
        <h2 className="page-title mb-0">Settings</h2>
      </div>

      {/* --- DROPDOWN MANAGER --- */}
      <div className="card p-4 shadow-sm border-0 mb-4">
        <h4 className="mb-4 d-flex align-items-center" style={{ color: "var(--brand-primary)", fontWeight: 700 }}>
          <SlidersHorizontal size={22} className="me-2" /> Project Entry Form Editor
        </h4>
        
        <div className="row g-4">
          <div className="col-md-4">
            <div className="list-group shadow-sm">
              {categories.map(c => (
                <button 
                  key={c} 
                  className={"list-group-item list-group-item-action " + (activeCategory === c ? "active" : "")}
                  onClick={() => setActiveCategory(c)}
                  style={activeCategory === c ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" } : {}}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          
          <div className="col-md-8">
            <div className="bg-light p-3 rounded border h-100">
              <h6 className="mb-3 fw-bold">{activeCategory} Options</h6>
              <form onSubmit={handleAddOption} className="d-flex gap-2 mb-3">
                <input 
                  className="form-control form-control-sm" 
                  placeholder="New option value..." 
                  value={newOptionValue} 
                  onChange={e => setNewOptionValue(e.target.value)} 
                />
                <button type="submit" className="btn-brand btn-sm text-nowrap"><Plus size={14} className="me-1"/> Add</button>
              </form>

              <div className="d-flex flex-column gap-2" style={{ maxHeight: 200, overflowY: "auto" }}>
                {(dropdownData[activeCategory] || []).map(opt => (
                  <div key={opt.id} className="d-flex justify-content-between align-items-center bg-white p-2 px-3 border rounded">
                    <span style={{ fontSize: "0.9rem" }}>{opt.value}</span>
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteOption(opt.id)}><Trash2 size={14}/></button>
                  </div>
                ))}
                {(!dropdownData[activeCategory] || dropdownData[activeCategory].length === 0) && (
                  <div className="text-muted text-center py-3">No options yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- HERO CONTENT --- */}
      <div className="row g-4">
        {/* LEFT COLUMN: IMAGES */}
        <div className="col-md-6" style={{ minWidth: 0 }}>
          <div className="card p-4 shadow-sm border-0 h-100">
            <h4 className="mb-3 d-flex align-items-center">
              <ImageIcon size={20} className="me-2" /> Hero Images
            </h4>
            <form onSubmit={handleAddImage} className="d-flex gap-2 mb-4">
              <input 
                type="url" 
                className="form-control form-control-sm" 
                placeholder="https://example.com/image.jpg" 
                value={newImgUrl} 
                onChange={e => setNewImgUrl(e.target.value)} 
                required
              />
              <button type="submit" className="btn-brand btn-sm px-3 d-flex align-items-center text-nowrap">
                <Plus size={14} className="me-1" /> Add Image
              </button>
            </form>

            <div className="row g-2">
              {images.map(img => (
                <div className="col-12" key={img.id}>
                  <div className="d-flex align-items-center bg-light rounded p-2 border">
                    <div style={{ width: 80, height: 45, backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 4, flexShrink: 0 }} />
                    <span className="ms-3 text-muted text-truncate" style={{ fontSize: "0.8rem", flex: 1, minWidth: 0 }}>
                      {img.url}
                    </span>
                    <button className="btn btn-sm btn-outline-danger py-1 px-2 ms-2 flex-shrink-0" onClick={() => handleDeleteImage(img.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {images.length === 0 && <p className="text-muted">No images uploaded yet.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TEXTS */}
        <div className="col-md-6" style={{ minWidth: 0 }}>
          <div className="card p-4 shadow-sm border-0 h-100">
            <h4 className="mb-3 d-flex align-items-center">
              <Type size={20} className="me-2" /> Hero Texts
            </h4>
            <form onSubmit={handleAddText} className="mb-4 bg-light p-3 rounded border">
              <div className="mb-2">
                <label className="form-label text-muted mb-1" style={{ fontSize: "0.8rem" }}>Title</label>
                <input 
                  type="text" 
                  className="form-control form-control-sm" 
                  placeholder="e.g. Unlocking the Economic Potential..." 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label text-muted mb-1" style={{ fontSize: "0.8rem" }}>Subtitle (Optional)</label>
                <textarea 
                  className="form-control form-control-sm" 
                  placeholder="e.g. Ethiobiopharma is driving national health security..." 
                  value={newSubtitle} 
                  onChange={e => setNewSubtitle(e.target.value)} 
                  rows={2}
                />
              </div>
              <button type="submit" className="btn-brand btn-sm w-100 d-flex justify-content-center align-items-center">
                <Plus size={14} className="me-1" /> Add Text Sequence
              </button>
            </form>

            <div className="d-flex flex-column gap-2">
              {texts.map(txt => (
                <div className="d-flex align-items-start bg-light rounded p-3 border" key={txt.id}>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h6 className="mb-1 fw-bold text-truncate" style={{ color: "var(--brand-primary)" }}>{txt.title}</h6>
                    {txt.subtitle && <p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>{txt.subtitle}</p>}
                  </div>
                  <button className="btn btn-sm btn-outline-danger py-1 px-2 ms-2 flex-shrink-0" onClick={() => handleDeleteText(txt.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {texts.length === 0 && <p className="text-muted">No texts created yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}