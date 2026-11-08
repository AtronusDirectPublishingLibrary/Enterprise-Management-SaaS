import { prisma } from "../src/lib/prisma";
import {
  PERIOD_TYPES,
  ensurePlanPeriod,
  linkPeriodSuccessions,
  periodLabelFor,
} from "../src/lib/planPeriods";

/**
 * One-off backfill: give every existing plan its planning-period record, fill in
 * the dual (EFY / Gregorian) label and rebuild the successor chain per type.
 * Safe to run repeatedly.
 */
async function main() {
  const order: Record<string, number> = { ROADMAP: 0, STRATEGIC: 1, AOP: 2 };
  const plans = await prisma.plan.findMany({ orderBy: [{ startDate: "asc" }] });
  plans.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));

  let created = 0;
  for (const plan of plans) {
    const before = plan.periodId;
    const period = await ensurePlanPeriod(plan.id, "backfill");
    if (!period) continue;
    if (!before) created += 1;

    const label = periodLabelFor(plan.type, plan.startDate, plan.endDate);
    if (!period.labelAlt && label.labelAlt) {
      await prisma.planPeriod.update({
        where: { id: period.id },
        data: { labelAlt: label.labelAlt },
      });
    }
    console.log(
      `  ${plan.type.padEnd(9)} ${period.label.padEnd(14)} state=${period.state.padEnd(9)} plan=${plan.title}`
    );
  }

  for (const type of PERIOD_TYPES) {
    const count = await linkPeriodSuccessions(type);
    console.log(`  ${type}: ${count} period(s), successor chain rebuilt`);
  }

  console.log(`\nBackfill complete: ${created} plan(s) linked to a new period.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
