import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Printer, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";

export default function GatePassPage() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const printRef = useRef(null);

  const load = async () => {
    try {
      const req = await api.get(`/fleet/requests/${requestId}`);
      setRequest(req);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [requestId]);

  const print = () => window.print();

  const resend = async () => {
    if (!window.confirm("Resend the gate pass email to the requester and driver?")) return;
    setResending(true);
    try {
      const res = await api.post(`/fleet/requests/${requestId}/resend-gate-pass`, {});
      alert("Resend status: " + res.status);
      await load();
    } catch (e) {
      alert("Failed to resend: " + e.message);
    } finally {
      setResending(false);
    }
  };

  if (loading) return <div className="p-5 text-center">Loading gate pass...</div>;
  if (error) return <div className="p-5 text-center text-danger">Error: {error}</div>;
  if (!request) return <div className="p-5 text-center">Gate pass not found</div>;

  if (!request.gatePassNo) {
    return (
      <div className="container py-5">
        <div className="card shadow-sm border-0 p-5 text-center" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div className="display-1 mb-3">📋</div>
          <h2 className="fw-bold mb-2">Gate Pass Not Issued</h2>
          <p className="text-muted">This request has not yet been approved by the fleet manager.</p>
          <Link to="/fleet/requests" className="btn btn-secondary mt-3">
            <ArrowLeft size={14} className="me-1" /> Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  const requesterName = `${request.requester?.firstName || ""} ${request.requester?.lastName || ""}`.trim() || request.requester?.username || "—";
  const approverName = request.fleetApprover ? `${request.fleetApprover.firstName || ""} ${request.fleetApprover.lastName || ""}`.trim() || request.fleetApprover.username : "Fleet Manager";
  const departureDisplay = `${new Date(request.departureDate).toLocaleDateString("en-GB")} ${request.departureTime}`;
  const returnDisplay = request.returnTime
    ? `${new Date(request.returnDate).toLocaleDateString("en-GB")} ${request.returnTime}`
    : new Date(request.returnDate).toLocaleDateString("en-GB");
  const valid = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(request.status);

  return (
    <div className="container py-4">
      <Helmet><title>Gate Pass {request.gatePassNo} | Ethio-Biopharma</title></Helmet>

      <div className="d-flex gap-2 mb-4 d-print-none">
        <Link to="/fleet/requests" className="btn btn-sm btn-outline-secondary">
          <ArrowLeft size={14} className="me-1" /> Back
        </Link>
        <button className="btn btn-sm btn-primary" onClick={print}>
          <Printer size={14} className="me-1" /> Print
        </button>
        <button className="btn btn-sm btn-outline-primary" onClick={resend} disabled={resending}>
          <RefreshCw size={14} className={`me-1 ${resending ? "spin" : ""}`} />
          {resending ? "Resending..." : "Resend Email"}
        </button>
      </div>

      <div className="card shadow-lg border-0 mx-auto" style={{ maxWidth: "500px" }} ref={printRef}>
        <div
          style={{
            background: "linear-gradient(135deg, #0B2545 0%, #0F3460 100%)",
            padding: "16px 18px",
            textAlign: "center",
            borderBottom: "4px solid #C9A227",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "1px" }}>Ethio-Biopharma</div>
          <div style={{ color: "#C9A227", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginTop: "4px" }}>
            Vehicle Gate Pass
          </div>
          <div style={{ display: "inline-block", background: valid ? "#10B981" : "#EF4444", color: "#fff", padding: "2px 14px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, marginTop: "8px" }}>
            {valid ? "✅ VALID" : "❌ " + request.status}
          </div>
        </div>

        <div className="p-3">
          <div className="text-center small text-muted pb-2 mb-2 border-bottom">
            📌 <strong style={{ color: "#0B2545" }}>{request.gatePassNo}</strong> &nbsp;•&nbsp; 📅 {new Date().toLocaleDateString("en-GB")}
          </div>

          <div className="row g-2">
            <div className="col-6">
              <div className="small text-muted text-uppercase fw-bold">👤 Driver</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{request.driver?.name || "—"}</div>
            </div>
            <div className="col-6">
              <div className="small text-muted text-uppercase fw-bold">🚗 Vehicle</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{request.vehicle?.vehicleCode || "—"}</div>
            </div>
            <div className="col-6">
              <div className="small text-muted text-uppercase fw-bold">🔢 Plate</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{request.vehicle?.licensePlate || "—"}</div>
            </div>
            <div className="col-6">
              <div className="small text-muted text-uppercase fw-bold">👥 Passengers</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{request.passengers}</div>
            </div>
            <div className="col-12">
              <div className="small text-muted text-uppercase fw-bold">🙋 Requester</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{requesterName}</div>
            </div>
            <div className="col-12">
              <div className="small text-muted text-uppercase fw-bold">📍 Destination</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{request.destination}</div>
            </div>
            <div className="col-6">
              <div className="small text-muted text-uppercase fw-bold">📅 Departure</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{departureDisplay}</div>
            </div>
            <div className="col-6">
              <div className="small text-muted text-uppercase fw-bold">📅 Return</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{returnDisplay}</div>
            </div>
            <div className="col-12">
              <div className="small text-muted text-uppercase fw-bold">✅ Approved By</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>{approverName}</div>
            </div>
          </div>

          <div className="mt-3 p-2 rounded" style={{ background: "#F9FAFB", borderLeft: "3px solid #C9A227" }}>
            <div className="small fw-bold" style={{ color: "#0B2545", textTransform: "uppercase", fontSize: "10px" }}>🔒 Security Check</div>
            <div className="d-flex flex-wrap gap-1 mt-1">
              <span className="badge bg-white text-dark border small">⬜ Driver ID</span>
              <span className="badge bg-white text-dark border small">⬜ Plate No.</span>
              <span className="badge bg-white text-dark border small">⬜ Passengers</span>
              <span className="badge bg-white text-dark border small">⬜ Date</span>
            </div>
          </div>

          {request.status === "COMPLETED" && (
            <div className="mt-3 small text-muted text-center">
              <ShieldCheck size={14} className="me-1 text-success" />
              Trip completed • Odometer end: {request.odometerEnd?.toLocaleString() || "—"} km
            </div>
          )}
        </div>

        <div style={{ background: "linear-gradient(90deg, #0B2545 0%, #C9A227 100%)", padding: "12px", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>🟦🟨 ETHIO-BIOPHARMA 🟨🟦</div>
          <div style={{ fontSize: "9px", opacity: 0.85, marginTop: "2px" }}>Enterprise Management System — Fleet &amp; Transport</div>
        </div>
      </div>

      <style>{`
        @media print {
          .d-print-none { display: none !important; }
          body { background: #fff !important; }
          .card { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}