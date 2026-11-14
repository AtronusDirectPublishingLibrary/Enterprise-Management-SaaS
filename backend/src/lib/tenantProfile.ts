import { prisma } from "./prisma";
import { runAsPlatform } from "./tenantContext";

export async function getTenantContextPayload(tenantId: string) {
  const tenant = await runAsPlatform(async () =>
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: { select: { code: true, name: true, enabledModules: true } } },
    }),
  );
  if (!tenant) return null;
  const settings = await runAsPlatform(async () =>
    prisma.tenantSetting.findMany({ where: { tenantId } }),
  );
  const map = new Map(settings.map((s) => [s.key, s.value as any]));
  const brandingKeys = ["branding.primaryColor", "branding.secondaryColor", "branding.logoUrl", "branding.faviconUrl", "branding.orgName", "branding.orgNameAm", "branding.timezone", "branding.dateFormat"];
  const branding: Record<string, any> = {};
  for (const k of brandingKeys) if (map.has(k)) branding[k] = map.get(k);

  const tenantModules = Array.isArray(tenant.enabledModules) && tenant.enabledModules.length ? tenant.enabledModules : [];
  const planModules = Array.isArray(tenant.subscriptionPlan?.enabledModules) ? tenant.subscriptionPlan!.enabledModules : [];
  const modules = tenantModules.length ? tenantModules : planModules;

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      type: tenant.type,
      industryType: tenant.industryType,
      orgSize: tenant.orgSize,
      primaryMarket: tenant.primaryMarket,
      currency: tenant.currency,
      fiscalYearStart: tenant.fiscalYearStart,
      languages: tenant.languages || ["en"],
      defaultTimezone: tenant.defaultTimezone,
      onboardingComplete: tenant.onboardingComplete,
      logoUrl: branding["branding.logoUrl"] || "",
      primaryColor: branding["branding.primaryColor"] || "#0B2545",
      secondaryColor: branding["branding.secondaryColor"] || "#C9A227",
      orgName: branding["branding.orgName"] || tenant.name,
      planCode: tenant.subscriptionPlan?.code || null,
      planName: tenant.subscriptionPlan?.name || null,
    },
    modules,
    departments: map.get("onboarding.departments") || [],
    roles: map.get("onboarding.roles") || [],
    workflows: map.get("onboarding.workflows") || { approvalDepth: 1, leaveTypes: ["ANNUAL", "SICK"], primaryLanguage: "en" },
    labels: map.get("onboarding.labels") || {},
    branding,
    isFirstTenant: tenant.slug === "ethio-biopharma",
  };
}
