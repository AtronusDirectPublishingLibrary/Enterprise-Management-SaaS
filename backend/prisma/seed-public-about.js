/**
 * Insert the public About page copy into an existing database.
 * Insert-only: existing rows (including admin edits) are left untouched.
 *
 *   node prisma/seed-public-about.js
 */
const { PrismaClient } = require("@prisma/client");
const keys = require("./public-about-keys");

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let kept = 0;

  for (const row of keys) {
    const existing = await prisma.translation.findUnique({ where: { key: row.key } });
    if (existing) {
      kept += 1;
      continue;
    }
    await prisma.translation.create({ data: row });
    created += 1;
  }

  console.log(`Public About copy: ${created} added, ${kept} already present.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
