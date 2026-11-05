import { useEffect, useState } from "react";
import { api } from "../lib/api";
import DropdownManager from "../components/DropdownManager";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  LayoutTemplate,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Pencil,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react";

const EMPTY_SLIDE = { title: "", tagline: "", subtitle: "", ctaLabel: "", ctaUrl: "", imageUrl: "" };

export default function HeroSettingsAdmin() {
  const [images, setImages] = useState([]);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newSlide, setNewSlide] = useState(EMPTY_SLIDE);
  const [editingId, setEditingId] = useState(null);

  // Dropdown manager state
  const [dropdownData, setDropdownData] = useState({});
  const [newOptionValue, setNewOptionValue] = useState("");
  const [activeCategory, setActiveCategory] = useState("Status");

  const loadData = async () => {
    setLoading(true);
    try {
      const [imgData, slideData, dropData] = await Promise.all([
        api.get("/hero-images").catch(() => []),
        api.get("/hero-texts/all").catch(() => []),
        api.get("/dropdowns").catch(() => ({})),
      ]);
      setImages(imgData || []);
      setSlides(Array.isArray(slideData) ? slideData : []);
      setDropdownData(dropData || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddImage = async (event) => {
    event.preventDefault();
    if (!newImgUrl) return;
    try {
      await api.post("/hero-images", { url: newImgUrl });
      setNewImgUrl("");
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!confirm("Remove this image from the library?")) return;
    try {
      await api.del(`/hero-images/${id}`);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddSlide = async (event) => {
    event.preventDefault();
    if (!newSlide.title.trim()) return;
    try {
      await api.post("/hero-texts", {
        ...newSlide,
        tagline: newSlide.tagline || null,
        subtitle: newSlide.subtitle || null,
        ctaLabel: newSlide.ctaLabel || null,
        ctaUrl: newSlide.ctaUrl || null,
        imageUrl: newSlide.imageUrl || null,
      });
      setNewSlide(EMPTY_SLIDE);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const saveSlide = async (id, patch) => {
    try {
      await api.put(`/hero-texts/${id}`, patch);
      setEditingId(null);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteSlide = async (id) => {
    if (!confirm("Remove this hero slide?")) return;
    try {
      await api.del(`/hero-texts/${id}`);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const moveSlide = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await Promise.all(
        reordered.map((slide, order) =>
          slide.sortOrder === order ? Promise.resolve() : api.put(`/hero-texts/${slide.id}`, { sortOrder: order })
        )
      );
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddOption = async (event) => {
    event.preventDefault();
    if (!newOptionValue.trim()) return;
    try {
      await api.post("/dropdowns", { category: activeCategory, value: newOptionValue.trim() });
      setNewOptionValue("");
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteOption = async (id) => {
    if (!confirm("Delete this option?")) return;
    try {
      await api.del(`/dropdowns/${id}`);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="spinner-border text-success m-4" />;

  const categories = ["Status", "Source of Funds", "Priority", "Project Category"];

  return (
    <div className="pb-4">
      <div className="d-flex align-items-center mb-4">
        <LayoutTemplate size={28} className="me-3" style={{ color: "var(--brand-primary)" }} />
        <div>
          <h2 className="page-title mb-0">Settings</h2>
          <div className="small text-muted">Hero slides transition their image and copy together on the public home page.</div>
        </div>
      </div>

      {/* Dropdown manager */}
      <div className="card p-4 shadow-sm border-0 mb-4">
        <h4 className="mb-4 d-flex align-items-center" style={{ color: "var(--brand-primary)", fontWeight: 700 }}>
          <SlidersHorizontal size={22} className="me-2" /> Project Entry Form Editor
        </h4>

        <div className="row g-4">
          <div className="col-md-4">
            <div className="list-group shadow-sm">
              {categories.map((category) => (
                <button
                  key={category}
                  className={"list-group-item list-group-item-action " + (activeCategory === category ? "active" : "")}
                  onClick={() => setActiveCategory(category)}
                  style={activeCategory === category ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" } : {}}
                >
                  {category}
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
                  onChange={(e) => setNewOptionValue(e.target.value)}
                />
                <button type="submit" className="btn-brand btn-sm text-nowrap">
                  <Plus size={14} className="me-1" /> Add
                </button>
              </form>

              <div className="d-flex flex-column gap-2" style={{ maxHeight: 200, overflowY: "auto" }}>
                {(dropdownData[activeCategory] || []).map((option) => (
                  <div key={option.id} className="d-flex justify-content-between align-items-center bg-white p-2 px-3 border rounded">
                    <span style={{ fontSize: "0.9rem" }}>{option.value}</span>
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteOption(option.id)}>
                      <Trash2 size={14} />
                    </button>
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

      {/* Hero slides + image library */}
      <div className="row g-4">
        <div className="col-lg-7" style={{ minWidth: 0 }}>
          <div className="card p-4 shadow-sm border-0 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0 d-flex align-items-center">
                <ImageIcon size={20} className="me-2" /> Hero slides
              </h4>
              <span className="badge bg-light text-dark border">{slides.length} slides</span>
            </div>

            <form onSubmit={handleAddSlide} className="mb-4 bg-light p-3 rounded border">
              <h6 className="fw-bold mb-2">New slide</h6>
              <div className="row g-2">
                <div className="col-12">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Title (required) - e.g. Building National Health Security"
                    value={newSlide.title}
                    onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Tagline / eyebrow (optional)"
                    value={newSlide.tagline}
                    onChange={(e) => setNewSlide({ ...newSlide, tagline: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <select
                    className="form-select form-select-sm"
                    value={newSlide.imageUrl}
                    onChange={(e) => setNewSlide({ ...newSlide, imageUrl: e.target.value })}
                  >
                    <option value="">Background: use image library in order</option>
                    {images.map((image) => (
                      <option key={image.id} value={image.url}>{image.url.split("/").pop()}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Subtitle / supporting sentence"
                    value={newSlide.subtitle}
                    onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                  />
                </div>
                <div className="col-md-5">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Button label (optional)"
                    value={newSlide.ctaLabel}
                    onChange={(e) => setNewSlide({ ...newSlide, ctaLabel: e.target.value })}
                  />
                </div>
                <div className="col-md-7">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Button link, e.g. /about or https://..."
                    value={newSlide.ctaUrl}
                    onChange={(e) => setNewSlide({ ...newSlide, ctaUrl: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Or paste a custom image URL"
                    value={newSlide.imageUrl?.startsWith("http") ? newSlide.imageUrl : ""}
                    onChange={(e) => setNewSlide({ ...newSlide, imageUrl: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-brand btn-sm w-100 mt-2">
                <Plus size={14} className="me-1" /> Add slide
              </button>
            </form>

            <div className="d-flex flex-column gap-2">
              {slides.map((slide, index) => (
                <div key={slide.id} className="border rounded bg-light">
                  <div className="d-flex align-items-center gap-2 p-2">
                    <span className="badge bg-dark">{index + 1}</span>
                    <div
                      style={{
                        width: 74,
                        height: 42,
                        borderRadius: 4,
                        flexShrink: 0,
                        backgroundImage: `url(${slide.imageUrl || images[index % Math.max(images.length, 1)]?.url || ""})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: "#334155",
                      }}
                    />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-bold text-truncate" style={{ color: "var(--brand-primary)" }}>{slide.title}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: 12 }}>
                        {slide.tagline ? `${slide.tagline} · ` : ""}{slide.subtitle || "No subtitle"}
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${slide.isActive ? "btn-outline-success" : "btn-outline-secondary"}`}
                      title={slide.isActive ? "Visible on the home page" : "Hidden"}
                      onClick={() => saveSlide(slide.id, { isActive: !slide.isActive })}
                    >
                      {slide.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" title="Move up" onClick={() => moveSlide(index, -1)} disabled={index === 0}>
                      <ArrowUp size={13} />
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" title="Move down" onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1}>
                      <ArrowDown size={13} />
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" title="Edit" onClick={() => setEditingId(editingId === slide.id ? null : slide.id)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => deleteSlide(slide.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {editingId === slide.id && (
                    <SlideEditor
                      slide={slide}
                      images={images}
                      onCancel={() => setEditingId(null)}
                      onSave={(patch) => saveSlide(slide.id, patch)}
                    />
                  )}
                </div>
              ))}
              {slides.length === 0 && (
                <p className="text-muted mb-0">
                  No slides yet. Until you add one, the home page falls back to the translated default hero copy.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5" style={{ minWidth: 0 }}>
          <div className="card p-4 shadow-sm border-0 h-100">
            <h4 className="mb-3 d-flex align-items-center">
              <ImageIcon size={20} className="me-2" /> Image library
            </h4>
            <form onSubmit={handleAddImage} className="d-flex gap-2 mb-4">
              <input
                type="url"
                className="form-control form-control-sm"
                placeholder="https://example.com/image.jpg"
                value={newImgUrl}
                onChange={(e) => setNewImgUrl(e.target.value)}
                required
              />
              <button type="submit" className="btn-brand btn-sm px-3 text-nowrap">
                <Plus size={14} className="me-1" /> Add
              </button>
            </form>

            <div className="d-flex flex-column gap-2">
              {images.map((image) => (
                <div className="d-flex align-items-center bg-light rounded p-2 border" key={image.id}>
                  <div
                    style={{
                      width: 80,
                      height: 45,
                      backgroundImage: `url(${image.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  />
                  <span className="ms-3 text-muted text-truncate" style={{ fontSize: "0.8rem", flex: 1, minWidth: 0 }}>
                    {image.url}
                  </span>
                  <button className="btn btn-sm btn-outline-danger py-1 px-2 ms-2 flex-shrink-0" onClick={() => handleDeleteImage(image.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {images.length === 0 && <p className="text-muted">No images uploaded yet.</p>}
            </div>
            <div className="small text-muted mt-3">
              Slides without their own image use this library in order. Both the image and the copy change together every 6 seconds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideEditor({ slide, images, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: slide.title || "",
    tagline: slide.tagline || "",
    subtitle: slide.subtitle || "",
    ctaLabel: slide.ctaLabel || "",
    ctaUrl: slide.ctaUrl || "",
    imageUrl: slide.imageUrl || "",
  });

  return (
    <div className="border-top p-3 bg-white">
      <div className="row g-2">
        <div className="col-12">
          <input className="form-control form-control-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
        </div>
        <div className="col-md-6">
          <input className="form-control form-control-sm" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" />
        </div>
        <div className="col-md-6">
          <select className="form-select form-select-sm" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}>
            <option value="">Background: image library in order</option>
            {images.map((image) => (
              <option key={image.id} value={image.url}>{image.url.split("/").pop()}</option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <textarea className="form-control form-control-sm" rows={2} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" />
        </div>
        <div className="col-md-5">
          <input className="form-control form-control-sm" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Button label" />
        </div>
        <div className="col-md-7">
          <input className="form-control form-control-sm" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/about or https://..." />
        </div>
        <div className="col-12">
          <input className="form-control form-control-sm" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Custom image URL" />
        </div>
      </div>
      <div className="d-flex gap-2 mt-2">
        <button
          className="btn-brand btn-sm"
          onClick={() =>
            onSave({
              ...form,
              tagline: form.tagline || null,
              subtitle: form.subtitle || null,
              ctaLabel: form.ctaLabel || null,
              ctaUrl: form.ctaUrl || null,
              imageUrl: form.imageUrl || null,
            })
          }
        >
          <Save size={13} className="me-1" /> Save
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          <X size={13} className="me-1" /> Cancel
        </button>
      </div>
    </div>
  );
}
