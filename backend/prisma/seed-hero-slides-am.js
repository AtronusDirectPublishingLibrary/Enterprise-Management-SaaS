/**
 * Amharic copy for the hero slides created by the public-site seed.
 *
 * The slides are database rows, so they are edited under Settings → Hero
 * slides rather than Language & Translations; this script only fills the
 * Amharic columns when they are still empty and never overwrites an edit.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TRANSLATIONS = [
  {
    title: "Building National Health Security",
    titleAm: "ብሔራዊ የጤና ዋስትናን መገንባት",
    subtitleAm:
      "በኢትዮጵያ ኢንቨስትመንት ሀልዲንግስ ስር የሚሰራ፣ የሰው ክትባቶችንና መድሃኒቶችን በሀገር ውስጥ ለማምረት፣ ለማስፋፋትና ለማቆየት ስልጣን የተሰጠው ስትራቴጂካዊ የመንግስት ተቋም።",
    taglineAm: "አዲስ አበባ፣ ኢትዮጵያ",
    ctaLabelAm: "ስልጣናችንን ይመልከቱ",
  },
  {
    title: "Innovating for a Healthier Tomorrow",
    titleAm: "ለተሻለ ነገ ጤና ፈጠራን እናደርጋለን",
    subtitleAm:
      "ኢትዮጵያ በ2028 ዓ.ም ራስን በራስ እንድትችል ሙሉ በሙሉ የተቀናጀ የመድሃኒትና የክትባት ማምረቻ ካምፓስ መገንባት።",
    taglineAm: "ራዕይ 2028 ዓ.ም",
    ctaLabelAm: "ስትራቴጂካዊ ዕቅዳችንን ያንብቡ",
  },
  {
    title: "Global Partnerships for Local Impact",
    titleAm: "ለአገር ውስጥ ተጽዕኖ ዓለም አቀፍ አጋርነቶች",
    subtitleAm:
      "ለቀድሞ የገቢ ፍሰትና የጋራ ድጋፍ ፈጣን ስኬት ያላቸውን የንግድ ክፍሎች መጠቀም፣ ዲጂታላይዜሽንና አርቲፊሻል ኢንተለጀንስን በማምረቻ ስራዎቻችን ውስጥ ማካተት።",
    taglineAm: "የተቀናጀ ካምፓስ ሞዴል",
    ctaLabelAm: "ዓላማዎቻችንን ይመልከቱ",
  },
  {
    title: "A Strategic Investment Opportunity",
    titleAm: "ስትራቴጂካዊ የኢንቨስትመንት ዕድል",
    subtitleAm:
      "የShieldVax ፋሲሊቲን ለማስጀመርና በ2023 ዓ.ም በዓመት 16 ሚሊዮን የክትባት ዶዞችን ለማቅረብ ከ207 ሚሊዮን ዶላር በላይ የተቀላቀለ ፋይናንስ ማስተላለፍ።",
    taglineAm: "የመድሃኒት ነፃነት",
    ctaLabelAm: "ከእኛ ጋር ይተባበሩ",
  },
];

async function main() {
  let updated = 0;
  for (const entry of TRANSLATIONS) {
    const slide = await prisma.heroText.findFirst({ where: { title: entry.title } });
    if (!slide) continue;
    const patch = {};
    for (const field of ["titleAm", "subtitleAm", "taglineAm", "ctaLabelAm"]) {
      if (!slide[field] && entry[field]) patch[field] = entry[field];
    }
    if (Object.keys(patch).length) {
      await prisma.heroText.update({ where: { id: slide.id }, data: patch });
      updated += 1;
    }
  }
  console.log(`Filled Amharic hero copy on ${updated} slide(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
