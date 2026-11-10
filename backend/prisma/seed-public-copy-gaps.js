/**
 * Copy that the public pages render but which was not yet in the translation
 * table. Running this script is safe: existing rows are left untouched, so an
 * editor's wording always wins.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ROWS = [
  {
    key: "about.strategicObjectivesNote",
    en: "The core of the 2026-2030 plan is defined by five Strategic Objectives (SOs).",
    am: "የ2019–2023 ዓ.ም ስትራቴጂካዊ ዕቅዱ ዋና ይዘት በአምስት ስትራቴጂካዊ ግቦች (SOs) ይተረጎማል።",
  },
  {
    key: "Vaccine doses per year by 2030",
    en: "Vaccine doses per year by 2030",
    am: "በ2023 ዓ.ም በዓመት የሚመረቱ የክትባት ዶዞች",
  },
  {
    key: "Blended financing for the campus",
    en: "Blended financing for the campus",
    am: "ለካምፓሱ የተቀላቀለ ፋይናንስ",
  },
  {
    key: "Direct jobs created by 2030",
    en: "Direct jobs created by 2030",
    am: "በ2023 ዓ.ም የተፈጠሩ ቀጥታ ስራዎች",
  },
];

async function main() {
  let created = 0;
  for (const row of ROWS) {
    const existing = await prisma.translation.findUnique({ where: { key: row.key } });
    if (existing) continue;
    await prisma.translation.create({ data: row });
    created += 1;
  }
  console.log(`Added ${created} translation row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
