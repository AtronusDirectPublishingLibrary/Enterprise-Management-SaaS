import type { Prisma } from "@prisma/client";
import { getTenantContext } from "./tenantContext";

// Models that are global/platform and must never be tenant-scoped by middleware.
const GLOBAL_MODELS = new Set(["Tenant", "SubscriptionPlan", "JobLock"]);

// Models that may be accessed without a tenant context only when explicitly intended;
// for request paths we still require tenant context if not bypassed.
const TENANT_OPTIONAL_MODELS = new Set([
  "AuditLog",
  "AuditVerification",
  "AuditCheckpoint",
  "JobLock",
  "AppSetting",
]);

function isScopedModel(model?: string) {
  if (!model) return false;
  if (GLOBAL_MODELS.has(model)) return false;
  return true;
}

function ensureWhere(args: any) {
  if (!args.where) args.where = {};
  return args.where;
}

export function tenantMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;
    if (!isScopedModel(model)) return next(params);

    const ctx = getTenantContext();
    if (ctx?.bypassTenantScope) return next(params);

    const tenantId = ctx?.tenantId ?? null;

    // Default request behavior: require tenant scope. System/platform flows must
    // run in an explicit bypass context.
    if (!tenantId) {
      throw new Error(`TENANT_SCOPE_REQUIRED:${model}:${params.action}`);
    }

    const a: any = params.args || (params.args = {});

    switch (params.action) {
      case "findMany":
      case "findFirst":
      case "count":
      case "aggregate":
      case "groupBy":
      case "deleteMany":
      case "updateMany": {
        const where = ensureWhere(a);
        if (where.tenantId === undefined) where.tenantId = tenantId;
        break;
      }
      case "findUnique":
      case "findUniqueOrThrow": {
        // Convert to findFirst with tenant constraint to prevent cross-tenant access by unique id.
        // findUnique's where may use compound-unique selectors (e.g. { userId_cycle: { userId, cycle } })
        // which are not valid in findFirst filters, so flatten them into scalar fields.
        params.action = params.action === "findUniqueOrThrow" ? "findFirstOrThrow" : "findFirst";
        const original = a.where || {};
        const flattened: any = {};
        for (const [k, v] of Object.entries(original)) {
          if (v && typeof v === "object" && !Array.isArray(v)) {
            Object.assign(flattened, v);
          } else {
            flattened[k] = v;
          }
        }
        flattened.tenantId = tenantId;
        a.where = flattened;
        break;
      }
      case "create": {
        if (!a.data) a.data = {};
        if (a.data.tenantId === undefined || a.data.tenantId === null) a.data.tenantId = tenantId;
        break;
      }
      case "createMany": {
        if (Array.isArray(a.data)) {
          a.data = a.data.map((row: any) => ({ ...row, tenantId: row?.tenantId ?? tenantId }));
        } else if (a.data) {
          a.data.tenantId = a.data.tenantId ?? tenantId;
        }
        break;
      }
      case "update":
      case "delete": {
        // Rewrite to updateMany/deleteMany with tenant constraint; enforce single-row effect.
        const where = ensureWhere(a);
        if (where.tenantId === undefined) where.tenantId = tenantId;
        if (params.action === "update") {
          params.action = "updateMany";
          const result = await next(params);
          if ((result as any)?.count === 0) {
            // preserve not-found semantics roughly
            const err: any = new Error("Record to update not found.");
            err.code = "P2025";
            throw err;
          }
          // callers expecting the record may break; but safer. For common cases, return count.
          return result;
        } else {
          params.action = "deleteMany";
          const result = await next(params);
          if ((result as any)?.count === 0) {
            const err: any = new Error("Record to delete does not exist.");
            err.code = "P2025";
            throw err;
          }
          return result;
        }
      }
      case "upsert": {
        const where = ensureWhere(a);
        if (where.tenantId === undefined) where.tenantId = tenantId;
        if (a.create && a.create.tenantId == null) a.create.tenantId = tenantId;
        if (a.update && a.update.tenantId == null) a.update.tenantId = tenantId;
        break;
      }
      default:
        // executeRaw/queryRaw etc. bypass middleware dispatch by model in most cases; be permissive.
        break;
    }

    return next(params);
  };
}
