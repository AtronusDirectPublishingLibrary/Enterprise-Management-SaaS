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

const CATEGORIES = ["Product", "Process", "Equipment", "Document", "Supplier", "Other"] as const;
const SEVERITIES = ["Critical", "Major", "Minor"] as const;
const SOURCES = ["Internal", "Audit", "Complaint", "Supplier", "Regulatory", "Customer"] as const;

const createSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters"),
  description: z.string().trim().min(10, "Describe what happened"),
  category: z.enum(CATEGORIES).default("Process"),
  severity: z.enum(SEVERITIES).default("Minor"),
  source: z.enum(SOURCES).default("Internal"),
  department: z.enum(QMS_DEPARTMENT_VALUES).optional().nullable(),
  detectedAt: z.coerce.date().optional(),
  ownerId: z.string().min(1).optional(),
  immediateAction: z.string().trim().max(4000).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  rootCause: z.string().trim().max(5000).optional().nullable(),
  investigation: z.string().trim().max(10000).optional().nullable(),
  closureNotes: z.string().trim().max(5000).optional().nullable(),
});

const closeSchema = z.object({
  rootCause: z.string().trim().min(5, "Record the root cause"),
  investigation: z.string().trim().min(10, "Summarise the investigation"),
  closureNotes: z.string().trim().min(5, "Record the closure decision"),
});

function canManage(document: { ownerId: string }, user: any) {
  return document.ownerId === user?.sub || isQmsApprover(user);
}

function personSelect() {
  return {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    position: true,
  };
}

router.get("/", async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.severity) where.severity = String(req.query.severity);
    if (req.query.department) where.department = String(req.query.department);
    const search = String(req.query.search || "").trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total, open, investigating, closed, criticalOpen] = await prisma.$transaction([
      prisma.qmsDeviation.findMany({
        where,
        include: { owner: { select: personSelect() }, reportedBy: { select: personSelect() } },
        orderBy: { updatedAt: "desc" },
        take: 500,
      }),
      prisma.qmsDeviation.count(),
      prisma.qmsDeviation.count({ where: { status: "OPEN" } }),
      prisma.qmsDeviation.count({ where: { status: "UNDER_INVESTIGATION" } }),
      prisma.qmsDeviation.count({ where: { status: "CLOSED" } }),
      prisma.qmsDeviation.count({ where: { status: { not: "CLOSED" }, severity: "Critical" } }),
    ]);

    res.json({
      items,
      summary: { total, open, investigating, closed, criticalOpen },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch deviations" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.qmsDeviation.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: personSelect() },
        reportedBy: { select: personSelect() },
        closedBy: { select: personSelect() },
        capas: {
          select: { id: true, code: true, title: true, status: true, dueAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!item) return res.status(404).json({ error: "Deviation not found" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to fetch deviation" });
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

    const prefix = qmsCodePrefix("DEV", data.department);
    const last = await prisma.qmsDeviation.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const code = qmsNextCode(prefix, last?.code);

    const created = await prisma.qmsDeviation.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        source: data.source,
        department: data.department ?? null,
        detectedAt: data.detectedAt ?? new Date(),
        reportedById: req.user.sub,
        ownerId,
        immediateAction: data.immediateAction ?? null,
        dueAt: data.dueAt ?? null,
      },
      include: { owner: { select: personSelect() } },
    });

    await logAudit("QMS", "QMS_DEVIATION_CREATED", qmsActor(req.user), {
      deviationId: created.id,
      code: created.code,
      severity: created.severity,
      category: created.category,
      title: created.title,
    });

    if (created.severity === "Critical") {
      await notifyQmsApprovers(
        `Critical deviation reported: ${created.code}`,
        `${created.title} requires immediate QA review.`,
        `/qms/deviations`
      );
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("qms deviation create failed", error);
    res.status(500).json({ error: "Failed to report deviation" });
  }
});

router.put("/:id", async (req: any, res) => {
  try {
    const item = await prisma.qmsDeviation.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Deviation not found" });
    if (item.status === "CLOSED") return res.status(409).json({ error: "A closed deviation is read-only" });
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may edit this deviation" });
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

    const updated = await prisma.qmsDeviation.update({
      where: { id: item.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.department !== undefined && { department: data.department ?? null }),
        ...(data.detectedAt !== undefined && { detectedAt: data.detectedAt }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
        ...(data.immediateAction !== undefined && { immediateAction: data.immediateAction ?? null }),
        ...(data.dueAt !== undefined && { dueAt: data.dueAt ?? null }),
        ...(data.rootCause !== undefined && { rootCause: data.rootCause ?? null }),
        ...(data.investigation !== undefined && { investigation: data.investigation ?? null }),
        ...(data.closureNotes !== undefined && { closureNotes: data.closureNotes ?? null }),
      },
    });

    await logAudit("QMS", "QMS_DEVIATION_UPDATED", qmsActor(req.user), {
      deviationId: updated.id,
      code: updated.code,
      fields: Object.keys(data),
    });

    res.json(updated);
  } catch (error) {
    console.error("qms deviation update failed", error);
    res.status(500).json({ error: "Failed to update deviation" });
  }
});

router.post("/:id/investigate", async (req: any, res) => {
  try {
    const item = await prisma.qmsDeviation.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Deviation not found" });
    if (item.status !== "OPEN") {
      return res.status(409).json({ error: `Deviation is ${item.status}, not OPEN` });
    }
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may start the investigation" });
    }

    const updated = await prisma.qmsDeviation.update({
      where: { id: item.id },
      data: { status: "UNDER_INVESTIGATION" },
    });

    await logAudit("QMS", "QMS_DEVIATION_INVESTIGATION_STARTED", qmsActor(req.user), {
      deviationId: updated.id,
      code: updated.code,
    });

    res.json(updated);
  } catch (error) {
    console.error("qms deviation investigate failed", error);
    res.status(500).json({ error: "Failed to start investigation" });
  }
});

router.post("/:id/close", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may close a deviation" });
    }
    const item = await prisma.qmsDeviation.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Deviation not found" });
    if (item.status !== "UNDER_INVESTIGATION") {
      return res.status(409).json({ error: `Deviation is ${item.status}, not UNDER_INVESTIGATION` });
    }
    const parsed = closeSchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const updated = await prisma.qmsDeviation.update({
      where: { id: item.id },
      data: {
        status: "CLOSED",
        rootCause: parsed.data.rootCause,
        investigation: parsed.data.investigation,
        closureNotes: parsed.data.closureNotes,
        closedById: req.user.sub,
        closedAt: new Date(),
      },
    });

    await logAudit("QMS", "QMS_DEVIATION_CLOSED", qmsActor(req.user), {
      deviationId: updated.id,
      code: updated.code,
      severity: updated.severity,
    });

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerId },
      select: { username: true },
    });
    await notifyQmsUser(
      owner?.username,
      `Deviation closed: ${updated.code}`,
      `${updated.title} has been investigated and closed.`,
      "/qms/deviations"
    );

    res.json(updated);
  } catch (error) {
    console.error("qms deviation close failed", error);
    res.status(500).json({ error: "Failed to close deviation" });
  }
});

export default router;
