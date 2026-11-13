import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Truck, Car, ArrowLeft, Send, AlertCircle, Calendar, Clock,
  MapPin, Users, FileText,
} from "lucide-react";

const VEHICLE_TYPES = ["Sedan", "4x4", "Minibus", "Ambulance", "Truck", "Motorcycle"];

const emptyVehicleForm = {
  requestType: "In-Town",
  tripPurpose: "",
  department: "",
  division: "",
  vehicleTypePreferred: "",
  passengers: 1,
  departureDate: "2026-11-11",
  returnDate: "2026-11-11",
  departureTime: "09:00",
  returnTime: "",
  pickupLocation: "",
  destination: "",
  distance: "",
  remarks: "",
};

const emptyRideForm = {
  tripPurpose: "",
  pickupLocation: "",
  destination: "",
  departureDate: "2026-11-11",
  departureTime: "09:00",
  returnTime: "",
  passengers: 1,
  remarks: "",
};

export default function NewFleetRequest() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get("type") === "ride" ? "ride" : "vehicle";
  const [tab, setTab] = useState(initialTab);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [rideForm, setRideForm] = useState(emptyRideForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const submitVehicle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/fleet/requests", {
        requestType: vehicleForm.requestType,
        tripPurpose: vehicleForm.tripPurpose,
        department: vehicleForm.department || null,
        division: vehicleForm.division || null,
        vehicleTypePreferred: vehicleForm.vehicleTypePreferred || null,
        passengers: Number(vehicleForm.passengers) || 1,
        departureDate: vehicleForm.departureDate,
        returnDate: vehicleForm.returnDate,
        departureTime: vehicleForm.departureTime,
        returnTime: vehicleForm.returnTime || null,
        pickupLocation: vehicleForm.pickupLocation,
        destination: vehicleForm.destination,
        distance: vehicleForm.distance === "" ? null : Number(vehicleForm.distance),
        remarks: vehicleForm.remarks || null,
      });
      setSuccess("Vehicle request submitted successfully. You will be notified when your supervisor approves.");
      setTimeout(() => navigate("/fleet/requests"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRide = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/fleet/rides", {
        tripPurpose: rideForm.tripPurpose,
        pickupLocation: rideForm.pickupLocation,
        destination: rideForm.destination,
        departureDate: rideForm.departureDate,
        departureTime: rideForm.departureTime,
        returnTime: rideForm.returnTime || null,
        passengers: Number(rideForm.passengers) || 1,
        remarks: rideForm.remarks || null,
      });
      setSuccess("Ride request submitted successfully. You will be notified when your supervisor approves.");
      setTimeout(() => navigate("/fleet/requests"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "900px" }}>
      <Helmet><title>New Request | Fleet | Ethio-Biopharma</title></Helmet>

      <div className="d-flex align-items-center mb-4">
        <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
          <ArrowLeft size={14} className="me-1" /> Fleet
        </Link>
        <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>New Request</h1>
      </div>

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <AlertCircle size={16} />
          <div>
            <strong>Could not submit request.</strong>
            <div className="small">{error}</div>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-0">
          <ul className="nav nav-tabs nav-fill">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === "vehicle" ? "active" : ""}`}
                onClick={() => setTab("vehicle")}
              >
                <Truck size={16} className="me-2" /> Vehicle Request
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === "ride" ? "active" : ""}`}
                onClick={() => setTab("ride")}
              >
                <Car size={16} className="me-2" /> Ride Request
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body p-4">

          {tab === "vehicle" && (
            <form onSubmit={submitVehicle} noValidate>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-bold">Request Type <span className="text-danger">*</span></label>
                  <div className="d-flex gap-3">
                    {["In-Town", "Field"].map((t) => (
                      <div className="form-check" key={t}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="requestType"
                          id={`rt-${t}`}
                          value={t}
                          checked={vehicleForm.requestType === t}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, requestType: e.target.value })}
                        />
                        <label className="form-check-label" htmlFor={`rt-${t}`}>{t}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold">
                    <FileText size={12} className="me-1" /> Trip Purpose <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={vehicleForm.tripPurpose}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, tripPurpose: e.target.value })}
                    placeholder="e.g., Site visit to Kilinto facility"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Department</label>
                  <input type="text" className="form-control" value={vehicleForm.department} onChange={(e) => setVehicleForm({ ...vehicleForm, department: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Division / Team</label>
                  <input type="text" className="form-control" value={vehicleForm.division} onChange={(e) => setVehicleForm({ ...vehicleForm, division: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Preferred Vehicle Type</label>
                  <select className="form-select" value={vehicleForm.vehicleTypePreferred} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleTypePreferred: e.target.value })}>
                    <option value="">Any</option>
                    {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Users size={12} className="me-1" /> Passengers <span className="text-danger">*</span>
                  </label>
                  <input type="number" className="form-control" min="1" value={vehicleForm.passengers} onChange={(e) => setVehicleForm({ ...vehicleForm, passengers: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Calendar size={12} className="me-1" /> Departure Date <span className="text-danger">*</span>
                  </label>
                  <input type="date" className="form-control" value={vehicleForm.departureDate} onChange={(e) => setVehicleForm({ ...vehicleForm, departureDate: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Calendar size={12} className="me-1" /> Return Date <span className="text-danger">*</span>
                  </label>
                  <input type="date" className="form-control" value={vehicleForm.returnDate} onChange={(e) => setVehicleForm({ ...vehicleForm, returnDate: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Clock size={12} className="me-1" /> Departure Time <span className="text-danger">*</span>
                  </label>
                  <input type="time" className="form-control" value={vehicleForm.departureTime} onChange={(e) => setVehicleForm({ ...vehicleForm, departureTime: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Clock size={12} className="me-1" /> Return Time
                  </label>
                  <input type="time" className="form-control" value={vehicleForm.returnTime} onChange={(e) => setVehicleForm({ ...vehicleForm, returnTime: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <MapPin size={12} className="me-1" /> Pickup Location <span className="text-danger">*</span>
                  </label>
                  <input type="text" className="form-control" value={vehicleForm.pickupLocation} onChange={(e) => setVehicleForm({ ...vehicleForm, pickupLocation: e.target.value })} placeholder="e.g., Main Gate" />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <MapPin size={12} className="me-1" /> Destination <span className="text-danger">*</span>
                  </label>
                  <input type="text" className="form-control" value={vehicleForm.destination} onChange={(e) => setVehicleForm({ ...vehicleForm, destination: e.target.value })} placeholder="e.g., Kilinto Site" />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Distance (km)</label>
                  <input type="number" className="form-control" min="0" step="0.1" value={vehicleForm.distance} onChange={(e) => setVehicleForm({ ...vehicleForm, distance: e.target.value })} />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold">Remarks</label>
                  <textarea className="form-control" rows={2} value={vehicleForm.remarks} onChange={(e) => setVehicleForm({ ...vehicleForm, remarks: e.target.value })}></textarea>
                </div>

                <div className="col-12 text-end">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    <Send size={14} className="me-1" /> {submitting ? "Submitting..." : "Submit Vehicle Request"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === "ride" && (
            <form onSubmit={submitRide} noValidate>
              <div className="alert alert-info small">
                <strong>Ride Service</strong> — used when no vehicle is available. Your supervisor approves the ride; the fleet manager assigns the provider.
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-bold">
                    <FileText size={12} className="me-1" /> Trip Purpose <span className="text-danger">*</span>
                  </label>
                  <input type="text" className="form-control" value={rideForm.tripPurpose} onChange={(e) => setRideForm({ ...rideForm, tripPurpose: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <MapPin size={12} className="me-1" /> Pickup Location <span className="text-danger">*</span>
                  </label>
                  <input type="text" className="form-control" value={rideForm.pickupLocation} onChange={(e) => setRideForm({ ...rideForm, pickupLocation: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <MapPin size={12} className="me-1" /> Destination <span className="text-danger">*</span>
                  </label>
                  <input type="text" className="form-control" value={rideForm.destination} onChange={(e) => setRideForm({ ...rideForm, destination: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Calendar size={12} className="me-1" /> Departure Date <span className="text-danger">*</span>
                  </label>
                  <input type="date" className="form-control" value={rideForm.departureDate} onChange={(e) => setRideForm({ ...rideForm, departureDate: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Clock size={12} className="me-1" /> Departure Time <span className="text-danger">*</span>
                  </label>
                  <input type="time" className="form-control" value={rideForm.departureTime} onChange={(e) => setRideForm({ ...rideForm, departureTime: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Clock size={12} className="me-1" /> Return Time
                  </label>
                  <input type="time" className="form-control" value={rideForm.returnTime} onChange={(e) => setRideForm({ ...rideForm, returnTime: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">
                    <Users size={12} className="me-1" /> Passengers <span className="text-danger">*</span>
                  </label>
                  <input type="number" className="form-control" min="1" value={rideForm.passengers} onChange={(e) => setRideForm({ ...rideForm, passengers: e.target.value })} />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold">Remarks</label>
                  <textarea className="form-control" rows={2} value={rideForm.remarks} onChange={(e) => setRideForm({ ...rideForm, remarks: e.target.value })}></textarea>
                </div>

                <div className="col-12 text-end">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    <Send size={14} className="me-1" /> {submitting ? "Submitting..." : "Submit Ride Request"}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}