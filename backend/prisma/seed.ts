import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser(
  username: string,
  password: string,
  role: string,
  email: string,
  extra: { piName?: string; forceChange?: boolean } = {},
) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where:  { username },
    update: { passwordHash, role, email, forceChange: extra.forceChange ?? false },
    create: {
      username, passwordHash, role, email,
      piName: extra.piName,
      forceChange: extra.forceChange ?? false,
    },
  });
  console.log(`  ${username.padEnd(14)} role=${role.padEnd(16)} id=${user.id}`);
}

async function main() {
  console.log("Seeding default users...");
  await upsertUser("admin",       "pms2026",  "admin",           "admin@ethiobiopharma.et");
  await upsertUser("pm_demo",     "pm123",    "project_manager", "pm@ethiobiopharma.et",     { forceChange: true });
  await upsertUser("pi_demo",     "pi123",    "pi",              "pi@ethiobiopharma.et",     { piName: "Dr. Sample PI", forceChange: true });
  await upsertUser("viewer_demo", "viewer123","viewer",          "viewer@ethiobiopharma.et", { forceChange: true });

  const projectCount = await prisma.project.count();
  console.log(`Existing projects in DB: ${projectCount} (left untouched)`);
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
