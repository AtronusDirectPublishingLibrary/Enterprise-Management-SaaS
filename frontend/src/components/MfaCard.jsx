import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "../lib/api";

/**
 * Self-service two-factor authentication. The secret is only activated after
 * the user proves they can generate a valid code, so a mis-scanned key cannot
 * lock anyone out.
 */
export default function MfaCard() {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  useEffect(() => {
    api.get("/auth/mfa/status")
      .then((data) => setStatus({ enabled: Boolean(data?.enabled) }))
      .catch(() => setStatus({ enabled: false }));
  }, []);

  async function beginSetup() {
    setBusy(true); setError(""); setMessage("");
    try {
      setSetup(await api.post("/auth/mfa/setup", {}));
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function enableMfa(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api.post("/auth/mfa/enable", { token: code.trim() });
      setStatus({ enabled: true });
      setSetup(null);
      setCode("");
      setRecoveryCodes(result.recoveryCodes || []);
      setMessage("Two-factor authentication is now on. You will be asked for a code at every sign-in.");
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function disableMfa(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await api.post("/auth/mfa/disable", { password, token: disableCode.trim() });
      setStatus({ enabled: false });
      setPassword(""); setDisableCode("");
      setMessage("Two-factor authentication is off for your account.");
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function copySecret() {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be blocked; the key is visible on screen */ }
  }

  const secondFactorOn = Boolean(status?.enabled || (status?.passkeyCount || 0) > 0);

  return (
    <section className="home-card" aria-label="Account security">
      <div className="home-card-head">
        <div>
          <div className="home-eyebrow">Account security</div>
          <h2 className="d-flex align-items-center gap-2">
            {secondFactorOn ? <ShieldCheck size={20} /> : <KeyRound size={20} />}
            Two-factor authentication
          </h2>
        </div>
        <span className={`badge ${secondFactorOn ? "bg-success" : "bg-light text-dark border"}`}>
          {status?.enabled ? "On" : secondFactorOn ? "Passkey" : "Off"}
        </span>
      </div>

      {status?.required && !status?.enabled && (
        <div className="alert alert-warning py-2 small">
          Your role requires authenticator-app two-factor authentication. Set it up before using other workspaces;
          passkeys remain an optional convenience and do not replace the password fallback.
        </div>
      )}

      {message && <div className="alert alert-success py-2 small">{message}</div>}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {recoveryCodes.length > 0 && (
        <div className="alert alert-warning small">
          <strong>Save these recovery codes now.</strong> They are shown once and each can be used once if your
          authenticator is unavailable. Store them offline, not in the same place as your password.
          <div className="d-flex flex-wrap gap-2 my-2">
            {recoveryCodes.map((recoveryCode) => (
              <code key={recoveryCode} className="p-1 bg-white rounded border">{recoveryCode}</code>
            ))}
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}
            >
              Copy all codes
            </button>
            <button type="button" className="btn btn-sm btn-light" onClick={() => setRecoveryCodes([])}>
              I have saved them
            </button>
          </div>
        </div>
      )}

      {status?.enabled ? (
        <form onSubmit={disableMfa} className="mt-2">
          <p className="small text-muted mb-3">
            Your account is protected by an authenticator app. To turn protection off, confirm your password and a
            current code.
          </p>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Current password</label>
              <input type="password" className="form-control form-control-sm" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Authenticator code</label>
              <input className="form-control form-control-sm" inputMode="numeric" maxLength={6} value={disableCode} onChange={(e) => setDisableCode(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn btn-outline-danger btn-sm mt-3" disabled={busy}>
            <ShieldOff size={14} /> {busy ? "Working…" : "Disable two-factor authentication"}
          </button>
        </form>
      ) : setup ? (
        <form onSubmit={enableMfa} className="mt-2">
          <p className="small text-muted">
            Open Google Authenticator, Microsoft Authenticator or 1Password, choose <strong>Add account → Enter a setup key</strong>,
            and enter this key. Keep it private.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <code className="p-2 bg-light rounded border" style={{ letterSpacing: "1px" }}>{setup.secret}</code>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={copySecret}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy key"}
            </button>
          </div>
          {setup.otpauth && (
            <div className="form-text mb-3">
              On a device with an authenticator app you can also open this link:{" "}
              <a href={setup.otpauth}>otpauth enrolment link</a>
            </div>
          )}
          <label className="form-label small fw-semibold">Enter the current 6-digit code</label>
          <div className="d-flex gap-2">
            <input className="form-control form-control-sm" style={{ maxWidth: 160 }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
            <button type="submit" className="btn btn-brand btn-sm" disabled={busy || code.trim().length !== 6}>
              {busy ? "Verifying…" : "Turn on"}
            </button>
            <button type="button" className="btn btn-light btn-sm" onClick={() => { setSetup(null); setCode(""); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="mt-2">
          <p className="small text-muted mb-3">
            Add a second step at sign-in. Even if someone learns your password, they cannot open payroll, HR or
            administrative data without the code from your phone.
          </p>
          <button type="button" className="btn btn-brand btn-sm" onClick={beginSetup} disabled={busy || status === null}>
            <KeyRound size={14} /> {busy ? "Preparing…" : "Set up two-factor authentication"}
          </button>
        </div>
      )}
    </section>
  );
}
