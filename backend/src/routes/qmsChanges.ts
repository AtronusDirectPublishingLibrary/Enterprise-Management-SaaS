import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { isQmsApprover } from "../lib/access";
import {
  QMS_DEPARTMENT_VALUES,
  notifyQmsApprovers,
  notifyQmsUser,
  qmsActor,
  qmsCleanBody,
  qmsCodePrefix,
  qmsNextCode,
} from "../lib/qmsWorkflow";

const router = Router();

const CATEGORIES = ["Document", "Process", "Equipment", "Facility", "System", "Supplier"] as const;
const RISK_LEVELS = ["High", "Medium", "Low"] as const;

const createSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters"),
  description: z.string().trim().min(10, "Describe the proposed change"),
  reason: z.string().trim().min(5, "Explain why the change is needed"),
  category: z.enum(CATEGORIES).default("Process"),
  riskLevel: z.enum(RISK_LEVELS).default("Medium"),
  department: z.enum(QMS_DEPARTMENT_VALUES).optional().nullable(),
  ownerId: z.string().min(1).optional(),
  impactAssessment: z.string().trim().max(10000).optional().nullable(),
  implementationPlan: z.string().trim().max(10000).optional().nullable(),
  effectiveDate: z.coerce.date().optional().nullable(),
  relatedDocument: z.string().trim().max(300).optional().nullable(),
});

const updateSchema = createSchema.partial();

const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason for rejection"),
});

const closeSchema = z.object({
  closureNotes: z.string().trim().min(5, "Record the implementation outcome"),
});

function canManage(change: { ownerId: string }, user: any) {
  return change.ownerId === user?.sub || isQmsApprover(user);
}

function personSelect() {
  return { id: true, firstName: true, lastName: true, username: true, position: true };
}

router.get("/", async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.riskLevel) where.riskLevel = String(req.query.riskLevel);
    if (req.query.department) where.department = String(req.query.department);
    const search = String(req.query.search || "").trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { relatedDocument: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total, draft, inReview, approved, implemented, closed, rejected] =
      await prisma.$transaction([
        prisma.qmsChangeControl.findMany({
          where,
          include: { owner: { select: personSelect() }, approvedBy: { select: personSelect() } },
          orderBy: { updatedAt: "desc" },
          take: 500,
        }),
        prisma.qmsChangeControl.count(),
        prisma.qmsChangeControl.count({ where: { status: "DRAFT" } }),
        prisma.qmsChangeControl.count({ where: { status: "IN_REVIEW" } }),
        prisma.qmsChangeControl.count({ where: { status: "APPROVED" } }),
        prisma.qmsChangeControl.count({ where: { status: "IMPLEMENTED" } }),
        prisma.qmsChangeControl.count({ where: { status: "CLOSED" } }),
        prisma.qmsChangeControl.count({ where: { status: "REJECTED" } }),
      ]);

    res.json({
      items,
      summary: { total, draft, inReview, approved, implemented, closed, rejected },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch change controls" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.qmsChangeControl.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: personSelect() },
        approvedBy: { select: personSelect() },
      },
    });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to fetch change control" });
  }
});

router.post("/", async (req: any, res) => {
  try {
    const parsed = createSchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const data = parsed.data;
    const ownerId = data.ownerId || req.user.sub;
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
    if (!owner) return res.status(400).json({ error: "The selected owner does not exist" });

    const prefix = qmsCodePrefix("CHG", data.department);
    const last = await prisma.qmsChangeControl.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const code = qmsNextCode(prefix, last?.code);

    const created = await prisma.qmsChangeControl.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        reason: data.reason,
        category: data.category,
        riskLevel: data.riskLevel,
        department: data.department ?? null,
        ownerId,
        impactAssessment: data.impactAssessment ?? null,
        implementationPlan: data.implementationPlan ?? null,
        effectiveDate: data.effectiveDate ?? null,
        relatedDocument: data.relatedDocument ?? null,
      },
      include: { owner: { select: personSelect() } },
    });

    await logAudit("QMS", "QMS_CHANGE_CREATED", qmsActor(req.user), {
      changeId: created.id,
      code: created.code,
      riskLevel: created.riskLevel,
      category: created.category,
      title: created.title,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("qms change create failed", error);
    res.status(500).json({ error: "Failed to create change control" });
  }
});

router.put("/:id", async (req: any, res) => {
  try {
    const item = await prisma.qmsChangeControl.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    if (!["DRAFT", "IN_REVIEW"].includes(item.status)) {
      return res.status(409).json({ error: `A ${item.status} change cannot be edited` });
    }
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may edit this change" });
    }

    const parsed = updateSchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const data = parsed.data;
    if (data.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: data.ownerId }, select: { id: true } });
      if (!owner) return res.status(400).json({ error: "The selected owner does not exist" });
    }

    const updated = await prisma.qmsChangeControl.update({
      where: { id: item.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.riskLevel !== undefined && { riskLevel: data.riskLevel }),
        ...(data.department !== undefined && { department: data.department ?? null }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
        ...(data.impactAssessment !== undefined && { impactAssessment: data.impactAssessment ?? null }),
        ...(data.implementationPlan !== undefined && { implementationPlan: data.implementationPlan ?? null }),
        ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate ?? null }),
        ...(data.relatedDocument !== undefined && { relatedDocument: data.relatedDocument ?? null }),
      },
    });

    await logAudit("QMS", "QMS_CHANGE_UPDATED", qmsActor(req.user), {
      changeId: updated.id,
      code: updated.code,
      fields: Object.keys(data),
    });

    res.json(updated);
  } catch (error) {
    console.error("qms change update failed", error);
    res.status(500).json({ error: "Failed to update change control" });
  }
});

router.post("/:id/submit", async (req: any, res) => {
  try {
    const item = await prisma.qmsChangeControl.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    if (item.ownerId !== req.user.sub) {
      return res.status(403).json({ error: "Only the change owner may submit it for review" });
    }
    if (item.status !== "DRAFT") {
      return res.status(409).json({ error: `Change is ${item.status}, not DRAFT` });
    }

    const updated = await prisma.qmsChangeControl.update({
      where: { id: item.id },
      data: { status: "IN_REVIEW" },
    });

    await logAudit("QMS", "QMS_CHANGE_SUBMITTED", qmsActor(req.user), {
      changeId: updated.id,
      code: updated.code,
    });

    await notifyQmsApprovers(
      `Change control awaiting approval: ${updated.code}`,
      `${updated.title} was submitted for QA review.`,
      "/qms/changes"
    );

    res.json(updated);
  } catch (error) {
    console.error("qms change submit failed", error);
    res.status(500).json({ error: "Failed to submit change control" });
  }
});

router.post("/:id/approve", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may approve a change" });
    }
    const item = await prisma.qmsChangeControl.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    if (item.status !== "IN_REVIEW") {
      return res.status(409).json({ error: `Change is ${item.status}, not IN_REVIEW` });
    }

    const updated = await prisma.qmsChangeControl.update({
      where: { id: item.id },
      data: {
        status: "APPROVED",
        approvedById: req.user.sub,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    await logAudit("QMS", "QMS_CHANGE_APPROVED", qmsActor(req.user), {
      changeId: updated.id,
      code: updated.code,
      riskLevel: updated.riskLevel,
    });

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerId },
      select: { username: true },
    });
    await notifyQmsUser(
      owner?.username,
      `Change approved: ${updated.code}`,
      `${updated.title} is approved for implementation.`,
      "/qms/changes"
    );

    res.json(updated);
  } catch (error) {
    console.error("qms change approve failed", error);
    res.status(500).json({ error: "Failed to approve change" });
  }
});

router.post("/:id/reject", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may reject a change" });
    }
    const item = await prisma.qmsChangeControl.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    if (item.status !== "IN_REVIEW") {
      return res.status(409).json({ error: `Change is ${item.status}, not IN_REVIEW` });
    }
    const parsed = rejectSchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const updated = await prisma.qmsChangeControl.update({
      where: { id: item.id },
      data: {
        status: "DRAFT",
        approvedById: req.user.sub,
        approvedAt: null,
        rejectionReason: parsed.data.reason,
      },
    });

    await logAudit("QMS", "QMS_CHANGE_REJECTED", qmsActor(req.user), {
      changeId: updated.id,
      code: updated.code,
      reason: parsed.data.reason,
    });

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerId },
      select: { username: true },
    });
    await notifyQmsUser(
      owner?.username,
      `Change returned: ${updated.code}`,
      parsed.data.reason,
      "/qms/changes"
    );

    res.json(updated);
  } catch (error) {
    console.error("qms change reject failed", error);
    res.status(500).json({ error: "Failed to reject change" });
  }
});

router.post("/:id/implement", async (req: any, res) => {
  try {
    const item = await prisma.qmsChangeControl.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    if (item.status !== "APPROVED") {
      return res.status(409).json({ error: `Change is ${item.status}, not APPROVED` });
    }
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may record implementation" });
    }

    const updated = await prisma.qmsChangeControl.update({
      where: { id: item.id },
      data: { status: "IMPLEMENTED", implementedAt: new Date() },
    });

    await logAudit("QMS", "QMS_CHANGE_IMPLEMENTED", qmsActor(req.user), {
      changeId: updated.id,
      code: updated.code,
    });

    res.json(updated);
  } catch (error) {
    console.error("qms change implement failed", error);
    res.status(500).json({ error: "Failed to record implementation" });
  }
});

router.post("/:id/close", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may close a change" });
    }
    const item = await prisma.qmsChangeControl.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Change control not found" });
    if (item.status !== "IMPLEMENTED") {
      return res.status(409).json({ error: `Change is ${item.status}, not IMPLEMENTED` });
    }
    const parsed = closeSchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const updated = await prisma.qmsChangeControl.update({
      where: { id: item.id },
      data: {
        status: "CLOSED",
        closureNotes: parsed.data.closureNotes,
        closedAt: new Date(),
      },
    });

    await logAudit("QMS", "QMS_CHANGE_CLOSED", qmsActor(req.user), {
      changeId: updated.id,
      code: updated.code,
    });

    res.json(updated);
  } catch (error) {
    console.error("qms change close failed", error);
    res.status(500).json({ error: "Failed to close change" });
  }
});

export default router;
