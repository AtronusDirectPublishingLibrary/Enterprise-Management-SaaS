import { prisma } from "./prisma";
import { getTenantId, runAsPlatform } from "./tenantContext";

export const MODULE_ALIASES: Record<string, string[]> = {
  hr: ["hr"],
  hrAnalytics: ["hr"],
  hrOps: ["hr"],
  recruitment: ["recruitment"],
  payroll: ["payroll"],
  fleet: ["fleet"],
  qms: ["qms"],
  // planning-related keys
  aop: ["aop", "planning"],
  strategic: ["strategic", "planning"],
  roadmap: ["roadmap", "planning"],
  progress: ["planning", "projects", "pms"],
  reports: ["reports"],
  calendar: ["planning"],
  alerts: ["planning"],
  pms: ["pms", "projects"],
  projects: ["projects", "pms"],
  // supply chain & finance modules
  supply_chain: ["supply_chain", "inventory", "assets", "scm", "procurement", "warehouse", "wms", "maintenance", "eam"],
  inventory: ["supply_chain", "inventory", "assets", "scm", "warehouse", "wms"],
  assets: ["supply_chain", "inventory", "assets", "scm", "maintenance", "eam", "cmms"],
  finance: ["finance", "financial", "accounting", "gl", "ap", "ar"],
  financial: ["finance", "financial", "accounting", "gl", "ap", "ar"],
  // Tier 1-3 enterprise modules (developed/in development)
  procurement: ["procurement", "vendors", "purchasing", "supply_chain", "scm"],
  vendors: ["procurement", "vendors", "purchasing", "supply_chain"],
  warehouse: ["warehouse", "wms", "inventory_mgmt", "supply_chain", "inventory", "scm"],
  accounting: ["accounting", "gl", "ap", "ar", "finance", "financial"],
  maintenance: ["maintenance", "eam", "cmms", "assets", "supply_chain"],
  crm: ["crm", "sales", "orders"],
  portals: ["portals_ext", "customer_portal", "partner_portal"],
  helpdesk: ["helpdesk", "itsm", "service_desk"],
  dms: ["dms", "records", "knowledge"],
  grc: ["grc", "risk", "compliance_audit"],
  bi: ["bi", "analytics_adv"],
  resources: ["resources", "capacity"],
  contracts: ["contracts", "legal"],
  ehs: ["ehs", "safety"],
  // content/public/admin-ish modules (optional gating)
  publicSite: ["public_site"],
  news: ["public_site"],
  documents: ["public_site"],
  media: ["public_site"],
  languages: ["public_site"],
};

export async function getEffectiveEnabledModules(tenantId?: string | null): Promise<string[] | null> {
  const tid = tenantId ?? getTenantId();
  if (!tid) return null; // no tenant context => do not module-gate (platform/public paths handled elsewhere)
  const tenant = await runAsPlatform(async () =>
    prisma.tenant.findUnique({
      where: { id: tid },
      select: {
        enabledModules: true,
        subscriptionPlan: { select: { enabledModules: true } },
      },
    }),
  );
  if (!tenant) return null;
  const tenantModules = Array.isArray(tenant.enabledModules) ? tenant.enabledModules.filter(Boolean) : [];
  if (tenantModules.length > 0) return tenantModules;
  const planModules = Array.isArray(tenant.subscriptionPlan?.enabledModules)
    ? tenant.subscriptionPlan!.enabledModules.filter(Boolean)
    : [];
  if (planModules.length > 0) return planModules;
  // Empty/undefined => backward-compatible: allow all modules
  return null;
}

export function moduleAllowed(enabledModules: string[] | null, key: string): boolean {
  if (!enabledModules) return true; // null means allow-all (legacy/unset)
  const aliases = MODULE_ALIASES[key];
  if (!aliases || aliases.length === 0) return true; // unmapped keys not module-gated
  return aliases.some((m) => enabledModules.includes(m));
}

export async function isModuleEnabledForTenant(key: string, tenantId?: string | null): Promise<boolean> {
  const mods = await getEffectiveEnabledModules(tenantId ?? null);
  return moduleAllowed(mods, key);
}
