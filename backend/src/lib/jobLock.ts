import crypto from "crypto";
import { prisma } from "./prisma";

export type JobOutcome<T> =
  | { skipped: true; result: null }
  | { skipped: false; result: T };

/**
 * Runs a background job only when this process can claim a durable lease.
 * The lease lives in PostgreSQL, so two API instances cannot send the same
 * reminder or report at the same time. A crashed process is recovered when its
 * lease expires.
 */
export async function runExclusiveJob<T>(
  name: string,
  fn: () => Promise<T>,
  leaseMs = 30 * 60 * 1000,
): Promise<JobOutcome<T>> {
  const owner = crypto.randomUUID();
  const until = new Date(Date.now() + Math.max(60_000, leaseMs));

  // A transactional advisory lock serialises the claim itself. PostgreSQL's
  // ON CONFLICT predicate alone can let two simultaneous inserts both believe
  // they hold a new lease, so the lock is taken before reading the row.
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${name})::bigint)`;
    const current = await tx.jobLock.findUnique({ where: { name } });
    if (current?.lockedBy && current.lockedUntil && current.lockedUntil > new Date()) {
      return false;
    }
    await tx.jobLock.upsert({
      where: { name },
      create: { name, lockedBy: owner, lockedUntil: until },
      update: { lockedBy: owner, lockedUntil: until },
    });
    return true;
  });

  if (!claimed) return { skipped: true, result: null };

  try {
    return { skipped: false, result: await fn() };
  } finally {
    await prisma.jobLock.updateMany({
      where: { name, lockedBy: owner },
      data: { lockedBy: null, lockedUntil: new Date(0) },
    }).catch((error) => console.error(`[job-lock] release failed for ${name}`, error));
  }
}
