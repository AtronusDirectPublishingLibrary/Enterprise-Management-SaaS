const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    { key: "eihHeading", en: "Ethiopian Investment Holdings", am: "የኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ" },
    { key: "boardHeading", en: "The Board of Directors", am: "የዳይሬክተሮች ቦርድ" },
    { key: "ebpeHeading", en: "Ethio-Bio Pharma Enterprise", am: "የኢትዮ-ባዮ ፋርማ ኢንተርፕራይዝ" },
    { key: "buHeading", en: "Business Unit Structure", am: "የቢዝነስ ክፍል አወቃቀር" }
  ];
  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, update: { en: t.en, am: t.am }, create: { key: t.key, en: t.en, am: t.am }
    });
  }
  console.log("✅ Governance translations added.");
}
main().catch(console.error).finally(() => prisma.$disconnect());