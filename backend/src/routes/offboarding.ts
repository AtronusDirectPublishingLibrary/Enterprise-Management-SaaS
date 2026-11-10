import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { allows, isAdminUser } from "../lib/access";
import { logAudit } from "../lib/audit";
import {
  dateStringInDays,
  getOffboardingSettings,
  saveOffboardingSettings,
} from "../lib/offboardingSettings";

/**
 * Employee exits, from the first notice through the final settlement.
 *
 * HR (or a position with the HR workspace) opens a case, which seeds a
 * department checklist. The leaver can follow the same case in My Portal,
 * tick their own handover tasks and sign their acknowledgment; HR closes the
 * case once everything is returned, settled and signed off.
 */
const router = Router();
router.use(requireAuth);

const DAY = 86_400_000;

const canManage = (user: Express.Request["user"]) =>
  Boolean(user) && (isAdminUser(user!) || allows(user!, "hr") || allows(user!, "hrOps"));

const REASONS = ["RESIGNATION", "TERMINATION", "RETIREMENT", "CONTRACT_END", "OTHER"] as const;
const STATUSES = ["SUBMITTED", "INITIATED", "IN_PROGRESS", "READY_FOR_EXIT", "COMPLETED", "WITHDRAWN"] as const;
const OPEN_STATUSES = ["SUBMITTED", "INITIATED", "IN_PROGRESS", "READY_FOR_EXIT"] as const;
const STATUS_RANK: Record<string, number> = {
  SUBMITTED: 0,
  READY_FOR_EXIT: 1,
  IN_PROGRESS: 2,
  INITIATED: 3,
  COMPLETED: 4,
  WITHDRAWN: 5,
};
const CATEGORIES = ["HANDOVER", "ASSETS", "ACCESS", "FINANCE", "HR", "EXIT", "GENERAL"] as const;

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  employeeNo: true,
  department: true,
  subDepartment: true,
  position: true,
  jobTitle: true,
  avatarUrl: true,
  hireDate: true,
  employmentType: true,
} as const;

const caseInclude = {
  user: { select: userSelect },
  initiatedBy: { select: { id: true, firstName: true, lastName: true, username: true } },
  manager: { select: { id: true, firstName: true, lastName: true, username: true } },
  tasks: { orderBy: [{ sortOrder: "asc" as const }] },
};

function decorate<T extends { lastWorkingDay: Date; tasks: Array<{ completedAt: Date | null }>; status: string }>(exitCase: T) {
  const total = exitCase.tasks.length;
  const completed = exitCase.tasks.filter((task) => task.completedAt).length;
  const now = new Date();
  return {
    ...exitCase,
    progress: total ? Math.round((completed / total) * 100) : 0,
    tasksTotal: total,
    tasksCompleted: completed,
    daysRemaining: Math.ceil((exitCase.lastWorkingDay.getTime() - now.getTime()) / DAY),
    blockedByOpenTasks: total - completed,
  };
}

/** The checklist every exit starts with, due relative to the last working day. */
function defaultChecklist(lastWorkingDay: Date) {
  const due = (daysBefore: number) => new Date(lastWorkingDay.getTime() - daysBefore * DAY);
  return [
    { title: "Confirm notice period and final working day", category: "HR", owner: "HR", dueAt: due(0) },
    { title: "Complete knowledge transfer and handover notes", category: "HANDOVER", owner: "EMPLOYEE", dueAt: due(7) },
    { title: "Return laptop, phone and other IT equipment", category: "ASSETS", owner: "IT", dueAt: due(1) },
    { title: "Disable email, VPN and system accounts", category: "ACCESS", owner: "IT", dueAt: due(0) },
    { title: "Return ID badge, keys and access card", category: "ASSETS", owner: "HR", dueAt: due(0) },
    { title: "Clear advances, expense claims and company property", category: "FINANCE", owner: "FINANCE", dueAt: due(3) },
    { title: "Calculate final pay, leave encashment and settlement", category: "FINANCE", owner: "PAYROLL", dueAt: due(0) },
    { title: "Conduct exit interview and record feedback", category: "EXIT", owner: "HR", dueAt: due(2) },
    { title: "Update HR file, org chart and distribution lists", category: "HR", owner: "HR", dueAt: due(0) },
    { title: "Archive records and confirm the exit is complete", category: "HR", owner: "HR", dueAt: due(0) },
  ].map((task, index) => ({ ...task, sortOrder: index }));
}

async function notify(username: string, title: string, body: string) {
  await prisma.notification.create({
    data: { recipient: username, type: "OFFBOARDING", title, body, link: "/my-hr" },
  });
}

/** Tell everyone who can act on the exit: HR, admin and the line manager. */
async function notifyHr(title: string, body: string, extra: string[] = []) {
  const hr = await prisma.user.findMany({
    where: {
      OR: [
        { role: { in: ["admin", "executive"] } },
        { position: { contains: "Human Resource", mode: "insensitive" } },
      ],
    },
    select: { username: true },
  });
  const recipients = Array.from(new Set([...hr.map((row) => row.username), ...extra].filter(Boolean)));
  if (!recipients.length) return;
  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      recipient,
      type: "OFFBOARDING",
      title,
      body,
      link: "/hr",
    })),
  });
}

/** HR configuration: the notice period applied to employee-filed resignations. */
router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await getOffboardingSettings();
    res.json({ ...settings, earliestLastWorkingDay: dateStringInDays(settings.noticePeriodDays) });
  } catch (error) {
    next(error);
  }
});

router.patch("/settings", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({
        noticePeriodDays: z.number().int().min(0).max(365).optional(),
        allowEmployeeInitiated: z.boolean().optional(),
      })
      .parse(req.body);
    const settings = await saveOffboardingSettings(body, req.user!.username);
    await logAudit("HR", "OFFBOARDING_SETTINGS_UPDATED", req.user!.username, settings);
    res.json({ ...settings, earliestLastWorkingDay: dateStringInDays(settings.noticePeriodDays) });
  } catch (error) {
    next(error);
  }
});

/** HR: the whole exit register with live progress. */
router.get("/", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const cases = await prisma.offboardingCase.findMany({
      include: caseInclude,
      orderBy: { lastWorkingDay: "asc" },
    });
    cases.sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9));
    res.set("Cache-Control", "no-store");
    res.json(cases.map(decorate));
  } catch (error) {
    next(error);
  }
});

/** Any employee: their own case, so My Portal can show what is still pending. */
router.get("/mine", async (req, res, next) => {
  try {
    const exitCase = await prisma.offboardingCase.findFirst({
      where: { userId: req.user!.sub, status: { not: "WITHDRAWN" } },
      include: caseInclude,
      orderBy: { createdAt: "desc" },
    });
    res.set("Cache-Control", "no-store");
    res.json(exitCase ? decorate(exitCase) : null);
  } catch (error) {
    next(error);
  }
});

/** HR: people who can still be offboarded. */
router.get("/eligible-staff", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const open = await prisma.offboardingCase.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      select: { userId: true },
    });
    const busy = new Set(open.map((row) => row.userId));
    const staff = await prisma.user.findMany({
      select: {
        ...userSelect,
        immediateSupervisorId: true,
        immediateSupervisor: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    res.json(staff.filter((person) => !busy.has(person.id) && person.id !== req.user!.sub));
  } catch (error) {
    next(error);
  }
});

/** HR: open a case and seed the exit checklist. */
router.post("/", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({
        userId: z.string().min(1),
        reason: z.enum([...REASONS]).default("RESIGNATION"),
        noticeDate: z.string().optional().nullable(),
        lastWorkingDay: z.string().min(1),
        managerId: z.string().optional().nullable(),
        handoverNotes: z.string().max(8000).optional().nullable(),
      })
      .parse(req.body);

    const person = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, username: true, firstName: true, lastName: true, immediateSupervisorId: true },
    });
    if (!person) return res.status(404).json({ message: "Employee not found" });

    const existing = await prisma.offboardingCase.findFirst({
      where: { userId: person.id, status: { in: [...OPEN_STATUSES] } },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ message: "This employee already has an open offboarding case." });
    }

    const lastWorkingDay = new Date(body.lastWorkingDay);
    if (Number.isNaN(lastWorkingDay.getTime())) {
      return res.status(400).json({ message: "Enter a valid last working day" });
    }

    const settings = await getOffboardingSettings();
    const exitCase = await prisma.offboardingCase.create({
      data: {
        userId: person.id,
        initiatedById: req.user!.sub,
        managerId: body.managerId || person.immediateSupervisorId || null,
        reason: body.reason,
        noticeDate: body.noticeDate ? new Date(body.noticeDate) : new Date(),
        lastWorkingDay,
        handoverNotes: body.handoverNotes || null,
        noticePeriodDays: settings.noticePeriodDays,
        acceptedAt: new Date(),
        tasks: { create: defaultChecklist(lastWorkingDay) },
      },
      include: caseInclude,
    });

    const name = `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.username;
    await notify(
      person.username,
      "Offboarding started",
      `HR has opened your exit file. Last working day: ${lastWorkingDay.toLocaleDateString("en-GB")}. Review the checklist in My Portal.`
    );
    await logAudit("HR", "OFFBOARDING_INITIATED", req.user!.username, {
      caseId: exitCase.id,
      employee: name,
    });
    res.status(201).json(decorate(exitCase));
  } catch (error) {
    next(error);
  }
});

/**
 * Employee self-service: file a resignation with the notice period HR has set.
 * The request becomes an offboarding case in the SUBMITTED state and joins the
 * same register HR works from; nothing starts until HR accepts it.
 */
router.post("/resignation", async (req, res, next) => {
  try {
    const settings = await getOffboardingSettings();
    if (!settings.allowEmployeeInitiated) {
      return res.status(403).json({
        message: "Self-service resignations are currently closed. Contact HR to start your exit.",
      });
    }

    const body = z
      .object({
        lastWorkingDay: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid last working day")
          .optional(),
        note: z.string().trim().max(4000).optional(),
        signedName: z.string().trim().min(3).max(160),
      })
      .parse(req.body);

    const userId = req.user!.sub;
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        immediateSupervisorId: true,
        signatureUrl: true,
        initialsUrl: true,
        initialsText: true,
      },
    });
    if (!me) return res.status(401).json({ message: "Session user not found" });

    const existing = await prisma.offboardingCase.findFirst({
      where: { userId, status: { in: [...OPEN_STATUSES] } },
      select: { id: true, status: true },
    });
    if (existing) {
      return res.status(409).json({
        message:
          existing.status === "SUBMITTED"
            ? "Your resignation is already with HR for review."
            : "You already have an open offboarding case. Contact HR to make a change.",
        caseId: existing.id,
        status: existing.status,
      });
    }

    const earliest = dateStringInDays(settings.noticePeriodDays);
    const requested = body.lastWorkingDay || earliest;
    if (requested < earliest) {
      return res.status(400).json({
        message: `HR requires ${settings.noticePeriodDays} days' notice. The earliest last working day is ${earliest}.`,
        earliestLastWorkingDay: earliest,
        noticePeriodDays: settings.noticePeriodDays,
      });
    }
    if (requested > dateStringInDays(730)) {
      return res.status(400).json({ message: "Choose a last working day within the next two years." });
    }

    const lastWorkingDay = new Date(`${requested}T00:00:00.000Z`);
    const now = new Date();
    const exitCase = await prisma.offboardingCase.create({
      data: {
        userId,
        initiatedById: userId,
        managerId: me.immediateSupervisorId || null,
        reason: "RESIGNATION",
        status: "SUBMITTED",
        noticeDate: now,
        lastWorkingDay,
        resignationSubmittedAt: now,
        resignationNote: body.note || null,
        noticePeriodDays: settings.noticePeriodDays,
        tasks: { create: defaultChecklist(lastWorkingDay) },
      },
      include: caseInclude,
    });

    await prisma.signatureRecord.create({
      data: {
        userId,
        entityType: "OFFBOARDING",
        entityId: exitCase.id,
        decision: "SUBMITTED",
        signedName: body.signedName,
        signatureUrl: me.signatureUrl,
        initialsUrl: me.initialsUrl,
        initialsText: me.initialsText,
        note: `Resignation with ${settings.noticePeriodDays}-day notice; requested last working day ${requested}`,
      },
    });

    const name = `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.username;
    await notifyHr(
      "Resignation submitted",
      `${name} filed a resignation with ${settings.noticePeriodDays} days' notice. Requested last working day: ${requested}. Review and accept it in the offboarding register.`,
      me.immediateSupervisorId
        ? [
            (
              await prisma.user.findUnique({
                where: { id: me.immediateSupervisorId },
                select: { username: true },
              })
            )?.username || "",
          ]
        : []
    );
    await logAudit("HR", "RESIGNATION_SUBMITTED", me.username, {
      caseId: exitCase.id,
      noticePeriodDays: settings.noticePeriodDays,
      lastWorkingDay: requested,
    });
    res.status(201).json(decorate(exitCase));
  } catch (error) {
    next(error);
  }
});

/** HR accepts a filed resignation, optionally adjusting the final working day. */
router.post("/:id/accept", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({
        lastWorkingDay: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid last working day")
          .optional(),
        note: z.string().trim().max(4000).optional(),
      })
      .parse(req.body || {});

    const existing = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      include: { tasks: true, user: { select: { username: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Offboarding case not found" });
    if (existing.status !== "SUBMITTED") {
      return res.status(409).json({ message: "Only a newly filed resignation can be accepted." });
    }

    const oldDate = existing.lastWorkingDay.toISOString().slice(0, 10);
    const nextDate = body.lastWorkingDay || oldDate;
    const lastWorkingDay = new Date(`${nextDate}T00:00:00.000Z`);
    const delta = lastWorkingDay.getTime() - existing.lastWorkingDay.getTime();

    if (delta) {
      await prisma.$transaction(
        existing.tasks.map((task) =>
          prisma.offboardingTask.update({
            where: { id: task.id },
            data: { dueAt: task.dueAt ? new Date(task.dueAt.getTime() + delta) : null },
          })
        )
      );
    }
    const updated = await prisma.offboardingCase.update({
      where: { id: existing.id },
      data: {
        status: "INITIATED",
        acceptedAt: new Date(),
        lastWorkingDay,
        ...(body.note ? { handoverNotes: body.note } : {}),
      },
      include: caseInclude,
    });

    await notify(
      existing.user.username,
      "Resignation accepted",
      `HR accepted your resignation. Your last working day is ${nextDate} and your exit checklist is now active in My Portal.`
    );
    await logAudit("HR", "RESIGNATION_ACCEPTED", req.user!.username, {
      caseId: existing.id,
      lastWorkingDay: nextDate,
    });
    res.json(decorate(updated));
  } catch (error) {
    next(error);
  }
});

/** HR declines a filed resignation and records why. */
router.post("/:id/decline", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({ reason: z.string().trim().min(3, "Give a short reason for the decision").max(2000) })
      .parse(req.body || {});
    const existing = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { username: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Offboarding case not found" });
    if (existing.status !== "SUBMITTED") {
      return res.status(409).json({ message: "Only a newly filed resignation can be declined." });
    }
    const updated = await prisma.offboardingCase.update({
      where: { id: existing.id },
      data: {
        status: "WITHDRAWN",
        resignationNote: [existing.resignationNote, `HR decision: ${body.reason}`].filter(Boolean).join("\n\n"),
      },
      include: caseInclude,
    });
    await notify(
      existing.user.username,
      "Resignation not accepted",
      `HR reviewed your resignation. Decision: ${body.reason}. Contact HR if you have questions.`
    );
    await logAudit("HR", "RESIGNATION_DECLINED", req.user!.username, {
      caseId: existing.id,
      reason: body.reason,
    });
    res.json(decorate(updated));
  } catch (error) {
    next(error);
  }
});

/** Employee changes their mind before HR has accepted the resignation. */
router.post("/:id/cancel", async (req, res, next) => {
  try {
    const exitCase = await prisma.offboardingCase.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      include: { user: { select: { username: true } } },
    });
    if (!exitCase) return res.status(404).json({ message: "No resignation of yours with that id" });
    if (exitCase.status !== "SUBMITTED") {
      return res.status(409).json({ message: "Contact HR to change an accepted resignation." });
    }
    const updated = await prisma.offboardingCase.update({
      where: { id: exitCase.id },
      data: { status: "WITHDRAWN" },
      include: caseInclude,
    });
    await notifyHr(
      "Resignation withdrawn",
      `${exitCase.user.username} withdrew their resignation before it was accepted.`
    );
    await logAudit("HR", "RESIGNATION_WITHDRAWN", req.user!.username, { caseId: exitCase.id });
    res.json(decorate(updated));
  } catch (error) {
    next(error);
  }
});

/** HR: edit the case, including settlement, interview notes and rehire call. */
router.patch("/:id", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({
        reason: z.enum([...REASONS]).optional(),
        status: z.enum([...STATUSES]).optional(),
        noticeDate: z.string().nullable().optional(),
        lastWorkingDay: z.string().optional(),
        exitInterviewAt: z.string().nullable().optional(),
        exitInterviewNotes: z.string().max(8000).nullable().optional(),
        handoverNotes: z.string().max(8000).nullable().optional(),
        finalSettlementAmount: z.number().nonnegative().nullable().optional(),
        settlementStatus: z.enum(["PENDING", "CALCULATED", "PAID"]).optional(),
        eligibleForRehire: z.boolean().nullable().optional(),
        managerId: z.string().nullable().optional(),
      })
      .parse(req.body);

    const existing = await prisma.offboardingCase.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Offboarding case not found" });

    const exitCase = await prisma.offboardingCase.update({
      where: { id: existing.id },
      data: {
        ...(body.reason ? { reason: body.reason } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.noticeDate !== undefined
          ? { noticeDate: body.noticeDate ? new Date(body.noticeDate) : null }
          : {}),
        ...(body.lastWorkingDay ? { lastWorkingDay: new Date(body.lastWorkingDay) } : {}),
        ...(body.exitInterviewAt !== undefined
          ? { exitInterviewAt: body.exitInterviewAt ? new Date(body.exitInterviewAt) : null }
          : {}),
        ...(body.exitInterviewNotes !== undefined
          ? { exitInterviewNotes: body.exitInterviewNotes || null }
          : {}),
        ...(body.handoverNotes !== undefined ? { handoverNotes: body.handoverNotes || null } : {}),
        ...(body.finalSettlementAmount !== undefined
          ? { finalSettlementAmount: body.finalSettlementAmount }
          : {}),
        ...(body.settlementStatus ? { settlementStatus: body.settlementStatus } : {}),
        ...(body.eligibleForRehire !== undefined ? { eligibleForRehire: body.eligibleForRehire } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId || null } : {}),
      },
      include: caseInclude,
    });
    await logAudit("HR", "OFFBOARDING_UPDATED", req.user!.username, { caseId: exitCase.id });
    res.json(decorate(exitCase));
  } catch (error) {
    next(error);
  }
});

/** HR: add a one-off checklist item to a case. */
router.post("/:id/tasks", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({
        title: z.string().trim().min(2).max(200),
        category: z.enum([...CATEGORIES]).default("GENERAL"),
        owner: z.string().trim().max(60).default("HR"),
        dueAt: z.string().nullable().optional(),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(req.body);
    const existing = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      select: { id: true, tasks: { select: { sortOrder: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Offboarding case not found" });
    const sortOrder = existing.tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;
    const task = await prisma.offboardingTask.create({
      data: {
        caseId: existing.id,
        title: body.title,
        category: body.category,
        owner: body.owner || "HR",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        notes: body.notes || null,
        sortOrder,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

/**
 * Tick a checklist item. HR can close any item; the leaver can only tick their
 * own handover items, so assets and access stay with the owning department.
 */
router.patch("/:id/tasks/:taskId", async (req, res, next) => {
  try {
    const body = z
      .object({
        completed: z.boolean(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(req.body);

    const exitCase = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      select: { id: true, userId: true, status: true },
    });
    if (!exitCase) return res.status(404).json({ message: "Offboarding case not found" });
    const isOwner = exitCase.userId === req.user!.sub;
    if (!canManage(req.user) && !isOwner) {
      return res.status(403).json({ message: "This offboarding case is not yours" });
    }
    if (["COMPLETED", "WITHDRAWN"].includes(exitCase.status)) {
      return res.status(409).json({ message: "This case is closed." });
    }
    if (exitCase.status === "SUBMITTED") {
      return res.status(409).json({
        message: "Wait for HR to accept the resignation before working the checklist.",
      });
    }

    const task = await prisma.offboardingTask.findFirst({
      where: { id: req.params.taskId, caseId: exitCase.id },
    });
    if (!task) return res.status(404).json({ message: "Checklist item not found" });
    if (!canManage(req.user) && task.owner !== "EMPLOYEE") {
      return res.status(403).json({ message: "This item is completed by the owning department" });
    }

    const updated = await prisma.offboardingTask.update({
      where: { id: task.id },
      data: {
        completedAt: body.completed ? new Date() : null,
        completedBy: body.completed ? req.user!.username : null,
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
      },
    });
    if (body.completed && exitCase.status === "INITIATED") {
      await prisma.offboardingCase.update({ where: { id: exitCase.id }, data: { status: "IN_PROGRESS" } });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/tasks/:taskId", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const deleted = await prisma.offboardingTask.deleteMany({
      where: { id: req.params.taskId, caseId: req.params.id },
    });
    if (!deleted.count) return res.status(404).json({ message: "Checklist item not found" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** The leaver signs to acknowledge the exit terms and checklist. */
router.post("/:id/acknowledge", async (req, res, next) => {
  try {
    const body = z.object({ signedName: z.string().trim().min(3).max(160) }).parse(req.body);
    const exitCase = await prisma.offboardingCase.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      select: { id: true, status: true, employeeAcknowledgedAt: true },
    });
    if (!exitCase) return res.status(404).json({ message: "No offboarding case of yours with that id" });
    if (exitCase.status === "WITHDRAWN") {
      return res.status(409).json({ message: "This case was withdrawn." });
    }
    if (exitCase.status === "SUBMITTED") {
      return res.status(409).json({
        message: "HR must accept your resignation before you can acknowledge the exit.",
      });
    }
    if (exitCase.employeeAcknowledgedAt) {
      return res.status(409).json({ message: "You have already acknowledged this exit." });
    }
    const me = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { signatureUrl: true, initialsUrl: true, initialsText: true },
    });
    const now = new Date();
    await prisma.$transaction([
      prisma.offboardingCase.update({
        where: { id: exitCase.id },
        data: { employeeAcknowledgedAt: now },
      }),
      prisma.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "OFFBOARDING",
          entityId: exitCase.id,
          decision: "ACKNOWLEDGED",
          signedName: body.signedName,
          signatureUrl: me?.signatureUrl || null,
          initialsUrl: me?.initialsUrl || null,
          initialsText: me?.initialsText || null,
          note: "Employee acknowledgment of offboarding checklist and exit terms",
        },
      }),
    ]);
    await logAudit("HR", "OFFBOARDING_ACKNOWLEDGED", req.user!.username, { caseId: exitCase.id });
    res.json({ success: true, employeeAcknowledgedAt: now });
  } catch (error) {
    next(error);
  }
});

/** HR sign-off: the checklist is complete and the case is ready for the exit date. */
router.post("/:id/approve", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const exitCase = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      include: { tasks: true },
    });
    if (!exitCase) return res.status(404).json({ message: "Offboarding case not found" });
    if (exitCase.status === "SUBMITTED") {
      return res.status(409).json({ message: "Accept the resignation before signing off the checklist." });
    }
    const open = exitCase.tasks.filter((task) => !task.completedAt);
    if (open.length) {
      return res.status(409).json({
        message: `${open.length} checklist item${open.length === 1 ? " is" : "s are"} still open.`,
        openTasks: open.map((task) => task.title),
      });
    }
    const updated = await prisma.offboardingCase.update({
      where: { id: exitCase.id },
      data: { status: "READY_FOR_EXIT", hrApprovedAt: new Date() },
      include: caseInclude,
    });
    await notify(
      updated.user.username,
      "Offboarding signed off by HR",
      "All exit items are complete. Your case is ready for the final working day."
    );
    await logAudit("HR", "OFFBOARDING_APPROVED", req.user!.username, { caseId: exitCase.id });
    res.json(decorate(updated));
  } catch (error) {
    next(error);
  }
});

/** Final adjournment: the person has left and every obligation is closed. */
router.post("/:id/complete", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z
      .object({
        eligibleForRehire: z.boolean().optional(),
        settlementStatus: z.enum(["PENDING", "CALCULATED", "PAID"]).optional(),
        finalSettlementAmount: z.number().nonnegative().nullable().optional(),
        note: z.string().max(4000).optional().nullable(),
      })
      .parse(req.body || {});
    const exitCase = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      include: { tasks: true },
    });
    if (!exitCase) return res.status(404).json({ message: "Offboarding case not found" });
    if (exitCase.status === "COMPLETED") return res.status(409).json({ message: "This case is already closed." });
    if (exitCase.status === "SUBMITTED") {
      return res.status(409).json({ message: "Accept the resignation before closing the exit." });
    }
    const open = exitCase.tasks.filter((task) => !task.completedAt);
    if (open.length) {
      return res.status(409).json({
        message: `Finish the ${open.length} remaining checklist item${open.length === 1 ? "" : "s"} first.`,
        openTasks: open.map((task) => task.title),
      });
    }

    const updated = await prisma.offboardingCase.update({
      where: { id: exitCase.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        hrApprovedAt: exitCase.hrApprovedAt || new Date(),
        ...(body.eligibleForRehire !== undefined ? { eligibleForRehire: body.eligibleForRehire } : {}),
        ...(body.settlementStatus ? { settlementStatus: body.settlementStatus } : {}),
        ...(body.finalSettlementAmount !== undefined
          ? { finalSettlementAmount: body.finalSettlementAmount }
          : {}),
        ...(body.note !== undefined ? { exitInterviewNotes: body.note || exitCase.exitInterviewNotes } : {}),
      },
      include: caseInclude,
    });
    await notify(
      updated.user.username,
      "Offboarding completed",
      "Your exit file is closed. Thank you for your contribution — your records are available to HR."
    );
    await logAudit("HR", "OFFBOARDING_COMPLETED", req.user!.username, { caseId: exitCase.id });
    res.json(decorate(updated));
  } catch (error) {
    next(error);
  }
});

/** Cancel an exit that no longer applies. The record stays for the audit trail. */
router.post("/:id/withdraw", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const body = z.object({ reason: z.string().max(2000).optional() }).parse(req.body || {});
    const exitCase = await prisma.offboardingCase.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { username: true } } },
    });
    if (!exitCase) return res.status(404).json({ message: "Offboarding case not found" });
    if (exitCase.status === "COMPLETED") {
      return res.status(409).json({ message: "A completed exit cannot be withdrawn." });
    }
    const updated = await prisma.offboardingCase.update({
      where: { id: exitCase.id },
      data: {
        status: "WITHDRAWN",
        ...(body.reason ? { handoverNotes: body.reason } : {}),
      },
      include: caseInclude,
    });
    await notify(
      exitCase.user.username,
      "Offboarding withdrawn",
      "HR has withdrawn your exit case. Contact HR if this is unexpected."
    );
    await logAudit("HR", "OFFBOARDING_WITHDRAWN", req.user!.username, { caseId: exitCase.id });
    res.json(decorate(updated));
  } catch (error) {
    next(error);
  }
});

/** HR: remove a case that was opened by mistake. Completed exits are kept. */
router.delete("/:id", async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ message: "HR access is required" });
    const exitCase = await prisma.offboardingCase.findUnique({ where: { id: req.params.id } });
    if (!exitCase) return res.status(404).json({ message: "Offboarding case not found" });
    if (exitCase.status === "COMPLETED") {
      return res.status(409).json({ message: "Completed exits are retained for the record." });
    }
    await prisma.offboardingCase.delete({ where: { id: exitCase.id } });
    await logAudit("HR", "OFFBOARDING_DELETED", req.user!.username, { caseId: exitCase.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;