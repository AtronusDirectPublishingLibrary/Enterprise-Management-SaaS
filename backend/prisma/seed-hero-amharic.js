/** Amharic copy for the existing hero slides (matched by English title). */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const translations = [
  {
    title: "Building National Health Security",
    titleAm: "ብሔራዊ የጤና ዋስትናን መገንባት",
    subtitleAm:
      "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፤ የሰው ልጅ ክትባቶችንና መድኃኒቶችን በአገር ውስጥ ለማምረት፣ ለማስፋፋትና ለማቆየት የተቋቋመ።",
    taglineAm: "አዲስ አበባ፣ ኢትዮጵያ",
    ctaLabelAm: "ስልጣናችንን ይመልከቱ",
  },
  {
    title: "Innovating for a Healthier Tomorrow",
    titleAm: "ለጤናማ ነገ ፈጠራን ማድረግ",
    subtitleAm:
      "እስከ 2035 ራስን በራስ ለማስቻል በኢትዮጵያ ውስጥ ሙሉ በሙሉ የተቀናጀ የመድኃኒትና የክትባት ማምረቻ ካምፓስ መገንባት።",
    taglineAm: "ራዕይ 2035",
    ctaLabelAm: "ስትራቴጂካዊ ዕቅዳችንን ያንብቡ",
  },
  {
    title: "Global Partnerships for Local Impact",
    titleAm: "ለአገር ውስጥ ተጽዕኖ ዓለም አቀፍ አጋርነት",
    subtitleAm:
      "ፈጣን አሸናፊ የንግድ ክፍሎችን ለቀድሞ የገንዘብ ፍሰትና የተሻጋሪ ድጋፍ በመጠቀም ዲጂታላይዜሽንና AIን በማምረቻ ስራዎቻችን ውስጥ ማካተት።",
    taglineAm: "የተቀናጀ ካምፓስ ሞዴል",
    ctaLabelAm: "ግቦቻችንን ያስሱ",
  },
  {
    title: "A Strategic Investment Opportunity",
    titleAm: "ስትራቴጂካዊ የኢንቨስትመንት እድል",
    subtitleAm:
      "የShieldVax ፋሲሊቲን ለማስጀመርና በ2030 በዓመት 16 ሚሊዮን የክትባት ዶዞችን ለማቅረብ ከ207 ሚሊዮን ዶላር በላይ የተቀላቀለ ፋይናንስ ማረጋገጥ።",
    taglineAm: "የፋርማሲዩቲካል ሉዓላዊነት",
    ctaLabelAm: "ከእኛ ጋር ይስሩ",
  },
];

async function main() {
  let updated = 0;
  for (const entry of translations) {
    const result = await prisma.heroText.updateMany({
      where: { title: entry.title },
      data: {
        titleAm: entry.titleAm,
        subtitleAm: entry.subtitleAm,
        taglineAm: entry.taglineAm,
        ctaLabelAm: entry.ctaLabelAm,
      },
    });
    updated += result.count;
  }
  console.log(`Hero slides updated with Amharic copy: ${updated}.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
