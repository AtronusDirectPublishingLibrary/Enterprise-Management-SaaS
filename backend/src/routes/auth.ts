import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken, COOKIE_NAME, COOKIE_OPTS } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { generateMfaSecret, otpauthUrl, verifyTotp } from "../lib/totp";

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  token: z.string().optional(),
});

function permissionsFor(role: string) {
  return {
    canViewAll:              ["admin", "viewer"].includes(role),
    canEdit:                 role !== "viewer",
    canUpdate:               role !== "viewer",
    canDelete:               role === "admin",
    canManageUsers:          role === "admin",
    canExport:               true,
    canManageMultipleProjects: ["admin", "project_manager"].includes(role),
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const { username, password, token: mfaToken } = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // Second factor: a password alone is not enough once MFA is enrolled.
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaToken) {
        return res.status(401).json({
          mfaRequired: true,
          message: "Enter the 6-digit code from your authenticator app.",
        });
      }
      if (!verifyTotp(user.mfaSecret, mfaToken)) {
        return res.status(401).json({
          mfaRequired: true,
          message: "That authenticator code is invalid or has expired. Try the current code.",
        });
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = signToken({ sub: user.id, username: user.username, role: user.role, position: user.position });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({
      success: true,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      position: user.position,
      email: user.email,
      forceChange: user.forceChange,
      mfaEnabled: user.mfaEnabled,
      permissions: permissionsFor(user.role),
    });
  } catch (e) { next(e); }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(401).json({ message: "Session user not found" });
    res.json({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      position: user.position,
      email: user.email,
      forceChange: user.forceChange,
      mfaEnabled: user.mfaEnabled,
      permissions: permissionsFor(user.role),
    });
  } catch (e) { next(e); }
});

/** Current MFA state for the signed-in user. */
router.get("/mfa/status", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { mfaEnabled: true },
    });
    res.json({ enabled: Boolean(user?.mfaEnabled) });
  } catch (e) { next(e); }
});

/**
 * Start enrollment: issues a secret but keeps MFA disabled until the user
 * proves they can generate a valid code, so a lost secret cannot lock them out.
 */
router.post("/mfa/setup", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.mfaEnabled) {
      return res.status(409).json({ message: "MFA is already enabled. Disable it before re-enrolling." });
    }
    const secret = generateMfaSecret();
    await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
    const account = user.email || user.username;
    res.json({
      secret,
      otpauth: otpauthUrl({ secret, account }),
      enabled: false,
      instructions:
        "Add this key to Google Authenticator, Microsoft Authenticator or 1Password, then enter the current 6-digit code to finish enrollment.",
    });
  } catch (e) { next(e); }
});

router.post("/mfa/enable", requireAuth, async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().min(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.mfaSecret) return res.status(400).json({ message: "Start enrollment first." });
    if (!verifyTotp(user.mfaSecret, token)) {
      return res.status(400).json({ message: "That code is not valid. Check the device clock and try again." });
    }
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    res.json({ success: true, enabled: true });
  } catch (e) { next(e); }
});

router.post("/mfa/disable", requireAuth, async (req, res, next) => {
  try {
    const { password, token } = z
      .object({ password: z.string().min(1), token: z.string().optional() })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!await bcrypt.compare(password, user.passwordHash)) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    if (user.mfaEnabled && user.mfaSecret && !verifyTotp(user.mfaSecret, token || "")) {
      return res.status(400).json({ message: "Enter a valid authenticator code to disable MFA." });
    }
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } });
    res.json({ success: true, enabled: false });
  } catch (e) { next(e); }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(4),
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!await bcrypt.compare(oldPassword, user.passwordHash))
      return res.status(400).json({ message: "Current password is incorrect" });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12), forceChange: false },
    });
    res.json({ success: true, message: "Password changed" });
  } catch (e) { next(e); }
});

export default router;
