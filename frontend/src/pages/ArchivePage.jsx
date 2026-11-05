import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { Plus, Edit2, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "../lib/auth";

const slug = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, "-");

export default function ArchivePage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/documents");
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleSave = async (formData) => {
    try {
      if (editDoc) {
        await api.put(`/documents/${editDoc.id}`, formData);
      } else {
        await api.post("/documents", formData);
      }
      setShowModal(false);
      loadDocs();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this document permanently?")) return;
    try {
      await api.del(`/documents/${id}`);
      loadDocs();
    } catch (e) { alert(e.message); }
  };

  // Calculate Stats dynamically
  const stats = {
    total: docs.length,
    active: docs.filter(d => d.status === "Active").length,
    expired: docs.filter(d => d.status === "Expired").length,
    review: docs.filter(d => d.status === "Under Review").length,
    draft: docs.filter(d => d.status === "Draft").length,
    suspended: docs.filter(d => d.status === "Suspended").length,
  };

  let filtered = docs;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(d => 
      (d.title && d.title.toLowerCase().includes(s)) || 
      (d.docNumber && d.docNumber.toLowerCase().includes(s)) ||
      (d.thematic && d.thematic.toLowerCase().includes(s))
    );
  }
  if (statusFilter !== "All") {
    filtered = filtered.filter(d => d.status === statusFilter);
  }

  return (
    <div className="pb-4">
      
      {/* KPI STAT CARDS - Harmonized with Ethio-Biopharma Brand */}
      <div className="row g-3 mb-4">
        <StatCard label="Total Documents" value={stats.total} bg="linear-gradient(135deg, var(--brand-primary) 0%, #1a1a5e 100%)" />
        <StatCard label="Active" value={stats.active} bg="linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)" />
        <StatCard label="Expired" value={stats.expired} bg="linear-gradient(135deg, var(--brand-accent) 0%, #8a3a3a 100%)" />
        <StatCard label="Under Review" value={stats.review} bg="linear-gradient(135deg, var(--brand-secondary) 0%, #b38f1c 100%)" color="var(--brand-dark)" />
        <StatCard label="Draft" value={stats.draft} bg="linear-gradient(135deg, #3498db 0%, #2980b9 100%)" />
        <StatCard label="Suspended" value={stats.suspended} bg="linear-gradient(135deg, #7f8c8d 0%, #34495e 100%)" />
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">Document Archive</h2>
        <div className="d-flex gap-2">
          <input 
            type="text" className="form-control form-control-sm" style={{ width: 250 }} 
            placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select form-select-sm" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Expired">Expired</option>
            <option value="Draft">Draft</option>
            <option value="Suspended">Suspended</option>
          </select>
          <button className="btn-brand btn-sm px-3 d-flex align-items-center" onClick={() => { setEditDoc(null); setShowModal(true); }}>
            <Plus size={14} className="me-1" /> Add Document
          </button>
        </div>
      </div>

      {showModal && <DocumentForm doc={editDoc} onSave={handleSave} onClose={() => setShowModal(false)} />}

      <div className="app-table">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Doc #</th>
              <th>Thematic Area</th>
              <th>Type</th>
              <th>Status</th>
              <th>File</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td><strong>{d.title}</strong></td>
                <td>{d.docNumber || "â€”"}</td>
                <td>{d.thematic === "Other" ? d.thematicOther : d.thematic}</td>
                <td>{d.type === "Other" ? d.typeOther : d.type}</td>
                <td><span className={"badge-status " + slug(d.status)}>{d.status}</span></td>
                <td>
                  {d.fileUrl ? (
                    <a href={`http://localhost:5000${d.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success py-0 px-2">
                      <ExternalLink size={14} />
                    </a>
                  ) : "â€”"}
                </td>
                <td>
                  <button className="btn btn-sm btn-link text-secondary p-0 me-2" onClick={() => { setEditDoc(d); setShowModal(true); }}>
                    <Edit2 size={14}/>
                  </button>
                  <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDelete(d.id)}>
                    <Trash2 size={14}/>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={7} className="text-center text-muted py-4">No documents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, bg, color = "white" }) {
  return (
    <div className="col-md-2 col-4">
      <div style={{ 
        background: bg, 
        color: color, 
        padding: "1rem", 
        borderRadius: "12px", 
        textAlign: "center", 
        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
        border: "1px solid rgba(255,255,255,0.15)",
        transition: "transform 0.2s"
      }}>
        <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{value}</div>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, marginTop: "0.6rem", opacity: 0.9, letterSpacing: "0.8px" }}>{label}</div>
      </div>
    </div>
  );
}

function DocumentForm({ doc, onSave, onClose }) {
  const [data, setData] = useState({
    title: doc?.title || "", docNumber: doc?.docNumber || "",
    thematic: doc?.thematic || "Research and Development", thematicOther: doc?.thematicOther || "",
    type: doc?.type || "Policy", typeOther: doc?.typeOther || "",
    unit: doc?.unit || "", language: doc?.language || "English",
    version: doc?.version || "", firstEndorsement: doc?.firstEndorsement || "",
    recentRenewal: doc?.recentRenewal || "", expiry: doc?.expiry || "",
    status: doc?.status || "Active", notes: doc?.notes || ""
  });
  const fileRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    for (const key in data) fd.append(key, data[key]);
    if (fileRef.current.files[0]) {
      fd.append("file", fileRef.current.files[0]);
    } else if (!doc) {
      alert("Please select a file."); return;
    }
    onSave(fd);
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{doc ? "Edit Document" : "Add Document"}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-2">
                <div className="col-md-12">
                  <label className="form-label">Title *</label>
                  <input className="form-control form-control-sm" value={data.title} onChange={e => setData({...data, title: e.target.value})} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Document Number</label>
                  <input className="form-control form-control-sm" value={data.docNumber} onChange={e => setData({...data, docNumber: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Thematic Area *</label>
                  <select className="form-select form-select-sm" value={data.thematic} onChange={e => setData({...data, thematic: e.target.value})} required>
                    <option>Research and Development</option>
                    <option>Research Training</option>
                    <option>Innovation</option>
                    <option>Governance</option>
                    <option>Production or Manufacturing</option>
                    <option>Other</option>
                  </select>
                </div>
                {data.thematic === "Other" && (
                  <div className="col-md-6">
                    <label className="form-label">Specify Thematic Area</label>
                    <input className="form-control form-control-sm" value={data.thematicOther} onChange={e => setData({...data, thematicOther: e.target.value})} required />
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label">Document Type *</label>
                  <select className="form-select form-select-sm" value={data.type} onChange={e => setData({...data, type: e.target.value})} required>
                    <option>Policy</option>
                    <option>Procedure</option>
                    <option>Guideline</option>
                    <option>Report</option>
                    <option>Form</option>
                    <option>Template</option>
                    <option>Other</option>
                  </select>
                </div>
                {data.type === "Other" && (
                  <div className="col-md-6">
                    <label className="form-label">Specify Type</label>
                    <input className="form-control form-control-sm" value={data.typeOther} onChange={e => setData({...data, typeOther: e.target.value})} required />
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select className="form-select form-select-sm" value={data.status} onChange={e => setData({...data, status: e.target.value})}>
                    <option>Active</option>
                    <option>Under Review</option>
                    <option>Expired</option>
                    <option>Draft</option>
                    <option>Suspended</option>
                  </select>
                </div>
                <div className="col-md-12 mt-3">
                  <label className="form-label">Upload File {doc ? "(Optional to replace)" : "*"}</label>
                  <input type="file" className="form-control form-control-sm" ref={fileRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" required={!doc} />
                  {doc && <small className="text-muted">Current: {doc.fileName}</small>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-brand btn-sm">Save Document</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}