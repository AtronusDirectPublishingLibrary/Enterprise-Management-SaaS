import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Truck, Car, ArrowLeft, Search, PlusCircle, Eye, X, Play,
  CheckCircle2, XCircle, Clock, MapPin, Calendar, Users,
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
  EXPIRED: "secondary",
};

const STATUS_OPTIONS = [
  "PENDING", "SUPERVISOR_APPROVED", "FLEET_APPROVED", "ASSIGNED",
  "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED", "EXPIRED",
];

export default function FleetRequests() {
  const [tab, setTab] = useState("vehicle");
  const [vehicleReqs, setVehicleReqs] = useState([]);
  const [rideReqs, setRideReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const [v, r] = await Promise.all([
        api.get("/fleet/requests/my-requests").catch(() => []),
        api.get("/fleet/rides/my-requests").catch(() => []),
      ]);
      setVehicleReqs(v || []);
      setRideReqs(r || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (req, type) => {
    try {
      const endpoint = type === "vehicle" ? `/fleet/requests/${req.id}` : `/fleet/rides/${req.id}`;
      const full = await api.get(endpoint);
      setDetail({ ...full, _type: type });
      setShowDetail(true);
    } catch (err) {
      alert("Failed to load details: " + err.message);
    }
  };

  const doAction = async (action, id, type, extraBody = {}) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    setActionLoading(true);
    try {
      const endpoint = type === "vehicle" ? `/fleet/requests/${id}/${action}` : `/fleet/rides/${id}/${action}`;
      await api.post(endpoint, extraBody);
      await load();
      setShowDetail(false);
    } catch (err) {
      alert(`Failed to ${action}: ` + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const completeWithDetails = async (type, id) => {
    if (type === "vehicle") {
      const odo = window.prompt("Enter final odometer reading (km):");
      if (odo === null) return;
      await doAction("complete", id, type, { odometerEnd: odo === "" ? null : Number(odo) });
    } else {
      const fare = window.prompt("Enter actual fare (ETB):");
      if (fare === null) return;
      const receipt = window.prompt("Receipt URL (optional, leave blank if none):", "");
      await doAction("complete", id, type, {
        actualFare: fare === "" ? null : Number(fare),
        receiptUrl: receipt || null,
      });
    }
  };

  const filterReq = (req) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (req.requestCode || "").toLowerCase().includes(q) ||
      (req.destination || "").toLowerCase().includes(q) ||
      (req.tripPurpose || "").toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;
    return matchesSearch && matchesStatus;
  };

  const current = tab === "vehicle" ? vehicleReqs : rideReqs;
  const filtered = current.filter(filterReq);

  if (loading) return <div className="p-5 text-center">Loading requests...</div>;
  if (error) return <div className="p-5 text-center text-danger">{error}</div>;

  return (
    <div className="container-fluid py-4">
      <Helmet><title>My Requests | Fleet | Ethio-Biopharma</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={14} className="me-1" /> Fleet
          </Link>
          <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>My Requests</h1>
        </div>
        <Link to="/fleet/new" className="btn btn-primary">
          <PlusCircle size={16} className="me-1" /> New Request
        </Link>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-0">
          <ul className="nav nav-tabs nav-fill">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === "vehicle" ? "active" : ""}`}
                onClick={() => setTab("vehicle")}
              >
                <Truck size={16} className="me-2" /> Vehicle Requests ({vehicleReqs.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === "ride" ? "active" : ""}`}
                onClick={() => setTab("ride")}
              >
                <Car size={16} className="me-2" /> Ride Requests ({rideReqs.length})
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-md-7">
              <div className="input-group">
                <span className="input-group-text bg-white"><Search size={14} /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by code, destination, or purpose..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="col-md-2 text-end text-muted small d-flex align-items-center justify-content-end">
              {filtered.length} of {current.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Destination</th>
                  <th>Departure</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      {current.length === 0
                        ? `No ${tab} requests yet. Click New Request to submit one.`
                        : "No requests match your filters."}
                    </td>
                  </tr>
                ) : filtered.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.requestCode}</code></td>
                    <td>
                      <div className="fw-bold">{r.destination}</div>
                      <div className="small text-muted">{r.tripPurpose}</div>
                    </td>
                    <td className="small">
                      {r.departureDate ? new Date(r.departureDate).toLocaleDateString() : "—"} {r.departureTime}
                    </td>
                    <td>
                      <span className={`badge bg-${STATUS_BADGE[r.status] || "secondary"}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openDetail(r, tab)} title="View details">
                        <Eye size={14} />
                      </button>
                      {(r.status === "PENDING" || r.status === "SUPERVISOR_APPROVED") && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => doAction("cancel", r.id, tab)} title="Cancel">
                          <X size={14} />
                        </button>
                      )}
                      {r.status === "ASSIGNED" && (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => doAction("start", r.id, tab)} title="Start trip">
                          <Play size={14} />
                        </button>
                      )}
                      {r.status === "IN_PROGRESS" && (
                        <button className="btn btn-sm btn-outline-success" onClick={() => completeWithDetails(tab, r.id)} title="Complete">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDetail && detail && (
        <>
          <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowDetail(false)}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {detail._type === "vehicle" ? <Truck size={18} className="me-2" /> : <Car size={18} className="me-2" />}
                    {detail.requestCode}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowDetail(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <span className={`badge bg-${STATUS_BADGE[detail.status] || "secondary"} fs-6`}>
                      {detail.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="small text-muted text-uppercase fw-bold">Trip Purpose</div>
                      <div>{detail.tripPurpose}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="small text-muted text-uppercase fw-bold"><Users size={12} /> Passengers</div>
                      <div>{detail.passengers}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="small text-muted text-uppercase fw-bold"><MapPin size={12} /> Pickup</div>
                      <div>{detail.pickupLocation}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="small text-muted text-uppercase fw-bold"><MapPin size={12} /> Destination</div>
                      <div>{detail.destination}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="small text-muted text-uppercase fw-bold"><Calendar size={12} /> Departure</div>
                      <div>{detail.departureDate ? new Date(detail.departureDate).toLocaleDateString() : "—"} {detail.departureTime}</div>
                    </div>
                    {detail.returnDate && (
                      <div className="col-md-6">
                        <div className="small text-muted text-uppercase fw-bold"><Calendar size={12} /> Return</div>
                        <div>{new Date(detail.returnDate).toLocaleDateString()} {detail.returnTime || ""}</div>
                      </div>
                    )}

                    {detail._type === "vehicle" && detail.vehicle && (
                      <>
                        <div className="col-md-6">
                          <div className="small text-muted text-uppercase fw-bold">Vehicle</div>
                          <div>{detail.vehicle.vehicleCode} — {detail.vehicle.licensePlate}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted text-uppercase fw-bold">Driver</div>
                          <div>{detail.driver ? `${detail.driver.name} (${detail.driver.driverCode})` : "—"}</div>
                        </div>
                      </>
                    )}

                    {detail._type === "ride" && detail.provider && (
                      <div className="col-md-6">
                        <div className="small text-muted text-uppercase fw-bold">Ride Provider</div>
                        <div>{detail.provider.name}</div>
                      </div>
                    )}

                    {detail.gatePassNo && (
                      <div className="col-md-6">
                        <div className="small text-muted text-uppercase fw-bold">Gate Pass</div>
                        <div><code>{detail.gatePassNo}</code></div>
                      </div>
                    )}

                    {detail.remarks && (
                      <div className="col-12">
                        <div className="small text-muted text-uppercase fw-bold">Remarks</div>
                        <div>{detail.remarks}</div>
                      </div>
                    )}

                    {detail.rejectionReason && (
                      <div className="col-12">
                        <div className="alert alert-danger mb-0 mt-3">
                          <strong>Rejection reason:</strong> {detail.rejectionReason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  {(detail.status === "PENDING" || detail.status === "SUPERVISOR_APPROVED") && (
                    <button
                      className="btn btn-outline-danger"
                      disabled={actionLoading}
                      onClick={() => doAction("cancel", detail.id, detail._type)}
                    >
                      <XCircle size={14} className="me-1" /> Cancel Request
                    </button>
                  )}
                  {detail.status === "ASSIGNED" && (
                    <button
                      className="btn btn-primary"
                      disabled={actionLoading}
                      onClick={() => doAction("start", detail.id, detail._type)}
                    >
                      <Play size={14} className="me-1" /> Start Trip
                    </button>
                  )}
                  {detail.status === "IN_PROGRESS" && (
                    <button
                      className="btn btn-success"
                      disabled={actionLoading}
                      onClick={() => completeWithDetails(detail._type, detail.id)}
                    >
                      <CheckCircle2 size={14} className="me-1" /> Complete
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDetail(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}