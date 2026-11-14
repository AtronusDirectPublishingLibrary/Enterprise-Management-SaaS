const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function downloadFromApi(path, filename) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let msg = `Export failed (${res.status})`;
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
