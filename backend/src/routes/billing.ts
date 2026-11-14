import { Router } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import { prisma } from "../lib/prisma";
import { runAsPlatform } from "../lib/tenantContext";
import { logAudit } from "../lib/audit";

const router = Router();

const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Billing/subscription management stubs.
 * Integrate with a provider (e.g. Stripe) by implementing the TODOs below:
 * - create checkout/billing portal sessions
 * - handle webhooks (invoice.paid, customer.subscription.updated/deleted, payment_failed)
 * - sync subscriptionPlan/tenant status and enforce usage limits server-side
 */

// Current tenant subscription summary
router.get("/subscription", requireAuth, async (req: any, res) => {
  try {
    const tenant = await runAsPlatform(async () =>
      prisma.tenant.findUnique({ where: { id: req.user.tenantId }, include: { subscriptionPlan: true } }),
    );
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json({
      tenantId: tenant.id,
      status: tenant.status,
      plan: tenant.subscriptionPlan ? { code: tenant.subscriptionPlan.code, name: tenant.subscriptionPlan.name, priceMonthly: tenant.subscriptionPlan.priceMonthly, currency: tenant.subscriptionPlan.currency, enabledModules: tenant.subscriptionPlan.enabledModules, maxUsers: tenant.subscriptionPlan.maxUsers, maxStorageGb: tenant.subscriptionPlan.maxStorageGb } : null,
      trialEndsAt: tenant.trialEndsAt,
      billingProvider: "not_configured",
    });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to load subscription" });
  }
});

// Platform: set tenant plan/status (manual/admin or webhook-sync hook)
router.post("/admin/tenants/:id/subscription", requireAuth, requirePlatformAdmin, async (req: any, res) => {
  try {
    const { subscriptionPlanId, status } = req.body || {};
    const tenant = await runAsPlatform(async () => prisma.tenant.findUnique({ where: { id: req.params.id } }));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.slug === "ethio-biopharma" && status && ["SUSPENDED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ message: "First tenant cannot be suspended/cancelled" });
    }
    const data: any = {};
    if (subscriptionPlanId !== undefined) data.subscriptionPlanId = subscriptionPlanId || null;
    if (status) data.status = status;
    const updated = await runAsPlatform(async () => prisma.tenant.update({ where: { id: tenant.id }, data, include: { subscriptionPlan: true } }));
    await runAsPlatform(async () => logAudit("BILLING", "TENANT_SUBSCRIPTION_UPDATED", req.user?.username || "platform", { tenantId: tenant.id, ...data }));
    res.json({ ok: true, tenant: { id: updated.id, status: updated.status, subscriptionPlanId: updated.subscriptionPlanId, plan: updated.subscriptionPlan?.code || null } });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to update subscription" });
  }
});

// Webhook receiver (provider-agnostic). Verifies HMAC signature when BILLING_WEBHOOK_SECRET is set.
// For Stripe, configure a raw-body parser for this route and verify Stripe-Signature per Stripe docs.
router.post("/webhook", webhookLimiter, async (req, res) => {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  if (secret) {
    const sig = String(req.headers["x-billing-signature"] || req.headers["stripe-signature"] || "");
    const payload = JSON.stringify(req.body || {});
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const ok = sig && expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    if (!ok) {
      console.warn("[billing] webhook signature verification failed");
      return res.status(400).json({ received: false, error: "invalid_signature" });
    }
  }
  const event = req.body || {};
  // TODO: map provider events (checkout/session completed, invoice.paid, subscription.updated/deleted, payment_failed)
  // to tenant plan/status updates via prisma + logAudit("BILLING", ...).
  console.log("[billing] webhook received", { type: event.type || "unknown", verified: Boolean(secret) });
  res.json({ received: true, handled: false, verified: Boolean(secret), note: secret ? "Signature verified; event handling not yet mapped" : "BILLING_WEBHOOK_SECRET not configured" });
});

export default router;
