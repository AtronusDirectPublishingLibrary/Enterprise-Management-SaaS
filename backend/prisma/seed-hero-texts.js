const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding new Hero Texts...");

  // 1. Clear existing generic hero texts
  await prisma.heroText.deleteMany({});
  console.log("🗑️ Cleared old hero texts.");

  // 2. Insert new slides from the EBPE Roadmap and Strategic Plan
  const newTexts = [
    {
      title: "Building National Health Security",
      subtitle: "A strategic state-owned enterprise under Ethiopian Investment Holdings, mandated to build, scale and sustain local manufacturing of human vaccines and pharmaceuticals.",
      tagline: "Addis Ababa, Ethiopia",
      ctaLabel: "Discover Our Mandate",
      ctaUrl: "/about",
      sortOrder: 1,
      isActive: true
    },
    {
      title: "Innovating for a Healthier Tomorrow",
      subtitle: "Establishing a fully integrated, end-to-end pharmaceutical and vaccine manufacturing campus in Ethiopia to achieve self-reliance by 2035.",
      tagline: "Vision 2035",
      ctaLabel: "Read Our Strategic Plan",
      ctaUrl: "/about",
      sortOrder: 2,
      isActive: true
    },
    {
      title: "Global Partnerships for Local Impact",
      subtitle: "Leveraging quick-win business units for early cash flow and cross-subsidization, while embedding digitalization and AI into our manufacturing operations.",
      tagline: "Integrated Campus Model",
      ctaLabel: "Explore Our Objectives",
      ctaUrl: "/about",
      sortOrder: 3,
      isActive: true
    },
    {
      title: "A Strategic Investment Opportunity",
      subtitle: "Securing USD 207M+ in blended financing to commission the ShieldVax facility and deliver 16 million vaccine doses annually by 2030.",
      tagline: "Pharmaceutical Sovereignty",
      ctaLabel: "Partner With Us",
      ctaUrl: "/about",
      sortOrder: 4,
      isActive: true
    }
  ];

  for (const text of newTexts) {
    await prisma.heroText.create({ data: text });
  }

  console.log(`✅ Successfully added ${newTexts.length} hero text slides.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());