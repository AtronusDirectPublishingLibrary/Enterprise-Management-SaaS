import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { isQmsApprover } from "../lib/access";
import {
  QMS_DEPARTMENT_VALUES,
  notifyQmsUser,
  qmsActor,
  qmsCleanBody,
  qmsCodePrefix,
  qmsNextCode,
} from "../lib/qmsWorkflow";

const router = Router();

const TYPES = ["Corrective", "Preventive"] as const;
const SOURCE_TYPES = ["Deviation", "Change", "Audit", "Complaint", "Other"] as const;

const createSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters"),
  type: z.enum(TYPES).default("Corrective"),
  sourceType: z.enum(SOURCE_TYPES).default("Deviation"),
  sourceRef: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().min(10, "Describe the correction or prevention"),
  rootCause: z.string().trim().max(5000).optional().nullable(),
  actionPlan: z.string().trim().max(10000).optional().nullable(),
  department: z.enum(QMS_DEPARTMENT_VALUES).optional().nullable(),
  ownerId: z.string().min(1).optional(),
  dueAt: z.coerce.date().optional().nullable(),
  deviationId: z.string().min(1).optional().nullable(),
});

const updateSchema = createSchema.partial();

const effectivenessSchema = z.object({
  effectivenessCheck: z.string().trim().min(10, "Describe how effectiveness will be verified"),
});

const verifySchema = z.object({
  effective: z.boolean(),
  verificationNotes: z.string().trim().max(5000).optional().nullable(),
});

function canManage(capa: { ownerId: string }, user: any) {
  return capa.ownerId === user?.sub || isQmsApprover(user);
}

function personSelect() {
  return { id: true, firstName: true, lastName: true, username: true, position: true };
}

router.get("/", async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.department) where.department = String(req.query.department);
    const search = String(req.query.search || "").trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sourceRef: { contains: search, mode: "insensitive" } },
      ];
    }

    const now = new Date();
    const [items, total, open, inProgress, pendingVerification, closed, overdue] =
      await prisma.$transaction([
        prisma.qmsCapa.findMany({
          where,
          include: {
            owner: { select: personSelect() },
            deviation: { select: { id: true, code: true, title: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 500,
        }),
        prisma.qmsCapa.count(),
        prisma.qmsCapa.count({ where: { status: "OPEN" } }),
        prisma.qmsCapa.count({ where: { status: "IN_PROGRESS" } }),
        prisma.qmsCapa.count({ where: { status: "PENDING_VERIFICATION" } }),
        prisma.qmsCapa.count({ where: { status: "CLOSED" } }),
        prisma.qmsCapa.count({
          where: { status: { not: "CLOSED" }, dueAt: { not: null, lt: now } },
        }),
      ]);

    res.json({
      items,
      summary: { total, open, inProgress, pendingVerification, closed, overdue },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch CAPA records" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.qmsCapa.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: personSelect() },
        verifiedBy: { select: personSelect() },
        deviation: { select: { id: true, code: true, title: true, status: true } },
      },
    });
    if (!item) return res.status(404).json({ error: "CAPA not found" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to fetch CAPA" });
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

    let sourceRef = data.sourceRef ?? null;
    if (data.deviationId) {
      const deviation = await prisma.qmsDeviation.findUnique({
        where: { id: data.deviationId },
        select: { code: true },
      });
      if (!deviation) return res.status(400).json({ error: "The linked deviation does not exist" });
      sourceRef = sourceRef || deviation.code;
    }

    const prefix = qmsCodePrefix("CAPA", data.department);
    const last = await prisma.qmsCapa.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const code = qmsNextCode(prefix, last?.code);

    const created = await prisma.qmsCapa.create({
      data: {
        code,
        title: data.title,
        type: data.type,
        sourceType: data.sourceType,
        sourceRef,
        description: data.description,
        rootCause: data.rootCause ?? null,
        actionPlan: data.actionPlan ?? null,
        department: data.department ?? null,
        ownerId,
        dueAt: data.dueAt ?? null,
        deviationId: data.deviationId ?? null,
      },
      include: { owner: { select: personSelect() } },
    });

    await logAudit("QMS", "QMS_CAPA_CREATED", qmsActor(req.user), {
      capaId: created.id,
      code: created.code,
      type: created.type,
      sourceType: created.sourceType,
      sourceRef: created.sourceRef,
      title: created.title,
    });

    const assigned = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { username: true },
    });
    await notifyQmsUser(
      assigned?.username,
      `CAPA assigned: ${created.code}`,
      `${created.title} is now assigned to you.`,
      "/qms/capa"
    );

    res.status(201).json(created);
  } catch (error) {
    console.error("qms capa create failed", error);
    res.status(500).json({ error: "Failed to create CAPA" });
  }
});

router.put("/:id", async (req: any, res) => {
  try {
    const item = await prisma.qmsCapa.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "CAPA not found" });
    if (!["OPEN", "IN_PROGRESS"].includes(item.status)) {
      return res.status(409).json({ error: `A ${item.status} CAPA cannot be edited` });
    }
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may edit this CAPA" });
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
    if (data.deviationId) {
      const deviation = await prisma.qmsDeviation.findUnique({
        where: { id: data.deviationId },
        select: { id: true },
      });
      if (!deviation) return res.status(400).json({ error: "The linked deviation does not exist" });
    }

    const updated = await prisma.qmsCapa.update({
      where: { id: item.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.sourceType !== undefined && { sourceType: data.sourceType }),
        ...(data.sourceRef !== undefined && { sourceRef: data.sourceRef ?? null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rootCause !== undefined && { rootCause: data.rootCause ?? null }),
        ...(data.actionPlan !== undefined && { actionPlan: data.actionPlan ?? null }),
        ...(data.department !== undefined && { department: data.department ?? null }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
        ...(data.dueAt !== undefined && { dueAt: data.dueAt ?? null }),
        ...(data.deviationId !== undefined && { deviationId: data.deviationId ?? null }),
      },
    });

    await logAudit("QMS", "QMS_CAPA_UPDATED", qmsActor(req.user), {
      capaId: updated.id,
      code: updated.code,
      fields: Object.keys(data),
    });

    res.json(updated);
  } catch (error) {
    console.error("qms capa update failed", error);
    res.status(500).json({ error: "Failed to update CAPA" });
  }
});

router.post("/:id/start", async (req: any, res) => {
  try {
    const item = await prisma.qmsCapa.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "CAPA not found" });
    if (item.status !== "OPEN") return res.status(409).json({ error: `CAPA is ${item.status}, not OPEN` });
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may start this CAPA" });
    }

    const updated = await prisma.qmsCapa.update({
      where: { id: item.id },
      data: { status: "IN_PROGRESS" },
    });

    await logAudit("QMS", "QMS_CAPA_STARTED", qmsActor(req.user), {
      capaId: updated.id,
      code: updated.code,
    });

    res.json(updated);
  } catch (error) {
    console.error("qms capa start failed", error);
    res.status(500).json({ error: "Failed to start CAPA" });
  }
});

router.post("/:id/submit", async (req: any, res) => {
  try {
    const item = await prisma.qmsCapa.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "CAPA not found" });
    if (item.status !== "IN_PROGRESS") {
      return res.status(409).json({ error: `CAPA is ${item.status}, not IN_PROGRESS` });
    }
    if (!canManage(item, req.user)) {
      return res.status(403).json({ error: "Only the owner or a QMS approver may submit this CAPA" });
    }
    const parsed = effectivenessSchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const updated = await prisma.qmsCapa.update({
      where: { id: item.id },
      data: {
        status: "PENDING_VERIFICATION",
        effectivenessCheck: parsed.data.effectivenessCheck,
      },
    });

    await logAudit("QMS", "QMS_CAPA_SUBMITTED_FOR_VERIFICATION", qmsActor(req.user), {
      capaId: updated.id,
      code: updated.code,
    });

    res.json(updated);
  } catch (error) {
    console.error("qms capa submit failed", error);
    res.status(500).json({ error: "Failed to submit CAPA for verification" });
  }
});

router.post("/:id/verify", async (req: any, res) => {
  try {
    if (!isQmsApprover(req.user)) {
      return res.status(403).json({ error: "Only a QMS approver may verify CAPA effectiveness" });
    }
    const item = await prisma.qmsCapa.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "CAPA not found" });
    if (item.status !== "PENDING_VERIFICATION") {
      return res.status(409).json({ error: `CAPA is ${item.status}, not PENDING_VERIFICATION` });
    }
    const parsed = verifySchema.safeParse(qmsCleanBody(req.body));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const effective = parsed.data.effective;
    const notes = parsed.data.verificationNotes;
    const combinedCheck = [item.effectivenessCheck, notes].filter(Boolean).join("\n\n");
    const now = new Date();
    const updated = await prisma.qmsCapa.update({
      where: { id: item.id },
      data: {
        status: effective ? "CLOSED" : "IN_PROGRESS",
        verifiedById: req.user.sub,
        verifiedAt: now,
        closedAt: effective ? now : null,
        effectivenessCheck: combinedCheck || item.effectivenessCheck,
      },
    });

    await logAudit("QMS", effective ? "QMS_CAPA_CLOSED" : "QMS_CAPA_RETURNED", qmsActor(req.user), {
      capaId: updated.id,
      code: updated.code,
      effective,
      notes: notes || null,
    });

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerId },
      select: { username: true },
    });
    await notifyQmsUser(
      owner?.username,
      effective ? `CAPA closed: ${updated.code}` : `CAPA returned: ${updated.code}`,
      effective
        ? `${updated.title} passed effectiveness verification.`
        : `${updated.title} did not pass verification and is back in progress.`,
      "/qms/capa"
    );

    res.json(updated);
  } catch (error) {
    console.error("qms capa verify failed", error);
    res.status(500).json({ error: "Failed to verify CAPA" });
  }
});

export default router;
