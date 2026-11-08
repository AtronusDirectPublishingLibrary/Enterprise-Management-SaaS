const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
    "heroTitle": "ለተሻለ ነገ ለመፍጠር እንሰራለን",
    "heroSubtitle": "የአገር ውስጥ የሰው ልጅ ክትባቶችን እና መድኃኒቶችን ለማምረት የሚያስችል ስትራቴጂያዊ የመንግስት ተቋም።",
    "discoverMandate": "ስልጣናችንን ይመልከቱ",
    "technologyTransferPartners": "የቴክኖሎጂ ሽግግር አጋሮች",
    "governmentMultilateral": "መንግስት እና ሁለገብ",
    "strategicStateMandate": "ስትራቴጂያዊ የመንግስት ተልዕኮ",
    "kilintoSpecialEconomicZone": "የኪሊንቶ ልዩ ኢኮኖሚ ዞን",
    "globalPartnerships": "ዓለም አቀፍ አጋርነቶች",
    "buildingNationalHealthSecurity": "የአገር አቀፍ ጤና ዋስትናን መገንባት"
  };

  let updatedCount = 0;
  const existing = await prisma.translation.findMany();
  
  for (const row of existing) {
    if (dict[row.key]) {
      await prisma.translation.update({
        where: { id: row.id },
        data: { am: dict[row.key] }
      });
      updatedCount++;
    }
  }
  
  console.log(`✅ Successfully updated ${updatedCount} rows with clean Amharic text.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());