import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { pruneAuditLog } from "../src/lib/auditRetention";

/** Manual audit-retention run: npm run audit:prune */
async function main() {
  const result = await pruneAuditLog();
  if (result.skipped) {
    console.log("[audit-retention] disabled (AUDIT_RETENTION_DAYS=0)");
  } else {
    console.log(
      `[audit-retention] removed ${result.deleted} entries older than ${result.retentionDays} days (cutoff ${result.cutoff})`
    );
  }
}

main()
  .catch((error) => {
    console.error(`[audit-retention] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
