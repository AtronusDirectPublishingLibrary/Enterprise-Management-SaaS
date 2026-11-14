/**
 * Best-effort backfill of tenantId on records that can be inferred from relations.
 * REVIEW and extend per model before running in production. Take a DB backup first.
 *
 * Usage: cd backend && npx ts-node --transpile-only scripts/backfill-tenant-attribution.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfill tenant attribution (best-effort)...");

  // PlanAlert: infer from plan
  const alerts: any = await prisma.$executeRawUnsafe(`
    UPDATE plan_alert pa
    SET tenant_id = p.tenant_id
    FROM plan p
    WHERE pa.plan_id = p.id AND pa.tenant_id IS NULL AND p.tenant_id IS NOT NULL
  `);
  console.log("plan_alert updated:", alerts);

  // PlanAlertMail: infer from alert
  const mails: any = await prisma.$executeRawUnsafe(`
    UPDATE plan_alert_mail m
    SET tenant_id = a.tenant_id
    FROM plan_alert a
    WHERE m.alert_id = a.id AND m.tenant_id IS NULL AND a.tenant_id IS NOT NULL
  `);
  console.log("plan_alert_mail updated:", mails);

  // Notifications: cannot be reliably inferred in general (recipient is username, not FK). Skipped.
  console.log("notification: skipped (no reliable relation) — handle via app logic/jobs.");

  console.log("Done. Verify results and extend for other models as needed.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
