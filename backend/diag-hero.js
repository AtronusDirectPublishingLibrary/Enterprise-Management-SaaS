const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const images = await prisma.heroImage.findMany();
  const texts = await prisma.heroText.findMany();
  const settings = await prisma.appSetting.findMany();

  console.log("\n--- HERO IMAGES (Database) ---");
  console.dir(images, { depth: null, colors: true });

  console.log("\n--- HERO TEXTS (Database) ---");
  console.dir(texts, { depth: null, colors: true });

  console.log("\n--- APP SETTINGS (Database) ---");
  console.dir(settings, { depth: null, colors: true });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
