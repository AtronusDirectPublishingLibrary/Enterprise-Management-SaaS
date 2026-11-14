import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { COOKIE_NAME } from "../lib/jwt";

export const CSRF_COOKIE = "ep_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function cookieOptions() {
  return {
    httpOnly: false,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

/** Creates a new readable double-submit token and returns it. */
export function setCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString("base64url");
  res.cookie(CSRF_COOKIE, token, cookieOptions());
  return token;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Double-submit CSRF protection for authenticated mutations. Requests without
 * a session cookie are left to the public endpoint's own validation; they have
 * no authenticated state to forge. Login is exempt because the caller has no
 * token yet.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (
    SAFE_METHODS.has(req.method) ||
    req.path === "/api/auth/login" ||
    req.path.startsWith("/api/auth/passkeys/login/")
  ) return next();
  if (!req.cookies?.[COOKIE_NAME]) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("x-csrf-token");
  if (typeof cookieToken === "string" && typeof headerToken === "string" && safeEqual(cookieToken, headerToken)) {
    return next();
  }
  return res.status(403).json({
    error: "CSRF token missing or invalid",
    message: "Your session security token expired. Please retry the action.",
    code: "CSRF_INVALID",
  });
}
