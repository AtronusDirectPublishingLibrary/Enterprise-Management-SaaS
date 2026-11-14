import { prisma } from "./prisma";
import { runAsPlatform, runWithTenantContext } from "./tenantContext";

export type TenantRef = { id: string; slug?: string | null };

/**
 * Enumerate active/trial tenants for per-tenant background jobs.
 * Runs in platform context to read the tenant table.
 */
export async function listActiveTenants(): Promise<TenantRef[]> {
  return runAsPlatform(async () =>
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
  );
}

/**
 * Execute a job function once per active tenant in the correct tenant context.
 * Use this to avoid cross-tenant leakage and to ensure tenantId attribution.
 */
export async function runPerTenant<T>(
  name: string,
  fn: (tenant: TenantRef) => Promise<T>,
): Promise<{ tenantId: string; ok: boolean; result?: T; error?: string }[]> {
  const tenants = await listActiveTenants();
  const out: { tenantId: string; ok: boolean; result?: T; error?: string }[] = [];
  for (const t of tenants) {
    try {
      const result = await runWithTenantContext({ tenantId: t.id }, () => fn(t));
      out.push({ tenantId: t.id, ok: true, result });
    } catch (e: any) {
      console.error(`[job:${name}] tenant ${t.id} failed`, e?.message || e);
      out.push({ tenantId: t.id, ok: false, error: e?.message || String(e) });
    }
  }
  return out;
}
