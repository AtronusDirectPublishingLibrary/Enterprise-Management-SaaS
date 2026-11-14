import jwt from "jsonwebtoken";

const SECRET  = process.env.JWT_SECRET || "change-me-in-env";
const EXPIRES = process.env.JWT_EXPIRES || "8h";

export type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  position?: string | null;
  /** Tenant scope for multi-tenant SaaS. Legacy tokens may omit it. */
  tenantId?: string | null;
  /** Incremented on password change and global sign-out. Legacy tokens omit it. */
  tokenVersion?: number;
  isPlatformAdmin?: boolean;
  impersonatingTenantId?: string | null;
  impersonatedBy?: string | null;
  impersonatedByUsername?: string | null;
};

export function signToken(p: JwtPayload, opts?: { expiresIn?: string | number }): string {
  return jwt.sign(p, SECRET, { expiresIn: opts?.expiresIn ?? EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export const COOKIE_NAME = "ep_auth";
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
};
