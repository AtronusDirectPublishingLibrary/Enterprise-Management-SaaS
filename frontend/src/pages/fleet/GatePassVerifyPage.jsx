import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { ShieldCheck, ShieldX, ArrowLeft, Truck, Calendar, MapPin } from "lucide-react";

export default function GatePassVerifyPage() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/fleet/requests/${requestId}`)
      .then(setRequest)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) return <div className="p-5 text-center">Verifying gate pass...</div>;
  if (error) {
    return (
      <div className="container py-5">
        <div className="card shadow-lg border-0 p-5 text-center" style={{ maxWidth: "500px", margin: "0 auto" }}>
          <ShieldX size={64} className="text-danger mb-3" />
          <h2 className="fw-bold text-danger">Invalid or Expired</h2>
          <p className="text-muted">{error}</p>
          <Link to="/" className="btn btn-secondary mt-3"><ArrowLeft size={14} className="me-1" /> Home</Link>
        </div>
      </div>
    );
  }

  const valid = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(request.status);

  return (
    <div className="container py-5">
      <div className="card shadow-lg border-0" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div className="card-body p-5 text-center">
          {valid ? (
            <>
              <ShieldCheck size={64} className="text-success mb-3" />
              <h2 className="fw-bold text-success mb-2">Gate Pass Verified</h2>
              <p className="text-muted mb-4">This gate pass is authentic and valid.</p>
            </>
          ) : (
            <>
              <ShieldX size={64} className="text-warning mb-3" />
              <h2 className="fw-bold text-warning mb-2">Status: {request.status}</h2>
              <p className="text-muted mb-4">This gate pass is not currently valid.</p>
            </>
          )}

          <div className="text-start mt-4 pt-4 border-top">
            <div className="row g-3">
              <div className="col-6">
                <div className="small text-muted text-uppercase fw-bold">Request</div>
                <div className="fw-bold">{request.requestCode}</div>
              </div>
              <div className="col-6">
                <div className="small text-muted text-uppercase fw-bold">Gate Pass</div>
                <div className="fw-bold">{request.gatePassNo || "—"}</div>
              </div>
              <div className="col-6">
                <div className="small text-muted text-uppercase fw-bold">Requester</div>
                <div className="fw-bold">{request.requester?.firstName} {request.requester?.lastName}</div>
              </div>
              <div className="col-6">
                <div className="small text-muted text-uppercase fw-bold">Vehicle</div>
                <div className="fw-bold">{request.vehicle?.vehicleCode || "—"}</div>
              </div>
              <div className="col-12">
                <div className="small text-muted text-uppercase fw-bold"><MapPin size={12} /> Destination</div>
                <div className="fw-bold">{request.destination}</div>
              </div>
              <div className="col-12">
                <div className="small text-muted text-uppercase fw-bold"><Calendar size={12} /> Departure</div>
                <div className="fw-bold">
                  {request.departureDate ? new Date(request.departureDate).toLocaleDateString() : "—"} {request.departureTime}
                </div>
              </div>
            </div>
          </div>

          <Link to="/" className="btn btn-secondary mt-4"><ArrowLeft size={14} className="me-1" /> Home</Link>
        </div>
      </div>
    </div>
  );
}