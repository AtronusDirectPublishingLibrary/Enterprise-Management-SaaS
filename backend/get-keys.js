const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.translation.findMany().then(data => {
  console.log(JSON.stringify(data.map(d => d.key)));
}).finally(() => prisma.$disconnect());
