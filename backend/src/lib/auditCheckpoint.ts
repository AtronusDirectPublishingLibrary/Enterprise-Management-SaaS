import crypto from "crypto";
import { prisma } from "./prisma";
import { appendAudit, stableStringify, verifyAuditChain } from "./auditChain";

const CHECKPOINT_VERSION = 1;

function signingKey() {
  const raw = process.env.AUDIT_CHECKPOINT_PRIVATE_KEY;
  if (!raw) {
    const error: any = new Error("AUDIT_CHECKPOINT_PRIVATE_KEY is not configured");
    error.status = 503;
    throw error;
  }
  return raw.replace(/\\n/g, "\n");
}

function publicKeyFor(privateKey: string) {
  return crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
}

function keyFingerprint(publicKeyPem: string) {
  return crypto.createHash("sha256").update(publicKeyPem).digest("hex");
}

export type CheckpointPayload = {
  version: number;
  generatedAt: string;
  headId: string;
  headHash: string;
  checkedCount: number;
  previousHash: string | null;
};

/** Creates a signed checkpoint over the current audit head. */
export async function createAuditCheckpoint(createdBy = "system") {
  const key = signingKey();
  const publicKeyPem = publicKeyFor(key);
  const latest = await prisma.auditCheckpoint.findFirst({
    orderBy: { createdAt: "desc" },
    select: { signature: true },
  });
  const head = await prisma.auditLog.findFirst({
    orderBy: { id: "desc" },
    select: { id: true, eventHash: true },
  });
  if (!head?.eventHash) {
    const error: any = new Error("The audit chain has no hashed head yet");
    error.status = 409;
    throw error;
  }
  const verification = await verifyAuditChain(0n, head.id);
  if (!verification.valid) {
    const error: any = new Error(`The audit chain is broken at entry ${verification.brokenAt}`);
    error.status = 409;
    throw error;
  }

  const payload: CheckpointPayload = {
    version: CHECKPOINT_VERSION,
    generatedAt: new Date().toISOString(),
    headId: head.id.toString(),
    headHash: head.eventHash,
    checkedCount: verification.checkedCount,
    previousHash: latest?.signature
      ? crypto.createHash("sha256").update(latest.signature).digest("hex")
      : null,
  };
  const signature = crypto.sign(null, Buffer.from(stableStringify(payload)), key).toString("base64");
  const checkpoint = await prisma.auditCheckpoint.create({
    data: {
      headId: head.id,
      headHash: head.eventHash,
      checkedCount: verification.checkedCount,
      previousHash: payload.previousHash,
      keyId: process.env.AUDIT_CHECKPOINT_KEY_ID || "default",
      publicKeyPem,
      publicKeySha256: keyFingerprint(publicKeyPem),
      signature,
      payload,
      algorithm: "Ed25519",
    },
  });
  // The checkpoint itself is outside audit_log; this event records who
  // requested it without feeding the checkpoint back into its own range.
  await appendAudit({
    grantId: "AUDIT",
    action: "AUDIT_CHECKPOINT_CREATED",
    user: createdBy,
    details: { checkpointId: checkpoint.id, headId: payload.headId, headHash: payload.headHash },
  }).catch((error) => console.error("[audit-checkpoint] could not append event", error));
  return checkpoint;
}

export function verifyAuditCheckpoint(checkpoint: {
  payload: unknown;
  signature: string;
  publicKeyPem: string;
}) {
  try {
    return crypto.verify(
      null,
      Buffer.from(stableStringify(checkpoint.payload)),
      checkpoint.publicKeyPem,
      Buffer.from(checkpoint.signature, "base64"),
    );
  } catch {
    return false;
  }
}
