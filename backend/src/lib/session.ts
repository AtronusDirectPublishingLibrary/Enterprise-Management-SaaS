import type { Response } from "express";
import { COOKIE_NAME, COOKIE_OPTS, signToken } from "./jwt";
import { setCsrfCookie } from "../middleware/csrf";

export function permissionsFor(role: string) {
  return {
    canViewAll: ["admin", "viewer"].includes(role),
    canEdit: role !== "viewer",
    canUpdate: role !== "viewer",
    canDelete: role === "admin",
    canManageUsers: role === "admin",
    canExport: true,
    canManageMultipleProjects: ["admin", "project_manager"].includes(role),
  };
}

export type SessionUser = {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  position?: string | null;
  email?: string | null;
  tenantId?: string | null;
  isTenantAdmin?: boolean;
  isPlatformAdmin?: boolean;
  forceChange?: boolean;
  mfaEnabled?: boolean;
  tokenVersion?: number;
  signatureUrl?: string | null;
  initialsUrl?: string | null;
  initialsText?: string | null;
  signatureUpdatedAt?: Date | null;
  avatarUrl?: string | null;
  avatarUpdatedAt?: Date | null;
};

export function sessionResponse(
  user: SessionUser,
  extra: {
    mfaEnrollmentRequired?: boolean;
    passkeyCount?: number;
    enabledModules?: string[] | null;
    impersonatingTenantId?: string | null;
    impersonatedBy?: string | null;
    impersonatedByUsername?: string | null;
  } = {},
) {
  return {
    success: true,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    position: user.position,
    email: user.email,
    tenantId: user.tenantId ?? null,
    isTenantAdmin: Boolean(user.isTenantAdmin),
    isPlatformAdmin: Boolean(user.isPlatformAdmin),
    impersonatingTenantId: extra.impersonatingTenantId ?? null,
    impersonatedBy: extra.impersonatedBy ?? null,
    impersonatedByUsername: extra.impersonatedByUsername ?? null,
    forceChange: user.forceChange,
    mfaEnabled: user.mfaEnabled,
    mfaEnrollmentRequired: Boolean(extra.mfaEnrollmentRequired),
    passkeyCount: extra.passkeyCount ?? 0,
    enabledModules: extra.enabledModules ?? null,
    signatureUrl: user.signatureUrl,
    initialsUrl: user.initialsUrl,
    initialsText: user.initialsText,
    signatureUpdatedAt: user.signatureUpdatedAt,
    avatarUrl: user.avatarUrl,
    avatarUpdatedAt: user.avatarUpdatedAt,
    permissions: permissionsFor(user.role),
  };
}

export function issueSession(
  res: Response,
  user: SessionUser,
  extra: {
    mfaEnrollmentRequired?: boolean;
    passkeyCount?: number;
    enabledModules?: string[] | null;
    impersonatingTenantId?: string | null;
    impersonatedBy?: string | null;
    impersonatedByUsername?: string | null;
  } = {},
) {
  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    position: user.position,
    tenantId: user.tenantId ?? null,
    tokenVersion: user.tokenVersion ?? 0,
    isPlatformAdmin: Boolean(user.isPlatformAdmin),
    ...(extra.impersonatingTenantId ? { impersonatingTenantId: extra.impersonatingTenantId } : {}),
    ...(extra.impersonatedBy ? { impersonatedBy: extra.impersonatedBy } : {}),
    ...(extra.impersonatedByUsername ? { impersonatedByUsername: extra.impersonatedByUsername } : {}),
  } as any);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  setCsrfCookie(res);
  return sessionResponse(user, extra);
}
