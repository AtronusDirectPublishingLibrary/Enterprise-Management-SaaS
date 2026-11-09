import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  DEFAULT_PLAN_ALERT_SETTINGS,
  getPlanAlertSettings,
  savePlanAlertSettings,
} from "../lib/planSettings";
import { mailConfigHint, mailConfigured, sendMail } from "../lib/mailer";
import { runPlanAlerts } from "../lib/planAlerts";
import { computePlanProgress } from "../lib/planProgress";
import { fiscalYear, insertAopTemplate, summarizeAopTemplate } from "../lib/aopTemplate";
import {
  PERIOD_CADENCE,
  ensurePlanPeriod,
  resolveCurrentPlan,
  syncPeriodFromPlan,
  type PeriodType,
} from "../lib/planPeriods";
import { commitRollover, prepareRollover } from "../lib/periodRollover";
import { runPeriodLifecycle } from "../lib/periodLifecycle";
import { generatePlanReports } from "../lib/planReports";
import { listImports, recordImport, rollbackImport } from "../lib/importBatches";

const router = Router();

const PLAN_TYPES = ["STRATEGIC", "ROADMAP", "AOP"] as const;
const PLAN_STATUSES = ["Draft", "In Review", "Approved", "Active", "Closed"] as const;
const ITEM_KINDS = ["PILLAR", "GOAL", "OBJECTIVE", "STRATEGY", "ACTIVITY", "KPI", "MILESTONE"] as const;
const REPORT_TYPES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "AD_HOC"] as const;
const REPORT_STATUSES = ["Pending", "Submitted", "Approved", "Waived"] as const;

const planTypeSchema = z.enum(PLAN_TYPES);
const itemKindSchema = z.enum(ITEM_KINDS);

const canWriteRole = requireRole("admin", "project_manager");
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Row-level plan permission: administrators may edit any plan, while project
 * managers may only change plans they created or own. Routes that address a
 * child record (item, report, import batch) are resolved back to their plan.
 */
async function planIdForRequest(req: any): Promise<string | null> {
  if (req.params.planId) return String(req.params.planId);
  if (req.params.itemId) {
    const item = await prisma.planItem.findUnique({
      where: { id: req.params.itemId },
      select: { planId: true },
    });
    return item?.planId || null;
  }
  if (req.params.reportId) {
    const report = await prisma.planReport.findUnique({
      where: { id: req.params.reportId },
      select: { planId: true },
    });
    return report?.planId || null;
  }
  if (req.params.batchId) {
    const batch = await prisma.importBatch.findUnique({
      where: { id: req.params.batchId },
      select: { planId: true },
    });
    return batch?.planId || null;
  }
  return null;
}

async function assertPlanWrite(req: any, res: any, next: any) {
  try {
    if (req.user!.role === "admin") return next();
    const planId = await planIdForRequest(req);
    if (!planId) return next();
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { createdBy: true, owner: true },
    });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { firstName: true, lastName: true, position: true },
    });
    const names = new Set(
      [
        user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null,
        user?.position,
      ]
        .filter(Boolean)
        .map((name) => String(name).trim().toLowerCase())
    );
    // The planning custodian keeps cross-plan editorial control; every other
    // project manager is limited to plans they own or created.
    const isPlanCustodian = user?.position === "Strategy and Planning Officer";
    const owns =
      isPlanCustodian ||
      plan.createdBy === req.user!.username ||
      (plan.owner ? names.has(plan.owner.trim().toLowerCase()) : false);
    if (!owns) {
      return res.status(403).json({
        message: "Only the plan owner, the plan creator or an administrator can change this plan.",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

const canWrite = (req: any, res: any, next: any) =>
  canWriteRole(req, res, () => assertPlanWrite(req, res, next));

const PLAN_ITEM_CSV_HEADERS = [
  "code", "parentCode", "kind", "title", "description", "owner", "startDate", "endDate",
  "status", "progress", "budget", "unit", "baseline", "targetValue", "currentValue",
  "direction", "frequency", "dataSource", "isFeatured", "targetPeriod", "target", "actual",
  "targetLabel", "note",
];

function normaliseCsvRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      typeof value === "string" ? value.trim() : value,
    ])
  );
}

function csvText(value: unknown) {
  return String(value ?? "").trim();
}

function csvNumber(value: unknown) {
  const text = String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, "");
  return text === "" ? null : Number(text);
}

function csvDate(value: unknown) {
  const text = csvText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function csvBoolean(value: unknown) {
  return ["1", "true", "yes", "y"].includes(csvText(value).toLowerCase());
}

function badRequest(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
}

function notFound(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 404;
  return error;
}

function parsePeriodYear(label: string): number | null {
  const match = label.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}


// ─── Public: current plans, headline targets and KPIs for the home page ───────

router.get("/public", async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isPublished: true },
      include: { items: { include: { targets: true } }, children: true },
      orderBy: { startDate: "desc" },
    });

    const byType = new Map<string, typeof plans>();
    for (const plan of plans) {
      const bucket = byType.get(plan.type) ?? [];
      bucket.push(plan);
      byType.set(plan.type, bucket);
    }

    const results: unknown[] = [];
    for (const type of ["STRATEGIC", "AOP", "ROADMAP"] as const) {
      const resolved = resolveCurrentPlan(byType.get(type) ?? []);
      if (!resolved) continue;
      const current = resolved.plan;
      const progress = await computePlanProgress(current.id);

      const roots = current.items
        .filter((item) => item.parentId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const featureKpis = current.items
        .filter((item) => item.kind === "KPI" && item.isFeatured)
        .slice(0, 6)
        .map((item) => {
          const readings = item.targets
            .filter((reading) => reading.target != null && reading.target !== 0)
            .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel));
          const latest = readings[readings.length - 1];
          const actual = latest?.actual ?? item.currentValue ?? null;
          const target = latest?.target ?? item.targetValue ?? null;
          const value =
            actual != null && target != null && target !== 0
              ? Math.max(0, Math.min(100, Math.round((actual / target) * 100)))
              : 0;
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            unit: item.unit,
            target,
            actual,
            periodLabel: latest?.periodLabel ?? null,
            progress: value,
          };
        });

      results.push({
        id: current.id,
        type: current.type,
        title: current.title,
        periodLabel: current.periodLabel,
        startDate: current.startDate,
        endDate: current.endDate,
        summary: current.summary,
        periodEnded: resolved.periodEnded,
        completion: progress?.completion ?? 0,
        priorities: (roots.some((item) => item.kind === "OBJECTIVE")
          ? roots.filter((item) => item.kind === "OBJECTIVE")
          : roots.filter((item) => item.kind !== "KPI")
        )
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            kind: item.kind,
            code: item.code,
            title: item.title,
            description: item.description,
            progress: progress?.items[item.id]?.progress ?? 0,
          })),
        kpis: featureKpis,
      });
    }

    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(results);
  } catch (e) {
    next(e);
  }
});

function planPath(type: string): string {
  return type === "AOP" ? "aop" : type === "ROADMAP" ? "roadmap" : "strategic-plan";
}

// ─── Shared, read-only plan view (no account required) ────────────────────────

router.get("/shared/:token", async (req, res, next) => {
  try {
    const share = await prisma.planShare.findUnique({
      where: { token: req.params.token },
      include: {
        plan: {
          include: {
            items: { include: { targets: true }, orderBy: { sortOrder: "asc" } },
            parent: { select: { title: true, type: true, periodLabel: true } },
          },
        },
      },
    });
    if (!share || !share.isActive) throw notFound("This share link is no longer available");
    if (share.expiresAt && share.expiresAt < new Date()) throw notFound("This share link has expired");

    await prisma.planShare.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    });

    const progress = await computePlanProgress(share.planId);
    const { plan } = share;

    res.setHeader("Cache-Control", "no-store");
    res.json({
      share: { label: share.label, createdAt: share.createdAt },
      completion: progress?.completion ?? 0,
      plan: {
        id: plan.id,
        type: plan.type,
        title: plan.title,
        periodLabel: plan.periodLabel,
        startDate: plan.startDate,
        endDate: plan.endDate,
        summary: plan.summary,
        vision: plan.vision,
        mission: plan.mission,
        status: plan.status,
        parent: plan.parent,
      },
      items: plan.items.map((item) => ({
        id: item.id,
        parentId: item.parentId,
        kind: item.kind,
        code: item.code,
        title: item.title,
        description: item.description,
        unit: item.unit,
        targetValue: item.targetValue,
        currentValue: item.currentValue,
        isFeatured: item.isFeatured,
        status: item.status,
        progress: progress?.items[item.id]?.progress ?? 0,
        targets: item.targets.map((target) => ({
          periodLabel: target.periodLabel,
          target: target.target,
          actual: target.actual,
          targetLabel: target.targetLabel,
        })),
      })),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/shared/:token/comments", async (req, res, next) => {
  try {
    const body = z
      .object({
        authorName: z.string().min(2).max(80),
        authorEmail: z.string().email().optional().nullable(),
        body: z.string().min(3).max(2000),
        context: z.string().max(200).optional().nullable(),
      })
      .parse(req.body);

    const share = await prisma.planShare.findUnique({
      where: { token: req.params.token },
      include: { plan: true },
    });
    if (!share || !share.isActive) throw notFound("This share link is no longer available");
    if (share.expiresAt && share.expiresAt < new Date()) throw notFound("This share link has expired");

    const hourAgo = new Date(Date.now() - 3_600_000);
    const recent = await prisma.planShareComment.count({
      where: { shareId: share.id, createdAt: { gte: hourAgo } },
    });
    if (recent >= 20) {
      return res.status(429).json({ message: "Too many comments from this link in the last hour. Please try again later." });
    }

    const comment = await prisma.planShareComment.create({
      data: {
        shareId: share.id,
        planId: share.planId,
        authorName: body.authorName,
        authorEmail: body.authorEmail || null,
        body: body.body,
        context: body.context || null,
      },
    });

    const recipient =
      share.plan.owner ??
      (await prisma.user.findFirst({ where: { role: "admin" }, select: { username: true } }))?.username;

    if (recipient) {
      await prisma.notification.create({
        data: {
          recipient,
          type: "COMMENT",
          title: `New comment on ${share.plan.title}`,
          body: `${body.authorName}: ${body.body.slice(0, 160)}`,
          link: `/database/${planPath(share.plan.type)}?plan=${share.planId}`,
        },
      });

      if (mailConfigured()) {
        const owner = await prisma.user.findUnique({ where: { username: recipient }, select: { email: true } });
        if (owner?.email) {
          const link = `${(process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "")}/database/${planPath(share.plan.type)}?plan=${share.planId}`;
          await sendMail({
            to: [owner.email],
            subject: `[Ethio-Biopharma] New comment on ${share.plan.title}`,
            text: `${body.authorName} commented on ${share.plan.title} (${share.plan.periodLabel}):\n\n${body.body}\n\nOpen the plan: ${link}`,
            html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px"><p style="color:#0f766e;font-weight:700;margin:0 0 8px">New plan feedback</p><h2 style="margin:0 0 8px;font-size:18px">${share.plan.title}</h2><p style="color:#64748b;margin:0 0 16px">${share.plan.periodLabel}</p><blockquote style="margin:0 0 16px;padding:12px 16px;background:#f1f5f9;border-left:4px solid #0f766e">${body.body.replace(/</g, "&lt;")}</blockquote><p style="margin:0 0 16px">From <strong>${body.authorName}</strong>${body.authorEmail ? ` &lt;${body.authorEmail}&gt;` : ""}</p><a href="${link}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open the plan</a></div>`,
          });
        }
      }
    }

    res.status(201).json({ ok: true, id: comment.id });
  } catch (e) {
    next(e);
  }
});

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Public calendar feed of a shared plan's reporting deadlines (subscribe in Outlook/Google Calendar). */
router.get("/shared/:token/calendar.ics", async (req, res, next) => {
  try {
    const share = await prisma.planShare.findUnique({
      where: { token: req.params.token },
      include: { plan: { include: { reports: { orderBy: { dueDate: "asc" } } } } },
    });
    if (!share || !share.isActive) throw notFound("This share link is no longer available");

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ethio-Biopharma//Plan reporting//EN",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:" + icsEscape(`${share.plan.title} reporting deadlines`),
    ];

    for (const report of share.plan.reports) {
      const due = new Date(report.dueDate);
      const end = new Date(due.getTime() + 86_400_000);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${report.id}@ethio-biopharma`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${icsDate(due)}`,
        `DTEND;VALUE=DATE:${icsDate(end)}`,
        `SUMMARY:${icsEscape(`${report.periodLabel} report due`)}`,
        `DESCRIPTION:${icsEscape(`${report.title} (${share.plan.title})`)}`,
        "BEGIN:VALARM",
        "TRIGGER:-P3D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reporting deadline in 3 days",
        "END:VALARM",
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="reporting-deadlines.ics"');
    res.send(lines.join("\r\n"));
  } catch (e) {
    next(e);
  }
});

// Everything below requires a session.
router.use(requireAuth);

// ─── Alert settings (admin-editable, no code changes) ─────────────────────────

router.get("/settings/plan-alerts", canWrite, async (_req, res, next) => {
  try {
    const settings = await getPlanAlertSettings();
    res.json({
      settings,
      defaults: DEFAULT_PLAN_ALERT_SETTINGS,
      mailConfigured: mailConfigured(),
      mailHint: mailConfigHint(),
    });
  } catch (e) {
    next(e);
  }
});

router.put("/settings/plan-alerts", requireRole("admin"), async (req, res, next) => {
  try {
    const body = z
      .object({
        emailEnabled: z.boolean().optional(),
        includeAdmins: z.boolean().optional(),
        recipients: z.array(z.string()).optional(),
        paceTolerancePct: z.number().min(0).max(90).optional(),
        criticalGapPct: z.number().min(1).max(100).optional(),
        dueSoonDays: z.number().min(1).max(120).optional(),
      })
      .parse(req.body);
    const settings = await savePlanAlertSettings(body, req.user!.username);
    res.json({ settings });
  } catch (e) {
    next(e);
  }
});

router.post("/settings/plan-alerts/test", requireRole("admin"), async (req, res, next) => {
  try {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);
    if (!mailConfigured()) {
      return res.status(400).json({ message: mailConfigHint(), mailConfigured: false });
    }
    const result = await sendMail({
      to: [to],
      subject: "[EBPE] Plan alert email test",
      text: "Your plan alert email configuration is working.",
      html: `<p style="font-family:Segoe UI,Arial,sans-serif">Your <strong>EBPE plan alert</strong> email configuration is working.</p>`,
    });
    if (result.status === "FAILED") {
      return res.status(502).json({ message: result.error ?? "Email delivery failed", status: result.status });
    }
    res.json({ status: result.status });
  } catch (e) {
    next(e);
  }
});

// ─── Alerts ───────────────────────────────────────────────────────────────────

router.get("/alerts", async (req, res, next) => {
  try {
    const query = z
      .object({
        status: z.string().optional(),
        severity: z.string().optional(),
        planId: z.string().optional(),
        limit: z.coerce.number().min(1).max(500).default(200),
      })
      .parse(req.query);

    const alerts = await prisma.planAlert.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.planId ? { planId: query.planId } : {}),
      },
      include: {
        plan: { select: { id: true, title: true, type: true, periodLabel: true } },
        item: { select: { id: true, title: true, kind: true } },
        report: { select: { id: true, title: true, dueDate: true, status: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: query.limit,
    });
    res.json(alerts);
  } catch (e) {
    next(e);
  }
});

router.post("/alerts/run", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({ planId: z.string().optional(), sendEmail: z.boolean().optional() })
      .parse(req.body ?? {});
    const summary = await runPlanAlerts(body);
    res.json(summary);
  } catch (e) {
    next(e);
  }
});

router.patch("/alerts/:alertId", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({ status: z.enum(["Open", "Acknowledged", "Resolved"]) })
      .parse(req.body);
    const alert = await prisma.planAlert.update({
      where: { id: req.params.alertId },
      data: {
        status: body.status,
        acknowledgedBy: body.status === "Acknowledged" ? req.user!.username : undefined,
        acknowledgedAt: body.status === "Acknowledged" ? new Date() : undefined,
      },
    });
    res.json(alert);
  } catch (e) {
    next(e);
  }
});

// ─── Reporting deadlines (all plans) ──────────────────────────────────────────

router.get("/reports", async (req, res, next) => {
  try {
    const query = z
      .object({
        status: z.string().optional(),
        planId: z.string().optional(),
        withinDays: z.coerce.number().optional(),
      })
      .parse(req.query);

    const dueBefore = query.withinDays
      ? new Date(Date.now() + query.withinDays * 86_400_000)
      : undefined;

    const reports = await prisma.planReport.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.planId ? { planId: query.planId } : {}),
        ...(dueBefore ? { dueDate: { lte: dueBefore } } : {}),
      },
      include: { plan: { select: { id: true, title: true, type: true, periodLabel: true } } },
      orderBy: { dueDate: "asc" },
      take: 300,
    });
    res.json(reports);
  } catch (e) {
    next(e);
  }
});

// ─── Share links & comments (authenticated) ────────────────────────────────────

router.get("/:planId/shares", async (req, res, next) => {
  try {
    const shares = await prisma.planShare.findMany({
      where: { planId: req.params.planId },
      include: { _count: { select: { comments: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(shares);
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/shares", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        label: z.string().max(120).optional().nullable(),
        expiresInDays: z.number().min(0).max(365).optional(),
      })
      .parse(req.body ?? {});

    const plan = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw notFound("Plan not found");

    const share = await prisma.planShare.create({
      data: {
        planId: plan.id,
        token: crypto.randomBytes(18).toString("base64url"),
        label: body.label || null,
        expiresAt: body.expiresInDays
          ? new Date(Date.now() + body.expiresInDays * 86_400_000)
          : null,
        createdBy: req.user!.username,
      },
    });

    res.status(201).json(share);
  } catch (e) {
    next(e);
  }
});

router.patch("/shares/:shareId", canWrite, async (req, res, next) => {
  try {
    const body = z.object({ isActive: z.boolean(), label: z.string().nullable().optional() }).parse(req.body);
    const share = await prisma.planShare.update({ where: { id: req.params.shareId }, data: body });
    res.json(share);
  } catch (e) {
    next(e);
  }
});

router.delete("/shares/:shareId", canWrite, async (req, res, next) => {
  try {
    await prisma.planShare.delete({ where: { id: req.params.shareId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/:planId/comments", async (req, res, next) => {
  try {
    const comments = await prisma.planShareComment.findMany({
      where: { planId: req.params.planId },
      include: { share: { select: { label: true, token: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(comments);
  } catch (e) {
    next(e);
  }
});

router.patch("/comments/:commentId", canWrite, async (req, res, next) => {
  try {
    const body = z.object({ isRead: z.boolean() }).parse(req.body);
    const comment = await prisma.planShareComment.update({
      where: { id: req.params.commentId },
      data: { isRead: body.isRead },
    });
    res.json(comment);
  } catch (e) {
    next(e);
  }
});

// ─── Template + periods + plan list ───────────────────────────────────────────

router.get("/template/aop", canWrite, async (req, res, next) => {
  try {
    const year = z.coerce.number().min(2000).max(2100).parse(req.query.year ?? new Date().getFullYear());
    res.json(summarizeAopTemplate(year));
  } catch (e) {
    next(e);
  }
});

router.get("/template/items", canWrite, (_req, res) => {
  const csv = [
    PLAN_ITEM_CSV_HEADERS.join(","),
    'SO1,,OBJECTIVE,Expand access to essential medicines,,Operations Manager,2026-01-01,2026-12-31,In Progress,40,,,,,,,,,false,2026,100,40,,"Annual objective"',
    'SO1-A1,SO1,ACTIVITY,Complete regional distribution assessment,,Operations Manager,2026-01-15,2026-06-30,In Progress,55,1200000,,,,,,,,,false,,,,,"Field assessment underway"',
    'SO1-K1,SO1,KPI,Share of districts reached,,Strategy and Planning Officer,2026-01-01,2026-12-31,In Progress,50,,%,,60,30,increase,Quarterly,Distribution reports,false,2026,60,30,,"Verified district coverage"',
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="plan-items-template.csv"');
  res.send(`\uFEFF${csv}\n`);
});

router.get("/periods", async (req, res, next) => {
  try {
    const { type } = z.object({ type: planTypeSchema.optional() }).parse(req.query);
    const plans = await prisma.plan.findMany({
      where: type ? { type } : {},
      select: { periodLabel: true, type: true, status: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    });

    const periods = new Map<
      string,
      { periodLabel: string; type: string; count: number; hasActive: boolean; startDate: Date; endDate: Date }
    >();
    for (const plan of plans) {
      const key = `${plan.type}:${plan.periodLabel}`;
      const existing = periods.get(key);
      if (existing) {
        existing.count += 1;
        existing.hasActive = existing.hasActive || plan.status === "Active";
      } else {
        periods.set(key, {
          periodLabel: plan.periodLabel,
          type: plan.type,
          count: 1,
          hasActive: plan.status === "Active",
          startDate: plan.startDate,
          endDate: plan.endDate,
        });
      }
    }
    res.json([...periods.values()]);
  } catch (e) {
    next(e);
  }
});

/** Every planning period with its state, plan, successor and preparation status. */
router.get("/periods/calendar", async (_req, res, next) => {
  try {
    const periods = await prisma.planPeriod.findMany({
      include: {
        plan: {
          select: { id: true, title: true, status: true, isPublished: true, owner: true },
        },
        successor: { select: { id: true, label: true, state: true } },
        predecessor: { select: { id: true, label: true, state: true } },
      },
      orderBy: [{ type: "asc" }, { startDate: "asc" }],
    });

    const now = new Date();
    res.json(
      periods.map((period) => {
        const daysRemaining = Math.ceil(
          (new Date(period.endDate).getTime() - now.getTime()) / 86_400_000
        );
        const leadDays =
          PERIOD_CADENCE[(period.type as PeriodType) in PERIOD_CADENCE ? (period.type as PeriodType) : "AOP"]
            .leadDays;
        return {
          id: period.id,
          type: period.type,
          sequence: period.sequence,
          label: period.label,
          labelAlt: period.labelAlt,
          startDate: period.startDate,
          endDate: period.endDate,
          state: period.state,
          preparedAt: period.preparedAt,
          activatedAt: period.activatedAt,
          closedAt: period.closedAt,
          plan: period.plan,
          successor: period.successor,
          predecessor: period.predecessor,
          daysRemaining,
          leadDays,
          isCurrent:
            new Date(period.startDate).getTime() <= now.getTime() &&
            new Date(period.endDate).getTime() >= now.getTime(),
          needsPreparation:
            ["Active", "Closing"].includes(period.state) &&
            !period.successorId &&
            daysRemaining <= leadDays,
        };
      })
    );
  } catch (e) {
    next(e);
  }
});

/** Run the period lifecycle now (normally the daily background job does this). */
router.post("/periods/lifecycle/run", requireRole("admin"), async (req, res, next) => {
  try {
    const { dryRun } = z
      .object({ dryRun: z.boolean().optional() })
      .parse(req.body ?? {});
    const summary = await runPeriodLifecycle({
      dryRun: dryRun ?? false,
      actor: req.user!.username,
    });
    res.json(summary);
  } catch (e) {
    next(e);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
        type: planTypeSchema.optional(),
        status: z.enum(PLAN_STATUSES).optional(),
        period: z.string().optional(),
        year: z.coerce.number().optional(),
        q: z.string().optional(),
      })
      .parse(req.query);

    const where: Prisma.PlanWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.period ? { periodLabel: query.period } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { periodLabel: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const plans = await prisma.plan.findMany({
      where,
      include: {
        _count: { select: { items: true, alerts: true, reports: true, children: true } },
        parent: { select: { id: true, title: true, type: true, periodLabel: true } },
        children: { select: { id: true, title: true, type: true, periodLabel: true, status: true } },
        period: { select: { id: true, labelAlt: true, state: true, successorId: true } },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });

    const unreadGroups = await prisma.planShareComment.groupBy({
      by: ["planId"],
      where: { isRead: false },
      _count: { _all: true },
    });
    const unreadMap = new Map(unreadGroups.map((group) => [group.planId, group._count._all]));

    const enriched = [];
    for (const plan of plans) {
      const progress = await computePlanProgress(plan.id);
      const openAlerts = await prisma.planAlert.count({
        where: { planId: plan.id, status: { not: "Resolved" } },
      });
      enriched.push({
        ...plan,
        completion: progress?.completion ?? 0,
        childPlans: progress?.childPlans ?? [],
        openAlerts,
        unreadComments: unreadMap.get(plan.id) ?? 0,
      });
    }

    if (query.year) {
      return res.json(
        enriched.filter((plan) => {
          const startYear = new Date(plan.startDate).getFullYear();
          const endYear = new Date(plan.endDate).getFullYear();
          return query.year! >= startYear && query.year! <= endYear;
        })
      );
    }

    res.json(enriched);
  } catch (e) {
    next(e);
  }
});

router.post("/", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        type: planTypeSchema,
        title: z.string().min(3),
        periodLabel: z.string().min(2),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        status: z.enum(PLAN_STATUSES).default("Draft"),
        summary: z.string().optional().nullable(),
        vision: z.string().optional().nullable(),
        mission: z.string().optional().nullable(),
        owner: z.string().optional().nullable(),
        isPublished: z.boolean().optional(),
        parentPlanId: z.string().optional().nullable(),
      })
      .parse(req.body);

    if (body.endDate <= body.startDate) throw badRequest("End date must be after the start date");

    if (body.parentPlanId) {
      const parent = await prisma.plan.findUnique({ where: { id: body.parentPlanId } });
      if (!parent) throw badRequest("Parent plan not found");
      const allowed = body.type === "AOP" ? "STRATEGIC" : body.type === "STRATEGIC" ? "ROADMAP" : null;
      if (allowed !== parent.type) {
        throw badRequest(
          body.type === "ROADMAP"
            ? "A roadmap is the top level and cannot have a parent plan"
            : `A ${body.type} plan can only be linked to a ${allowed} plan`
        );
      }
    }

    const plan = await prisma.plan.create({
      data: {
        ...body,
        createdBy: req.user!.username,
        isPublished: body.isPublished ?? false,
      },
    });

    await ensurePlanPeriod(plan.id, req.user!.username);

    if (body.status === "Active") {
      await prisma.plan.updateMany({
        where: { type: body.type, status: "Active", id: { not: plan.id } },
        data: { status: "Closed" },
      });
    }

    res.status(201).json(plan);
  } catch (e) {
    next(e);
  }
});

router.post("/from-template", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        fyStartYear: z.coerce.number().min(2000).max(2100),
        title: z.string().optional(),
        owner: z.string().optional().nullable(),
        parentPlanId: z.string().optional().nullable(),
        status: z.enum(PLAN_STATUSES).default("Draft"),
        isPublished: z.boolean().default(false),
      })
      .parse(req.body);

    const fy = fiscalYear(body.fyStartYear);
    const periodLabel = `${fy.label} EFY`;

    const existing = await prisma.plan.findUnique({
      where: { type_periodLabel: { type: "AOP", periodLabel } },
    });
    if (existing) {
      return res.status(409).json({
        message: `An annual operational plan for ${periodLabel} already exists.`,
        planId: existing.id,
      });
    }

    if (body.parentPlanId) {
      const parent = await prisma.plan.findUnique({ where: { id: body.parentPlanId } });
      if (!parent || parent.type !== "STRATEGIC") {
        throw badRequest("An annual operational plan must be linked to a strategic plan");
      }
    }

    const plan = await prisma.plan.create({
      data: {
        type: "AOP",
        title: body.title?.trim() || `Annual Operational Plan ${periodLabel}`,
        periodLabel,
        startDate: fy.start,
        endDate: fy.end,
        status: body.status,
        owner: body.owner ?? null,
        parentPlanId: body.parentPlanId ?? null,
        summary:
          "Annual operational plan generated from the EBPE standard template: strategic pillars, annual objectives, strategies, quarterly major activities and KPI targets.",
        isPublished: body.isPublished,
        createdBy: req.user!.username,
      },
    });

    const created = await insertAopTemplate(plan.id, body.fyStartYear);
    await ensurePlanPeriod(plan.id, req.user!.username);

    if (body.status === "Active") {
      await prisma.plan.updateMany({
        where: { type: "AOP", status: "Active", id: { not: plan.id } },
        data: { status: "Closed" },
      });
    }

    res.status(201).json({ plan, createdItems: created });
  } catch (e) {
    next(e);
  }
});

// ─── Single plan ──────────────────────────────────────────────────────────────

router.get("/:planId", async (req, res, next) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: req.params.planId },
      include: {
        items: { include: { targets: true, linkedItem: { select: { id: true, title: true, code: true, kind: true } } }, orderBy: { sortOrder: "asc" } },
        reports: { orderBy: { dueDate: "asc" } },
        parent: { select: { id: true, title: true, type: true, periodLabel: true } },
        children: { select: { id: true, title: true, type: true, periodLabel: true, status: true, isPublished: true } },
        alerts: {
          where: { status: { not: "Resolved" } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!plan) throw notFound("Plan not found");

    const progress = await computePlanProgress(plan.id);

    const siblings = await prisma.plan.findMany({
      where: { type: plan.type, id: { not: plan.id } },
      select: { id: true, title: true, periodLabel: true, status: true },
      orderBy: { startDate: "desc" },
    });

    res.json({
      ...plan,
      completion: progress?.completion ?? 0,
      itemProgress: progress?.items ?? {},
      childPlanProgress: progress?.childPlans ?? [],
      linkablePlans:
        plan.type === "AOP"
          ? await prisma.plan.findMany({ where: { type: "STRATEGIC" }, select: { id: true, title: true, periodLabel: true }, orderBy: { startDate: "desc" } })
          : plan.type === "STRATEGIC"
          ? await prisma.plan.findMany({ where: { type: "ROADMAP" }, select: { id: true, title: true, periodLabel: true }, orderBy: { startDate: "desc" } })
          : [],
      adoptablePlans:
        plan.type === "STRATEGIC"
          ? await prisma.plan.findMany({ where: { type: "AOP", parentPlanId: null }, select: { id: true, title: true, periodLabel: true }, orderBy: { startDate: "desc" } })
          : plan.type === "ROADMAP"
          ? await prisma.plan.findMany({ where: { type: "STRATEGIC", parentPlanId: null }, select: { id: true, title: true, periodLabel: true }, orderBy: { startDate: "desc" } })
          : [],
      siblingPlans: siblings,
      mailConfigured: mailConfigured(),
    });
  } catch (e) {
    next(e);
  }
});

router.put("/:planId", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(3).optional(),
        periodLabel: z.string().min(2).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        status: z.enum(PLAN_STATUSES).optional(),
        summary: z.string().nullable().optional(),
        vision: z.string().nullable().optional(),
        mission: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        isPublished: z.boolean().optional(),
        parentPlanId: z.string().nullable().optional(),
      })
      .parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw notFound("Plan not found");

    if (body.parentPlanId) {
      if (body.parentPlanId === plan.id) throw badRequest("A plan cannot be its own parent");
      const parent = await prisma.plan.findUnique({ where: { id: body.parentPlanId } });
      if (!parent) throw badRequest("Parent plan not found");
      const allowed = plan.type === "AOP" ? "STRATEGIC" : plan.type === "STRATEGIC" ? "ROADMAP" : null;
      if (allowed !== parent.type) {
        throw badRequest(
          plan.type === "ROADMAP"
            ? "A roadmap is the top level and cannot have a parent plan"
            : `A ${plan.type} plan can only be linked to a ${allowed} plan`
        );
      }
    }

    const updated = await prisma.plan.update({
      where: { id: plan.id },
      data: {
        ...body,
        parentPlanId: body.parentPlanId === undefined ? undefined : body.parentPlanId,
      },
    });

    if (body.status === "Active") {
      await prisma.plan.updateMany({
        where: { type: plan.type, status: "Active", id: { not: plan.id } },
        data: { status: "Closed" },
      });
    }

    await syncPeriodFromPlan(plan.id);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/:planId", requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.plan.delete({ where: { id: req.params.planId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/link-child", canWrite, async (req, res, next) => {
  try {
    const { childPlanId } = z.object({ childPlanId: z.string() }).parse(req.body);
    const [plan, child] = await Promise.all([
      prisma.plan.findUnique({ where: { id: req.params.planId } }),
      prisma.plan.findUnique({ where: { id: childPlanId } }),
    ]);
    if (!plan || !child) throw notFound("Plan not found");

    const allowed = plan.type === "STRATEGIC" ? "AOP" : plan.type === "ROADMAP" ? "STRATEGIC" : null;
    if (!allowed || child.type !== allowed) {
      throw badRequest(
        plan.type === "AOP"
          ? "An annual plan sits at the bottom of the hierarchy"
          : `A ${plan.type} plan can only adopt ${allowed} plans`
      );
    }

    const updated = await prisma.plan.update({
      where: { id: child.id },
      data: { parentPlanId: plan.id },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/auto-align", canWrite, async (req, res, next) => {
  try {
    const { childPlanId } = z.object({ childPlanId: z.string() }).parse(req.body);
    const [parentItems, childItems] = await Promise.all([
      prisma.planItem.findMany({ where: { planId: req.params.planId }, select: { id: true, code: true } }),
      prisma.planItem.findMany({
        where: { planId: childPlanId },
        select: { id: true, code: true, parentId: true },
      }),
    ]);

    const byCode = new Map(parentItems.filter((item) => item.code).map((item) => [item.code!, item.id]));
    let linked = 0;

    for (const item of childItems) {
      if (!item.code) continue;
      const pillarCode = item.code.match(/^P\d+/)?.[0];
      const target = byCode.get(item.code) ?? (pillarCode ? byCode.get(pillarCode) : undefined);
      if (!target) continue;
      await prisma.planItem.update({ where: { id: item.id }, data: { linkedItemId: target } });
      linked += 1;
    }

    res.json({ linked });
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/duplicate", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().optional(),
        periodLabel: z.string().min(1),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        status: z.enum(PLAN_STATUSES).default("Draft"),
        parentPlanId: z.string().nullable().optional(),
        isPublished: z.boolean().default(false),
        copyActuals: z.boolean().default(false),
        keepDates: z.boolean().default(false),
      })
      .parse(req.body);

    const source = await prisma.plan.findUnique({
      where: { id: req.params.planId },
      include: { items: { include: { targets: true } } },
    });
    if (!source) throw notFound("Plan not found");

    const existing = await prisma.plan.findUnique({
      where: { type_periodLabel: { type: source.type, periodLabel: body.periodLabel } },
    });
    if (existing) {
      return res.status(409).json({
        message: `A ${source.type} plan for ${body.periodLabel} already exists.`,
        planId: existing.id,
      });
    }

    const plan = await prisma.plan.create({
      data: {
        type: source.type,
        title: body.title || `${source.title.split(" ").slice(0, -1).join(" ")} ${body.periodLabel}`.trim(),
        periodLabel: body.periodLabel,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
        summary: source.summary,
        vision: source.vision,
        mission: source.mission,
        owner: source.owner,
        parentPlanId: body.parentPlanId ?? null,
        isPublished: body.isPublished,
        createdBy: req.user!.username,
      },
    });

    const byParent = new Map<string | null, typeof source.items>();
    for (const item of source.items) {
      const key = item.parentId ?? null;
      const bucket = byParent.get(key) ?? [];
      bucket.push(item);
      byParent.set(key, bucket);
    }
    for (const bucket of byParent.values()) bucket.sort((a, b) => a.sortOrder - b.sortOrder);

    let copied = 0;
    const cloneLevel = async (oldParentId: string | null, newParentId: string | null) => {
      const items = byParent.get(oldParentId) ?? [];
      let order = 0;
      for (const item of items) {
        const copy = await prisma.planItem.create({
          data: {
            planId: plan.id,
            parentId: newParentId,
            kind: item.kind,
            code: item.code,
            title: item.title,
            description: item.description,
            owner: item.owner,
            sortOrder: order,
            unit: item.unit,
            baseline: item.baseline,
            targetValue: item.targetValue,
            currentValue: body.copyActuals ? item.currentValue : null,
            direction: item.direction,
            frequency: item.frequency,
            dataSource: item.dataSource,
            isFeatured: item.isFeatured,
            startDate: body.keepDates ? item.startDate : null,
            endDate: body.keepDates ? item.endDate : null,
            budget: item.budget,
            status: "Planned",
            progress: 0,
            targets: item.targets.length
              ? {
                  create: item.targets.map((target) => ({
                    periodLabel: target.periodLabel,
                    target: target.target,
                    targetLabel: target.targetLabel,
                    actual: body.copyActuals ? target.actual : null,
                    note: null,
                  })),
                }
              : undefined,
          },
        });
        copied += 1;
        await cloneLevel(item.id, copy.id);
        order += 1;
      }
    };
    await cloneLevel(null, null);

    await ensurePlanPeriod(plan.id, req.user!.username);
    res.status(201).json({ plan, items: copied });
  } catch (e) {
    next(e);
  }
});

/**
 * Prepare the next period of this plan's type: carry structure, unfinished
 * activities, budgets and KPI definitions, re-base each KPI on its last actual
 * and re-date every reading into the new period.
 *
 * Body { dryRun: true } (the default) returns the diff without writing.
 */
router.post("/:planId/rollover", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        dryRun: z.boolean().default(true),
        label: z.string().min(2).optional(),
        labelAlt: z.string().nullable().optional(),
        title: z.string().min(3).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        includeCompleted: z.boolean().optional(),
        keepProgress: z.boolean().optional(),
        copyActuals: z.boolean().optional(),
        parentPlanId: z.string().nullable().optional(),
        generateReports: z.boolean().optional(),
        prepareParentPeriod: z.boolean().optional(),
      })
      .parse(req.body ?? {});

    if (body.startDate && body.endDate && body.endDate <= body.startDate) {
      throw badRequest("The new period must end after it starts");
    }

    const { dryRun, ...options } = body;
    const createdBy = req.user!.username;

    if (dryRun) {
      const prepared = await prepareRollover(req.params.planId, { ...options, createdBy });
      return res.json({
        dryRun: true,
        preview: prepared.plan,
        periodId: prepared.successorPeriodId,
      });
    }

    const result = await commitRollover(req.params.planId, { ...options, createdBy });
    res.status(201).json({ dryRun: false, ...result });
  } catch (e) {
    next(e);
  }
});

// ─── Approval workflow, revisions, bulk actuals and export ────────────────────

async function snapshotPlan(planId: string, createdBy: string, note?: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { items: { include: { targets: true }, orderBy: { sortOrder: "asc" } }, reports: true },
  });
  if (!plan) return null;

  const revision = plan.revision + 1;
  const snapshot = JSON.parse(JSON.stringify({ plan, items: plan.items, reports: plan.reports }));

  await prisma.planRevision.create({
    data: {
      planId,
      revision,
      status: plan.status,
      note: note ?? null,
      createdBy,
      snapshot: snapshot as Prisma.InputJsonValue,
    },
  });
  await prisma.plan.update({ where: { id: planId }, data: { revision } });
  return revision;
}

router.post("/:planId/transition", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        action: z.enum(["submit", "approve", "publish", "reopen"]),
        note: z.string().max(1000).optional(),
      })
      .parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw notFound("Plan not found");
    const isAdmin = req.user!.role === "admin";

    if (body.action !== "submit" && !isAdmin) {
      return res.status(403).json({ message: "Only an administrator can approve, publish or reopen a plan" });
    }

    let data: Prisma.PlanUpdateInput = {};
    if (body.action === "submit") {
      if (!["Draft", "Closed"].includes(plan.status)) throw badRequest("Only a draft plan can be submitted for review");
      data = {
        status: "In Review",
        reviewedBy: req.user!.username,
        reviewedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
      };
    } else if (body.action === "approve") {
      if (plan.status !== "In Review") throw badRequest("Only a plan in review can be approved");
      data = { status: "Approved", approvedBy: req.user!.username, approvedAt: new Date() };
    } else if (body.action === "publish") {
      if (!["Approved", "Active"].includes(plan.status)) throw badRequest("Approve the plan before publishing");
      data = { status: "Active", isPublished: true, publishedAt: new Date() };
    } else {
      data = { status: "Draft", isPublished: false, approvedBy: null, approvedAt: null };
    }

    const updated = await prisma.plan.update({ where: { id: plan.id }, data });

    if (body.action === "publish") {
      await prisma.plan.updateMany({
        where: { type: plan.type, status: "Active", id: { not: plan.id } },
        data: { status: "Closed" },
      });
    }

    await syncPeriodFromPlan(plan.id);

    let revision: number | null = null;
    if (body.action === "approve" || body.action === "publish") {
      revision = await snapshotPlan(plan.id, req.user!.username, body.note ?? body.action);
    }

    res.json({ plan: updated, revision });
  } catch (e) {
    next(e);
  }
});

router.get("/:planId/revisions", async (req, res, next) => {
  try {
    const revisions = await prisma.planRevision.findMany({
      where: { planId: req.params.planId },
      select: { id: true, revision: true, status: true, note: true, createdBy: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(revisions);
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/revisions", canWrite, async (req, res, next) => {
  try {
    const { note } = z.object({ note: z.string().max(1000).optional() }).parse(req.body ?? {});
    const revision = await snapshotPlan(req.params.planId, req.user!.username, note ?? "Manual snapshot");
    if (!revision) throw notFound("Plan not found");
    res.status(201).json({ revision });
  } catch (e) {
    next(e);
  }
});

router.get("/:planId/revisions/:revisionId", async (req, res, next) => {
  try {
    const revision = await prisma.planRevision.findUnique({ where: { id: req.params.revisionId } });
    if (!revision || revision.planId !== req.params.planId) throw notFound("Revision not found");
    res.json(revision);
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/actuals", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        periodLabel: z.string().min(1).max(40),
        updates: z
          .array(z.object({ itemId: z.string(), actual: z.number().nullable() }))
          .min(1)
          .max(500),
      })
      .parse(req.body);

    const items = await prisma.planItem.findMany({
      where: { planId: req.params.planId, id: { in: body.updates.map((update) => update.itemId) } },
      select: { id: true },
    });
    const allowed = new Set(items.map((item) => item.id));
    const currentYear = String(new Date().getFullYear());
    let saved = 0;

    for (const update of body.updates) {
      if (!allowed.has(update.itemId)) continue;
      const existing = await prisma.planKpiTarget.findUnique({
        where: { itemId_periodLabel: { itemId: update.itemId, periodLabel: body.periodLabel } },
      });
      if (existing) {
        await prisma.planKpiTarget.update({ where: { id: existing.id }, data: { actual: update.actual } });
      } else {
        await prisma.planKpiTarget.create({
          data: { itemId: update.itemId, periodLabel: body.periodLabel, actual: update.actual },
        });
      }
      if (update.actual != null && body.periodLabel.includes(currentYear)) {
        await prisma.planItem.update({ where: { id: update.itemId }, data: { currentValue: update.actual } });
      }
      saved += 1;
    }

    res.json({ saved });
  } catch (e) {
    next(e);
  }
});

router.get("/:planId/export.csv", async (req, res, next) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: req.params.planId },
      include: {
        items: { include: { targets: true }, orderBy: { sortOrder: "asc" } },
        reports: { orderBy: { dueDate: "asc" } },
      },
    });
    if (!plan) throw notFound("Plan not found");
    const progress = await computePlanProgress(plan.id);

    const cell = (value: unknown) => {
      const text = value == null ? "" : String(value);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows: string[] = [];
    rows.push(
      ["Type", "Code", "Item", "Kind", "Owner", "Unit", "Target", "Current", "Status", "Progress %", "Period targets"]
        .map(cell)
        .join(",")
    );
    for (const item of plan.items) {
      rows.push(
        [
          plan.type,
          item.code ?? "",
          item.title,
          item.kind,
          item.owner ?? "",
          item.unit ?? "",
          item.targetValue ?? "",
          item.currentValue ?? "",
          item.status,
          progress?.items[item.id]?.progress ?? 0,
          item.targets
            .map(
              (target) =>
                `${target.periodLabel}: ${target.target ?? ""}${
                  target.actual != null ? ` (actual ${target.actual})` : ""
                }`
            )
            .join(" | "),
        ]
          .map(cell)
          .join(",")
      );
    }
    rows.push("");
    rows.push(["Reporting deadlines"].join(","));
    rows.push(["Period", "Report", "Type", "Due date", "Status"].map(cell).join(","));
    for (const report of plan.reports) {
      rows.push(
        [report.periodLabel, report.title, report.type, report.dueDate.toISOString().slice(0, 10), report.status]
          .map(cell)
          .join(",")
      );
    }

    const filename = `${plan.type.toLowerCase()}-${plan.periodLabel.replace(/[^a-zA-Z0-9]+/g, "-")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + rows.join("\r\n"));
  } catch (e) {
    next(e);
  }
});

/**
 * Import plan items into a selected annual, strategic or roadmap plan.
 * Rows are matched by code (preferred) or exact title, so re-uploading a
 * corrected sheet updates items instead of creating duplicates. Parent codes
 * are resolved in a second pass so a child may appear before its parent.
 */
router.post("/:planId/import", canWrite, csvUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Choose a CSV file to upload." });
    }
    const plan = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw notFound("Plan not found");

    let rows: Record<string, unknown>[];
    try {
      rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
    } catch {
      return res.status(400).json({ message: "The file is not a valid CSV. Download the template and try again." });
    }
    if (!rows.length) return res.status(400).json({ message: "The CSV has no plan-item rows." });

    const existingItems = await prisma.planItem.findMany({ where: { planId: plan.id } });
    const existingById = new Map(existingItems.map((item) => [item.id, item]));
    const byCode = new Map<string, string>();
    const byTitle = new Map<string, string>();
    for (const item of existingItems) {
      if (item.code) byCode.set(item.code.trim().toLowerCase(), item.id);
      byTitle.set(item.title.trim().toLowerCase(), item.id);
    }
    const snapshot: { created: string[]; updated: { id: string; before: unknown }[]; targetsCreated: string[]; targetsUpdated: { id: string; before: unknown }[] } = {
      created: [], updated: [], targetsCreated: [], targetsUpdated: [],
    };
    let nextSort = existingItems.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const imported: { itemId: string; parentCode: string; targetPeriod: string; row: Record<string, unknown>; line: number }[] = [];

    for (const [index, raw] of rows.entries()) {
      const row = normaliseCsvRow(raw);
      const line = index + 2;
      const title = csvText(row.title);
      const kind = (csvText(row.kind) || "ACTIVITY").toUpperCase();
      if (!title) {
        skipped++;
        errors.push(`Row ${line}: title is required.`);
        continue;
      }
      if (!ITEM_KINDS.includes(kind as (typeof ITEM_KINDS)[number])) {
        skipped++;
        errors.push(`Row ${line}: kind must be one of ${ITEM_KINDS.join(", ")}.`);
        continue;
      }

      const code = csvText(row.code) || null;
      const existingId = (code ? byCode.get(code.toLowerCase()) : undefined) || byTitle.get(title.toLowerCase());
      const startDate = csvText(row.startdate) ? csvDate(row.startdate) : null;
      const endDate = csvText(row.enddate) ? csvDate(row.enddate) : null;
      if (csvText(row.startdate) && !startDate) {
        skipped++;
        errors.push(`Row ${line}: startDate is not a valid date.`);
        continue;
      }
      if (csvText(row.enddate) && !endDate) {
        skipped++;
        errors.push(`Row ${line}: endDate is not a valid date.`);
        continue;
      }

      const optional: Record<string, unknown> = {};
      const setText = (column: string, field: string) => {
        if (csvText(row[column])) optional[field] = csvText(row[column]);
      };
      const setNumber = (column: string, field: string) => {
        if (!csvText(row[column])) return;
        const value = csvNumber(row[column]);
        if (value != null && !Number.isNaN(value)) optional[field] = value;
      };
      setText("description", "description");
      setText("owner", "owner");
      setText("status", "status");
      setText("unit", "unit");
      setText("direction", "direction");
      setText("frequency", "frequency");
      setText("datasource", "dataSource");
      setNumber("progress", "progress");
      setNumber("budget", "budget");
      setNumber("baseline", "baseline");
      setNumber("targetvalue", "targetValue");
      setNumber("currentvalue", "currentValue");
      if (csvText(row.isfeatured)) optional.isFeatured = csvBoolean(row.isfeatured);
      if (startDate) optional.startDate = startDate;
      if (endDate) optional.endDate = endDate;
      if (optional.progress != null) optional.progress = Math.max(0, Math.min(100, Math.round(Number(optional.progress))));

      let itemId: string;
      if (existingId) {
        await prisma.planItem.update({
          where: { id: existingId },
          data: { title, kind, ...(code ? { code } : {}), ...optional },
        });
        itemId = existingId;
        snapshot.updated.push({ id: existingId, before: existingById.get(existingId) });
        updated++;
      } else {
        const item = await prisma.planItem.create({
          data: {
            planId: plan.id,
            code,
            title,
            kind,
            sortOrder: nextSort++,
            ...optional,
          },
        });
        itemId = item.id;
        snapshot.created.push(item.id);
        created++;
      }

      if (code) {
        byCode.set(code.toLowerCase(), itemId);
        if (!existingId) byTitle.set(title.toLowerCase(), itemId);
      } else if (!existingId) {
        byTitle.set(title.toLowerCase(), itemId);
      }

      imported.push({
        itemId,
        parentCode: csvText(row.parentcode),
        targetPeriod: csvText(row.targetperiod),
        row,
        line,
      });
    }

    // Resolve parent codes after every row exists.
    for (const entry of imported) {
      if (!entry.parentCode) continue;
      const parentId = byCode.get(entry.parentCode.toLowerCase());
      if (!parentId) {
        errors.push(`Row ${entry.line}: parentCode "${entry.parentCode}" was not found in this plan.`);
        continue;
      }
      if (parentId === entry.itemId) {
        errors.push(`Row ${entry.line}: an item cannot use its own code as parentCode.`);
        continue;
      }
      await prisma.planItem.update({ where: { id: entry.itemId }, data: { parentId } });
    }

    // Optional KPI reading on the same row.
    let targets = 0;
    for (const entry of imported) {
      if (!entry.targetPeriod) continue;
      const target = csvNumber(entry.row.target);
      const actual = csvNumber(entry.row.actual);
      const targetLabel = csvText(entry.row.targetlabel) || null;
      const note = csvText(entry.row.note) || null;
      if (target == null && actual == null && !targetLabel && !note) continue;
      const before = await prisma.planKpiTarget.findUnique({
        where: { itemId_periodLabel: { itemId: entry.itemId, periodLabel: entry.targetPeriod } },
      });
      const saved = await prisma.planKpiTarget.upsert({
        where: { itemId_periodLabel: { itemId: entry.itemId, periodLabel: entry.targetPeriod } },
        create: { itemId: entry.itemId, periodLabel: entry.targetPeriod, target, actual, targetLabel, note },
        update: { target, actual, targetLabel, note },
      });
      if (before) snapshot.targetsUpdated.push({ id: saved.id, before });
      else snapshot.targetsCreated.push(saved.id);
      targets++;
    }

    const summary = { created, updated, skipped, total: rows.length, targets, errors, planTitle: plan.title, type: plan.type };
    const batch = await recordImport({
      module: "PLAN_ITEMS",
      planId: plan.id,
      user: req.user!,
      fileName: req.file.originalname,
      summary,
      snapshot,
    });
    res.json({
      planId: plan.id,
      batchId: batch.id,
      ...summary,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Dry run: validate the same CSV the importer accepts and report what would be
 * created, updated or rejected, without writing anything to the plan.
 */
router.post("/:planId/import/preview", canWrite, csvUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Choose a CSV file to preview." });
    }
    const plan = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw notFound("Plan not found");

    let rows: Record<string, unknown>[];
    try {
      rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
    } catch {
      return res.status(400).json({ message: "The file is not a valid CSV. Download the template and try again." });
    }
    if (!rows.length) return res.status(400).json({ message: "The CSV has no plan-item rows." });

    const existingItems = await prisma.planItem.findMany({ where: { planId: plan.id } });
    const byCode = new Map<string, string>();
    const byTitle = new Map<string, string>();
    for (const item of existingItems) {
      if (item.code) byCode.set(item.code.trim().toLowerCase(), item.id);
      byTitle.set(item.title.trim().toLowerCase(), item.id);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const preview: { line: number; action: "create" | "update" | "skip"; title: string; kind: string }[] = [];

    for (const [index, raw] of rows.entries()) {
      const row = normaliseCsvRow(raw);
      const line = index + 2;
      const title = csvText(row.title);
      const kind = (csvText(row.kind) || "ACTIVITY").toUpperCase();
      if (!title) {
        skipped++; errors.push(`Row ${line}: title is required.`);
        preview.push({ line, action: "skip", title: "(no title)", kind });
        continue;
      }
      if (!ITEM_KINDS.includes(kind as (typeof ITEM_KINDS)[number])) {
        skipped++;
        errors.push(`Row ${line}: kind must be one of ${ITEM_KINDS.join(", ")}.`);
        preview.push({ line, action: "skip", title, kind });
        continue;
      }
      if (csvText(row.startdate) && !csvDate(row.startdate)) {
        skipped++; errors.push(`Row ${line}: startDate is not a valid date.`);
        preview.push({ line, action: "skip", title, kind });
        continue;
      }
      if (csvText(row.enddate) && !csvDate(row.enddate)) {
        skipped++; errors.push(`Row ${line}: endDate is not a valid date.`);
        preview.push({ line, action: "skip", title, kind });
        continue;
      }
      const code = csvText(row.code);
      const existingId = (code ? byCode.get(code.toLowerCase()) : undefined) || byTitle.get(title.toLowerCase());
      if (existingId) {
        updated++;
        preview.push({ line, action: "update", title, kind });
      } else {
        created++;
        preview.push({ line, action: "create", title, kind });
      }
      if (code && !existingId) byCode.set(code.toLowerCase(), `preview-${line}`);
    }

    // Parent codes may appear on a later row, so check the whole sheet first.
    const sheetCodes = new Set(
      rows
        .map((raw) => csvText(normaliseCsvRow(raw).code).toLowerCase())
        .filter(Boolean)
    );
    const missingParents = [...new Set(
      rows
        .map((raw) => csvText(normaliseCsvRow(raw).parentcode))
        .filter(Boolean)
        .filter((code) => !byCode.has(code.toLowerCase()) && !sheetCodes.has(code.toLowerCase()))
    )];
    for (const code of missingParents) {
      errors.push(`parentCode "${code}" was not found in this plan.`);
    }

    res.json({
      preview: true,
      planTitle: plan.title,
      total: rows.length,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 50),
      rows: preview.slice(0, 100),
      missingParents,
    });
  } catch (e) { next(e); }
});

router.get("/:planId/imports", canWrite, async (req, res, next) => {
  try {
    res.json(await listImports("PLAN_ITEMS", req.params.planId));
  } catch (e) { next(e); }
});

router.post("/imports/:batchId/rollback", canWrite, async (req: any, res, next) => {
  try {
    res.json(await rollbackImport(req.params.batchId, req.user!));
  } catch (e) { next(e); }
});

// ─── Plan items ───────────────────────────────────────────────────────────────

router.post("/:planId/items", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        kind: itemKindSchema,
        parentId: z.string().nullable().optional(),
        linkedItemId: z.string().nullable().optional(),
        code: z.string().optional().nullable(),
        title: z.string().min(2),
        description: z.string().optional().nullable(),
        owner: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        baseline: z.number().nullable().optional(),
        targetValue: z.number().nullable().optional(),
        currentValue: z.number().nullable().optional(),
        direction: z.string().optional().nullable(),
        frequency: z.string().optional().nullable(),
        dataSource: z.string().optional().nullable(),
        isFeatured: z.boolean().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        budget: z.number().nullable().optional(),
        status: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        targets: z
          .array(
            z.object({
              periodLabel: z.string().min(1),
              target: z.number().nullable().optional(),
              targetLabel: z.string().nullable().optional(),
              actual: z.number().nullable().optional(),
              note: z.string().nullable().optional(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw notFound("Plan not found");

    if (body.parentId) {
      const parent = await prisma.planItem.findUnique({ where: { id: body.parentId } });
      if (!parent || parent.planId !== plan.id) throw badRequest("Parent item is not part of this plan");
    }

    const last = await prisma.planItem.findFirst({
      where: { planId: plan.id, parentId: body.parentId ?? null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const { targets, ...rest } = body;
    const item = await prisma.planItem.create({
      data: {
        ...rest,
        planId: plan.id,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        targets: targets?.length
          ? { create: targets.map((target) => ({ ...target })) }
          : undefined,
      },
      include: { targets: true },
    });

    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.put("/items/:itemId", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        kind: itemKindSchema.optional(),
        parentId: z.string().nullable().optional(),
        linkedItemId: z.string().nullable().optional(),
        code: z.string().nullable().optional(),
        title: z.string().min(2).optional(),
        description: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
        unit: z.string().nullable().optional(),
        baseline: z.number().nullable().optional(),
        targetValue: z.number().nullable().optional(),
        currentValue: z.number().nullable().optional(),
        direction: z.string().nullable().optional(),
        frequency: z.string().nullable().optional(),
        dataSource: z.string().nullable().optional(),
        isFeatured: z.boolean().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        budget: z.number().nullable().optional(),
        status: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
      })
      .parse(req.body);

    const item = await prisma.planItem.findUnique({ where: { id: req.params.itemId } });
    if (!item) throw notFound("Item not found");

    if (body.parentId) {
      if (body.parentId === item.id) throw badRequest("An item cannot be its own parent");
      const parent = await prisma.planItem.findUnique({ where: { id: body.parentId } });
      if (!parent || parent.planId !== item.planId) throw badRequest("Parent item is not part of this plan");
    }

    if (body.linkedItemId) {
      const linked = await prisma.planItem.findUnique({ where: { id: body.linkedItemId } });
      if (!linked) throw badRequest("Linked item not found");
      if (linked.planId === item.planId) throw badRequest("Link an item in the associated plan, not the same plan");
    }

    const updated = await prisma.planItem.update({
      where: { id: item.id },
      data: body,
      include: { targets: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/items/:itemId", canWrite, async (req, res, next) => {
  try {
    await prisma.planItem.delete({ where: { id: req.params.itemId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.put("/items/:itemId/targets", canWrite, async (req, res, next) => {
  try {
    const { targets } = z
      .object({
        targets: z.array(
          z.object({
            periodLabel: z.string().min(1),
            target: z.number().nullable().optional(),
            targetLabel: z.string().nullable().optional(),
            actual: z.number().nullable().optional(),
            note: z.string().nullable().optional(),
          })
        ),
      })
      .parse(req.body);

    const item = await prisma.planItem.findUnique({ where: { id: req.params.itemId } });
    if (!item) throw notFound("Item not found");

    await prisma.$transaction([
      prisma.planKpiTarget.deleteMany({ where: { itemId: item.id } }),
      prisma.planKpiTarget.createMany({
        data: targets.map((target) => ({
          itemId: item.id,
          periodLabel: target.periodLabel,
          target: target.target ?? null,
          targetLabel: target.targetLabel ?? null,
          actual: target.actual ?? null,
          note: target.note ?? null,
        })),
      }),
    ]);

    const updated = await prisma.planItem.findUnique({
      where: { id: item.id },
      include: { targets: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ─── Reporting obligations ────────────────────────────────────────────────────

router.post("/:planId/reports", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(2),
        type: z.enum(REPORT_TYPES).default("QUARTERLY"),
        periodLabel: z.string().min(1),
        dueDate: z.coerce.date(),
        owner: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
      .parse(req.body);

    const report = await prisma.planReport.create({
      data: { ...body, planId: req.params.planId },
    });
    res.status(201).json(report);
  } catch (e) {
    next(e);
  }
});

router.post("/:planId/reports/generate", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        frequency: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        dueDaysAfterPeriod: z.number().min(0).max(90).default(15),
        owner: z.string().optional().nullable(),
      })
      .parse(req.body);

    const result = await generatePlanReports(req.params.planId, {
      frequency: body.frequency,
      startDate: body.startDate ?? undefined,
      endDate: body.endDate ?? undefined,
      dueDaysAfterPeriod: body.dueDaysAfterPeriod,
      owner: body.owner,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.put("/reports/:reportId", canWrite, async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(2).optional(),
        type: z.enum(REPORT_TYPES).optional(),
        periodLabel: z.string().min(1).optional(),
        dueDate: z.coerce.date().optional(),
        owner: z.string().nullable().optional(),
        status: z.enum(REPORT_STATUSES).optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(req.body);

    const report = await prisma.planReport.update({
      where: { id: req.params.reportId },
      data: {
        ...body,
        ...(body.status === "Submitted"
          ? { submittedAt: new Date(), submittedBy: req.user!.username }
          : body.status
          ? { submittedAt: null, submittedBy: null }
          : {}),
      },
    });
    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.delete("/reports/:reportId", canWrite, async (req, res, next) => {
  try {
    await prisma.planReport.delete({ where: { id: req.params.reportId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
