import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("pms2026");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="text-center mb-4">
          <h1 className="mb-0" style={{ color: "var(--brand-primary)", fontWeight: 800 }}>Ethiobiopharma</h1>
          <h4 className="mt-1" style={{ color: "var(--brand-secondary)", fontWeight: 600, letterSpacing: "1px" }}>Database</h4>
        </div>

        {err && <div className="alert alert-danger py-2">{err}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold">Username</label>
          <input
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn-brand w-100 py-2 fs-5" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-4 pt-3 border-top text-center" style={{ fontSize: "0.8rem", color: "#6c757d" }}>
          <div className="fw-semibold mb-1">Demo accounts</div>
          <div>admin / pms2026 &nbsp;·&nbsp; pm_demo / pm123</div>
          <div>pi_demo / pi123 &nbsp;·&nbsp; viewer_demo / viewer123</div>
        </div>
      </form>
    </div>
  );
}