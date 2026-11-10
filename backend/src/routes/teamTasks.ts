import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { sendNotification } from "../lib/notify";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

const displayName = (user: { firstName?: string | null; lastName?: string | null; username?: string | null } | null) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.username || "Staff";

const canOversee = (user: any) =>
  ["admin", "executive"].includes(user?.role) ||
  ["Human Resource and Administration Manager", "Chief Executive Officer"].includes((user?.position || "").trim());

async function taskFor(id: string) {
  return prisma.staffTask.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, firstName: true, lastName: true, position: true, avatarUrl: true } },
      updates: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
}

function canSeeTask(task: any, me: any) {
  return Boolean(task && (task.userId === me.sub || task.assignedById === me.sub || canOversee(me)));
}

/** The supervisor workspace: my reports, tasks I assigned and tasks assigned to me. */
router.get("/", async (req: any, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        role: true,
        position: true,
        directReports: {
          select: { id: true, username: true, firstName: true, lastName: true, position: true, department: true, avatarUrl: true },
          orderBy: [{ firstName: "asc" }, { username: "asc" }],
        },
      },
    });
    if (!me) return res.status(401).json({ message: "Account not found" });

    const tasks = await prisma.staffTask.findMany({
      where: { OR: [{ assignedById: me.id }, { userId: me.id }] },
      include: {
        user: { select: { username: true, firstName: true, lastName: true, position: true, avatarUrl: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 8 },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });

    res.json({
      me: { id: me.id, role: me.role, position: me.position },
      reports: me.directReports.map((report) => ({ ...report, name: displayName(report) })),
      assignedByMe: tasks.filter((task) => task.assignedById === me.id),
      assignedToMe: tasks.filter((task) => task.userId === me.id && task.assignedById),
      personal: tasks.filter((task) => task.userId === me.id && !task.assignedById),
    });
  } catch (e) { next(e); }
});

const assignSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional().default("NORMAL"),
  dueAt: z.string().nullable().optional(),
  link: z.string().trim().max(500).optional().nullable(),
});

router.post("/", async (req: any, res, next) => {
  try {
    const body = assignSchema.parse(req.body);
    const [target, me] = await Promise.all([
      prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, username: true, immediateSupervisorId: true, firstName: true, lastName: true } }),
      prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, username: true, firstName: true, lastName: true, role: true, position: true } }),
    ]);
    if (!target) return res.status(404).json({ message: "That staff member no longer exists." });
    if (target.id === req.user.sub) return res.status(400).json({ message: "Assign work to a team member, not to yourself." });
    if (target.immediateSupervisorId !== req.user.sub && !canOversee(req.user)) {
      return res.status(403).json({ message: "You can assign tasks only to your direct reports." });
    }

    const task = await prisma.staffTask.create({
      data: {
        userId: target.id,
        title: body.title,
        description: body.description || null,
        priority: body.priority,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        link: body.link || null,
        assignedById: me?.id || req.user.sub,
        assignedByName: displayName(me),
      },
      include: { updates: true },
    });

    await sendNotification(
      target.username,
      "ASSIGNMENT",
      `New task: ${task.title}`,
      `${displayName(me)} assigned this to you${body.dueAt ? ` · due ${new Date(body.dueAt).toLocaleDateString("en-GB")}` : ""}.`,
      "/team-tasks",
    );
    await logAudit("HR", "TASK_ASSIGNED", req.user.username, { taskId: task.id, to: target.username });
    res.status(201).json(task);
  } catch (e) { next(e); }
});

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  dueAt: z.string().nullable().optional(),
  status: z.enum(["OPEN", "DONE"]).optional(),
});

router.patch("/:id", async (req: any, res, next) => {
  try {
    const task = await taskFor(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canSeeTask(task, req.user)) return res.status(403).json({ message: "Forbidden" });
    const body = patchSchema.parse(req.body);
    const isAssigner = task.assignedById === req.user.sub || canOversee(req.user);
    if ((body.title !== undefined || body.description !== undefined || body.priority !== undefined || body.dueAt !== undefined) && !isAssigner) {
      return res.status(403).json({ message: "Only the supervisor who assigned this task can edit its details." });
    }

    const updated = await prisma.staffTask.update({
      where: { id: task.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
        ...(body.status ? { status: body.status, completedAt: body.status === "DONE" ? new Date() : null } : {}),
      },
      include: { updates: { orderBy: { createdAt: "desc" }, take: 8 }, user: { select: { username: true, firstName: true, lastName: true } } },
    });

    if (body.status && task.assignedById) {
      const notifyUser = task.userId === req.user.sub ? task.assignedById : task.user?.username;
      if (notifyUser) {
        const recipient = task.userId === req.user.sub
          ? (await prisma.user.findUnique({ where: { id: task.assignedById }, select: { username: true } }))?.username
          : notifyUser;
        if (recipient) {
          await sendNotification(recipient, "STATUS_CHANGE", `Task ${body.status.toLowerCase()}: ${task.title}`, `${displayName(req.user)} updated the status.`, "/team-tasks");
        }
      }
    }
    res.json(updated);
  } catch (e) { next(e); }
});

const updateSchema = z.object({
  note: z.string().trim().min(2).max(3000),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(["OPEN", "DONE"]).optional(),
});

/** Two-way progress exchange: either the assignee or the supervisor can post. */
router.post("/:id/updates", async (req: any, res, next) => {
  try {
    const task = await taskFor(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canSeeTask(task, req.user)) return res.status(403).json({ message: "Forbidden" });
    const body = updateSchema.parse(req.body);
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { firstName: true, lastName: true, username: true, position: true },
    });
    const authorName = displayName(me);
    const status = body.status || task.status;

    const update = await prisma.staffTaskUpdate.create({
      data: {
        taskId: task.id,
        authorId: req.user.sub,
        authorName,
        progress: body.progress ?? null,
        note: body.note,
        status,
      },
    });
    const updated = await prisma.staffTask.update({
      where: { id: task.id },
      data: {
        ...(body.progress !== undefined ? { progress: body.progress } : {}),
        status,
        latestUpdate: body.note,
        ...(status === "DONE" ? { completedAt: new Date() } : {}),
      },
      include: { updates: { orderBy: { createdAt: "desc" }, take: 25 } },
    });

    const recipientId = task.userId === req.user.sub ? task.assignedById : task.userId;
    if (recipientId) {
      const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { username: true } });
      if (recipient) {
        await sendNotification(
          recipient.username,
          "COMMENT",
          `Progress on: ${task.title}`,
          `${authorName} · ${body.note.slice(0, 140)}${body.note.length > 140 ? "…" : ""}`,
          "/team-tasks",
        );
      }
    }
    res.status(201).json({ update, task: updated });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req: any, res, next) => {
  try {
    const task = await taskFor(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.assignedById !== req.user.sub && task.userId !== req.user.sub && !canOversee(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await prisma.staffTask.delete({ where: { id: task.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;