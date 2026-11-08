const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const imgs = await prisma.heroImage.findMany();
  console.log("  Hero Images in Database:");
  imgs.forEach(i => console.log(`    - ${i.url}`));
}
main().finally(() => prisma.$disconnect());
