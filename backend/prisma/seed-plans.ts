import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    code: "STARTER",
    name: "Starter",
    description: "Core planning and HR for small teams",
    priceMonthly: 49,
    priceYearly: 490,
    currency: "USD",
    trialDays: 14,
    enabledModules: ["pms", "hr", "myhr", "approvals", "projects", "reports"],
    defaultIndustries: ["other", "education", "government"],
    maxUsers: 15,
    maxStorageGb: 10,
    forNonProfit: false,
    isActive: true,
  },
  {
    code: "PROFESSIONAL",
    name: "Professional",
    description: "Full operations suite for growing organizations",
    priceMonthly: 149,
    priceYearly: 1490,
    currency: "USD",
    trialDays: 14,
    enabledModules: ["pms", "hr", "myhr", "approvals", "projects", "reports", "planning", "aop", "strategic", "roadmap", "fleet", "qms", "recruitment", "payroll"],
    defaultIndustries: ["manufacturing", "healthcare", "logistics", "biopharma"],
    maxUsers: 75,
    maxStorageGb: 50,
    forNonProfit: false,
    isActive: true,
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    description: "Enterprise-grade multi-module platform",
    priceMonthly: 299,
    priceYearly: 2990,
    currency: "USD",
    trialDays: 14,
    enabledModules: ["pms", "hr", "myhr", "approvals", "projects", "reports", "planning", "aop", "strategic", "roadmap", "fleet", "qms", "recruitment", "payroll", "public_site"],
    defaultIndustries: ["biopharma", "manufacturing", "healthcare", "government", "logistics"],
    maxUsers: 500,
    maxStorageGb: 200,
    forNonProfit: false,
    isActive: true,
  },
  {
    code: "NONPROFIT_BASIC",
    name: "Nonprofit Basic",
    description: "Discounted plan for nonprofit organizations",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    trialDays: 30,
    enabledModules: ["pms", "hr", "myhr", "approvals", "projects", "reports", "planning", "aop", "strategic", "roadmap"],
    defaultIndustries: ["government", "education", "healthcare", "other"],
    maxUsers: 50,
    maxStorageGb: 25,
    forNonProfit: true,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding subscription plans (idempotent)...");
  for (const p of plans) {
    const row = await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        currency: p.currency,
        trialDays: p.trialDays,
        enabledModules: p.enabledModules,
        defaultIndustries: p.defaultIndustries,
        maxUsers: p.maxUsers,
        maxStorageGb: p.maxStorageGb,
        forNonProfit: p.forNonProfit,
        isActive: p.isActive,
      },
      create: p as any,
    });
    console.log(`  ${row.code} id=${row.id} modules=${row.enabledModules.length} active=${row.isActive}`);
  }
  console.log("seed:plans complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
