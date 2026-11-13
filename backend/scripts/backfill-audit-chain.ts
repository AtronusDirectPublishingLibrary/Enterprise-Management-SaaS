import "dotenv/config";
import { backfillAuditChain, verifyAuditChain } from "../src/lib/auditChain";
import { prisma } from "../src/lib/prisma";

async function main() {
  const force = process.argv.includes("--force");
  const result = await backfillAuditChain({ force });
  const verification = await verifyAuditChain(0n);
  console.log(JSON.stringify({ backfill: result, verification }, null, 2));
  if (!verification.valid) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
