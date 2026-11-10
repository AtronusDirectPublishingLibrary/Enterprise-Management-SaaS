import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Truck, ArrowLeft, Construction } from "lucide-react";

export default function FleetPlaceholder({ title, batch }) {
  return (
    <div className="container-fluid py-4">
      <Helmet><title>{title} | Fleet | Ethio-Biopharma</title></Helmet>
      <div className="d-flex align-items-center mb-4">
        <Link to="/fleet" className="btn btn-sm btn-outline-secondary me-3">
          <ArrowLeft size={14} className="me-1" /> Back
        </Link>
        <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>{title}</h1>
      </div>
      <div className="card shadow-sm border-0">
        <div className="card-body p-5 text-center">
          <Construction size={64} className="text-warning mb-3" />
          <h4 className="fw-bold mb-2">Coming in {batch}</h4>
          <p className="text-muted mb-0">
            This page will be built in the next batch. The backend API is already
            live at <code>/api/fleet/*</code>.
          </p>
        </div>
      </div>
    </div>
  );
}