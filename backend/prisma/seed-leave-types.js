const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = [
    { name: "Annual Leave", code: "ANNUAL", defaultDays: 20, maxRolloverDays: 5, rolloverExpireYr: 1 },
    { name: "Sick Leave", code: "SICK", defaultDays: 10, maxRolloverDays: 0, rolloverExpireYr: 0 },
    { name: "Maternity/Paternity Leave", code: "MATERNITY", defaultDays: 90, maxRolloverDays: 0, rolloverExpireYr: 0 },
    { name: "Study Leave", code: "STUDY", defaultDays: 5, maxRolloverDays: 2, rolloverExpireYr: 1 },
    { name: "Unpaid Leave", code: "UNPAID", defaultDays: 0, maxRolloverDays: 0, rolloverExpireYr: 0 },
  ];

  for (const t of types) {
    await prisma.leaveType.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
  }
  console.log(`✅ Seeded ${types.length} leave types.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());