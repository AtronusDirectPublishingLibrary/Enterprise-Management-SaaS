import crypto from "crypto";
import { prisma } from "./prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const bytes = crypto.randomBytes(10);
  let value = "";
  for (const byte of bytes) value += ALPHABET[byte % ALPHABET.length];
  return `${value.slice(0, 5)}-${value.slice(5)}`;
}

export function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(value: string) {
  return crypto.createHash("sha256").update(normalizeRecoveryCode(value)).digest("hex");
}

/** Issues a fresh set of ten codes and invalidates every previous code. */
export async function issueRecoveryCodes(userId: string, count = 10) {
  const codes = Array.from({ length: count }, randomCode);
  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
    await tx.mfaRecoveryCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })),
    });
  });
  return codes;
}

/** Atomically consumes a matching unused code. */
export async function consumeRecoveryCode(userId: string, value: string) {
  if (normalizeRecoveryCode(value).length !== 10) return false;
  const result = await prisma.mfaRecoveryCode.updateMany({
    where: { userId, codeHash: hashRecoveryCode(value), usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}

export async function countUnusedRecoveryCodes(userId: string) {
  return prisma.mfaRecoveryCode.count({ where: { userId, usedAt: null } });
}
