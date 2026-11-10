export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE = API_BASE;

async function request(method, path, body) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function uploadRequest(method, path, formData) {
  // Never set Content-Type for FormData: the browser must add its own
  // multipart boundary or the upload arrives empty on the server.
  const res = await fetch(BASE + path, { method, credentials: "include", body: formData });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),
  upload: (p, formData, method = "POST") => uploadRequest(method, p, formData),
};

/** Absolute URL for an uploaded file (`/uploads/...`) or a full external URL. */
export function assetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE.replace(/\/api$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "" && v !== "All") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ─── Analytics Helper (Section 5.7) ───
export function trackEvent(action, category, label) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
    });
  }
}