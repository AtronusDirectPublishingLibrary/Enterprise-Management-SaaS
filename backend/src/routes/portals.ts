import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { runAsPlatform } from "../lib/tenantContext";
import { getIndustryDefaults } from "../lib/onboardingTemplates";
import { getTenantContextPayload } from "../lib/tenantProfile";
import { requireAuth } from "../middleware/auth";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import { isReservedSlug } from "../lib/reservedSlugs";
import { logAudit } from "../lib/audit";
import { signToken, COOKIE_NAME, COOKIE_OPTS } from "../lib/jwt";
import { setCsrfCookie } from "../middleware/csrf";

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Try again later." },
});

function normalizeSlug(input: string) {
  const s = String(input || "").trim().toLowerCase();
  if (s === "ethiobiopharma") return "ethio-biopharma";
  return s;
}

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

async function getTenantBranding(tenantId: string) {
  const rows = await runAsPlatform(async () =>
    prisma.tenantSetting.findMany({
      where: { tenantId, key: { in: ["branding.logoUrl", "branding.primaryColor", "branding.secondaryColor", "branding.orgName", "branding.faviconUrl"] } },
      select: { key: true, value: true },
    }),
  );
  const out: Record<string, string> = {};
  for (const r of rows) {
    const v = r.value as any;
    if (typeof v === "string") out[r.key] = v;
    else if (v && typeof v === "object" && "value" in v) out[r.key] = String(v.value ?? "");
    else if (v != null) out[r.key] = String(v);
  }
  return out;
}

async function findTenantBySlug(slugInput: string) {
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;
  return runAsPlatform(async () =>
    prisma.tenant.findUnique({
      where: { slug },
      include: { subscriptionPlan: { select: { id: true, code: true, name: true, enabledModules: true, priceMonthly: true } } },
    }),
  );
}

async function upsertSetting(tenantId: string, key: string, value: any) {
  return runAsPlatform(async () =>
    prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value },
      update: { value },
    }),
  );
}

// Public: resolve tenant branding/context for login pages
router.get("/tenant-context", async (req, res) => {
  try {
    const slug = normalizeSlug(String(req.query.slug || ""));
    if (!slug) return res.status(400).json({ message: "slug is required" });
    const tenant = await runAsPlatform(async () =>
      prisma.tenant.findUnique({
        where: { slug },
        select: {
          id: true, slug: true, name: true, status: true, industryType: true, orgSize: true,
          primaryMarket: true, currency: true, fiscalYearStart: true, languages: true,
          defaultTimezone: true, onboardingComplete: true,
        },
      }),
    );
    if (!tenant) return res.status(404).json({ message: "Organization not found" });
    const branding = await getTenantBranding(tenant.id);
    res.set("Cache-Control", "no-store").json({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      industryType: tenant.industryType,
      orgSize: tenant.orgSize,
      primaryMarket: tenant.primaryMarket,
      currency: tenant.currency,
      fiscalYearStart: tenant.fiscalYearStart,
      languages: tenant.languages || [],
      defaultTimezone: tenant.defaultTimezone,
      onboardingComplete: tenant.onboardingComplete,
      logoUrl: branding["branding.logoUrl"] || "",
      primaryColor: branding["branding.primaryColor"] || "#0B2545",
      secondaryColor: branding["branding.secondaryColor"] || "#C9A227",
      orgName: branding["branding.orgName"] || tenant.name,
      faviconUrl: branding["branding.faviconUrl"] || "",
      isFirstTenant: tenant.slug === "ethio-biopharma",
    });
  } catch (e: any) {
    console.error("[portals/tenant-context] failed", e?.message, e?.stack);
    res.status(500).json({ message: "Failed to resolve tenant context" });
  }
});

// Auth: current tenant full context (context-responsive app)
router.get("/tenant-context/current", requireAuth, async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ message: "Tenant context missing" });
    const payload = await getTenantContextPayload(tenantId);
    if (!payload) return res.status(404).json({ message: "Tenant not found" });
    res.json(payload);
  } catch (e: any) {
    res.status(500).json({ message: "Failed to load tenant context", error: e?.message });
  }
});

// Public: slug availability
router.get("/check-slug", async (req, res) => {
  try {
    const raw = String(req.query.slug || "");
    const slug = slugify(raw);
    if (!slug) return res.json({ available: false, reason: "invalid" });
    if (isReservedSlug(slug)) return res.json({ available: false, reason: "reserved", slug });
    const exists = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { slug }, select: { id: true } }));
    if (exists) return res.json({ available: false, reason: "taken", slug });
    res.json({ available: true, slug });
  } catch (e) {
    res.status(500).json({ available: false, reason: "error" });
  }
});

const RegisterSchema = z.object({
  organization: z.object({
    legalName: z.string().min(1),
    displayName: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(["PROFIT", "NON_PROFIT"]),
    country: z.string().min(1),
    city: z.string().optional().default(""),
    primaryEmail: z.string().email(),
    industryType: z.string().min(1),
    orgSize: z.string().min(1),
    primaryMarket: z.string().min(1),
    fiscalYearStart: z.coerce.number().int().min(1).max(12),
    currency: z.string().min(1),
    languages: z.array(z.string()).min(1).default(["en"]),
  }),
  structure: z.object({
    departments: z.array(z.string()).default([]),
    reportingLevels: z.number().int().min(1).max(5).default(2),
  }),
  modules: z.array(z.string()).default([]),
  workflows: z.object({
    approvalDepth: z.number().int().min(1).max(5).default(1),
    leaveTypes: z.array(z.string()).default(["ANNUAL", "SICK"]),
    primaryLanguage: z.string().default("en"),
  }),
  admin: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

// Public: register tenant (C3)
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const parsedResult = RegisterSchema.safeParse(req.body);
    if (!parsedResult.success) {
      const issues = parsedResult.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      console.warn("[portals/register] validation failed", issues);
      return res.status(400).json({ message: "Invalid registration data", issues });
    }
    const parsed = parsedResult.data;
    const org = parsed.organization;
    const slug = slugify(org.slug || org.displayName);
    if (!slug) return res.status(400).json({ message: "Invalid organization slug" });
    if (isReservedSlug(slug)) return res.status(400).json({ message: "This slug is reserved", reason: "reserved" });

    const existing = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { slug }, select: { id: true } }));
    if (existing) return res.status(409).json({ message: "Organization slug already taken", reason: "taken" });

    // choose plan (first active ENTERPRISE/PROFESSIONAL-like or any active)
    const plan = await runAsPlatform(async () =>
      prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: [{ code: "desc" }, { createdAt: "asc" }] }),
    );

    const defaults = getIndustryDefaults(org.industryType, org.orgSize);
    const departments = parsed.structure.departments.length ? parsed.structure.departments : defaults.departments;
    const modules = parsed.modules.length ? parsed.modules : defaults.modules;
    const workflows = {
      approvalDepth: parsed.workflows.approvalDepth || defaults.workflows.approvalDepth,
      leaveTypes: parsed.workflows.leaveTypes.length ? parsed.workflows.leaveTypes : defaults.workflows.leaveTypes,
      primaryLanguage: parsed.workflows.primaryLanguage || defaults.workflows.primaryLanguage,
      reportingLevels: parsed.structure.reportingLevels || 2,
    };
    const labels = defaults.labels || {};

    const usernameBase = org.primaryEmail.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "admin";
    let username = usernameBase;
    let i = 1;
    while (await runAsPlatform(async () => prisma.user.findUnique({ where: { username } }))) {
      username = `${usernameBase}${i++}`;
    }

    const passwordHash = await bcrypt.hash(parsed.admin.password, 12);
    const result = await runAsPlatform(async () =>
      prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug,
            name: org.displayName,
            legalName: org.legalName,
            type: org.type,
            country: org.country,
            primaryEmail: org.primaryEmail,
            status: "TRIAL",
            onboardingComplete: false,
            subscriptionPlanId: plan?.id || null,
            industryType: org.industryType,
            orgSize: org.orgSize,
            primaryMarket: org.primaryMarket,
            fiscalYearStart: org.fiscalYearStart,
            currency: org.currency,
            languages: org.languages,
            timezone: "Africa/Addis_Ababa",
            defaultTimezone: "Africa/Addis_Ababa",
            enabledModules: modules,
            profile: { organization: org, structure: parsed.structure, modules, workflows } as any,
          },
        });
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            username,
            passwordHash,
            firstName: parsed.admin.firstName,
            lastName: parsed.admin.lastName,
            email: parsed.admin.email,
            role: "admin",
            isTenantAdmin: true,
            isPlatformAdmin: false,
          } as any,
        });
        const settingsRows = [
          { key: "onboarding.departments", value: departments },
          { key: "onboarding.roles", value: defaults.roles },
          { key: "onboarding.defaultModules", value: modules },
          { key: "onboarding.approvalChain", value: Array.from({ length: workflows.approvalDepth }, (_, idx) => ({ level: idx + 1 })) },
          { key: "onboarding.workflows", value: workflows },
          { key: "onboarding.labels", value: labels },
          { key: "branding.primaryColor", value: "#0B2545" },
          { key: "branding.secondaryColor", value: "#C9A227" },
          { key: "branding.orgName", value: org.displayName },
          { key: "branding.orgNameAm", value: "" },
          { key: "branding.logoUrl", value: "" },
          { key: "branding.faviconUrl", value: "" },
        ];
        for (const s of settingsRows) {
          await tx.tenantSetting.create({ data: { tenantId: tenant.id, key: s.key, value: s.value as any } });
        }
        return { tenant, user };
      }),
    );

    await runAsPlatform(async () => logAudit("TENANT", "TENANT_REGISTERED", result.user.username, { tenantId: result.tenant.id, slug: result.tenant.slug }));

    res.status(201).json({
      tenantId: result.tenant.id,
      slug: result.tenant.slug,
      loginUrl: `/org/${result.tenant.slug}/login`,
      onboardingUrl: `/org/${result.tenant.slug}/onboarding`,
      adminUsername: result.user.username,
    });
  } catch (e: any) {
    console.error("[portals/register] failed", e?.message, e);
    res.status(500).json({ message: "Failed to register organization" });
  }
});

// Onboarding (C6)
router.get("/onboarding/:tenantSlug", async (req, res) => {
  try {
    const tenant = await findTenantBySlug(req.params.tenantSlug);
    if (!tenant) return res.status(404).json({ message: "Organization not found" });
    const settings = await runAsPlatform(async () => prisma.tenantSetting.findMany({ where: { tenantId: tenant.id } }));
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, onboardingComplete: tenant.onboardingComplete, industryType: tenant.industryType, orgSize: tenant.orgSize },
      onboarding: {
        departments: map["onboarding.departments"] || [],
        roles: map["onboarding.roles"] || [],
        defaultModules: map["onboarding.defaultModules"] || [],
        workflows: map["onboarding.workflows"] || {},
        labels: map["onboarding.labels"] || {},
        branding: {
          primaryColor: map["branding.primaryColor"] || "#0B2545",
          secondaryColor: map["branding.secondaryColor"] || "#C9A227",
          logoUrl: map["branding.logoUrl"] || "",
          orgName: map["branding.orgName"] || tenant.name,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load onboarding state" });
  }
});

router.post("/onboarding/:tenantSlug/step/:step", async (req, res) => {
  try {
    const tenant = await findTenantBySlug(req.params.tenantSlug);
    if (!tenant) return res.status(404).json({ message: "Organization not found" });
    const step = String(req.params.step);
    const body = req.body || {};
    if (step === "1") {
      if (Array.isArray(body.departments)) await upsertSetting(tenant.id, "onboarding.departments", body.departments);
      if (Array.isArray(body.roles)) await upsertSetting(tenant.id, "onboarding.roles", body.roles);
      if (Array.isArray(body.modules)) {
        await upsertSetting(tenant.id, "onboarding.defaultModules", body.modules);
        await runAsPlatform(async () => prisma.tenant.update({ where: { id: tenant.id }, data: { enabledModules: body.modules } }));
      }
      if (body.workflows) await upsertSetting(tenant.id, "onboarding.workflows", body.workflows);
    } else if (step === "2") {
      if (body.primaryColor) await upsertSetting(tenant.id, "branding.primaryColor", body.primaryColor);
      if (body.secondaryColor) await upsertSetting(tenant.id, "branding.secondaryColor", body.secondaryColor);
      if (body.logoUrl !== undefined) await upsertSetting(tenant.id, "branding.logoUrl", body.logoUrl);
      if (body.orgName) await upsertSetting(tenant.id, "branding.orgName", body.orgName);
    } else if (step === "3") {
      // invites are optional; store for reference
      if (Array.isArray(body.invites)) await upsertSetting(tenant.id, "onboarding.invites", body.invites);
    }
    res.json({ ok: true, step });
  } catch (e) {
    res.status(500).json({ message: "Failed to save onboarding step" });
  }
});

router.post("/onboarding/:tenantSlug/complete", async (req, res) => {
  try {
    const tenant = await findTenantBySlug(req.params.tenantSlug);
    if (!tenant) return res.status(404).json({ message: "Organization not found" });
    await runAsPlatform(async () => prisma.tenant.update({ where: { id: tenant.id }, data: { onboardingComplete: true } }));
    res.json({ ok: true, onboardingComplete: true });
  } catch (e) {
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
});

// ---------------- Platform admin APIs (C5/C8) ----------------
const platform = Router();
platform.use(requireAuth, requirePlatformAdmin);

platform.get("/metrics", async (_req, res) => {
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const tenants = await runAsPlatform(async () => prisma.tenant.findMany({ include: { subscriptionPlan: true } }));
    const active = tenants.filter(t => t.status === "ACTIVE").length;
    const trials = tenants.filter(t => t.status === "TRIAL").length;
    const mrr = tenants.filter(t => t.status === "ACTIVE").reduce((sum, t) => sum + (t.subscriptionPlan?.priceMonthly || 0), 0);
    const signups30 = tenants.filter(t => t.createdAt >= in30).length;
    const byIndustry: Record<string, number> = {};
    const byPlan: Record<string, number> = {};
    for (const t of tenants) {
      const ind = t.industryType || "unknown";
      byIndustry[ind] = (byIndustry[ind] || 0) + 1;
      const p = t.subscriptionPlan?.code || "none";
      byPlan[p] = (byPlan[p] || 0) + 1;
    }
    const recentAudits = await runAsPlatform(async () => prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 20 }));
    res.json({
      totals: { tenants: tenants.length, active, trials, mrr, signups30d: signups30, churn30d: 0 },
      charts: { tenantsByIndustry: byIndustry, tenantsByPlan: byPlan },
      recentActivity: recentAudits.map(a => ({ id: String(a.id), timestamp: a.timestamp, action: a.action, user: a.user, tenantId: a.tenantId, details: a.details })),
    });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to load platform metrics", error: e?.message });
  }
});

platform.get("/tenants", async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const plan = String(req.query.plan || "").trim();
    const industry = String(req.query.industry || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"), 10) || 20));
    let tenants = await runAsPlatform(async () => prisma.tenant.findMany({ include: { subscriptionPlan: true, _count: { select: { users: true } } }, orderBy: { createdAt: "desc" } }));
    if (status && status !== "all") tenants = tenants.filter(t => t.status === status.toUpperCase());
    if (plan) tenants = tenants.filter(t => (t.subscriptionPlan?.code || "") === plan);
    if (industry) tenants = tenants.filter(t => (t.industryType || "") === industry);
    if (search) tenants = tenants.filter(t => [t.name, t.slug, t.primaryEmail].some(v => String(v || "").toLowerCase().includes(search)));
    const total = tenants.length;
    const items = tenants.slice((page - 1) * pageSize, page * pageSize).map(t => ({
      id: t.id, name: t.name, slug: t.slug, type: t.type, industryType: t.industryType, status: t.status,
      plan: t.subscriptionPlan?.code || null, mrr: t.status === "ACTIVE" ? (t.subscriptionPlan?.priceMonthly || 0) : 0,
      users: t._count.users, createdAt: t.createdAt, isFirstTenant: t.slug === "ethio-biopharma",
    }));
    res.json({ items, total, page, pageSize });
  } catch (e) {
    res.status(500).json({ message: "Failed to load tenants" });
  }
});

platform.get("/tenants/:id", async (req, res) => {
  try {
    const tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: req.params.id }, include: { subscriptionPlan: true, settings: true, users: { select: { id: true, username: true, email: true, role: true, lastLogin: true, isTenantAdmin: true } }, _count: { select: { users: true } } } }));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    const audits = await runAsPlatform(async () => prisma.auditLog.findMany({ where: { tenantId: tenant.id }, orderBy: { timestamp: "desc" }, take: 50 }));
    const map = Object.fromEntries(tenant.settings.map(s => [s.key, s.value]));
    res.json({
      ...tenant,
      isFirstTenant: tenant.slug === "ethio-biopharma",
      onboarding: {
        departments: map["onboarding.departments"] || [],
        roles: map["onboarding.roles"] || [],
        defaultModules: map["onboarding.defaultModules"] || [],
        workflows: map["onboarding.workflows"] || {},
        labels: map["onboarding.labels"] || {},
      },
      branding: {
        primaryColor: map["branding.primaryColor"], secondaryColor: map["branding.secondaryColor"], logoUrl: map["branding.logoUrl"], orgName: map["branding.orgName"],
      },
      recentAudit: audits.map(a => ({ id: String(a.id), timestamp: a.timestamp, action: a.action, user: a.user, details: a.details })),
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load tenant" });
  }
});

platform.put("/tenants/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: req.params.id } }));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.slug === "ethio-biopharma" && b.status && ["SUSPENDED", "CANCELLED"].includes(b.status)) {
      return res.status(400).json({ message: "First tenant cannot be suspended or cancelled" });
    }
    const data: any = {};
    if (b.status) data.status = String(b.status).toUpperCase();
    if (b.subscriptionPlanId !== undefined) data.subscriptionPlanId = b.subscriptionPlanId || null;
    if (b.enabledModules !== undefined) {
      const mods = Array.isArray(b.enabledModules) ? b.enabledModules.map((m: any) => String(m)).filter(Boolean) : [];
      data.enabledModules = Array.from(new Set(mods));
    }
    if (b.name !== undefined) data.name = String(b.name).trim();
    if (b.legalName !== undefined) data.legalName = b.legalName ? String(b.legalName) : null;
    if (b.primaryEmail !== undefined) data.primaryEmail = b.primaryEmail ? String(b.primaryEmail) : null;
    if (b.industryType !== undefined) data.industryType = b.industryType || null;
    if (b.orgSize !== undefined) data.orgSize = b.orgSize || null;
    if (b.trialEndsAt !== undefined) data.trialEndsAt = b.trialEndsAt ? new Date(b.trialEndsAt) : null;
    const updated = await runAsPlatform(async () => prisma.tenant.update({ where: { id: tenant.id }, data, include: { subscriptionPlan: true } }));
    await runAsPlatform(async () => logAudit("PLATFORM", "TENANT_UPDATED", (req as any).user?.username || "platform", { tenantId: tenant.id, changes: Object.keys(data) }));
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to update tenant" });
  }
});

platform.get("/plans", async (_req, res) => {
  try {
    const plans = await runAsPlatform(async () => prisma.subscriptionPlan.findMany({ include: { _count: { select: { tenants: true } } }, orderBy: [{ isActive: "desc" }, { priceMonthly: "asc" }, { createdAt: "asc" }] }));
    res.json({ items: plans });
  } catch (e) {
    res.status(500).json({ message: "Failed to load plans" });
  }
});

platform.post("/plans", async (req: any, res) => {
  try {
    const b = req.body || {};
    const code = String(b.code || "").trim().toUpperCase();
    const name = String(b.name || "").trim();
    if (!code || !name) return res.status(400).json({ message: "code and name are required" });
    const enabledModules = Array.isArray(b.enabledModules) ? Array.from(new Set(b.enabledModules.map((m: any) => String(m)).filter(Boolean))) : [];
    const plan = await runAsPlatform(async () => prisma.subscriptionPlan.create({
      data: {
        code, name,
        description: b.description || null,
        priceMonthly: Number(b.priceMonthly || 0),
        priceYearly: Number(b.priceYearly || 0),
        currency: String(b.currency || "USD"),
        trialDays: Math.max(0, parseInt(String(b.trialDays ?? 14), 10) || 14),
        maxUsers: b.maxUsers == null || b.maxUsers === "" ? null : parseInt(String(b.maxUsers), 10),
        maxStorageGb: b.maxStorageGb == null || b.maxStorageGb === "" ? null : parseInt(String(b.maxStorageGb), 10),
        enabledModules,
        isActive: b.isActive !== false,
      } as any,
    }));
    await runAsPlatform(async () => logAudit("PLATFORM", "PLAN_CREATED", req.user?.username || "platform", { planId: plan.id, code: plan.code }));
    res.status(201).json(plan);
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ message: "Plan code already exists" });
    res.status(500).json({ message: e?.message || "Failed to create plan" });
  }
});

platform.put("/plans/:id", async (req: any, res) => {
  try {
    const b = req.body || {};
    const existing = await runAsPlatform(async () => prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } }));
    if (!existing) return res.status(404).json({ message: "Plan not found" });
    const data: any = {};
    if (b.code !== undefined) data.code = String(b.code).trim().toUpperCase();
    if (b.name !== undefined) data.name = String(b.name).trim();
    if (b.description !== undefined) data.description = b.description || null;
    if (b.priceMonthly !== undefined) data.priceMonthly = Number(b.priceMonthly || 0);
    if (b.priceYearly !== undefined) data.priceYearly = Number(b.priceYearly || 0);
    if (b.currency !== undefined) data.currency = String(b.currency || "USD");
    if (b.trialDays !== undefined) data.trialDays = Math.max(0, parseInt(String(b.trialDays), 10) || 0);
    if (b.maxUsers !== undefined) data.maxUsers = b.maxUsers == null || b.maxUsers === "" ? null : parseInt(String(b.maxUsers), 10);
    if (b.maxStorageGb !== undefined) data.maxStorageGb = b.maxStorageGb == null || b.maxStorageGb === "" ? null : parseInt(String(b.maxStorageGb), 10);
    if (b.enabledModules !== undefined) data.enabledModules = Array.isArray(b.enabledModules) ? Array.from(new Set(b.enabledModules.map((m: any) => String(m)).filter(Boolean))) : [];
    if (b.isActive !== undefined) data.isActive = !!b.isActive;
    const plan = await runAsPlatform(async () => prisma.subscriptionPlan.update({ where: { id: req.params.id }, data }));
    await runAsPlatform(async () => logAudit("PLATFORM", "PLAN_UPDATED", req.user?.username || "platform", { planId: plan.id, changes: Object.keys(data) }));
    res.json(plan);
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ message: "Plan code already exists" });
    res.status(500).json({ message: e?.message || "Failed to update plan" });
  }
});

platform.delete("/plans/:id", async (req: any, res) => {
  try {
    const plan = await runAsPlatform(async () => prisma.subscriptionPlan.findUnique({ where: { id: req.params.id }, include: { _count: { select: { tenants: true } } } }));
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    if (plan._count.tenants > 0) {
      const updated = await runAsPlatform(async () => prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { isActive: false } }));
      return res.json({ ok: true, deactivated: true, plan: updated, message: "Plan is assigned to tenants; it was deactivated instead of deleted." });
    }
    await runAsPlatform(async () => prisma.subscriptionPlan.delete({ where: { id: plan.id } }));
    await runAsPlatform(async () => logAudit("PLATFORM", "PLAN_DELETED", req.user?.username || "platform", { planId: plan.id, code: plan.code }));
    res.json({ ok: true, deleted: true });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to delete plan" });
  }
});

platform.post("/tenants/:id/suspend", async (req, res) => {
  try {
    const tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: req.params.id } }));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.slug === "ethio-biopharma") return res.status(400).json({ message: "First tenant cannot be suspended" });
    const updated = await runAsPlatform(async () => prisma.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENDED" } }));
    await runAsPlatform(async () => logAudit("PLATFORM", "TENANT_SUSPENDED", (req as any).user?.username || "platform", { tenantId: tenant.id }));
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Failed to suspend tenant" });
  }
});

platform.delete("/tenants/:id", async (req, res) => {
  try {
    const tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: req.params.id } }));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.slug === "ethio-biopharma") return res.status(400).json({ message: "First tenant cannot be deleted" });
    const updated = await runAsPlatform(async () => prisma.tenant.update({ where: { id: tenant.id }, data: { status: "CANCELLED" } }));
    await runAsPlatform(async () => logAudit("PLATFORM", "TENANT_SOFT_DELETED", (req as any).user?.username || "platform", { tenantId: tenant.id, graceDays: 30 }));
    res.json({ ok: true, status: updated.status, graceDays: 30 });
  } catch (e) {
    res.status(500).json({ message: "Failed to delete tenant" });
  }
});

platform.post("/tenants/:id/impersonate", async (req: any, res) => {
  try {
    const tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: req.params.id } }));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    const adminUser = req.user;
    const dbUser = await runAsPlatform(async () => prisma.user.findUnique({ where: { id: adminUser.sub } }));
    if (!dbUser) return res.status(404).json({ message: "User not found" });
    const token = signToken({
      sub: dbUser.id,
      username: dbUser.username,
      role: dbUser.role || "admin",
      position: dbUser.position || null,
      tenantId: tenant.id,
      tokenVersion: dbUser.tokenVersion ?? 0,
      isPlatformAdmin: true,
      impersonatingTenantId: tenant.id,
      impersonatedBy: dbUser.id,
      impersonatedByUsername: dbUser.username,
    } as any, { expiresIn: "1h" });
    res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTS, maxAge: 60 * 60 * 1000 });
    setCsrfCookie(res);
    await runAsPlatform(async () => logAudit("PLATFORM", "PLATFORM_IMPERSONATION", adminUser.username || "platform", { tenantId: tenant.id, tenantSlug: tenant.slug, impersonatedBy: adminUser.sub, reason: req.body?.reason || null, expiresInMinutes: 60 }));
    res.json({ token, tenantId: tenant.id, slug: tenant.slug, name: tenant.name, expiresInMinutes: 60, impersonating: true });
  } catch (e) {
    res.status(500).json({ message: "Failed to impersonate tenant" });
  }
});

platform.get("/activity", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize || "50"), 10) || 50));
    const tenantId = String(req.query.tenantId || "").trim();
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    const [items, total] = await runAsPlatform(async () => Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { timestamp: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]));
    res.json({ items: items.map(a => ({ id: String(a.id), timestamp: a.timestamp, action: a.action, user: a.user, tenantId: a.tenantId, details: a.details })), total, page, pageSize });
  } catch (e) {
    res.status(500).json({ message: "Failed to load activity" });
  }
});

platform.get("/revenue", async (_req, res) => {
  try {
    const tenants = await runAsPlatform(async () => prisma.tenant.findMany({ include: { subscriptionPlan: true } }));
    const active = tenants.filter(t => t.status === "ACTIVE");
    const mrr = active.reduce((s, t) => s + (t.subscriptionPlan?.priceMonthly || 0), 0);
    const byPlan: Record<string, number> = {};
    for (const t of active) {
      const k = t.subscriptionPlan?.code || "none";
      byPlan[k] = (byPlan[k] || 0) + (t.subscriptionPlan?.priceMonthly || 0);
    }
    res.json({ mrr, arpu: active.length ? mrr / active.length : 0, churnRate: 0, byPlan, topTenants: active.slice(0, 10).map(t => ({ id: t.id, name: t.name, slug: t.slug, mrr: t.subscriptionPlan?.priceMonthly || 0 })) });
  } catch (e) {
    res.status(500).json({ message: "Failed to load revenue" });
  }
});

platform.get("/support/flags", async (_req, res) => {
  try {
    const now = new Date();
    const tenants = await runAsPlatform(async () => prisma.tenant.findMany({ include: { users: { select: { lastLogin: true } }, subscriptionPlan: true } }));
    const flags: any[] = [];
    for (const t of tenants) {
      const daysSinceCreated = (now.getTime() - t.createdAt.getTime()) / 86400000;
      const lastLogin = t.users.map(u => u.lastLogin).filter(Boolean).sort((a: any, b: any) => b.getTime() - a.getTime())[0] as Date | undefined;
      if (t.status === "PAST_DUE") flags.push({ tenantId: t.id, name: t.name, slug: t.slug, reason: "PAST_DUE", severity: "high" });
      if (t.status === "TRIAL" && t.trialEndsAt && (t.trialEndsAt.getTime() - now.getTime()) / 86400000 < 3) flags.push({ tenantId: t.id, name: t.name, slug: t.slug, reason: "TRIAL_ENDING", severity: "medium" });
      if (!t.onboardingComplete && daysSinceCreated > 7) flags.push({ tenantId: t.id, name: t.name, slug: t.slug, reason: "ONBOARDING_INCOMPLETE", severity: "medium" });
      if (lastLogin && (now.getTime() - lastLogin.getTime()) / 86400000 > 30) flags.push({ tenantId: t.id, name: t.name, slug: t.slug, reason: "NO_LOGIN_30D", severity: "low" });
    }
    res.json({ items: flags });
  } catch (e) {
    res.status(500).json({ message: "Failed to load support flags" });
  }
});

router.use("/platform", platform);

export default router;
