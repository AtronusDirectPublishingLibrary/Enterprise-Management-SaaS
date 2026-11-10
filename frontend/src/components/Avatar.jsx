import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../lib/api";

const PALETTE = [
  ["#0d3357", "#e8f1f8"],
  ["#2f8f6b", "#e7f6ef"],
  ["#8a6d1f", "#fbf3dc"],
  ["#2e6f9e", "#e6f2fa"],
  ["#8c3b3b", "#fbeaea"],
  ["#5b4b8a", "#efecfa"],
];

export function initialsFor(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "EB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function paletteFor(seed) {
  let hash = 0;
  const text = String(seed || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Round portrait with a graceful initials fallback. The image is cropped square
 * at upload time, so every surface shows the same framing.
 */
export default function Avatar({
  name,
  src,
  size = 40,
  ring = false,
  className = "",
  style,
  title,
  badge,
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const initials = useMemo(() => initialsFor(name), [name]);
  const [ink, paper] = paletteFor(name);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`avatar ${ring ? "avatar--ring" : ""} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        background: showImage ? "#e8eef4" : paper,
        color: ink,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        ...style,
      }}
      title={title || name || undefined}
      aria-hidden={!name && !src}
    >
      {showImage ? (
        <img
          src={assetUrl(src)}
          alt={name ? `${name} profile photo` : "Profile photo"}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className="avatar__initials">{initials}</span>
      )}
      {badge ? <span className="avatar__badge">{badge}</span> : null}
    </span>
  );
}