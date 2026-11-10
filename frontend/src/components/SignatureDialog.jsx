import { useEffect, useRef, useState } from "react";
import { PenLine, X } from "lucide-react";
import { api, assetUrl } from "../lib/api";

/**
 * Typed electronic signature with the optional uploaded signature and initials
 * shown alongside it. Used for requisitions, leave, timesheets, plans,
 * documents and job-description acknowledgement.
 */
export default function SignatureDialog({
  open,
  title = "Sign electronically",
  subtitle = "Type your full name exactly as it appears on your HR record.",
  confirmLabel = "Sign and continue",
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    api.get("/auth/me")
      .then((me) => {
        setProfile(me);
        setName((current) => current || [me.firstName, me.lastName].filter(Boolean).join(" "));
        window.setTimeout(() => inputRef.current?.focus(), 80);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    if (name.trim().length < 3) {
      setError("Enter at least three characters — this is your legal signature.");
      return;
    }
    setError("");
    onConfirm?.(name.trim());
  };

  return (
    <div className="signature-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel?.();
    }}>
      <form className="signature-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="signature-title">
        <div className="signature-modal__head d-flex justify-content-between align-items-start gap-3">
          <div>
            <div className="text-uppercase small fw-bold" style={{ letterSpacing: "0.12em", color: "var(--brand-secondary)" }}>
              Electronic signature
            </div>
            <h2 id="signature-title" className="h5 fw-bold mb-1">{title}</h2>
            <p className="small mb-0" style={{ opacity: 0.78 }}>{subtitle}</p>
          </div>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={onCancel} disabled={busy} aria-label="Close signature dialog">
            <X size={15} />
          </button>
        </div>

        <div className="signature-modal__body">
          <div className="row g-3 align-items-stretch mb-3">
            <div className="col-sm-7">
              <div className="small fw-bold text-muted mb-1">Signature on file</div>
              <div className="signature-preview-box">
                {profile?.signatureUrl ? (
                  <img src={assetUrl(profile.signatureUrl)} alt="Your uploaded signature" />
                ) : (
                  <span className="signature-ink">{name || "Your signature"}</span>
                )}
              </div>
            </div>
            <div className="col-sm-5">
              <div className="small fw-bold text-muted mb-1">Initials</div>
              <div className="signature-preview-box">
                {profile?.initialsUrl ? (
                  <img src={assetUrl(profile.initialsUrl)} alt="Your uploaded initials" />
                ) : (
                  <span className="signature-ink">
                    {profile?.initialsText ||
                      (name || "")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase() ||
                      "—"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <label className="form-label small fw-bold" htmlFor="signature-name">Full name</label>
          <input
            id="signature-name"
            ref={inputRef}
            className={`form-control ${error ? "is-invalid" : ""}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Type your full name"
            autoComplete="name"
            required
          />
          {error ? <div className="invalid-feedback">{error}</div> : null}
          <div className="form-text">
            Your typed name, the timestamp, typed initials and uploaded images (when available) are stored with this record.
          </div>
          {!profile?.signatureUrl ? (
            <div className="alert alert-light border small py-2 mt-3 mb-0">
              You have not uploaded a signature image. You can add an image or type your initials in{" "}
              <strong>My Portal → Electronic signature</strong>; typed signing still works without either.
            </div>
          ) : null}
        </div>

        <div className="signature-modal__foot">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-brand btn-sm d-inline-flex align-items-center gap-2" disabled={busy}>
            <PenLine size={15} /> {busy ? "Signing…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
