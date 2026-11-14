import { Request, Response, NextFunction } from "express";
import { verifyToken, COOKIE_NAME, JwtPayload } from "../lib/jwt";
import { allows, isAdminUser } from "../lib/access";
import { prisma } from "../lib/prisma";
import { mfaRequiredFor } from "../lib/mfaPolicy";
import { runWithTenantContext, runAsPlatform } from "../lib/tenantContext";
import { isModuleEnabledForTenant } from "../lib/moduleGate";

declare global {
  namespace Express {
    interface Request { user?: JwtPayload & { tenantId?: string | null }; tenant?: any }
  }
}

function mfaEnrollmentPath(req: Request) {
  const path = (req.originalUrl || "").split("?")[0];
  return (
    path === "/api/auth/me" ||
    path === "/api/auth/logout" ||
    path === "/api/auth/logout-all" ||
    path === "/api/auth/mfa/status" ||
    path === "/api/auth/mfa/setup" ||
    path === "/api/auth/mfa/enable" ||
    path.startsWith("/api/auth/passkeys")
  );
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Not authenticated" });
  try {
    const payload = verifyToken(token);
    const tokenVersion = payload.tokenVersion ?? 0;

    // Bootstrap user lookup must bypass tenant scoping (we don't know tenant yet).
    const user = await runWithTenantContext({ bypassTenantScope: true }, async () =>
      prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          tokenVersion: true,
          mfaEnabled: true,
          role: true,
          position: true,
          tenantId: true,
          isPlatformAdmin: true,
          isTenantAdmin: true,
          username: true,
        },
      }),
    );
    if (!user || user.tokenVersion !== tokenVersion) {
      return res.status(401).json({ message: "Session revoked. Please sign in again." });
    }
    if (mfaRequiredFor(user) && !user.mfaEnabled && !mfaEnrollmentPath(req)) {
      return res.status(403).json({
        code: "MFA_ENROLLMENT_REQUIRED",
        mfaEnrollmentRequired: true,
        message: "Your role requires two-factor authentication. Enroll an authenticator app before continuing.",
      });
    }

    const effectiveTenantId = payload.tenantId ?? user.tenantId ?? null;
    let tenant: any = null;
    if (effectiveTenantId) {
      tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: effectiveTenantId } }));
      if (!tenant) return res.status(401).json({ message: "Tenant not found for session" });
      if (!["ACTIVE", "TRIAL"].includes(tenant.status)) {
        return res.status(402).json({ message: `Tenant is ${tenant.status}`, status: tenant.status });
      }
    }

    const enriched: any = {
      ...payload,
      tenantId: effectiveTenantId,
      position: payload.position ?? user.position ?? null,
      role: payload.role ?? user.role,
      isPlatformAdmin: Boolean(user.isPlatformAdmin || payload.isPlatformAdmin),
      isTenantAdmin: Boolean(user.isTenantAdmin),
      username: user.username,
    };
    req.user = enriched;
    req.tenant = tenant;

    return runWithTenantContext(
      {
        tenantId: enriched.tenantId ?? null,
        userId: enriched.sub,
        isPlatformAdmin: Boolean(user.isPlatformAdmin || payload.isPlatformAdmin),
      },
      () => next(),
    );
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

/** Attaches a valid session when present, but lets public endpoints continue. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await runWithTenantContext({ bypassTenantScope: true }, async () =>
      prisma.user.findUnique({
        where: { id: payload.sub },
        select: { tokenVersion: true, mfaEnabled: true, role: true, position: true, tenantId: true, isPlatformAdmin: true, isTenantAdmin: true, username: true },
      }),
    );
    if (user && user.tokenVersion === (payload.tokenVersion ?? 0) && (!mfaRequiredFor(user) || user.mfaEnabled)) {
      const effectiveTenantId = payload.tenantId ?? user.tenantId ?? null;
      let tenant: any = null;
      if (effectiveTenantId) {
        tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: effectiveTenantId } }));
      }
      const enriched: any = { ...payload, tenantId: effectiveTenantId, isPlatformAdmin: Boolean(user.isPlatformAdmin || payload.isPlatformAdmin), isTenantAdmin: Boolean(user.isTenantAdmin), username: user.username };
      req.user = enriched;
      req.tenant = tenant;
      return runWithTenantContext(
        { tenantId: enriched.tenantId ?? null, userId: enriched.sub, isPlatformAdmin: Boolean(user.isPlatformAdmin || payload.isPlatformAdmin) },
        () => next(),
      );
    }
  } catch {
    // Public files remain public; private files will reject the request.
  }
  next();
}

export function requireAccess(key: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!allows(req.user, key)) {
      return res.status(403).json({
        message: `Your position does not have access to this workspace (${key}).`,
      });
    }
    try {
      const tenantId = (req.user as any).tenantId ?? null;
      const enabled = await isModuleEnabledForTenant(key, tenantId);
      if (!enabled) {
        return res.status(403).json({
          message: `This module is not enabled for your organization (${key}).`,
          code: "MODULE_DISABLED",
        });
      }
    } catch {
      // Fail closed on module-resolution errors for tenant-scoped requests
      if ((req.user as any)?.tenantId) {
        return res.status(503).json({ message: "Unable to verify module access. Please try again." });
      }
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (roles.includes("admin") && isAdminUser(req.user)) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

/** Admin-only areas that one operational position also owns (e.g. IT → media). */
export function requireAdminOrPosition(...positions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const position = (req.user.position || "").trim();
    if (isAdminUser(req.user) || positions.includes(position)) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}
