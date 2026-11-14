import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { api } from "../lib/api";

export default function RecoveryCodesCard() {
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => api.get("/auth/mfa/status").then(setStatus).catch(() => setStatus(null));
  useEffect(() => { load(); }, []);

  async function generate(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api.post("/auth/mfa/recovery-codes", { password, token: token.trim() });
      setCodes(result.recoveryCodes || []);
      setPassword(""); setToken("");
      setMessage("New recovery codes generated. Old codes no longer work.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="home-card" aria-label="Recovery codes">
      <div className="home-card-head">
        <div>
          <div className="home-eyebrow">Account security</div>
          <h2 className="d-flex align-items-center gap-2"><KeyRound size={20} /> Recovery codes</h2>
        </div>
        {status?.enabled && (
          <span className="badge bg-light text-dark border">{status.recoveryCodesRemaining || 0} remaining</span>
        )}
      </div>

      {message && <div className="alert alert-success py-2 small">{message}</div>}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {codes.length > 0 && (
        <div className="alert alert-warning small">
          <strong>Store these offline now.</strong> Each code works once. They are not shown again.
          <div className="d-flex flex-wrap gap-2 my-2">
            {codes.map((code) => <code key={code} className="p-1 bg-white rounded border">{code}</code>)}
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>
              Copy all codes
            </button>
            <button type="button" className="btn btn-sm btn-light" onClick={() => setCodes([])}>Done</button>
          </div>
        </div>
      )}

      {!status?.enabled ? (
        <p className="small text-muted mb-0">Recovery codes become available after authenticator two-factor is enabled.</p>
      ) : (
        <form onSubmit={generate}>
          <p className="small text-muted">
            Replace your recovery codes if you have used one or think they were exposed. Confirm your password and a
            current authenticator code.
          </p>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Current password</label>
              <input type="password" className="form-control form-control-sm" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Authenticator code</label>
              <input className="form-control form-control-sm" inputMode="numeric" maxLength={6} value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn btn-outline-secondary btn-sm mt-3" disabled={busy}>
            {busy ? "Generating…" : "Generate new recovery codes"}
          </button>
        </form>
      )}
    </section>
  );
}
