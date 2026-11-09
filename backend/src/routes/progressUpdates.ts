import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { currentPlans } from "../lib/currentPlans";
import { requireAuth } from "../middleware/auth";

const router = Router();
const ASSIGNABLE = ["ACTIVITY", "MILESTONE", "KPI", "OBJECTIVE", "STRATEGY", "GOAL"];

const updateSchema = z.object({
  itemId: z.string().min(1),
  periodLabel: z.string().trim().max(40).optional(),
  progress: z.coerce.number().min(0).max(100),
  summary: z.string().trim().min(3).max(4000),
  achievements: z.string().trim().max(4000).optional().nullable(),
  challenges: z.string().trim().max(4000).optional().nullable(),
  nextSteps: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(["Draft", "Submitted", "Reviewed", "Verified"]).optional(),
});

/** Verification is owned by Strategy & Planning; admins and the CEO retain override. */
const canVerify = (user?: { role?: string; position?: string | null }) =>
  user?.role === "admin" ||
  user?.role === "executive" ||
  user?.position === "Strategy and Planning Officer";

const isVerified = (status?: string | null) => status === "Verified" || status === "Reviewed";

/** Stable, human-readable index such as PU-0017 for report cross-references. */
async function nextReference() {
  const latest = await prisma.progressUpdate.findFirst({
    where: { reference: { not: null } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const number = Number(latest?.reference?.replace(/\D/g, "") || 0) + 1;
  return `PU-${String(number).padStart(4, "0")}`;
}

function currentPeriodLabel() {
  return new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
}

/**
 * Assignable work items with their owner, baseline progress and the latest
 * update. Task owners use this to find what they are accountable for.
 */
router.get("/targets", requireAuth, async (req: any, res, next) => {
  try {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const planId = typeof req.query.planId === "string" ? req.query.planId : undefined;
    const mine = req.query.mine === "true";

    // Follow the current period of each plan level. A rollover into a new
    // active period changes this list automatically.
    const current = await currentPlans();
    const planIds = planId
      ? [planId]
      : type
      ? [(current as Record<string, { id: string } | undefined>)[type]?.id].filter((id): id is string => Boolean(id))
      : Object.values(current)
          .map((plan) => plan?.id)
          .filter((id): id is string => Boolean(id));

    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, type: true, title: true, periodLabel: true, status: true, periodId: true },
      orderBy: [{ type: "asc" }],
    });
    const currentIds = new Set(Object.values(current).map((plan) => plan?.id).filter(Boolean) as string[]);

    const items = await prisma.planItem.findMany({
      where: {
        planId: { in: plans.map((plan) => plan.id) },
        kind: { in: ASSIGNABLE },
      },
      include: {
        progressUpdates: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            reference: true,
            periodId: true,
            periodLabel: true,
            progress: true,
            status: true,
            summary: true,
            authorName: true,
            reviewedBy: true,
            reviewedAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    const planById = new Map(plans.map((plan) => [plan.id, plan]));
    const me = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { username: true, firstName: true, lastName: true },
    });
    const candidates = [
      me?.username,
      [me?.firstName, me?.lastName].filter(Boolean).join(" "),
      me?.firstName,
      me?.lastName,
    ].filter((value): value is string => Boolean(value && value.trim()));
    const privileged = canVerify(req.user);
    const ownsItem = (owner?: string | null) =>
      !owner || candidates.some((name) => owner.toLowerCase().includes(name.toLowerCase()));

    const rows = items
      .map((item) => {
        const plan = planById.get(item.planId)!;
        const latest = item.progressUpdates[0] || null;
        const owner = item.owner || plan.title;
        const owns = ownsItem(item.owner);
        return {
          id: item.id,
          title: item.title,
          code: item.code,
          kind: item.kind,
          owner: item.owner,
          status: item.status,
          progress: item.progress,
          unit: item.unit,
          targetValue: item.targetValue,
          currentValue: item.currentValue,
          endDate: item.endDate,
          plan,
          isCurrentPlan: currentIds.has(plan.id),
          latest,
          canUpdate: privileged || owns,
        };
      })
      .filter((row) => (mine ? row.canUpdate : true));

    res.json(rows);
  } catch (e) { next(e); }
});

router.get("/", requireAuth, async (req: any, res, next) => {
  try {
    const planId = typeof req.query.planId === "string" ? req.query.planId : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const mine = req.query.mine === "true";
    const all = req.query.all === "true";
    let planIds: string[] | undefined;
    if (planId) planIds = [planId];
    else if (!all) {
      const current = await currentPlans();
      planIds = Object.values(current)
        .map((plan) => plan?.id)
        .filter((id): id is string => Boolean(id));
    }
    const updates = await prisma.progressUpdate.findMany({
      where: {
        ...(planIds ? { planId: { in: planIds } } : {}),
        ...(mine ? { authorId: req.user!.sub } : {}),
        ...(type ? { plan: { type } } : {}),
      },
      include: {
        item: { select: { title: true, kind: true, code: true, owner: true, status: true } },
        plan: { select: { id: true, type: true, title: true, periodLabel: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    res.json(updates);
  } catch (e) { next(e); }
});

router.post("/", requireAuth, async (req: any, res, next) => {
  try {
    const payload = updateSchema.parse(req.body);
    const item = await prisma.planItem.findUnique({
      where: { id: payload.itemId },
      include: { plan: { select: { id: true, title: true, periodId: true } } },
    });
    if (!item) return res.status(404).json({ message: "Task not found in the plan." });

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { firstName: true, lastName: true, username: true },
    });
    const authorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || req.user.username;
    const candidates = [
      user?.username,
      authorName,
      user?.firstName,
      user?.lastName,
    ].filter((value): value is string => Boolean(value && value.trim()));
    const owns =
      !item.owner || candidates.some((name) => item.owner!.toLowerCase().includes(name.toLowerCase()));
    const verifier = canVerify(req.user);
    if (!owns && !verifier) {
      return res.status(403).json({ message: `This task is owned by ${item.owner}. Only its owner or the Strategy and Planning Officer can update it.` });
    }

    if (isVerified(payload.status) && !verifier) {
      return res.status(403).json({ message: "Only the Strategy and Planning Officer can verify an update." });
    }

    const periodLabel = payload.periodLabel || currentPeriodLabel();
    const existing = await prisma.progressUpdate.findUnique({
      where: { itemId_periodLabel: { itemId: item.id, periodLabel } },
      select: { id: true, reference: true, status: true },
    });
    // Editing a verified submission sends it back for verification, unless the
    // Strategy and Planning Officer is the person making the change.
    const status =
      existing && isVerified(existing.status) && !verifier && !payload.status
        ? "Submitted"
        : payload.status || "Submitted";
    const reference = existing?.reference || (await nextReference());
    const saved = await prisma.progressUpdate.upsert({
      where: { itemId_periodLabel: { itemId: item.id, periodLabel } },
      create: {
        reference,
        planId: item.planId,
        periodId: item.plan.periodId,
        itemId: item.id,
        periodLabel,
        authorId: req.user.sub,
        authorName,
        progress: Math.round(payload.progress),
        status,
        summary: payload.summary,
        achievements: payload.achievements || null,
        challenges: payload.challenges || null,
        nextSteps: payload.nextSteps || null,
        ...(isVerified(status) ? { reviewedBy: req.user.username, reviewedAt: new Date() } : {}),
      },
      update: {
        authorId: req.user.sub,
        authorName,
        periodId: item.plan.periodId,
        progress: Math.round(payload.progress),
        status,
        summary: payload.summary,
        achievements: payload.achievements || null,
        challenges: payload.challenges || null,
        nextSteps: payload.nextSteps || null,
        ...(isVerified(status)
          ? { reviewedBy: req.user.username, reviewedAt: new Date() }
          : existing && isVerified(existing.status) && !isVerified(status)
          ? { reviewedBy: null, reviewedAt: null, reviewerNote: null }
          : {}),
      },
    });

    // Keep the plan item's headline number in step with a verified submission.
    if (isVerified(status) && ["ACTIVITY", "MILESTONE"].includes(item.kind)) {
      await prisma.planItem.update({
        where: { id: item.id },
        data: { progress: Math.round(payload.progress) },
      });
    }

    res.status(201).json(saved);
  } catch (e) { next(e); }
});

router.put("/:id", requireAuth, async (req: any, res, next) => {
  try {
    const payload = z
      .object({
        status: z.enum(["Draft", "Submitted", "Reviewed", "Verified"]).optional(),
        reviewerNote: z.string().trim().max(2000).optional().nullable(),
        progress: z.coerce.number().min(0).max(100).optional(),
      })
      .parse(req.body);

    const existing = await prisma.progressUpdate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Progress update not found." });

    const verifier = canVerify(req.user);
    if (isVerified(payload.status) && !verifier) {
      return res.status(403).json({ message: "Only the Strategy and Planning Officer can verify an update." });
    }
    if (!verifier && existing.authorId !== req.user.sub) {
      return res.status(403).json({ message: "Only the author or the Strategy and Planning Officer can change this update." });
    }
    if (isVerified(existing.status) && !verifier && payload.status && !isVerified(payload.status)) {
      return res.status(403).json({ message: "A verified update can only be reopened by the Strategy and Planning Officer." });
    }

    const updated = await prisma.progressUpdate.update({
      where: { id: existing.id },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.progress !== undefined ? { progress: Math.round(payload.progress) } : {}),
        ...(payload.reviewerNote !== undefined ? { reviewerNote: payload.reviewerNote || null } : {}),
        ...(isVerified(payload.status)
          ? { reviewedBy: req.user.username, reviewedAt: new Date() }
          : payload.status && !isVerified(payload.status)
          ? { reviewedBy: null, reviewedAt: null }
          : {}),
      },
    });

    if (isVerified(payload.status)) {
      await prisma.planItem.update({
        where: { id: existing.itemId },
        data: { progress: updated.progress },
      });
    }
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/:id", requireAuth, async (req: any, res, next) => {
  try {
    const existing = await prisma.progressUpdate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Progress update not found." });
    if (!canVerify(req.user) && existing.authorId !== req.user.sub) {
      return res.status(403).json({ message: "Only the author or the Strategy and Planning Officer can delete this update." });
    }
    await prisma.progressUpdate.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
