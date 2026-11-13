import { Request, Response, NextFunction } from "express";
import { verifyToken, COOKIE_NAME, JwtPayload } from "../lib/jwt";
import { allows, isAdminUser } from "../lib/access";

declare global {
  namespace Express {
    interface Request { user?: JwtPayload }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Not authenticated" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

/** Attaches a valid session when present, but lets public endpoints continue. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      req.user = verifyToken(token);
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
