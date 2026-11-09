import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { nextRunFor, runScheduleNow, SCHEDULE_FREQUENCIES } from "../lib/reportSchedules";

const router = Router();
router.use(requireAuth, requireRole("admin", "executive"));

const frequency = z.enum(SCHEDULE_FREQUENCIES);
const reportType = z.enum(["AOP", "STRATEGIC", "ROADMAP"]);

const createSchema = z.object({
  type: reportType,
  planId: z.string().min(1).nullable().optional(),
  recipients: z.array(z.string().email()).max(30).default([]),
  frequency: frequency.default("MONTHLY"),
  enabled: z.boolean().default(true),
});

router.get("/", async (_req, res, next) => {
  try {
    const schedules = await prisma.reportSchedule.findMany({
      orderBy: [{ enabled: "desc" }, { nextRunAt: "asc" }],
    });
    res.json(schedules);
  } catch (e) { next(e); }
});

router.post("/", async (req: any, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const schedule = await prisma.reportSchedule.create({
      data: {
        type: body.type,
        planId: body.planId || null,
        recipients: body.recipients,
        frequency: body.frequency,
        enabled: body.enabled,
        nextRunAt: nextRunFor(body.frequency),
        createdBy: req.user!.username,
      },
    });
    await logAudit("REPORTS", "SCHEDULE_CREATED", req.user!.username, {
      scheduleId: schedule.id,
      type: body.type,
      frequency: body.frequency,
      recipients: body.recipients.length,
    });
    res.json({ success: true, schedule });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req: any, res, next) => {
  try {
    const body = z
      .object({
        enabled: z.boolean().optional(),
        recipients: z.array(z.string().email()).max(30).optional(),
        frequency: frequency.optional(),
      })
      .parse(req.body);
    const existing = await prisma.reportSchedule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Report schedule not found." });
    const schedule = await prisma.reportSchedule.update({
      where: { id: existing.id },
      data: {
        ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
        ...(body.recipients ? { recipients: body.recipients } : {}),
        ...(body.frequency
          ? { frequency: body.frequency, nextRunAt: nextRunFor(body.frequency) }
          : {}),
      },
    });
    await logAudit("REPORTS", "SCHEDULE_UPDATED", req.user!.username, {
      scheduleId: schedule.id,
      changes: body,
    });
    res.json({ success: true, schedule });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req: any, res, next) => {
  try {
    const existing = await prisma.reportSchedule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Report schedule not found." });
    await prisma.reportSchedule.delete({ where: { id: existing.id } });
    await logAudit("REPORTS", "SCHEDULE_DELETED", req.user!.username, { scheduleId: existing.id });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post("/:id/run", async (req: any, res, next) => {
  try {
    const result = await runScheduleNow(req.params.id);
    await logAudit("REPORTS", "SCHEDULE_RUN", req.user!.username, {
      scheduleId: req.params.id,
      mailStatus: result.mailStatus,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

export default router;
