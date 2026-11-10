import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Users, PlusCircle, Pencil, Trash2, Search, ArrowLeft,
  Save, X, Phone, Mail, Calendar, Truck,
} from "lucide-react";

const STATUS_OPTIONS = ["Available", "On Trip", "On Leave", "Suspended"];

const STATUS_BADGE = {
  Available: "success",
  "On Leave": "warning",
  "On Trip": "info",
  Suspended: "danger",
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  userId: "",
  licenseExpiry: "",
  status: "Available",
};

export default function FleetDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async () => {
    try {
      const [d, u] = await Promise.all([
        api.get("/fleet/drivers"),
        api.get("/hr/staff").catch(() => []), // users for linking
      ]);
      setDrivers(d || []);
      setUsers(u || []);
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

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name || "",
      phone: d.phone || "",
      email: d.email || "",
      userId: d.userId || "",
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split("T")[0] : "",
      status: d.status || "Available",
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
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        userId: form.userId || null,
        licenseExpiry: form.licenseExpiry || null,
        status: form.status,
      };
      if (editing) {
        await api.put(`/fleet/drivers/${editing.id}`, payload);
      } else {
        await api.post("/fleet/drivers", payload);
      }
      await load();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (d, newStatus) => {
    try {
      await api.put(`/fleet/drivers/${d.id}/status`, { status: newStatus });
      await load();
    } catch (err) {
      alert("Failed to change status: " + err.message);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete driver ${d.driverCode} (${d.name})?\n\nThis cannot be undone.`)) return;
    try {
      await api.del(`/fleet/drivers/${d.id}`);
      await load();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (d.driverCode || "").toLowerCase().includes(q) ||
      (d.name || "").toLowerCase().includes(q) ||
      (d.phone || "").toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-5 text-center">Loading drivers...</div>;
  if (error) return <div className="p-5 text-center text-danger">{error}</div>;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Drivers | Fleet | Ethio-Biopharma</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={14} className="me-1" /> Fleet
          </Link>
          <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
            <Users size={24} className="me-2" /> Drivers
          </h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <PlusCircle size={16} className="me-1" /> Add Driver
        </button>
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
                  placeholder="Search by code, name, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-md-3 text-end text-muted small d-flex align-items-center justify-content-end">
              {filtered.length} of {drivers.length} driver{drivers.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>License Expiry</th>
                  <th>Assigned Vehicles</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      {drivers.length === 0
                        ? "No drivers yet. Click Add Driver to register the first one."
                        : "No drivers match your filters."}
                    </td>
                  </tr>
                ) : filtered.map((d) => (
                  <tr key={d.id}>
                    <td><code>{d.driverCode}</code></td>
                    <td><strong>{d.name}</strong></td>
                    <td className="small">
                      <div><Phone size={12} className="me-1" /> {d.phone}</div>
                      {d.email && <div className="text-muted"><Mail size={12} className="me-1" /> {d.email}</div>}
                    </td>
                    <td className="small">
                      {d.licenseExpiry
                        ? <span className={new Date(d.licenseExpiry) < new Date() ? "text-danger fw-bold" : ""}>
                            {new Date(d.licenseExpiry).toLocaleDateString()}
                          </span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="small">
                      {d.vehicles && d.vehicles.length > 0
                        ? d.vehicles.map((v) => <span key={v.id} className="badge bg-secondary me-1">{v.vehicleCode}</span>)
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={d.status}
                        onChange={(e) => changeStatus(d, e.target.value)}
                        style={{ minWidth: "130px" }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(d)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(d)} title="Delete">
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
        <>
          <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={save}>
                  <div className="modal-header">
                    <h5 className="modal-title fw-bold">
                      {editing ? `Edit ${editing.driverCode}` : "Add Driver"}
                    </h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <div className="modal-body">
                    {formError && <div className="alert alert-danger">{formError}</div>}

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Full Name <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Phone size={12} className="me-1" /> Phone <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251-9..." required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Mail size={12} className="me-1" /> Email</label>
                        <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Calendar size={12} className="me-1" /> License Expiry</label>
                        <input type="date" className="form-control" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Status</label>
                        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Link to User (optional)</label>
                        <select className="form-select" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                          <option value="">— Not linked —</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.username})</option>)}
                        </select>
                        <div className="form-text">If linked, the driver can see their trips on their portal.</div>
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
        </>
      )}
    </div>
  );
}