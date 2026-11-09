import { prisma } from "./prisma";

/**
 * Audit retention. Keeps the audit trail long enough for governance review
 * while preventing unbounded growth. Defaults to 365 days; override with
 * AUDIT_RETENTION_DAYS (0 disables deletion).
 */
export function auditRetentionDays(): number {
  const configured = Number(process.env.AUDIT_RETENTION_DAYS);
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 365;
}

export async function pruneAuditLog(options: { days?: number } = {}) {
  const days = options.days ?? auditRetentionDays();
  if (days <= 0) {
    return { deleted: 0, retentionDays: 0, cutoff: null, skipped: true };
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({
    where: { timestamp: { lt: cutoff } },
  });
  return { deleted: result.count, retentionDays: days, cutoff: cutoff.toISOString(), skipped: false };
}
