import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.heroText.deleteMany();

  const texts = [
    { title: "Unlocking the Economic Potential of Ethiopia", subtitle: "Ethiobiopharma is driving national health security by managing public assets, enabling strategic bio-investments, and fostering transformative partnerships." },
    { title: "Innovating for a Healthier Tomorrow", subtitle: "Our state-of-the-art research facilities and strategic partnerships are paving the way for groundbreaking biomedical discoveries." },
    { title: "Sovereign Wealth for Sovereign Health", subtitle: "Managing Africa's largest health fund to ensure sustainable, equitable, and world-class healthcare for all Ethiopians." }
  ];

  for (const t of texts) {
    await prisma.heroText.create({ data: t });
  }
  console.log("Seeded 3 hero texts.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());