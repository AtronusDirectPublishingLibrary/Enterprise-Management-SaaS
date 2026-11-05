import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";

export default function DropdownManager() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [activeCategory, setActiveCategory] = useState("Status");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dropdowns");
      setData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    try {
      await api.post("/dropdowns", { category: activeCategory, value: newValue.trim() });
      setNewValue("");
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this option?")) return;
    try {
      await api.del(`/dropdowns/${id}`);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const categories = ["Status", "Source of Funds", "Priority", "Project Category"];

  return (
    <div className="card p-4 shadow-sm border-0 mb-4">
      <h4 className="mb-4 d-flex align-items-center" style={{ color: "var(--brand-primary)", fontWeight: 700 }}>
        <SlidersHorizontal size={22} className="me-2" /> Form Dropdown Manager
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
            <form onSubmit={handleAdd} className="d-flex gap-2 mb-3">
              <input 
                className="form-control form-control-sm" 
                placeholder="New option value..." 
                value={newValue} 
                onChange={e => setNewValue(e.target.value)} 
              />
              <button type="submit" className="btn-brand btn-sm text-nowrap"><Plus size={14} className="me-1"/> Add</button>
            </form>

            <div className="d-flex flex-column gap-2">
              {(data[activeCategory] || []).map(opt => (
                <div key={opt.id} className="d-flex justify-content-between align-items-center bg-white p-2 px-3 border rounded">
                  <span style={{ fontSize: "0.9rem" }}>{opt.value}</span>
                  <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDelete(opt.id)}><Trash2 size={14}/></button>
                </div>
              ))}
              {(!data[activeCategory] || data[activeCategory].length === 0) && (
                <div className="text-muted text-center py-3">No options yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}