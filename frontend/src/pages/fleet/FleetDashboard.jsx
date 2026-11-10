import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Truck, CheckCircle2, Clock, Car, PlusCircle, ClipboardList,
  AlertCircle, TrendingUp,
} from "lucide-react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS = {
  Available: "#10B981",
  "In Use": "#F59E0B",
  "Under Maintenance": "#EF4444",
  Unavailable: "#6B7280",
};

export default function FleetDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [pending, setPending] = useState([]);
  const [fleetQueue, setFleetQueue] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/fleet/vehicles").catch(() => []),
      api.get("/fleet/requests/pending").catch(() => []),
      api.get("/fleet/requests/fleet-queue").catch(() => []),
      api.get("/fleet/requests/my-requests").catch(() => []),
      api.get("/fleet/rides/my-requests").catch(() => []),
    ])
      .then(([v, p, fq, mr, mri]) => {
        setVehicles(v || []);
        setPending(p || []);
        setFleetQueue(fq || []);
        setMyRequests(mr || []);
        setMyRides(mri || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-5 text-center">Loading fleet dashboard...</div>;
  if (error) return <div className="p-5 text-center text-danger">{error}</div>;

  const availableCount = vehicles.filter((v) => v.status === "Available").length;
  const inUseCount = vehicles.filter((v) => v.status === "In Use").length;
  const maintCount = vehicles.filter((v) => v.status === "Under Maintenance").length;
  const unavailableCount = vehicles.filter((v) => v.status === "Unavailable").length;
  const pendingCount = pending.length + fleetQueue.length;
  const myActiveRides = myRides.filter((r) => ["PENDING", "SUPERVISOR_APPROVED", "ASSIGNED"].includes(r.status)).length;

  const chartData = {
    labels: ["Available", "In Use", "Under Maintenance", "Unavailable"],
    datasets: [{
      data: [availableCount, inUseCount, maintCount, unavailableCount],
      backgroundColor: Object.values(STATUS_COLORS),
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 12 } } },
    },
    cutout: "60%",
  };

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Fleet & Transport | Ethio-Biopharma</title></Helmet>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>Fleet & Transport</h1>
        <div className="d-flex gap-2">
          <Link to="/fleet/new" className="btn btn-primary">
            <PlusCircle size={16} className="me-1" /> New Request
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Total Vehicles</span>
                <Truck size={20} style={{ color: "var(--brand-primary)" }} />
              </div>
              <h2 className="display-6 fw-bold mb-0">{vehicles.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100" style={{ background: "#ECFDF5" }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Available</span>
                <CheckCircle2 size={20} color="#10B981" />
              </div>
              <h2 className="display-6 fw-bold mb-0" style={{ color: "#059669" }}>{availableCount}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100" style={{ background: "#FEF3C7" }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Pending Approvals</span>
                <Clock size={20} color="#F59E0B" />
              </div>
              <h2 className="display-6 fw-bold mb-0" style={{ color: "#B45309" }}>{pendingCount}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100" style={{ background: "#EFF6FF" }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">My Active Rides</span>
                <Car size={20} color="#3B82F6" />
              </div>
              <h2 className="display-6 fw-bold mb-0" style={{ color: "#1D4ED8" }}>{myActiveRides}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Vehicle Status Chart */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <TrendingUp size={18} className="me-2" style={{ color: "var(--brand-primary)" }} />
                Vehicle Status
              </h5>
              <div style={{ height: "280px" }}>
                {vehicles.length === 0 ? (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    No vehicles yet
                  </div>
                ) : (
                  <Doughnut data={chartData} options={chartOptions} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <ClipboardList size={18} className="me-2" style={{ color: "var(--brand-primary)" }} />
                Quick Actions
              </h5>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <Link to="/fleet/new?type=vehicle" className="btn btn-outline-primary w-100 text-start">
                    <Truck size={16} className="me-2" /> Request a Vehicle
                  </Link>
                </div>
                <div className="col-md-6">
                  <Link to="/fleet/new?type=ride" className="btn btn-outline-primary w-100 text-start">
                    <Car size={16} className="me-2" /> Request a Ride
                  </Link>
                </div>
                <div className="col-md-6">
                  <Link to="/fleet/requests" className="btn btn-outline-secondary w-100 text-start">
                    <ClipboardList size={16} className="me-2" /> All Requests
                  </Link>
                </div>
                <div className="col-md-6">
                  <Link to="/fleet/approvals" className="btn btn-outline-warning w-100 text-start">
                    <AlertCircle size={16} className="me-2" /> Approvals
                    {pendingCount > 0 && <span className="badge bg-danger ms-2">{pendingCount}</span>}
                  </Link>
                </div>
              </div>
              {myRequests.length > 0 && (
                <>
                  <h6 className="fw-bold mt-4 mb-2">My Recent Requests</h6>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr className="small text-muted">
                          <th>Code</th>
                          <th>Destination</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.slice(0, 5).map((r) => (
                          <tr key={r.id}>
                            <td className="small">{r.requestCode}</td>
                            <td className="small">{r.destination}</td>
                            <td>
                              <span className={`badge bg-${
                                r.status === "COMPLETED" ? "success" :
                                r.status === "REJECTED" || r.status === "CANCELLED" ? "danger" :
                                r.status === "PENDING" ? "warning" : "info"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}