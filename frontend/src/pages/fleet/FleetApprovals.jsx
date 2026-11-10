import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Truck, Car, ArrowLeft, CheckCircle2, XCircle, ClipboardList,
  MapPin, Calendar, Users, RefreshCw, AlertCircle,
} from "lucide-react";

const STATUS_BADGE = {
  PENDING: "warning",
  SUPERVISOR_APPROVED: "info",
  FLEET_APPROVED: "info",
  ASSIGNED: "primary",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "secondary",
};

export default function FleetApprovals() {
  const [tab, setTab] = useState("vehicle");
  const [supervisorQueue, setSupervisorQueue] = useState([]);
  const [fleetQueue, setFleetQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [assignModal, setAssignModal] = useState(null); // {req, type: 'vehicle'|'ride'}
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [assignForm, setAssignForm] = useState({ vehicleId: "", driverId: "", providerId: "", estimatedFare: "" });
  const [assignError, setAssignError] = useState(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const supervisorEndpoint = tab === "vehicle" ? "/fleet/requests/pending" : "/fleet/rides/pending";
      const fleetEndpoint = tab === "vehicle" ? "/fleet/requests/fleet-queue" : "/fleet/rides/fleet-queue";
      const [sup, fleet] = await Promise.all([
        api.get(supervisorEndpoint).catch(() => []),
        api.get(fleetEndpoint).catch(() => []),
      ]);
      setSupervisorQueue(sup || []);
      setFleetQueue(fleet || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [tab]);

  const approve = async (req) => {
    if (!window.confirm(`Approve ${req.requestCode}?`)) return;
    try {
      const endpoint = tab === "vehicle"
        ? `/fleet/requests/${req.id}/supervisor-approve`
        : `/fleet/rides/${req.id}/supervisor-approve`;
      await api.post(endpoint, {});
      await load(true);
    } catch (e) {
      alert("Failed to approve: " + e.message);
    }
  };

  const reject = async (req) => {
    const reason = window.prompt(`Reason for rejecting ${req.requestCode}:`);
    if (!reason || reason.trim().length < 2) return;
    try {
      const endpoint = tab === "vehicle"
        ? `/fleet/requests/${req.id}/reject`
        : `/fleet/rides/${req.id}/reject`;
      await api.post(endpoint, { reason: reason.trim() });
      await load(true);
    } catch (e) {
      alert("Failed to reject: " + e.message);
    }
  };

  const openAssign = async (req) => {
    setAssignError(null);
    setAssignForm({ vehicleId: "", driverId: "", providerId: "", estimatedFare: "" });
    setAssignModal({ req, type: tab });
    if (tab === "vehicle") {
      try {
        const [v, d] = await Promise.all([
          api.get("/fleet/vehicles/available"),
          api.get("/fleet/drivers/available"),
        ]);
        setAvailableVehicles(v || []);
        setAvailableDrivers(d || []);
      } catch (e) {
        setAssignError("Failed to load available vehicles/drivers: " + e.message);
      }
    } else {
      try {
        const p = await api.get("/fleet/ride-providers/active");
        setAvailableProviders(p || []);
      } catch (e) {
        setAssignError("Failed to load active providers: " + e.message);
      }
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setAssignError(null);
    setAssignSubmitting(true);
    try {
      if (tab === "vehicle") {
        if (!assignForm.vehicleId || !assignForm.driverId) {
          setAssignError("Select both a vehicle and a driver.");
          setAssignSubmitting(false);
          return;
        }
        await api.post(`/fleet/requests/${assignModal.req.id}/fleet-approve`, {
          vehicleId: assignForm.vehicleId,
          driverId: assignForm.driverId,
        });
      } else {
        if (!assignForm.providerId) {
          setAssignError("Select a ride provider.");
          setAssignSubmitting(false);
          return;
        }
        await api.post(`/fleet/rides/${assignModal.req.id}/fleet-approve`, {
          providerId: assignForm.providerId,
          estimatedFare: assignForm.estimatedFare === "" ? null : Number(assignForm.estimatedFare),
        });
      }
      setAssignModal(null);
      await load(true);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const supervisorCount = supervisorQueue.length;
  const fleetCount = fleetQueue.length;

  if (loading) return <div className="p-5 text-center">Loading approvals...</div>;
  if (error) return <div className="p-5 text-center text-danger">{error}</div>;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Approvals | Fleet | Ethio-Biopharma</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={14} className="me-1" /> Fleet
          </Link>
          <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
            <ClipboardList size={24} className="me-2" /> Fleet Approvals
          </h1>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw size={14} className={`me-1 ${refreshing ? "spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "vehicle" ? "active" : ""}`}
            onClick={() => setTab("vehicle")}
          >
            <Truck size={16} className="me-2" /> Vehicle Requests
            {(supervisorCount + fleetCount) > 0 && (
              <span className="badge bg-danger ms-2">{supervisorCount + fleetCount}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "ride" ? "active" : ""}`}
            onClick={() => setTab("ride")}
          >
            <Car size={16} className="me-2" /> Ride Requests
            {(supervisorCount + fleetCount) > 0 && (
              <span className="badge bg-danger ms-2">{supervisorCount + fleetCount}</span>
            )}
          </button>
        </li>
      </ul>

      <div className="row g-3">
        {/* Supervisor Queue */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold">
                <CheckCircle2 size={18} className="me-2" style={{ color: "var(--brand-primary)" }} />
                Supervisor Queue
                <span className="badge bg-warning text-dark ms-2">{supervisorCount}</span>
              </h5>
              <div className="small text-muted">Requests waiting for your approval</div>
            </div>
            <div className="card-body">
              {supervisorQueue.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <CheckCircle2 size={40} className="text-success opacity-25 mb-2" />
                  <div>No pending approvals</div>
                </div>
              ) : supervisorQueue.map((req) => (
                <div key={req.id} className="border rounded p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold">{req.requestCode}</div>
                      <div className="small text-muted">
                        {req.requester?.firstName} {req.requester?.lastName} ({req.requester?.username})
                        {req.requester?.department ? ` • ${req.requester.department}` : ""}
                      </div>
                    </div>
                    <span className={`badge bg-${STATUS_BADGE[req.status] || "secondary"}`}>
                      {req.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="small mb-2">
                    <div><MapPin size={12} className="me-1" /> {req.pickupLocation} → {req.destination}</div>
                    <div><Calendar size={12} className="me-1" /> {new Date(req.departureDate).toLocaleDateString()} {req.departureTime}</div>
                    <div><Users size={12} className="me-1" /> {req.passengers} passenger{req.passengers === 1 ? "" : "s"}</div>
                    {req.tripPurpose && <div className="text-muted mt-1">{req.tripPurpose}</div>}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-success" onClick={() => approve(req)}>
                      <CheckCircle2 size={14} className="me-1" /> Approve
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => reject(req)}>
                      <XCircle size={14} className="me-1" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fleet Queue */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white">
              <h5 className="mb-0 fw-bold">
                <Truck size={18} className="me-2" style={{ color: "var(--brand-secondary)" }} />
                Fleet Assignment Queue
                <span className="badge bg-info text-dark ms-2">{fleetCount}</span>
              </h5>
              <div className="small text-muted">
                {tab === "vehicle" ? "Assign vehicles and drivers" : "Assign providers to approved rides"}
              </div>
            </div>
            <div className="card-body">
              {fleetQueue.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <ClipboardList size={40} className="text-info opacity-25 mb-2" />
                  <div>Nothing to assign</div>
                </div>
              ) : fleetQueue.map((req) => (
                <div key={req.id} className="border rounded p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold">{req.requestCode}</div>
                      <div className="small text-muted">
                        {req.requester?.firstName} {req.requester?.lastName} ({req.requester?.username})
                      </div>
                    </div>
                    <span className={`badge bg-${STATUS_BADGE[req.status] || "secondary"}`}>
                      {req.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="small mb-2">
                    <div><MapPin size={12} className="me-1" /> {req.pickupLocation} → {req.destination}</div>
                    <div><Calendar size={12} className="me-1" /> {new Date(req.departureDate).toLocaleDateString()} {req.departureTime}</div>
                    <div><Users size={12} className="me-1" /> {req.passengers} passenger{req.passengers === 1 ? "" : "s"}</div>
                    {req.vehicleTypePreferred && <div className="text-muted">Prefers: {req.vehicleTypePreferred}</div>}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-primary" onClick={() => openAssign(req)}>
                      <Truck size={14} className="me-1" /> {tab === "vehicle" ? "Assign Vehicle" : "Assign Provider"}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => reject(req)}>
                      <XCircle size={14} className="me-1" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={submitAssign}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {tab === "vehicle" ? <Truck size={18} className="me-2" /> : <Car size={18} className="me-2" />}
                    Assign for {assignModal.req.requestCode}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setAssignModal(null)}></button>
                </div>
                <div className="modal-body">
                  {assignError && (
                    <div className="alert alert-danger">
                      <AlertCircle size={16} className="me-2" /> {assignError}
                    </div>
                  )}

                  {tab === "vehicle" ? (
                    <>
                      <div className="alert alert-info small">
                        Assigning a vehicle sends the gate pass by email to the requester and the driver.
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Vehicle <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={assignForm.vehicleId}
                          onChange={(e) => setAssignForm({ ...assignForm, vehicleId: e.target.value })}
                        >
                          <option value="">— Select vehicle —</option>
                          {availableVehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.vehicleCode} — {v.type} ({v.licensePlate}) • Cap {v.capacity}
                            </option>
                          ))}
                        </select>
                        {availableVehicles.length === 0 && (
                          <div className="form-text text-danger">
                            No vehicles available. Add one at <Link to="/fleet/vehicles">/fleet/vehicles</Link>.
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Driver <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={assignForm.driverId}
                          onChange={(e) => setAssignForm({ ...assignForm, driverId: e.target.value })}
                        >
                          <option value="">— Select driver —</option>
                          {availableDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.driverCode} — {d.name} ({d.phone})
                            </option>
                          ))}
                        </select>
                        {availableDrivers.length === 0 && (
                          <div className="form-text text-danger">
                            No drivers available. Add one at <Link to="/fleet/drivers">/fleet/drivers</Link>.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Ride Provider <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={assignForm.providerId}
                          onChange={(e) => setAssignForm({ ...assignForm, providerId: e.target.value })}
                        >
                          <option value="">— Select provider —</option>
                          {availableProviders.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.contactPhone ? ` (${p.contactPhone})` : ""}
                            </option>
                          ))}
                        </select>
                        {availableProviders.length === 0 && (
                          <div className="form-text text-danger">
                            No active providers. Add one at <Link to="/fleet/rides">/fleet/rides</Link>.
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Estimated Fare (ETB)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="0.01"
                          value={assignForm.estimatedFare}
                          onChange={(e) => setAssignForm({ ...assignForm, estimatedFare: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setAssignModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={assignSubmitting}>
                    {assignSubmitting ? "Assigning..." : "Confirm Assignment"}
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