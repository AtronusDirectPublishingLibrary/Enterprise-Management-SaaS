import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Truck, PlusCircle, Pencil, Trash2, Search, ArrowLeft,
  Save, X, Fuel, Gauge, Calendar,
} from "lucide-react";

const STATUS_OPTIONS = ["Available", "In Use", "Under Maintenance", "Unavailable"];
const TYPE_OPTIONS = ["Sedan", "4x4", "Minibus", "Ambulance", "Truck", "Motorcycle"];
const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric", "Hybrid"];

const STATUS_BADGE = {
  Available: "success",
  "In Use": "warning",
  "Under Maintenance": "danger",
  Unavailable: "secondary",
};

const emptyForm = {
  type: "Sedan",
  licensePlate: "",
  capacity: 4,
  fuelType: "Petrol",
  odometer: "",
  lastMaintenance: "",
  nextMaintenance: "",
  remarks: "",
  assignedDriverId: "",
  status: "Available",
};

export default function FleetVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async () => {
    try {
      const [v, d] = await Promise.all([
        api.get("/fleet/vehicles"),
        api.get("/fleet/drivers"),
      ]);
      setVehicles(v || []);
      setDrivers(d || []);
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

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      type: v.type || "Sedan",
      licensePlate: v.licensePlate || "",
      capacity: v.capacity || 4,
      fuelType: v.fuelType || "Petrol",
      odometer: v.odometer ?? "",
      lastMaintenance: v.lastMaintenance ? v.lastMaintenance.split("T")[0] : "",
      nextMaintenance: v.nextMaintenance ? v.nextMaintenance.split("T")[0] : "",
      remarks: v.remarks || "",
      assignedDriverId: v.assignedDriverId || "",
      status: v.status || "Available",
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
        type: form.type,
        licensePlate: form.licensePlate,
        capacity: Number(form.capacity),
        fuelType: form.fuelType || null,
        odometer: form.odometer === "" ? null : Number(form.odometer),
        lastMaintenance: form.lastMaintenance || null,
        nextMaintenance: form.nextMaintenance || null,
        remarks: form.remarks || null,
        status: form.status,
      };
      if (editing) {
        await api.put(`/fleet/vehicles/${editing.id}`, payload);
        // driver assignment is a separate call (server doesn't accept it in PUT /:id)
        if (editing.assignedDriverId !== form.assignedDriverId || !editing.assignedDriverId && form.assignedDriverId) {
          // no-op for now - driver assignment is managed from Driver side; store only if schema supports
        }
      } else {
        await api.post("/fleet/vehicles", payload);
      }
      await load();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (v, newStatus) => {
    try {
      await api.put(`/fleet/vehicles/${v.id}/status`, { status: newStatus });
      await load();
    } catch (err) {
      alert("Failed to change status: " + err.message);
    }
  };

  const remove = async (v) => {
    if (!window.confirm(`Delete vehicle ${v.vehicleCode} (${v.licensePlate})?\n\nThis cannot be undone.`)) return;
    try {
      await api.del(`/fleet/vehicles/${v.id}`);
      await load();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (v.vehicleCode || "").toLowerCase().includes(q) ||
      (v.licensePlate || "").toLowerCase().includes(q) ||
      (v.type || "").toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-5 text-center">Loading vehicles...</div>;
  if (error) return <div className="p-5 text-center text-danger">{error}</div>;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Vehicles | Fleet | Ethio-Biopharma</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={14} className="me-1" /> Fleet
          </Link>
          <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
            <Truck size={24} className="me-2" /> Vehicles
          </h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <PlusCircle size={16} className="me-1" /> Add Vehicle
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
                  placeholder="Search by code, plate, or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-md-3 text-end text-muted small d-flex align-items-center justify-content-end">
              {filtered.length} of {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>License Plate</th>
                  <th>Capacity</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      {vehicles.length === 0
                        ? "No vehicles yet. Click Add Vehicle to register the first one."
                        : "No vehicles match your filters."}
                    </td>
                  </tr>
                ) : filtered.map((v) => (
                  <tr key={v.id}>
                    <td><code>{v.vehicleCode}</code></td>
                    <td>{v.type}</td>
                    <td><strong>{v.licensePlate}</strong></td>
                    <td>{v.capacity}</td>
                    <td>
                      {v.assignedDriver
                        ? <span>{v.assignedDriver.name} <small className="text-muted">({v.assignedDriver.driverCode})</small></span>
                        : <span className="text-muted">Unassigned</span>}
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={v.status}
                        onChange={(e) => changeStatus(v, e.target.value)}
                        style={{ minWidth: "160px" }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(v)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(v)} title="Delete">
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
                      {editing ? `Edit ${editing.vehicleCode}` : "Add Vehicle"}
                    </h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <div className="modal-body">
                    {formError && <div className="alert alert-danger">{formError}</div>}

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Type <span className="text-danger">*</span></label>
                        <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">License Plate <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="AA-12345" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Capacity <span className="text-danger">*</span></label>
                        <input type="number" className="form-control" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Fuel size={12} className="me-1" /> Fuel Type</label>
                        <select className="form-select" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                          <option value="">—</option>
                          {FUEL_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Gauge size={12} className="me-1" /> Odometer (km)</label>
                        <input type="number" className="form-control" min="0" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Assigned Driver</label>
                        <select className="form-select" value={form.assignedDriverId} onChange={(e) => setForm({ ...form, assignedDriverId: e.target.value })}>
                          <option value="">— Unassigned —</option>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.driverCode})</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Calendar size={12} className="me-1" /> Last Maintenance</label>
                        <input type="date" className="form-control" value={form.lastMaintenance} onChange={(e) => setForm({ ...form, lastMaintenance: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold"><Calendar size={12} className="me-1" /> Next Maintenance</label>
                        <input type="date" className="form-control" value={form.nextMaintenance} onChange={(e) => setForm({ ...form, nextMaintenance: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Status</label>
                        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Remarks</label>
                        <textarea className="form-control" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}></textarea>
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