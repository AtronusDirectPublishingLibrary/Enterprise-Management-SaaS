import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import Login from "../Login";

export default function OrgLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/portals/tenant-context?slug=${encodeURIComponent(slug || "")}`)
      .then((data) => {
        if (!active) return;
        setTenant(data);
        setError("");
      })
      .catch((e) => {
        if (!active) return;
        const msg = e?.message || "Organization not found";
        setError(msg);
        // If not found, redirect to /register with message (registration portal may not exist yet, but follow spec intent)
        if (e?.status === 404) {
          navigate("/register", { replace: true, state: { message: "Organization not found" } });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, navigate]);

  if (loading) {
    return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-primary" role="status" /></div>;
  }
  if (error && !tenant) {
    return (
      <div className="auth-wrapper" style={{ background: "#0B2545" }}>
        <div className="auth-card text-center">
          <h4 className="mb-2">Organization not found</h4>
          <p className="text-muted mb-0">{error}</p>
        </div>
      </div>
    );
  }
  return <Login slug={slug} tenantContext={tenant} />;
}
