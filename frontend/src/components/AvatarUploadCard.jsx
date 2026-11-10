import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw, Trash2, X, ZoomIn } from "lucide-react";
import { api } from "../lib/api";
import Avatar from "./Avatar";

const VIEWPORT = 280;
const OUTPUT = 640;

/**
 * Self-service portrait. The chosen photo is cropped square in the browser with
 * drag and zoom, then sent as a small JPEG so the header and HR tables stay fast.
 */
export default function AvatarUploadCard({ profile, onSaved, onError }) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const fileRef = useRef(null);

  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.username || "";
  const source = profile?.avatarUrl || "";

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setOpen(false);
    setImage(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const clamp = useCallback(
    (nextZoom, nextOffset) => {
      if (!image) return nextOffset;
      const scale = Math.max(VIEWPORT / image.width, VIEWPORT / image.height) * nextZoom;
      const maxX = Math.max(0, (image.width * scale - VIEWPORT) / 2);
      const maxY = Math.max(0, (image.height * scale - VIEWPORT) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
        y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
      };
    },
    [image]
  );

  const draw = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas || !image) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIEWPORT * dpr;
    canvas.height = VIEWPORT * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    const scale = Math.max(VIEWPORT / image.width, VIEWPORT / image.height) * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (VIEWPORT - width) / 2 + offset.x, (VIEWPORT - height) / 2 + offset.y, width, height);
  }, [image, zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  const choose = (file) => {
    setError("");
    setNotice("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG or WebP photo.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Choose a photo smaller than 12 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setImage(img);
        setOpen(true);
      };
      img.onerror = () => setError("That file could not be read as an image.");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const startDrag = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, offset };
  };

  const drag = (event) => {
    if (!dragRef.current) return;
    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    setOffset(clamp(zoom, { x: dragRef.current.offset.x + deltaX, y: dragRef.current.offset.y + deltaY }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const upload = async () => {
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      const ratio = OUTPUT / VIEWPORT;
      const scale = Math.max(VIEWPORT / image.width, VIEWPORT / image.height) * zoom;
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(
        image,
        ((VIEWPORT - width) / 2 + offset.x) * ratio,
        ((VIEWPORT - height) / 2 + offset.y) * ratio,
        width * ratio,
        height * ratio
      );
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Could not prepare the photo. Try another file.");
      const body = new FormData();
      body.append("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      await api.upload("/hr-self/avatar", body);
      setNotice("Profile photo updated.");
      close();
      await onSaved?.();
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove your profile photo? Your initials will be shown instead.")) return;
    setBusy(true);
    setError("");
    try {
      await api.del("/hr-self/avatar");
      setNotice("Profile photo removed.");
      await onSaved?.();
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm mb-4 avatar-card">
      <div className="card-body d-flex flex-column flex-md-row align-items-md-center gap-4">
        <div className="avatar-card__portrait">
          <Avatar name={name} src={source} size={112} ring />
          <span className="avatar-card__camera">
            <Camera size={16} />
          </span>
        </div>
        <div className="flex-grow-1">
          <h2 className="h6 fw-bold mb-1">Profile photo</h2>
          <p className="small text-muted mb-3 mb-md-2" style={{ maxWidth: "58ch" }}>
            A clear, front-facing portrait appears beside your name in My Portal and the header, and in HR
            registers. You can drag and zoom to frame it; everything is cropped to a circle automatically.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <label className="btn btn-sm btn-brand d-inline-flex align-items-center gap-2 mb-0">
              <ImagePlus size={15} /> {source ? "Change photo" : "Upload photo"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => choose(event.target.files?.[0])}
              />
            </label>
            {source ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-2"
                onClick={remove}
                disabled={busy}
              >
                <Trash2 size={14} /> Remove
              </button>
            ) : null}
            <span className="small text-muted">PNG, JPG or WebP · square crop · max 12 MB</span>
          </div>
          {error ? <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div> : null}
          {notice ? <div className="alert alert-success py-2 small mt-3 mb-0">{notice}</div> : null}
        </div>
      </div>

      {open ? (
        <div
          className="avatar-crop-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) close();
          }}
        >
          <div className="avatar-crop" role="dialog" aria-modal="true" aria-label="Crop profile photo">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <div className="text-uppercase small fw-bold" style={{ letterSpacing: "0.12em", color: "var(--brand-secondary)" }}>
                  Portrait
                </div>
                <h2 className="h5 fw-bold mb-0">Frame your photo</h2>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={close} disabled={busy} aria-label="Close">
                <X size={15} />
              </button>
            </div>

            <div className="avatar-crop__stage">
              <canvas
                ref={previewRef}
                width={VIEWPORT}
                height={VIEWPORT}
                style={{ width: "100%", maxWidth: VIEWPORT, touchAction: "none", cursor: "grab" }}
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
              <div className="avatar-crop__ring" aria-hidden="true" />
            </div>

            <div className="d-flex align-items-center gap-2 mt-3">
              <ZoomIn size={16} className="text-muted" />
              <input
                type="range"
                className="form-range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => {
                  const nextZoom = Number(event.target.value);
                  setZoom(nextZoom);
                  setOffset((current) => clamp(nextZoom, current));
                }}
                aria-label="Zoom"
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
            <div className="small text-muted mt-1">Drag the photo to centre your face, then save.</div>
            {error ? <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div> : null}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn-brand btn-sm" onClick={upload} disabled={busy || !image}>
                {busy ? "Saving…" : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}