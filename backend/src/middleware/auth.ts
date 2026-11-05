import { Request, Response, NextFunction } from "express";
import { verifyToken, COOKIE_NAME, JwtPayload } from "../lib/jwt";

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

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
