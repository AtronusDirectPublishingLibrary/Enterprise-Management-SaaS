import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Audit chain design
 * ------------------
 * The chain is linear and ordered by the auto-increment id. A PostgreSQL
 * advisory transaction lock serialises appends, so two requests cannot read the
 * same previous hash and create a fork.
 *
 * The hash covers a canonical JSON document, not raw `JSON.stringify`, because
 * PostgreSQL jsonb does not preserve object key order. The timestamp and nonce
 * are generated in the application and stored explicitly, so verification does
 * not depend on database defaults.
 *
 * Legacy rows remain nullable until the backfill script has run. The verifier
 * reports them separately rather than pretending they are part of the chain.
 */

const CHAIN_VERSION = 1;
const AUDIT_LOCK_KEY = 741_992_001;

function canonicalValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = canonicalValue(source[key]);
    }
    return result;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  const canonical = canonicalValue(value);
  if (canonical === null || typeof canonical !== "object") return JSON.stringify(canonical);
  if (Array.isArray(canonical)) return `[${canonical.map(stableStringify).join(",")}]`;
  const source = canonical as Record<string, unknown>;
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(source[key])}`)
    .join(",")}}`;
}

export type AuditHashInput = {
  prevHash: string;
  grantId: string | null;
  action: string;
  user: string;
  details: unknown;
  timestamp: Date;
  nonce: string;
  chainVersion?: number;
};

export function computeAuditHash(input: AuditHashInput): string {
  const payload = {
    chainVersion: input.chainVersion ?? CHAIN_VERSION,
    grantId: input.grantId || "PMS",
    action: input.action,
    user: input.user || "system",
    details: canonicalValue(input.details ?? {}),
    timestamp: input.timestamp.toISOString(),
    nonce: input.nonce,
  };
  return crypto.createHash("sha256").update(`${input.prevHash}|${stableStringify(payload)}`).digest("hex");
}

export type AuditAppendInput = {
  grantId: string;
  action: string;
  user: string;
  details?: unknown;
};

/**
 * Append one audit event. The advisory lock is acquired inside a transaction
 * and held until commit, making the read of the previous hash and the insert
 * atomic with respect to every other audit writer.
 */
export async function appendAudit(input: AuditAppendInput) {
  const timestamp = new Date();
  const nonce = crypto.randomUUID();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(741992001)");
          const previous = await tx.auditLog.findFirst({
            orderBy: { id: "desc" },
            select: { eventHash: true },
          });
          const prevHash = previous?.eventHash || "GENESIS";
          const details = (input.details ?? {}) as Prisma.InputJsonValue;
          const eventHash = computeAuditHash({
            prevHash,
            grantId: input.grantId || "PMS",
            action: input.action,
            user: input.user || "system",
            details,
            timestamp,
            nonce,
          });
          return tx.auditLog.create({
            data: {
              grantId: input.grantId || "PMS",
              action: input.action,
              user: input.user || "system",
              details,
              timestamp,
              nonce,
              chainVersion: CHAIN_VERSION,
              prevHash,
              eventHash,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        },
      );
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string })?.code;
      if (code !== "P2034") break;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }

  throw lastError;
}

export type AuditChainResult = {
  valid: boolean;
  checkedCount: number;
  legacyCount: number;
  brokenAt: string | null;
  headHash: string | null;
  startId: string;
  endId: string | null;
  truncated: boolean;
};

function toBigInt(value: bigint | number | string | undefined): bigint | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return BigInt(value);
}

/**
 * Recalculate every hash in the requested id range. A range that begins after
 * the genesis row is anchored by the preceding row, so deleting a middle row is
 * still detected. Tail deletion needs the signed checkpoint described in the
 * audit documentation.
 */
export async function verifyAuditChain(
  startId: bigint | number | string = 0n,
  endId?: bigint | number | string,
  options: { persist?: boolean; checkedBy?: string } = {},
): Promise<AuditChainResult> {
  const start = toBigInt(startId) ?? 0n;
  const end = toBigInt(endId);
  const where: Prisma.AuditLogWhereInput = { id: { gte: start, ...(end !== undefined ? { lte: end } : {}) } };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      timestamp: true,
      grantId: true,
      action: true,
      user: true,
      details: true,
      nonce: true,
      chainVersion: true,
      eventHash: true,
      prevHash: true,
    },
  });

  let expectedPrev = "GENESIS";
  let truncated = start > 0n;
  if (start > 0n) {
    const before = await prisma.auditLog.findFirst({
      where: { id: { lt: start }, eventHash: { not: null } },
      orderBy: { id: "desc" },
      select: { eventHash: true },
    });
    expectedPrev = before?.eventHash || "GENESIS";
  } else {
    // Retention may have removed the oldest rows. The first surviving row's
    // prevHash is then the anchor. This keeps the remainder verifiable and
    // flags the chain as truncated instead of pretending it starts at genesis.
    const firstHashed = rows.find((row) => Boolean(row.eventHash));
    if (firstHashed?.prevHash && firstHashed.prevHash !== "GENESIS") {
      expectedPrev = firstHashed.prevHash;
      truncated = true;
    }
  }

  let checkedCount = 0;
  let legacyCount = 0;
  let brokenAt: bigint | null = null;
  let headHash: string | null = expectedPrev === "GENESIS" ? null : expectedPrev;

  for (const row of rows) {
    if (!row.eventHash || !row.prevHash || !row.nonce) {
      legacyCount += 1;
      continue;
    }
    if (row.prevHash !== expectedPrev) {
      brokenAt = row.id;
      break;
    }
    const recalculated = computeAuditHash({
      prevHash: row.prevHash,
      grantId: row.grantId,
      action: row.action,
      user: row.user,
      details: row.details,
      timestamp: row.timestamp,
      nonce: row.nonce,
      chainVersion: row.chainVersion,
    });
    if (recalculated !== row.eventHash) {
      brokenAt = row.id;
      break;
    }
    expectedPrev = row.eventHash;
    headHash = row.eventHash;
    checkedCount += 1;
  }

  const result: AuditChainResult = {
    valid: brokenAt === null,
    checkedCount,
    legacyCount,
    brokenAt: brokenAt?.toString() ?? null,
    headHash,
    startId: start.toString(),
    endId: end?.toString() ?? null,
    truncated,
  };

  if (options.persist) {
    await prisma.auditVerification.create({
      data: {
        checkedBy: options.checkedBy || "system",
        checkedCount: result.checkedCount,
        valid: result.valid,
        brokenAt: brokenAt,
        headHash: result.headHash,
        legacyCount: result.legacyCount,
        truncated: result.truncated,
      },
    });
  }

  return result;
}

/**
 * Rebuild the chain for existing rows. Run only before the append-only trigger
 * is installed, and never against a database that already has a signed
 * checkpoint. `force` recomputes rows that already have hashes.
 */
export async function backfillAuditChain(options: { force?: boolean } = {}) {
  const rows = await prisma.auditLog.findMany({ orderBy: { id: "asc" } });
  let prevHash = "GENESIS";
  let updated = 0;

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(741992001)");
      for (const row of rows) {
        if (!options.force && row.eventHash && row.prevHash && row.nonce) {
          prevHash = row.eventHash;
          continue;
        }
        const nonce = row.nonce || crypto.randomUUID();
        const eventHash = computeAuditHash({
          prevHash,
          grantId: row.grantId,
          action: row.action,
          user: row.user,
          details: row.details,
          timestamp: row.timestamp,
          nonce,
          chainVersion: row.chainVersion || CHAIN_VERSION,
        });
        await tx.auditLog.update({
          where: { id: row.id },
          data: {
            nonce,
            chainVersion: row.chainVersion || CHAIN_VERSION,
            prevHash,
            eventHash,
          },
        });
        prevHash = eventHash;
        updated += 1;
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 120_000,
    },
  );

  return { total: rows.length, updated, headHash: prevHash };
}

/** Daily background verification; records the result without appending to the chain. */
export async function runAuditVerification(checkedBy = "system") {
  const last = await prisma.auditLog.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const result = await verifyAuditChain(0n, last?.id ?? 0n, {
    persist: true,
    checkedBy,
  });

  if (!result.valid) {
    console.error("[audit-chain] verification failed", result);
    try {
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { username: true },
        take: 50,
      });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            recipient: admin.username,
            type: "AUDIT_CHAIN_FAILURE",
            title: "Audit chain verification failed",
            body: `The audit chain is broken at entry ${result.brokenAt}. Investigate before signing any audit export.`,
            link: "/audit-log",
          })),
        });
      }
    } catch (error) {
      console.error("[audit-chain] could not notify administrators", error);
    }
  }

  return result;
}

export const AUDIT_CHAIN_LOCK_KEY = AUDIT_LOCK_KEY;
