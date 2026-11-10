import { useEffect, useRef, useState } from "react";
import { PenLine, ShieldCheck, Trash2, Upload } from "lucide-react";
import { api, assetUrl } from "../lib/api";

/**
 * Optional signature and initials images owned by the signed-in employee.
 * Uploading is never mandatory: typed signatures remain available everywhere.
 */
export default function SignatureSettingsCard({ profile, onSaved, onError }) {
  const [signatureUrl, setSignatureUrl] = useState(profile?.signatureUrl || "");
  const [initialsUrl, setInitialsUrl] = useState(profile?.initialsUrl || "");
  const [signatureFile, setSignatureFile] = useState(null);
  const [initialsFile, setInitialsFile] = useState(null);
  const [initialsText, setInitialsText] = useState(profile?.initialsText || "");
  const [savedInitialsText, setSavedInitialsText] = useState(profile?.initialsText || "");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [initialsPreview, setInitialsPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const signatureRef = useRef(null);
  const initialsRef = useRef(null);

  useEffect(() => {
    setSignatureUrl(profile?.signatureUrl || "");
    setInitialsUrl(profile?.initialsUrl || "");
    setInitialsText(profile?.initialsText || "");
    setSavedInitialsText(profile?.initialsText || "");
  }, [profile?.signatureUrl, profile?.initialsUrl, profile?.initialsText]);

  const textDirty = initialsText.trim().toUpperCase() !== (savedInitialsText || "").toUpperCase();
  const canSave = Boolean(signatureFile || initialsFile || textDirty);

  const choose = (file, kind) => {
    setError("");
    setNotice("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Signature images must be 2 MB or smaller.");
      return;
    }
    if (kind === "signature") {
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    } else {
      setInitialsFile(file);
      setInitialsPreview(URL.createObjectURL(file));
    }
  };

  const upload = async () => {
    if (!canSave) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      if (signatureFile) body.append("signature", signatureFile);
      if (initialsFile) body.append("initials", initialsFile);
      if (textDirty) body.append("initialsText", initialsText.trim().toUpperCase());
      const result = await api.upload("/hr-self/signature", body);
      setSignatureFile(null);
      setInitialsFile(null);
      setSignaturePreview("");
      setInitialsPreview("");
      setSignatureUrl(result.signatureUrl || "");
      setInitialsUrl(result.initialsUrl || "");
      setInitialsText(result.initialsText || "");
      setSavedInitialsText(result.initialsText || "");
      setNotice("Signature settings saved.");
      onSaved?.();
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (kind) => {
    if (!window.confirm(`Remove your ${kind} image? Typed signing will still work.`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.del(`/hr-self/signature/${kind}`);
      setSignatureUrl(result.signatureUrl || "");
      setInitialsUrl(result.initialsUrl || "");
      setNotice(`${kind === "signature" ? "Signature" : "Initials"} removed.`);
      onSaved?.();
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renderTile = ({ kind, label, url, preview, inputRef }) => (
    <div className="col-md-6">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <label className="form-label small fw-bold mb-0">{label}</label>
        {url ? (
          <button
            type="button"
            className="btn btn-sm btn-link text-danger p-0 d-inline-flex align-items-center gap-1"
            onClick={() => remove(kind)}
            disabled={busy}
          >
            <Trash2 size={13} /> Remove
          </button>
        ) : null}
      </div>
      <label className="signature-dropzone d-block mb-0">
        {preview || url ? (
          <img src={preview || assetUrl(url)} alt={`${label} preview`} />
        ) : (
          <div className="py-3">
            <Upload size={20} className="mb-1" />
            <div className="small fw-semibold">Upload {label.toLowerCase()}</div>
            <div className="text-muted" style={{ fontSize: "0.72rem" }}>PNG, JPG or WebP · max 2 MB</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => choose(event.target.files?.[0], kind)}
        />
      </label>
      {(preview || url) ? (
        <div className="form-text mt-1">
          {preview ? "New image selected — save to apply." : "Uploaded image on file."}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center gap-3 flex-wrap">
        <div>
          <h2 className="h6 fw-bold mb-1 d-flex align-items-center gap-2">
            <PenLine size={18} /> Electronic signature
          </h2>
          <div className="small text-muted">
            Optional images used when you sign forms and approvals. Your typed name is always the legal signature.
          </div>
        </div>
        <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
          <ShieldCheck size={13} /> Private to your account
        </span>
      </div>
      <div className="card-body">
        {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
        {notice ? <div className="alert alert-success py-2 small">{notice}</div> : null}
        <div className="row g-3">
          {renderTile({
            kind: "signature",
            label: "Signature",
            url: signatureUrl,
            preview: signaturePreview,
            inputRef: signatureRef,
          })}
          {renderTile({
            kind: "initials",
            label: "Initials image",
            url: initialsUrl,
            preview: initialsPreview,
            inputRef: initialsRef,
          })}
        </div>

        <div className="typed-initials mt-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label small fw-bold mb-0" htmlFor="typed-initials">
              Or type your initials
            </label>
            <span className="badge bg-light text-dark border">No image needed</span>
          </div>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <input
              id="typed-initials"
              className="form-control form-control-sm typed-initials__input"
              value={initialsText}
              maxLength={8}
              placeholder="e.g. AD"
              onChange={(event) => {
                setError("");
                setNotice("");
                setInitialsText(event.target.value.replace(/[^\p{L}.\s]/gu, "").toUpperCase());
              }}
              aria-describedby="typed-initials-help"
            />
            <span className="typed-initials__chip" aria-hidden="true">
              {initialsText.trim() || "—"}
            </span>
            <span id="typed-initials-help" className="form-text mb-0">
              Letters only, up to 8 characters. An uploaded initials image still takes visual priority.
            </span>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center gap-3 mt-3 flex-wrap">
          <div className="small text-muted">
            Tip: sign on white paper, photograph or scan it, and crop tightly before uploading.
          </div>
          <div className="d-flex gap-2">
            {(signatureFile || initialsFile || textDirty) ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSignatureFile(null);
                  setInitialsFile(null);
                  setSignaturePreview("");
                  setInitialsPreview("");
                  setInitialsText(savedInitialsText || "");
                }}
                disabled={busy}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              className="btn-brand btn-sm d-inline-flex align-items-center gap-2"
              onClick={upload}
              disabled={busy || !canSave}
            >
              <Upload size={14} /> {busy ? "Saving…" : "Save signature settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
