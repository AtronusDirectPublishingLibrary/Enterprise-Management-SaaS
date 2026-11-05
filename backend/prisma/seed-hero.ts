import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing seed images to avoid duplicates
  await prisma.heroImage.deleteMany();

  const images = [
    { url: "/hero-bg.jpg" }, // The one we already downloaded
    { url: "https://images.unsplash.com/photo-1574263867128-a3d5c1b1275c?q=80&w=2070&auto=format&fit=crop" }, // Laboratory
    { url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop" }  // Science/Research
  ];

  for (const img of images) {
    await prisma.heroImage.create({ data: img });
  }
  console.log("Seeded 3 hero images.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());