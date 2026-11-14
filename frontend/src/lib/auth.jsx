import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/auth/me")
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function toUser(res) {
    return {
      username: res.username,
      firstName: res.firstName,
      lastName: res.lastName,
      position: res.position,
      role: res.role,
      email: res.email,
      tenantId: res.tenantId || null,
      isTenantAdmin: Boolean(res.isTenantAdmin),
      isPlatformAdmin: Boolean(res.isPlatformAdmin),
      impersonatingTenantId: res.impersonatingTenantId || null,
      impersonatedBy: res.impersonatedBy || null,
      impersonatedByUsername: res.impersonatedByUsername || null,
      enabledModules: res.enabledModules ?? null,
      forceChange: res.forceChange,
      mfaEnabled: res.mfaEnabled,
      mfaEnrollmentRequired: Boolean(res.mfaEnrollmentRequired),
      passkeyCount: res.passkeyCount || 0,
      signatureUrl: res.signatureUrl,
      initialsUrl: res.initialsUrl,
      initialsText: res.initialsText,
      avatarUrl: res.avatarUrl,
      permissions: res.permissions,
    };
  }

  async function login(username, password, token, turnstileToken, slug) {
    const res = await api.post("/auth/login", {
      username,
      password,
      ...(token ? { token } : {}),
      ...(turnstileToken ? { turnstileToken } : {}),
      ...(slug ? { slug } : {}),
    });
    const userData = toUser(res);
    setUser(userData);
    return userData;
  }

  /** Passwordless path: password remains available as a fallback. */
  async function loginWithPasskey(username) {
    const options = await api.post("/auth/passkeys/login/options", { username });
    const response = await startAuthentication({ optionsJSON: options.options });
    const res = await api.post("/auth/passkeys/login/verify", {
      challengeId: options.challengeId,
      response,
    });
    const userData = toUser(res);
    setUser(userData);
    return userData;
  }

  /** Re-read the profile after the person changes their photo or signature. */
  async function refreshUser() {
    const fresh = await api.get("/auth/me");
    setUser(fresh);
    return fresh;
  }

  async function logout() {
    try { await api.post("/auth/logout", {}); } catch { /* ignore */ }
    setUser(null);
    navigate("/");
  }

  async function refreshSession() {
    const res = await api.get("/auth/me");
    const u = toUser(res);
    setUser(u);
    return u;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithPasskey, logout, setUser, refreshUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}