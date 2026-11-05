import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { FileText, Plus, Trash2, Edit2 } from "lucide-react";

export default function ManageDocuments() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", docNumber: "", thematic: "General", type: "Report", notes: "" });
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/documents").then(setItems).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("docNumber", form.docNumber);
    formData.append("thematic", form.thematic);
    formData.append("type", form.type);
    formData.append("notes", form.notes);
    if (file) formData.append("file", file);

    try {
      const token = document.cookie.split("; ").find(row => row.startsWith("ep_auth="))?.split("=")[1];
      const url = editingId ? `http://localhost:5000/api/documents/${editingId}` : "http://localhost:5000/api/documents";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      
      if (!res.ok) throw new Error("Failed to save");
      
      setForm({ title: "", docNumber: "", thematic: "General", type: "Report", notes: "" });
      setFile(null);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this document?")) return;
    await api.del(`/documents/${id}`);
    load();
  };

  const handleEdit = (item) => {
    setForm({ title: item.title, docNumber: item.docNumber || "", thematic: item.thematic, type: item.type, notes: item.notes || "" });
    setEditingId(item.id);
    setShowForm(true);
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold d-flex align-items-center gap-2" style={{ color: "var(--brand-primary)" }}>
          <FileText size={28} /> Manage Documents
        </h2>
        <button className="btn-brand d-flex align-items-center gap-2" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
          <Plus size={16} /> New Document
        </button>
      </div>

      {showForm && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <form onSubmit={handleSubmit}>
            <h5 className="fw-bold mb-3">{editingId ? "Edit Document" : "New Document"}</h5>
            <div className="row g-2 mb-2">
              <div className="col-md-6"><input className="form-control" placeholder="Title" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Doc Number" value={form.docNumber} onChange={e => setForm({...form, docNumber: e.target.value})} /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Thematic Area" value={form.thematic} onChange={e => setForm({...form, thematic: e.target.value})} /></div>
              <div className="col-md-6"><input className="form-control" placeholder="Type (e.g. Annual Report)" value={form.type} onChange={e => setForm({...form, type: e.target.value})} /></div>
              <div className="col-md-6"><input type="file" className="form-control" required={!editingId} onChange={e => setFile(e.target.files[0])} /></div>
              <div className="col-12"><textarea className="form-control" rows={2} placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn-brand me-2">Save</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner-border" /> : (
        <div className="app-table bg-white shadow-sm rounded p-3">
          <table className="table mb-0">
            <thead><tr><th>Title</th><th>Doc #</th><th>Thematic</th><th>Type</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="fw-semibold">{item.title}</td>
                  <td>{item.docNumber}</td>
                  <td>{item.thematic}</td>
                  <td>{item.type}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(item)}><Edit2 size={14}/></button>
                    <button className="btn btn-sm btn-danger d-flex align-items-center gap-1 text-white" onClick={() => handleDelete(item.id)}><Trash2 size={14}/> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}