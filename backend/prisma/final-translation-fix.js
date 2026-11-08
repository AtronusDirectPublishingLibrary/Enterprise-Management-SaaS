const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    { key: "heroTitle1", en: "Building National Health Security", am: "የአገር አቀፍ ጤና ዋስትናን መገንባት" },
    { key: "heroSub1", en: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.", am: "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፣ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን በአገር ውስጥ ለማምረት የተቋቋመ።" },
    { key: "navOverview", en: "Overview", am: "አጠቃላይ እይታ" },
    { key: "navObjectives", en: "Objectives", am: "ግቦች" },
    { key: "navGovernance", en: "Governance", am: "አስተዳደር" },
    { key: "missionVisionHeading", en: "Our Mission & Vision", am: "ተልዕኮአችን እና ራዕያችን" }
  ];

  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key },
      update: { en: t.en, am: t.am },
      create: { en: t.en, am: t.am, key: t.key }
    });
  }
  console.log("✅ Database translations verified and updated.");
}
main().catch(console.error).finally(() => prisma.$disconnect());