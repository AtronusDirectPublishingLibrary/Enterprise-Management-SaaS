const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // The keys are the exact English sentences rendered by React.
  // The `am` values are the Amharic translations to display.
  const dict = [
    { key: "Vaccine doses per year by 2030", en: "Vaccine doses per year by 2030", am: "በ2030 በዓመት 16 ሚሊዮን የክትባት ዶዞች" },
    { key: "Blended financing for the campus", en: "Blended financing for the campus", am: "207 ሚሊዮን ዶላር የተቀላቀለ ፋይናንስ" },
    { key: "Direct jobs created by 2030", en: "Direct jobs created by 2030", am: "በ2030 የሚፈጠሩ 400+ ቀጥታ ስራዎች" }
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
  console.log(`✅ Successfully added/updated ${count} stat translations.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());