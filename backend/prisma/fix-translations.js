const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fixing Amharic translations in database...");
  
  const dict = {
    "about": "ስለ እኛ",
    "products": "ምርቶች",
    "news": "ዜናዎች",
    "partners": "አጋሮች",
    "investors": "ባለሀብቶች",
    "documents": "ሰነዶች",
    "contact": "አግኙን",
    "staffLogin": "የሰራተኞች መግቢያ",
    "brandName": "ኢትዮ-ባዮፋርማ",
    "footerRights": "መብቱ በህግ የተጠበቀ ነው።",
    "quickLinks": "ፈጣን አገናኞች",
    "headOffice": "ዋና መስሪያ ቤት",
    "headOfficeAddress1": "ካዛንቺስ፣ ቤተ ብርሃን ህንፃ፣ 5ኛ ፎቅ",
    "headOfficeAddress2": "አዲስ አበባ፣ ኢትዮጵያ",
    "heroTitle1": "የአገር አቀፍ ጤና ዋስትናን መገንባት",
    "heroSub1": "በኢትዮጵያ ኢንቨስትመንት ሆልዲንግስ ስር የሚተዳደር ስትራቴጂያዊ የመንግስት ተቋም፣ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን በአገር ውስጥ ለማምረት የተቋቋመ።",
    "heroTagline": "አዲስ አበባ፣ ኢትዮጵያ",
    "discoverMandate": "ስልጣናችንን ይመልከቱ",
    "productsCapabilities": "ምርቶች እና አቅሞች",
    "newsAnnouncements": "ዜናዎች እና ማስታወቂያዎች"
  };

  const existing = await prisma.translation.findMany();
  let updatedCount = 0;

  for (const row of existing) {
    if (dict[row.key]) {
      await prisma.translation.update({
        where: { id: row.id },
        data: { am: dict[row.key] }
      });
      updatedCount++;
    }
  }

  console.log(`✅ Successfully fixed ${updatedCount} Amharic translations.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());