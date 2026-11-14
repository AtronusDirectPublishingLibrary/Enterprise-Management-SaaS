import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function PlatformLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.isPlatformAdmin) return <Navigate to="/platform/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await login(username, password);
      if (!res?.isPlatformAdmin) {
        setError("Access denied. This portal is for platform staff only.");
        return;
      }
      navigate("/platform/dashboard", { replace: true });
    } catch (err) {
      setError(err?.data?.message || err?.message || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{ background: "linear-gradient(180deg,#0b1220,#121826)", color: "#e5e7eb" }}>
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="text-center mb-4">
          <div className="fw-bold fs-4" style={{ color: "#e5e7eb" }}>BEMS <span style={{ color: "#60a5fa" }}>Platform Admin</span></div>
          <div className="small text-secondary">Beshilo Enterprise Management System — platform operations</div>
        </div>
        <div className="card border-0 shadow-lg" style={{ background: "#161d2b", color: "#e5e7eb" }}>
          <div className="card-body p-4">
            <h5 className="mb-3">Staff sign in</h5>
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}
            <form onSubmit={submit} className="d-grid gap-3">
              <div>
                <label className="form-label">Username</label>
                <input className="form-control bg-dark text-light border-secondary" value={username} onChange={e=>setUsername(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input type="password" className="form-control bg-dark text-light border-secondary" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
            </form>
            <div className="mt-3 small text-secondary">Authorized platform staff only. <Link to="/login" className="link-light">Tenant sign in</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}
