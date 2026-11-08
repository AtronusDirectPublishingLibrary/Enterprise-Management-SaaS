const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    { key: "16M", en: "16M", am: "16 ሚሊዮን" },
    { key: "USD 207M", en: "USD 207M", am: "207 ሚሊዮን ዶላር" },
    { key: "400+", en: "400+", am: "400+" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log("✅ Added/Updated 3 numeric translations (16M, USD 207M, 400+).");
}
main().catch(console.error).finally(() => prisma.$disconnect());