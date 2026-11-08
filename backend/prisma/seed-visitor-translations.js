const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    { key: "Visitors", en: "Visitors", am: "ጎብኝዎች" },
    { key: "Today", en: "Today", am: "ዛሬ" },
    { key: "This Week", en: "This Week", am: "በዚህ ሳምንት" },
    { key: "This Month", en: "This Month", am: "በዚህ ወር" },
    { key: "This Year", en: "This Year", am: "በዚህ ዓመት" },
    { key: "All Time", en: "All Time", am: "ከመቼውም ጊዜ" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log("✅ Visitor translation keys added to the database.");
}
main().catch(console.error).finally(() => prisma.$disconnect());