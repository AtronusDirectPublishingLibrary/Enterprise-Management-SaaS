import { AsyncLocalStorage } from "async_hooks";

export type TenantContext = {
  tenantId?: string | null;
  userId?: string | null;
  isPlatformAdmin?: boolean;
  /** When true, tenant scoping middleware is bypassed (system jobs, platform ops). */
  bypassTenantScope?: boolean;
};

const als = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return als.getStore();
}

export function getTenantId(): string | null | undefined {
  return als.getStore()?.tenantId;
}

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Run as platform/system context (no tenant scoping). Use for background jobs and explicit cross-tenant ops. */
export function runAsPlatform<T>(fn: () => T): T {
  return als.run({ bypassTenantScope: true, isPlatformAdmin: true }, fn);
}
