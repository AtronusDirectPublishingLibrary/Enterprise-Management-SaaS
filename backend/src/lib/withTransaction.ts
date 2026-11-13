import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Small retry wrapper for interactive transactions. PostgreSQL Serializable
 * transactions can be aborted with P2034 under contention; retrying is required
 * for that isolation level. ReadCommitted remains the default because making
 * every write Serializable is a throughput and availability risk.
 */
export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    retries?: number;
    maxWait?: number;
    timeout?: number;
  } = {},
): Promise<T> {
  const attempts = Math.max(1, options.retries ?? 3);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: options.isolationLevel ?? Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: options.maxWait ?? 5_000,
        timeout: options.timeout ?? 10_000,
      });
    } catch (error) {
      lastError = error;
      if ((error as { code?: string })?.code !== "P2034" || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }

  throw lastError;
}
