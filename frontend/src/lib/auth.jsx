import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  async function login(username, password, token, turnstileToken) {
    const res = await api.post("/auth/login", {
      username,
      password,
      ...(token ? { token } : {}),
      ...(turnstileToken ? { turnstileToken } : {}),
    });
    const userData = {
      username: res.username,
      firstName: res.firstName,
      lastName: res.lastName,
      position: res.position,
      role: res.role,
      email: res.email,
      forceChange: res.forceChange,
      mfaEnabled: res.mfaEnabled,
      signatureUrl: res.signatureUrl,
      initialsUrl: res.initialsUrl,
      initialsText: res.initialsText,
      avatarUrl: res.avatarUrl,
      permissions: res.permissions,
    };
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}