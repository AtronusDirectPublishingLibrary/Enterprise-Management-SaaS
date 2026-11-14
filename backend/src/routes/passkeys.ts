import crypto from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { issueSession } from "../lib/session";
import { mfaRequiredFor } from "../lib/mfaPolicy";
import { webauthnConfig } from "../lib/webauthn";

const router = Router();
const CHALLENGE_MS = 5 * 60 * 1000;

const passkeyLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many passkey attempts. Try again later." },
});

function disabled(res: any, config: ReturnType<typeof webauthnConfig>) {
  return res.status(503).json({
    enabled: false,
    configured: config.configured,
    message: "Passkeys are not configured on this deployment.",
  });
}

async function saveChallenge(challenge: string, userId: string | null, kind: "registration" | "authentication") {
  await prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const id = crypto.randomUUID();
  await prisma.webAuthnChallenge.create({
    data: { id, challenge, userId, kind, expiresAt: new Date(Date.now() + CHALLENGE_MS) },
  });
  return id;
}

async function takeChallenge(id: string, kind: "registration" | "authentication") {
  const row = await prisma.webAuthnChallenge.findUnique({ where: { id } });
  if (!row || row.kind !== kind || row.expiresAt < new Date()) {
    if (row) await prisma.webAuthnChallenge.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  // Single use: delete before verification so a failed or replayed response
  // cannot reuse the challenge.
  await prisma.webAuthnChallenge.delete({ where: { id } }).catch(() => undefined);
  return row;
}

router.get("/status", (_req, res) => {
  const config = webauthnConfig();
  res.set("Cache-Control", "no-store").json({
    enabled: config.enabled,
    configured: config.configured,
  });
});

/** List the signed-in user's registered passkeys. */
router.get("/", requireAuth, async (req: any, res, next) => {
  try {
    const rows = await prisma.webAuthnCredential.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true },
    });
    res.set("Cache-Control", "no-store").json(rows);
  } catch (error) { next(error); }
});

/** Begin adding a passkey to the signed-in account. */
router.post("/register/options", requireAuth, async (req: any, res, next) => {
  try {
    const config = webauthnConfig();
    if (!config.enabled) return disabled(res, config);
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(401).json({ message: "Session user not found" });
    const existing = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userName: user.username,
      userID: Buffer.from(user.id),
      userDisplayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
      attestationType: "none",
      excludeCredentials: existing.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as any,
      })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    });
    const challengeId = await saveChallenge(options.challenge, user.id, "registration");
    res.set("Cache-Control", "no-store").json({ options, challengeId });
  } catch (error) { next(error); }
});

/** Finish passkey registration after the browser returns an attestation. */
router.post("/register/verify", requireAuth, async (req: any, res, next) => {
  try {
    const config = webauthnConfig();
    if (!config.enabled) return disabled(res, config);
    const body = z.object({
      challengeId: z.string().min(1),
      response: z.any(),
      name: z.string().trim().max(80).optional(),
    }).parse(req.body);
    const challenge = await takeChallenge(body.challengeId, "registration");
    if (!challenge || challenge.userId !== req.user.sub) {
      return res.status(400).json({ message: "Registration challenge expired. Try again." });
    }
    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) {
      return res.status(400).json({ message: "The passkey could not be verified." });
    }
    const info = verification.registrationInfo;
    const credential = info.credential;
    await prisma.webAuthnCredential.create({
      data: {
        userId: req.user.sub,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        transports: (credential.transports || []) as string[],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
        name: body.name || "This device",
      },
    });
    await logAudit("AUTH", "AUTH_PASSKEY_ADDED", req.user.username, { name: body.name || "This device" });
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

/** Begin a passkey sign-in for a username. */
router.post("/login/options", passkeyLoginLimiter, async (req, res, next) => {
  try {
    const config = webauthnConfig();
    if (!config.enabled) return disabled(res, config);
    const { username } = z.object({ username: z.string().trim().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ message: "No passkey is registered for that account." });
    const credentials = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });
    if (!credentials.length) return res.status(400).json({ message: "No passkey is registered for that account." });
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as any,
      })),
      userVerification: "required",
    });
    const challengeId = await saveChallenge(options.challenge, user.id, "authentication");
    res.set("Cache-Control", "no-store").json({ options, challengeId });
  } catch (error) { next(error); }
});

/** Finish passkey sign-in and issue the normal application session. */
router.post("/login/verify", passkeyLoginLimiter, async (req, res, next) => {
  try {
    const config = webauthnConfig();
    if (!config.enabled) return disabled(res, config);
    const body = z.object({ challengeId: z.string().min(1), response: z.any() }).parse(req.body);
    const challenge = await takeChallenge(body.challengeId, "authentication");
    if (!challenge) return res.status(400).json({ message: "Passkey challenge expired. Try again." });
    const credential = await prisma.webAuthnCredential.findUnique({
      where: { credentialId: String(body.response?.id || "") },
    });
    if (!credential || (challenge.userId && credential.userId !== challenge.userId)) {
      await logAudit("AUTH", "AUTH_PASSKEY_LOGIN_FAILED", "unknown", { reason: "UNKNOWN_CREDENTIAL" });
      return res.status(401).json({ message: "Passkey sign-in failed." });
    }
    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter,
        transports: credential.transports as any,
      },
      requireUserVerification: true,
    });
    if (!verification.verified) {
      await logAudit("AUTH", "AUTH_PASSKEY_LOGIN_FAILED", credential.userId, { reason: "VERIFICATION_FAILED" });
      return res.status(401).json({ message: "Passkey sign-in failed." });
    }
    const user = await prisma.user.findUnique({ where: { id: credential.userId } });
    if (!user) return res.status(401).json({ message: "Session user not found" });
    await prisma.$transaction([
      prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null, lastLogin: new Date() },
      }),
    ]);
    await logAudit("AUTH", "AUTH_PASSKEY_LOGIN_SUCCESS", user.username, {
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
    });
    const passkeyCount = await prisma.webAuthnCredential.count({ where: { userId: user.id } });
    res.json(issueSession(res, user, {
      passkeyCount,
      mfaEnrollmentRequired: mfaRequiredFor(user) && !user.mfaEnabled,
    }));
  } catch (error) { next(error); }
});

/** Remove a passkey from the signed-in account. */
router.delete("/:id", requireAuth, async (req: any, res, next) => {
  try {
    const deleted = await prisma.webAuthnCredential.deleteMany({
      where: { id: req.params.id, userId: req.user.sub },
    });
    if (!deleted.count) return res.status(404).json({ message: "Passkey not found" });
    await logAudit("AUTH", "AUTH_PASSKEY_REMOVED", req.user.username, { id: req.params.id });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
