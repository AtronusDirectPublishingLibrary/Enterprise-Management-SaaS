import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { COOKIE_NAME } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { generateMfaSecret, otpauthUrl, verifyTotp } from "../lib/totp";
import { logAudit } from "../lib/audit";
import { CSRF_COOKIE, setCsrfCookie } from "../middleware/csrf";
import { issueSession, sessionResponse } from "../lib/session";
import { mfaEnforcementMode, mfaRequiredFor } from "../lib/mfaPolicy";
import {
  consumeRecoveryCode,
  countUnusedRecoveryCodes,
  issueRecoveryCodes,
} from "../lib/mfaRecovery";
import { turnstileConfig, verifyTurnstile } from "../lib/turnstile";

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  token: z.string().optional(),
  turnstileToken: z.string().optional(),
});

// Issues the readable half of the double-submit CSRF pair. Safe to call before
// login; the token is random and carries no session identity.
router.get("/csrf", (_req, res) => {
  res.set("Cache-Control", "no-store").json({ token: setCsrfCookie(res) });
});

// Public, non-secret login configuration. The site key is intentionally public;
// the Turnstile secret never leaves the server.
router.get("/login-config", (_req, res) => {
  const config = turnstileConfig();
  res.set("Cache-Control", "no-store").json({
    turnstileRequired: config.enabled,
    turnstileSiteKey: config.siteKey || "",
    turnstileAction: config.action,
  });
});

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

function clientIp(req: any) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function lockLabel(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const loginShortLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later.", message: "Too many login attempts. Try again later." },
});

const loginLongLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later.", message: "Too many login attempts. Try again later." },
});

router.post("/login", loginShortLimiter, loginLongLimiter, async (req, res, next) => {
  try {
    const { username, password, token: mfaToken, turnstileToken } = LoginSchema.parse(req.body);
    const ip = clientIp(req);
    const userAgent = String(req.headers["user-agent"] || "unknown");
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
      await logAudit("AUTH", "AUTH_LOGIN_FAILED", "unknown", { username, ip, userAgent, reason: "UNKNOWN_USER" });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      await logAudit("AUTH", "AUTH_LOGIN_BLOCKED", user.username, { username, ip, userAgent });
      return res.status(423).json({
        error: `Account locked. Try again after ${lockLabel(user.lockedUntil)}.`,
        message: `Account locked until ${lockLabel(user.lockedUntil)} — contact IT if unexpected.`,
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    // A valid MFA continuation is already gated by the password; requiring a
    // fresh single-use CAPTCHA token on that second request would break MFA.
    const captchaRequired = !(user.mfaEnabled && mfaToken);
    if (captchaRequired) {
      const captchaOk = await verifyTurnstile(turnstileToken, ip);
      if (!captchaOk) {
        await logAudit("AUTH", "AUTH_CAPTCHA_FAILED", user.username, { username, ip, userAgent });
        return res.status(400).json({ error: "CAPTCHA verification failed", message: "CAPTCHA verification failed" });
      }
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    const registerFailure = async (reason: string) => {
      const windowStart = user.lastFailedLoginAt?.getTime() ?? 0;
      const inWindow = now.getTime() - windowStart <= ATTEMPT_WINDOW_MS;
      const attempts = (inWindow ? user.failedLoginAttempts : 0) + 1;
      const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCK_MS) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lastFailedLoginAt: now,
          ...(lockedUntil ? { lockedUntil } : {}),
        },
      });
      await logAudit("AUTH", "AUTH_LOGIN_FAILED", user.username, { username, ip, userAgent, reason });
      if (lockedUntil) {
        await logAudit("AUTH", "AUTH_ACCOUNT_LOCKED", user.username, {
          username,
          ip,
          userAgent,
          lockedUntil: lockedUntil.toISOString(),
        });
      }
    };

    if (!ok) {
      await registerFailure("PASSWORD");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Second factor: a password alone is not enough once MFA is enrolled. A
    // recovery code is accepted as a one-time fallback and immediately consumed.
    let mfaMethod: "TOTP" | "RECOVERY" | null = null;
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaToken) {
        return res.status(401).json({
          mfaRequired: true,
          message: "Enter the 6-digit code from your authenticator app.",
        });
      }
      if (/^\d{6}$/.test(mfaToken.trim()) && verifyTotp(user.mfaSecret, mfaToken.trim())) {
        mfaMethod = "TOTP";
      } else if (await consumeRecoveryCode(user.id, mfaToken)) {
        mfaMethod = "RECOVERY";
      } else {
        await registerFailure("MFA");
        return res.status(401).json({
          mfaRequired: true,
          message: "That authenticator or recovery code is invalid. Try again.",
        });
      }
    }

    const passkeyCount = await prisma.webAuthnCredential.count({ where: { userId: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null, lastLogin: new Date() },
    });
    await logAudit("AUTH", "AUTH_LOGIN_SUCCESS", user.username, { username, ip, userAgent });
    if (mfaMethod === "RECOVERY") {
      await logAudit("AUTH", "AUTH_MFA_RECOVERY_USED", user.username, { ip, userAgent });
    }

    res.json(issueSession(res, user, {
      passkeyCount,
      mfaEnrollmentRequired: mfaRequiredFor(user) && !user.mfaEnabled,
    }));
  } catch (e) { next(e); }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.clearCookie(CSRF_COOKIE, { path: "/" });
  res.json({ success: true });
});

/** Revokes every token issued to this account, including other devices. */
router.post("/logout-all", requireAuth, async (req: any, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.sub },
      data: { tokenVersion: { increment: 1 } },
    });
    await logAudit("AUTH", "AUTH_ALL_SESSIONS_REVOKED", req.user.username, { ip: clientIp(req) });
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.clearCookie(CSRF_COOKIE, { path: "/" });
    res.json({ success: true, message: "All sessions have been signed out." });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(401).json({ message: "Session user not found" });
    const [passkeyCount, recoveryCodesRemaining] = await Promise.all([
      prisma.webAuthnCredential.count({ where: { userId: user.id } }),
      countUnusedRecoveryCodes(user.id),
    ]);
    res.json({
      ...sessionResponse(user, {
        passkeyCount,
        mfaEnrollmentRequired: mfaRequiredFor(user) && !user.mfaEnabled,
      }),
      recoveryCodesRemaining,
      mfaRequired: mfaRequiredFor(user),
      mfaEnforcementMode: mfaEnforcementMode(),
    });
  } catch (e) { next(e); }
});

/** Current MFA state for the signed-in user. */
router.get("/mfa/status", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { mfaEnabled: true, role: true, position: true },
    });
    const [recoveryCodesRemaining, passkeyCount] = await Promise.all([
      countUnusedRecoveryCodes(req.user!.sub),
      prisma.webAuthnCredential.count({ where: { userId: req.user!.sub } }),
    ]);
    res.json({
      enabled: Boolean(user?.mfaEnabled),
      required: mfaRequiredFor(user),
      enforcement: mfaEnforcementMode(),
      recoveryCodesRemaining,
      passkeyCount,
    });
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
    const recoveryCodes = await issueRecoveryCodes(user.id);
    await logAudit("AUTH", "AUTH_MFA_ENABLED", user.username, { ip: clientIp(req) });
    res.json({ success: true, enabled: true, recoveryCodes });
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
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } }),
      prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
    ]);
    await logAudit("AUTH", "AUTH_MFA_DISABLED", user.username, { ip: clientIp(req) });
    res.json({ success: true, enabled: false });
  } catch (e) { next(e); }
});

/** Replaces the user's recovery codes after re-proving password and TOTP. */
router.post("/mfa/recovery-codes", requireAuth, async (req, res, next) => {
  try {
    const { password, token } = z
      .object({ password: z.string().min(1), token: z.string().min(6) })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: "Enable authenticator two-factor authentication first." });
    }
    if (!await bcrypt.compare(password, user.passwordHash)) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    if (!verifyTotp(user.mfaSecret, token)) {
      return res.status(400).json({ message: "Enter a valid authenticator code." });
    }
    const recoveryCodes = await issueRecoveryCodes(user.id);
    await logAudit("AUTH", "AUTH_MFA_RECOVERY_CODES_ISSUED", user.username, { ip: clientIp(req) });
    res.json({ success: true, recoveryCodes });
  } catch (e) { next(e); }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(12).max(200),
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!await bcrypt.compare(oldPassword, user.passwordHash))
      return res.status(400).json({ message: "Current password is incorrect" });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        forceChange: false,
        tokenVersion: { increment: 1 },
      },
    });
    await logAudit("AUTH", "AUTH_PASSWORD_CHANGED", user.username, { ip: clientIp(req) });
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.clearCookie(CSRF_COOKIE, { path: "/" });
    res.json({ success: true, reauthenticate: true, message: "Password changed. Sign in again." });
  } catch (e) { next(e); }
});

export default router;
