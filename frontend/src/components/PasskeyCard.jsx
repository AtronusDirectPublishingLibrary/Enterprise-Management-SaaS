import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../lib/api";

export default function PasskeyCard() {
  const [status, setStatus] = useState(null);
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const state = await api.get("/auth/passkeys/status");
      setStatus(state);
      if (state.enabled) setKeys(await api.get("/auth/passkeys"));
    } catch {
      setStatus({ enabled: false, configured: false });
    }
  };

  useEffect(() => { load(); }, []);

  async function addDevice() {
    setBusy(true); setError(""); setMessage("");
    try {
      const options = await api.post("/auth/passkeys/register/options", {});
      const response = await startRegistration({ optionsJSON: options.options });
      await api.post("/auth/passkeys/register/verify", {
        challengeId: options.challengeId,
        response,
        name: name.trim() || "This device",
      });
      setName("");
      setMessage("This device can now unlock your account with its fingerprint, face or PIN.");
      await load();
    } catch (e) {
      setError(e.message || "The device could not be enrolled. Try again or use an authenticator app.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDevice(id) {
    if (!window.confirm("Remove this passkey? You can still sign in with your password and authenticator app.")) return;
    try {
      await api.del(`/auth/passkeys/${id}`);
      setMessage("Passkey removed.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="home-card" aria-label="Device unlock">
      <div className="home-card-head">
        <div>
          <div className="home-eyebrow">Account security</div>
          <h2 className="d-flex align-items-center gap-2"><Fingerprint size={20} /> Device unlock</h2>
        </div>
        <span className={`badge ${keys.length ? "bg-success" : "bg-light text-dark border"}`}>
          {keys.length ? `${keys.length} device${keys.length === 1 ? "" : "s"}` : "Off"}
        </span>
      </div>

      {message && <div className="alert alert-success py-2 small">{message}</div>}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {!status?.enabled ? (
        <p className="small text-muted mb-0">
          Passkeys are not enabled on this deployment. Password sign-in and authenticator-app two-factor remain
          available. An administrator must configure the WebAuthn relying-party ID and origin first.
        </p>
      ) : (
        <>
          <p className="small text-muted mb-3">
            Add this device as a passkey. Sign-in then uses your fingerprint, face or device PIN; your password
            remains available as a fallback. Passkeys are phishing-resistant and never leave your device.
          </p>
          {keys.length > 0 && (
            <ul className="list-group list-group-flush mb-3">
              {keys.map((key) => (
                <li key={key.id} className="list-group-item px-0 d-flex justify-content-between align-items-center gap-2">
                  <span className="small">
                    <ShieldCheck size={14} className="me-1 text-success" />
                    <strong>{key.name || "Passkey"}</strong>
                    <span className="text-muted d-block">
                      Added {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ""}
                    </span>
                  </span>
                  <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeDevice(key.id)} aria-label="Remove passkey">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="form-label small fw-semibold">Device name (optional)</label>
          <div className="d-flex gap-2">
            <input
              className="form-control form-control-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office laptop"
              maxLength={80}
            />
            <button type="button" className="btn btn-brand btn-sm text-nowrap" onClick={addDevice} disabled={busy || typeof window.PublicKeyCredential === "undefined"}>
              <Fingerprint size={14} /> {busy ? "Waiting…" : "Enroll this device"}
            </button>
          </div>
          {typeof window.PublicKeyCredential === "undefined" && (
            <div className="form-text text-danger">This browser does not support passkeys.</div>
          )}
        </>
      )}
    </section>
  );
}
