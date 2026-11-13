export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE = API_BASE;
const CSRF_COOKIE = "ep_csrf";

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

let csrfRequest = null;

async function refreshCsrf() {
  if (!csrfRequest) {
    csrfRequest = fetch(`${BASE}/auth/csrf`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return "";
        const data = await res.json().catch(() => null);
        return data?.token || readCookie(CSRF_COOKIE);
      })
      .catch(() => "")
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

async function csrfToken() {
  return readCookie(CSRF_COOKIE) || (await refreshCsrf());
}

function isMutation(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

function toError(res, data) {
  const msg = data?.message || data?.error || `HTTP ${res.status} ${res.statusText}`;
  const err = new Error(msg);
  err.status = res.status;
  err.data = data;
  return err;
}

async function send(method, path, body, formData) {
  const opts = { method, credentials: "include", headers: {} };
  const mutate = isMutation(method);
  if (mutate && path !== "/auth/login") {
    const token = await csrfToken();
    if (token) opts.headers["X-CSRF-Token"] = token;
  }
  if (formData) {
    // Never set Content-Type for FormData: the browser must add its own
    // multipart boundary or the upload arrives empty on the server.
    opts.body = formData;
  } else {
    opts.headers["Content-Type"] = "application/json";
    if (body !== undefined) opts.body = JSON.stringify(body);
  }
  return fetch(BASE + path, opts);
}

async function request(method, path, body, formData) {
  let res = await send(method, path, body, formData);
  let data = await parseResponse(res);

  // A session may predate the CSRF cookie, or another tab may have rotated it.
  // Fetch a fresh double-submit token and retry once.
  if (res.status === 403 && data?.code === "CSRF_INVALID" && isMutation(method)) {
    await refreshCsrf();
    res = await send(method, path, body, formData);
    data = await parseResponse(res);
  }

  if (!res.ok) throw toError(res, data);
  return data;
}

async function uploadRequest(method, path, formData) {
  return request(method, path, undefined, formData);
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
  const publicPrefixes = ["avatars/", "brand/", "hero/", "media/", "news/"];
  const relative = url.replace(/^\/?uploads\//, "");
  if (publicPrefixes.some((prefix) => relative.startsWith(prefix))) {
    return `${BASE.replace(/\/api$/, "")}/uploads/${relative}`;
  }
  return `${BASE}/files/${relative}`;
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
