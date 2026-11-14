import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getTenantContext } from "./tenantContext";

/**
 * RLS integration helper.
 *
 * The generated policies in docs/rls-tenant-policies.sql expect:
 *   - app.tenant_id = current tenant id (text)
 *   - app.bypass_rls = 'on' for explicit platform/system operations
 *
 * With Prisma, session variables must be set on the same connection; the safe way
 * is inside a transaction (SET LOCAL / set_config(..., true)). Use this wrapper for
 * operations that should be protected by DB-level RLS once policies are enabled.
 *
 * NOTE: RLS policies are NOT auto-applied by the app; apply docs/rls-tenant-policies.sql
 * in a staged migration after validating compatibility with all query paths.
 */
export async function withRls<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const ctx = getTenantContext();
  const tenantId = ctx?.tenantId ?? null;
  const bypass = ctx?.bypassTenantScope ? "on" : "off";
  return prisma.$transaction(async (tx) => {
    if (bypass === "on") {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', '', true)`;
    } else {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId ?? ""}, true)`;
    }
    return fn(tx);
  });
}

/** Returns RLS session settings for the current context (for diagnostics/middleware). */
export function currentRlsSettings() {
  const ctx = getTenantContext();
  return {
    tenantId: ctx?.tenantId ?? null,
    bypassRls: Boolean(ctx?.bypassTenantScope),
  };
}
