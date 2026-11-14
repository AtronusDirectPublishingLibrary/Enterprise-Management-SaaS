import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

const TenantContext = createContext({ loading: false, context: null, refresh: async () => {} });

export function TenantContextProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!user) {
      setContext(null);
      try { sessionStorage.removeItem("ebems.tenantContext"); } catch {}
      return;
    }
    setLoading(true);
    try {
      const data = await api.get("/portals/tenant-context/current");
      setContext(data);
      try { sessionStorage.setItem("ebems.tenantContext", JSON.stringify(data)); } catch {}
    } catch {
      // keep previous/none
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.tenantId, user?.username, user?.impersonatingTenantId]);

  useEffect(() => {
    if (!context?.tenant) return;
    const root = document.documentElement;
    const primary = context.tenant.primaryColor;
    const secondary = context.tenant.secondaryColor;
    if (/^#[0-9a-fA-F]{6}$/.test(primary || "")) {
      root.style.setProperty("--brand-primary", primary.toUpperCase());
    }
    if (/^#[0-9a-fA-F]{6}$/.test(secondary || "")) {
      root.style.setProperty("--brand-secondary", secondary.toUpperCase());
    }
  }, [context]);

  const value = useMemo(() => ({ loading, context, refresh, tenant: context?.tenant || null, modules: context?.modules || [], labels: context?.labels || {}, workflows: context?.workflows || {}, departments: context?.departments || [] }), [loading, context]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  return useContext(TenantContext);
}
