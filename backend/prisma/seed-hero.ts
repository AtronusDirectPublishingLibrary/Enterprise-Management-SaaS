import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * The hero rotation pulls its backgrounds from the active Hero image library,
 * in order. These are the approved EBPE campus renders from /Images, optimised
 * into frontend/public/media/hero.
 */
const HERO_IMAGES = [
  { url: "/media/hero/ebpe-campus-1.webp" },
  { url: "/media/hero/ebpe-campus-2.webp" },
  { url: "/media/hero/ebpe-campus-3.webp" },
];

async function main() {
  // Clear existing images so re-running stays idempotent.
  await prisma.heroImage.deleteMany();

  for (const image of HERO_IMAGES) {
    await prisma.heroImage.create({ data: image });
  }
  console.log(`Seeded ${HERO_IMAGES.length} hero images.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
