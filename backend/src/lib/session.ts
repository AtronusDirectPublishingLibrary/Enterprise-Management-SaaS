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
  extra: { mfaEnrollmentRequired?: boolean; passkeyCount?: number } = {},
) {
  return {
    success: true,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    position: user.position,
    email: user.email,
    forceChange: user.forceChange,
    mfaEnabled: user.mfaEnabled,
    mfaEnrollmentRequired: Boolean(extra.mfaEnrollmentRequired),
    passkeyCount: extra.passkeyCount ?? 0,
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
  extra: { mfaEnrollmentRequired?: boolean; passkeyCount?: number } = {},
) {
  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    position: user.position,
    tokenVersion: user.tokenVersion ?? 0,
  });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  setCsrfCookie(res);
  return sessionResponse(user, extra);
}
