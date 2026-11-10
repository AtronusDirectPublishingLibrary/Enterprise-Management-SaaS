import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password, mfaRequired ? code.trim() : undefined);
      navigate("/dashboard");
    } catch (e2) {
      console.error("Login error:", e2);
      if (e2.data?.mfaRequired) {
        setMfaRequired(true);
        setCode("");
      }
      setErr(e2.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="text-center mb-4">
          <BrandLogo variant="login" />
          <h1 className="mb-0" style={{ color: "var(--brand-primary)", fontWeight: 800 }}>Ethio-Biopharma</h1>
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
            required
            disabled={mfaRequired}
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
            required
            disabled={mfaRequired}
          />
        </div>

        {mfaRequired && (
          <div className="mb-3">
            <label className="form-label fw-semibold d-flex align-items-center gap-1">
              <ShieldCheck size={15} /> Authenticator code
            </label>
            <input
              className="form-control"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              autoFocus
              required
            />
            <div className="form-text">
              Open your authenticator app and enter the current 6-digit code.
            </div>
          </div>
        )}

        <button type="submit" className="btn-brand w-100 py-2 fs-5" disabled={busy}>
          {busy ? "Signing in..." : mfaRequired ? "Verify and sign in" : "Sign in"}
        </button>

        <div className="mt-4 pt-3 border-top text-center" style={{ fontSize: "0.8rem", color: "#6c757d" }}>
          Use the account issued to you by the system administrator. Access is recorded in the audit trail.
        </div>
      </form>
    </div>
  );
}
