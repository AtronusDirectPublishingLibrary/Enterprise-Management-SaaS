import { Request, Response, NextFunction } from "express";
import { isAdminUser } from "../lib/access";

export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Not logged in" });
    }
    if (allowedRoles.includes("admin") && isAdminUser(req.user)) return next();
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};