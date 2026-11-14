import { Request, Response, NextFunction } from "express";
import { verifyToken, COOKIE_NAME, JwtPayload } from "../lib/jwt";
import { allows, isAdminUser } from "../lib/access";
import { prisma } from "../lib/prisma";
import { mfaRequiredFor } from "../lib/mfaPolicy";

declare global {
  namespace Express {
    interface Request { user?: JwtPayload }
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
    // Legacy tokens predate versioning, so they are treated as version 0.
    // They remain valid while the account is at 0 and are revoked as soon as a
    // password change or global sign-out increments the stored version.
    const tokenVersion = payload.tokenVersion ?? 0;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        tokenVersion: true,
        mfaEnabled: true,
        role: true,
        position: true,
      },
    });
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
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

/** Attaches a valid session when present, but lets public endpoints continue. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          tokenVersion: true,
          mfaEnabled: true,
          role: true,
          position: true,
        },
      });
      if (user && user.tokenVersion === (payload.tokenVersion ?? 0) && (!mfaRequiredFor(user) || user.mfaEnabled)) {
        req.user = payload;
      }
    } catch {
      // Public files remain public; private files will reject the request.
    }
  }
  next();
}

export function requireAccess(key: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!allows(req.user, key)) {
      return res.status(403).json({
        message: `Your position does not have access to this workspace (${key}).`,
      });
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
