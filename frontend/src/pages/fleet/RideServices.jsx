import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Car, CarFront, PlusCircle, Pencil, Trash2, Search, ArrowLeft,
  Save, X, Phone, Mail, Power, PowerOff, AlertCircle,
} from "lucide-react";

const emptyForm = {
  name: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  pricingNote: "",
  isActive: true,
};

export default function RideServices() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | active | inactive

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async () => {
    try {
      const items = await api.get("/fleet/ride-providers");
      setProviders(items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      contactName: p.contactName || "",
      contactPhone: p.contactPhone || "",
      contactEmail: p.contactEmail || "",
      pricingNote: p.pricingNote || "",
      isActive: p.isActive ?? true,
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName || null,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        pricingNote: form.pricingNote || null,
        isActive: form.isActive,
      };
      if (editing) {
        await api.put(`/fleet/ride-providers/${editing.id}`, payload);
      } else {
        await api.post("/fleet/ride-providers", payload);
      }
      await load();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p) => {
    try {
      await api.put(`/fleet/ride-providers/${p.id}/toggle`, {});
      await load();
    } catch (err) {
      alert("Failed to toggle: " + err.message);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ride provider "${p.name}"?\n\nThis cannot be undone.`)) return;
    try {
      await api.del(`/fleet/ride-providers/${p.id}`);
      await load();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.contactName || "").toLowerCase().includes(q) ||
      (p.contactPhone || "").toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all"
      || (filterStatus === "active" && p.isActive)
      || (filterStatus === "inactive" && !p.isActive);
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-5 text-center">Loading ride providers...</div>;
  if (error) return <div className="p-5 text-center text-danger">{error}</div>;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Ride Services | Fleet | Ethio-Biopharma</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={14} className="me-1" /> Fleet
          </Link>
          <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
            <CarFront size={24} className="me-2" /> Ride Services
          </h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <PlusCircle size={16} className="me-1" /> Add Provider
        </button>
      </div>

      <div className="alert alert-info small">
        <strong>Ride Services</strong> are the shared-mobility providers (Ride, ZayRide, Feres, etc.) that the organization
        uses as an alternative to vehicles when the fleet isn't sufficient. Add at least one active provider
        before approving ride requests.
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white"><Search size={14} /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or contact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            <div className="col-md-3 text-end text-muted small d-flex align-items-center justify-content-end">
              {filtered.length} of {providers.length} provider{providers.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Pricing Note</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      {providers.length === 0
                        ? "No ride providers yet. Click Add Provider to add your first one."
                        : "No providers match your filters."}
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td className="small">
                      {p.contactName && <div><strong>{p.contactName}</strong></div>}
                      {p.contactPhone && <div><Phone size={12} className="me-1" />{p.contactPhone}</div>}
                      {p.contactEmail && <div className="text-muted"><Mail size={12} className="me-1" />{p.contactEmail}</div>}
                      {!p.contactName && !p.contactPhone && !p.contactEmail && <span className="text-muted">—</span>}
                    </td>
                    <td className="small text-muted">{p.pricingNote || "—"}</td>
                    <td>
                      <span className={`badge bg-${p.isActive ? "success" : "secondary"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        className={`btn btn-sm ${p.isActive ? "btn-outline-warning" : "btn-outline-success"} me-1`}
                        onClick={() => toggle(p)}
                        title={p.isActive ? "Deactivate" : "Activate"}
                      >
                        {p.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={save}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editing ? `Edit ${editing.name}` : "Add Ride Provider"}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">
                      <AlertCircle size={16} className="me-2" /> {formError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-bold">Provider Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Ride, ZayRide, Feres"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Contact Person</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold"><Phone size={12} className="me-1" /> Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.contactPhone}
                        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                        placeholder="+251-..."
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold"><Mail size={12} className="me-1" /> Contact Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.contactEmail}
                        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Pricing Note</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.pricingNote}
                        onChange={(e) => setForm({ ...form, pricingNote: e.target.value })}
                        placeholder="e.g. Fixed rate ETB 15/km, or Minimum fare ETB 200 per trip"
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="providerActive"
                          checked={form.isActive}
                          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="providerActive">
                          Active — available for selection when approving ride requests
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    <X size={14} className="me-1" /> Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={14} className="me-1" /> {saving ? "Saving..." : (editing ? "Update" : "Create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}