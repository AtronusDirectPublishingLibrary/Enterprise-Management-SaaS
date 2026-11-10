import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import {
  ArrowLeft, BarChart3, TrendingUp, Truck, Car, DollarSign,
  MapPin, Users, AlertCircle,
} from "lucide-react";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Legend, Title,
} from "chart.js";

ChartJS.register(
  ArcElement, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Legend, Title
);

const STATUS_COLORS = {
  Available: "#10B981",
  "In Use": "#F59E0B",
  "Under Maintenance": "#EF4444",
  Unavailable: "#6B7280",
};

const NAVY = "#0B2545";
const GOLD = "#C9A227";

export default function FleetAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/fleet/analytics/stats")
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-5 text-center">Loading analytics...</div>;
  if (error) return (
    <div className="container-fluid py-4">
      <div className="alert alert-danger">
        <AlertCircle size={16} className="me-2" /> {error}
      </div>
    </div>
  );
  if (!stats) return null;

  const totalRequests = stats.requests.vehicle.total + stats.requests.ride.total;
  const completedRequests = stats.requests.vehicle.completed + stats.requests.ride.completed;

  // Chart data
  const vehicleStatusData = {
    labels: ["Available", "In Use", "Under Maintenance", "Unavailable"],
    datasets: [{
      data: [stats.vehicles.available, stats.vehicles.inUse, stats.vehicles.maintenance, stats.vehicles.unavailable],
      backgroundColor: Object.values(STATUS_COLORS),
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };

  const requestStatusData = {
    labels: ["Pending", "Approved", "Assigned", "In Progress", "Completed", "Rejected", "Cancelled"],
    datasets: [
      {
        label: "Vehicle",
        data: [
          stats.requests.vehicle.pending,
          stats.requests.vehicle.supervisorApproved + stats.requests.vehicle.fleetApproved,
          stats.requests.vehicle.assigned,
          stats.requests.vehicle.inProgress,
          stats.requests.vehicle.completed,
          stats.requests.vehicle.rejected,
          stats.requests.vehicle.cancelled,
        ],
        backgroundColor: NAVY,
        borderRadius: 4,
      },
      {
        label: "Ride",
        data: [
          stats.requests.ride.pending,
          stats.requests.ride.supervisorApproved + stats.requests.ride.fleetApproved,
          stats.requests.ride.assigned,
          stats.requests.ride.inProgress,
          stats.requests.ride.completed,
          stats.requests.ride.rejected,
          stats.requests.ride.cancelled,
        ],
        backgroundColor: GOLD,
        borderRadius: 4,
      },
    ],
  };

  const monthlyData = {
    labels: stats.monthlyVolume.map((m) => m.label),
    datasets: [
      {
        label: "Vehicle Requests",
        data: stats.monthlyVolume.map((m) => m.vehicle),
        borderColor: NAVY,
        backgroundColor: NAVY + "20",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Ride Requests",
        data: stats.monthlyVolume.map((m) => m.ride),
        borderColor: GOLD,
        backgroundColor: GOLD + "20",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const topDestData = {
    labels: stats.topDestinations.length > 0
      ? stats.topDestinations.map((d) => d.destination)
      : ["No data"],
    datasets: [{
      label: "Requests",
      data: stats.topDestinations.length > 0
        ? stats.topDestinations.map((d) => d.count)
        : [0],
      backgroundColor: GOLD,
      borderRadius: 4,
    }],
  };

  const driverWorkloadData = {
    labels: stats.driverWorkload.map((d) => d.name),
    datasets: [{
      label: "Trips (last 90 days)",
      data: stats.driverWorkload.map((d) => d.trips),
      backgroundColor: NAVY,
      borderRadius: 4,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 12 } },
    },
  };

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Fleet Analytics | Ethio-Biopharma</title></Helmet>

      <div className="d-flex align-items-center mb-4">
        <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
          <ArrowLeft size={14} className="me-1" /> Fleet
        </Link>
        <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
          <BarChart3 size={24} className="me-2" /> Fleet Analytics
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Total Requests</span>
                <TrendingUp size={20} style={{ color: NAVY }} />
              </div>
              <h2 className="display-6 fw-bold mb-0">{totalRequests}</h2>
              <div className="small text-muted">{completedRequests} completed</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Vehicles</span>
                <Truck size={20} style={{ color: NAVY }} />
              </div>
              <h2 className="display-6 fw-bold mb-0">{stats.vehicles.total}</h2>
              <div className="small text-muted">{stats.vehicles.available} available</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Ride Spend</span>
                <DollarSign size={20} style={{ color: GOLD }} />
              </div>
              <h2 className="display-6 fw-bold mb-0">
                {stats.rideSpend.total.toLocaleString()}
              </h2>
              <div className="small text-muted">{stats.rideSpend.currency}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase small fw-bold text-muted">Ride Requests</span>
                <Car size={20} style={{ color: GOLD }} />
              </div>
              <h2 className="display-6 fw-bold mb-0">{stats.requests.ride.total}</h2>
              <div className="small text-muted">{stats.requests.ride.completed} completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Vehicle status + Request status */}
      <div className="row g-3 mb-3">
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                <Truck size={16} className="me-2" /> Vehicle Status
              </h6>
              <div style={{ height: "260px" }}>
                {stats.vehicles.total === 0 ? (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">No vehicles</div>
                ) : (
                  <Doughnut data={vehicleStatusData} options={{ ...chartOpts, cutout: "60%" }} />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                <BarChart3 size={16} className="me-2" /> Requests by Status
              </h6>
              <div style={{ height: "260px" }}>
                <Bar data={requestStatusData} options={chartOpts} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Monthly volume */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                <TrendingUp size={16} className="me-2" /> Request Volume (last 6 months)
              </h6>
              <div style={{ height: "260px" }}>
                <Line
                  data={monthlyData}
                  options={{
                    ...chartOpts,
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top destinations + driver workload */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                <MapPin size={16} className="me-2" /> Top Destinations (last 90 days)
              </h6>
              <div style={{ height: "300px" }}>
                {stats.topDestinations.length === 0 ? (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    No destination data yet
                  </div>
                ) : (
                  <Bar
                    data={topDestData}
                    options={{
                      ...chartOpts,
                      indexAxis: "y",
                      plugins: { ...chartOpts.plugins, legend: { display: false } },
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                <Users size={16} className="me-2" /> Driver Workload (last 90 days)
              </h6>
              <div style={{ height: "300px" }}>
                {stats.driverWorkload.length === 0 ? (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    No drivers yet
                  </div>
                ) : (
                  <Bar
                    data={driverWorkloadData}
                    options={{
                      ...chartOpts,
                      indexAxis: "y",
                      plugins: { ...chartOpts.plugins, legend: { display: false } },
                      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}