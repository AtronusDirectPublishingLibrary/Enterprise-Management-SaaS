import type { Request, Response, NextFunction } from "express";

export function isPlatformAdminUser(user: any) {
  return Boolean(user?.isPlatformAdmin);
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  if (!isPlatformAdminUser(user)) return res.status(403).json({ message: "Access denied. This portal is for platform staff only." });
  next();
}
