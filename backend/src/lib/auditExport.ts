import crypto from "crypto";
import { prisma } from "./prisma";
import { stableStringify } from "./auditChain";

export async function buildAuditExport(input: {
  from?: Date;
  to?: Date;
  limit?: number;
  generatedBy: string;
}) {
  const key = process.env.AUDIT_EXPORT_SIGNING_KEY;
  if (!key) {
    const error: any = new Error("AUDIT_EXPORT_SIGNING_KEY is not configured");
    error.status = 503;
    throw error;
  }

  const limit = Math.min(Math.max(input.limit || 5_000, 1), 20_000);
  const where = {
    ...(input.from || input.to
      ? {
          timestamp: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { id: "asc" },
    take: limit + 1,
  });
  const truncated = rows.length > limit;
  const exported = truncated ? rows.slice(0, limit) : rows;

  const unsigned = {
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy,
    range: {
      from: input.from?.toISOString() ?? null,
      to: input.to?.toISOString() ?? null,
    },
    count: exported.length,
    truncated,
    firstId: exported[0]?.id.toString() ?? null,
    lastId: exported[exported.length - 1]?.id.toString() ?? null,
    headHash: exported[exported.length - 1]?.eventHash ?? null,
    records: exported.map((row) => ({
      id: row.id.toString(),
      timestamp: row.timestamp.toISOString(),
      grantId: row.grantId,
      action: row.action,
      user: row.user,
      details: row.details,
      nonce: row.nonce,
      chainVersion: row.chainVersion,
      prevHash: row.prevHash,
      eventHash: row.eventHash,
    })),
  };

  const signature = crypto
    .createHmac("sha256", key)
    .update(stableStringify(unsigned))
    .digest("hex");

  return {
    ...unsigned,
    signature: {
      alg: "HMAC-SHA256",
      keyId: process.env.AUDIT_EXPORT_KEY_ID || "default",
      value: signature,
    },
  };
}
