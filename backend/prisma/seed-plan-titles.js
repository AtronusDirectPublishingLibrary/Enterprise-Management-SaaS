const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dict = [
    // 1. Plan Titles
    { key: "5-Year Strategic Plan (2026-2030)", en: "5-Year Strategic Plan (2026-2030)", am: "ባለ 5-ዓመት ስትራቴጂካዊ እቅድ (2026-2030)" },
    { key: "Annual Workplan 2019 E.C. (July 2026 – June 2027)", en: "Annual Workplan 2019 E.C. (July 2026 – June 2027)", am: "ዓመታዊ የስራ እቅድ 2019 ዓ.ም (ሐምሌ 2026 – ሰኔ 2027)" },
    { key: "Building an Integrated, Digitally Enabled Biopharmaceutical Campus for Ethiopia", en: "Building an Integrated, Digitally Enabled Biopharmaceutical Campus for Ethiopia", am: "ለኢትዮጵያ የተቀናጀ፣ በዲጂታል የተደገፈ የባዮፋርማሲዩቲካል ካምፓስ መገንባት" },

    // 2. Strategic Plan Bullets
    { key: "Infrastructure and Integrated Biopharmaceutical Campus Development", en: "Infrastructure and Integrated Biopharmaceutical Campus Development", am: "መሠረተ ልማት እና የተቀናጀ የባዮፋርማሲዩቲካል ካምፓስ ልማት" },
    { key: "Technology Transfer, Smart Manufacturing, R&D and Innovation", en: "Technology Transfer, Smart Manufacturing, R&D and Innovation", am: "ቴክኖሎጂ ሽግግር፣ ብልህ ማምረቻ፣ ምርምር እና ፈጠራ" },
    { key: "Regulatory Excellence and Quality Assurance", en: "Regulatory Excellence and Quality Assurance", am: "የቁጥጥር ልቀት እና የጥራት ማረጋገጫ" },
    { key: "Human Capital Development and Talent Management", en: "Human Capital Development and Talent Management", am: "የሰው ካፒታል ልማት እና የተሰጥኦ አስተዳደር" },

    // 3. Annual Plan Bullets
    { key: "Phase I — Civil Construction for ShieldVax Project", en: "Phase I — Civil Construction for ShieldVax Project", am: "ምዕራፍ I — ለShieldVax ፕሮጀክት ሲቪል ግንባታ" },
    { key: "Engage TT Partner(s) for Fill-Finish of Priority Vaccines", en: "Engage TT Partner(s) for Fill-Finish of Priority Vaccines", am: "ለቅድሚያ ክትባቶች ሙሌት-ማጠናቀቂያ የቴክኖሎጂ ሽግግር አጋሮችን ማሳተፍ" },
    { key: "Finalize Preparation for Phase II Project Implementation of ShieldVax", en: "Finalize Preparation for Phase II Project Implementation of ShieldVax", am: "ለShieldVax ምዕራፍ II ፕሮጀክት ትግበራ ዝግጅትን ማጠናቀቅ" },
    { key: "Operationalizing Ethio-BioPharma Enterprise", en: "Operationalizing Ethio-BioPharma Enterprise", am: "የኢትዮ-ባዮፋርማ ኢንተርፕራይዝን ተግባራዊ ማድረግ" },

    // 4. Roadmap Bullets
    { key: "Pre-Launch & Foundation", en: "Pre-Launch & Foundation", am: "ከመጀመሩ በፊት እና መሠረት ማውጣት" },
    { key: "Groundbreaking & Quick-Win Build-Out", en: "Groundbreaking & Quick-Win Build-Out", am: "የመሠረት ጥልቀት እና ፈጣን አሸናፊ ግንባታ" },
    { key: "ShieldVax Commissioning & Quick-Win Scale-Up", en: "ShieldVax Commissioning & Quick-Win Scale-Up", am: "የShieldVax ስርዓተ-ስራ እና ፈጣን አሸናፊ መስፋፋት" },
    { key: "Integrated Operations & Vertical Expansion", en: "Integrated Operations & Vertical Expansion", am: "የተቀናጀ ስራዎች እና ቁመታዊ መስፋፋት" }
  ];

  let count = 0;
  for (const t of dict) {
    await prisma.translation.upsert({
      where: { key: t.key }, 
      update: { en: t.en, am: t.am }, 
      create: { key: t.key, en: t.en, am: t.am }
    });
    count++;
  }
  console.log(`✅ Added/Updated ${count} Plan translations to the database.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());