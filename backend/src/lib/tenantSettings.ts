import { prisma } from "./prisma";
import { getTenantId } from "./tenantContext";

export type TenantBranding = {
  "branding.primaryColor": string;
  "branding.secondaryColor": string;
  "branding.logoUrl": string;
  "branding.faviconUrl": string;
  "branding.orgName": string;
  "branding.orgNameAm": string;
  "branding.timezone": string;
  "branding.dateFormat": string;
};

export const TENANT_BRANDING_DEFAULTS: TenantBranding = {
  "branding.primaryColor": "#0B2545",
  "branding.secondaryColor": "#C9A227",
  "branding.logoUrl": "",
  "branding.faviconUrl": "",
  "branding.orgName": "",
  "branding.orgNameAm": "",
  "branding.timezone": "Africa/Addis_Ababa",
  "branding.dateFormat": "DD/MM/YYYY",
};

export async function getTenantBranding(tenantId?: string | null): Promise<TenantBranding> {
  const tid = tenantId ?? getTenantId();
  if (!tid) {
    return { ...TENANT_BRANDING_DEFAULTS };
  }
  const rows = await prisma.tenantSetting.findMany({
    where: { tenantId: tid, key: { in: Object.keys(TENANT_BRANDING_DEFAULTS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out: any = { ...TENANT_BRANDING_DEFAULTS };
  for (const key of Object.keys(TENANT_BRANDING_DEFAULTS) as (keyof TenantBranding)[]) {
    const v = map.get(key);
    if (v === undefined || v === null) continue;
    // values stored as Json; support plain string or {value:...}
    if (typeof v === "string") out[key] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[key] = String(v);
    else if (v && typeof v === "object" && "value" in (v as any)) out[key] = String((v as any).value ?? "");
    else out[key] = String(v);
  }
  return out as TenantBranding;
}

export async function setTenantBranding(
  updates: Partial<TenantBranding>,
  userId?: string | null,
  tenantId?: string | null,
) {
  const tid = tenantId ?? getTenantId();
  if (!tid) throw new Error("TENANT_CONTEXT_REQUIRED");
  const entries = Object.entries(updates).filter(([k]) => k in TENANT_BRANDING_DEFAULTS);
  for (const [key, value] of entries) {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: tid, key } },
      create: { tenantId: tid, key, value: (value ?? "") as any, updatedBy: userId ?? null },
      update: { value: (value ?? "") as any, updatedBy: userId ?? null },
    });
  }
  return getTenantBranding(tid);
}
