import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { isReservedSlug, RESERVED_SLUGS } from "../src/lib/reservedSlugs";

const prisma = new PrismaClient();

const TENANT_ID = "tenant_default_ethio_biopharma";
const TENANT_SLUG = "ethio-biopharma"; // keep existing slug to preserve compatibility
const PLAN_ID = "plan_default_enterprise";

const ALL_MODULES = Array.from(new Set([
  "pms","projects","planning","aop","strategic","roadmap","progress","reports","calendar","alerts",
  "hr","hrAnalytics","hrOps","recruitment","payroll","fleet","qms","audit",
  "public_site","news","documents","media","languages","myhr","approvals","users","publicSite","settings","archive"
]));

async function main() {
  console.log("Seeding first tenant (Ethio-Biopharma)...");
  console.log("Reserved slugs:", RESERVED_SLUGS.join(", "));

  const plan = await prisma.subscriptionPlan.upsert({
    where: { code: "ENTERPRISE" },
    update: {
      name: "Enterprise",
      description: "Enterprise plan — all modules enabled, unlimited users",
      priceMonthly: 299,
      priceYearly: 2990,
      currency: "USD",
      trialDays: 14,
      enabledModules: ALL_MODULES,
      maxUsers: 100000,
      maxStorageGb: 10000,
      forNonProfit: false,
      isActive: true,
    },
    create: {
      id: PLAN_ID,
      code: "ENTERPRISE",
      name: "Enterprise",
      description: "Enterprise plan — all modules enabled, unlimited users",
      priceMonthly: 299,
      priceYearly: 2990,
      currency: "USD",
      trialDays: 14,
      enabledModules: ALL_MODULES,
      maxUsers: 100000,
      maxStorageGb: 10000,
      forNonProfit: false,
      isActive: true,
    },
  });
  console.log(`Plan: ${plan.code} (${plan.id}) modules=${plan.enabledModules.length}`);

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      name: "Ethio-Biopharma Enterprise",
      type: "NON_PROFIT",
      status: "ACTIVE",
      onboardingComplete: true,
      subscriptionPlanId: plan.id,
      industryType: "biopharma",
      orgSize: "large",
      primaryMarket: "national",
      languages: ["en", "am"],
      fiscalYearStart: 7,
      currency: "ETB",
      country: "ET",
      timezone: "Africa/Addis_Ababa",
      defaultTimezone: "Africa/Addis_Ababa",
      primaryEmail: existingTenant?.primaryEmail || "admin@ethiobiopharma.local",
    },
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      name: "Ethio-Biopharma Enterprise",
      type: "NON_PROFIT",
      status: "ACTIVE",
      onboardingComplete: true,
      subscriptionPlanId: plan.id,
      industryType: "biopharma",
      orgSize: "large",
      primaryMarket: "national",
      languages: ["en", "am"],
      fiscalYearStart: 7,
      currency: "ETB",
      country: "ET",
      timezone: "Africa/Addis_Ababa",
      defaultTimezone: "Africa/Addis_Ababa",
      primaryEmail: "admin@ethiobiopharma.local",
    },
  });
  console.log(`Tenant: ${tenant.name} slug=${tenant.slug} id=${tenant.id} status=${tenant.status}`);

  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });
  const adminUpdate: any = {
    tenantId: tenant.id,
    role: "admin",
    isTenantAdmin: true,
    isPlatformAdmin: true,
  };
  if (seedPassword) {
    adminUpdate.passwordHash = await bcrypt.hash(seedPassword, 12);
  }
  const admin = existingAdmin
    ? await prisma.user.update({ where: { id: existingAdmin.id }, data: adminUpdate })
    : await prisma.user.create({
        data: {
          username: "admin",
          passwordHash: await bcrypt.hash(seedPassword || "ChangeMe123!", 12),
          role: "admin",
          tenantId: tenant.id,
          isTenantAdmin: true,
          isPlatformAdmin: true,
          email: "admin@ethiobiopharma.local",
        } as any,
      });
  console.log(`Admin user: ${admin.username} tenantId=${admin.tenantId} isTenantAdmin=${admin.isTenantAdmin} isPlatformAdmin=${admin.isPlatformAdmin} passwordChanged=${Boolean(seedPassword)}`);

  const deptRows = await prisma.user.findMany({
    where: { tenantId: tenant.id, department: { not: null } },
    select: { department: true },
  });
  const departments = Array.from(new Set(
    deptRows.map((d) => String(d.department || "").trim()).filter(Boolean)
  )).sort();

  const settings: Array<{ key: string; value: any }> = [
    { key: "onboarding.departments", value: departments },
    { key: "onboarding.defaultModules", value: ALL_MODULES },
    { key: "branding.primaryColor", value: "#0B2545" },
    { key: "branding.secondaryColor", value: "#C9A227" },
    { key: "branding.orgName", value: "Ethio-Biopharma" },
  ];
  for (const s of settings) {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: s.key } },
      create: { tenantId: tenant.id, key: s.key, value: s.value as any },
      update: { value: s.value as any },
    });
  }
  console.log(`TenantSettings seeded: ${settings.map((s) => s.key).join(", ")}`);
  console.log(`Slug protected by reserved list: ${isReservedSlug(tenant.slug)} (reserved includes ethio-biopharma/ethiobiopharma)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
