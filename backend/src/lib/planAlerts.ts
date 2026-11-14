import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPlanAlertSettings, PlanAlertSettings } from "./planSettings";
import { sendMail } from "./mailer";

type Severity = "INFO" | "WARNING" | "CRITICAL";
const RANK: Record<Severity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2 };
const DAY = 86_400_000;

type PlanForAlerts = Prisma.PlanGetPayload<{
  include: { items: { include: { targets: true } }; reports: true };
}>;

interface Candidate {
  planId: string;
  itemId: string | null;
  reportId: string | null;
  dedupeKey: string;
  periodLabel: string;
  severity: Severity;
  rule: string;
  title: string;
  message: string;
  expected?: number;
  actual?: number;
  progress?: number;
  owner?: string | null;
}

export interface AlertRunSummary {
  created: number;
  updated: number;
  resolved: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  evaluated: { plans: number; kpis: number; milestones: number; reports: number };
}

const round = (value: number) => Math.round(value * 10) / 10;
const pct = (value: number) => `${Math.round(value)}%`;

function formatNumber(value: number, unit?: string | null): string {
  const formatted =
    Math.abs(value) >= 1000
      ? Math.round(value).toLocaleString("en-US")
      : String(Math.round(value * 10) / 10);
  return unit ? `${formatted} ${unit}` : formatted;
}

function typePath(type: string): string {
  if (type === "AOP") return "aop";
  if (type === "ROADMAP") return "roadmap";
  return "strategic-plan";
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
}

function evaluatePlan(plan: PlanForAlerts, asOf: Date, settings: PlanAlertSettings): Candidate[] {
  const candidates: Candidate[] = [];
  const today = asOf.getTime();
  const start = new Date(plan.startDate).getTime();
  const end = new Date(plan.endDate).getTime();
  const elapsed = end > start ? Math.max(0, Math.min(1, (today - start) / (end - start))) : 0;
  const currentYear = asOf.getFullYear();

  for (const item of plan.items) {
    if (item.kind === "KPI") {
      const target = item.targetValue;
      const numericReadings = item.targets.filter(
        (reading) => reading.target != null && reading.target !== 0
      );

      // Annual target rows for years that have already closed.
      for (const reading of numericReadings) {
        const year = Number(reading.periodLabel);
        if (!Number.isInteger(year) || year >= currentYear) continue;
        const actual = reading.actual ?? 0;
        const gapPct = ((reading.target! - actual) / reading.target!) * 100;
        if (gapPct <= 0) continue;
        candidates.push({
          planId: plan.id,
          itemId: item.id,
          reportId: null,
          dedupeKey: `kpi:${item.id}:${reading.periodLabel}:TARGET_MISSED`,
          periodLabel: reading.periodLabel,
          severity: gapPct >= settings.criticalGapPct ? "CRITICAL" : "WARNING",
          rule: "TARGET_MISSED",
          title: `Target missed: ${item.title}`,
          message: `${item.title} closed ${reading.periodLabel} at ${formatNumber(
            actual,
            item.unit
          )} against a target of ${formatNumber(reading.target!, item.unit)} (${pct(gapPct)} short).`,
          expected: reading.target!,
          actual,
          progress: round((actual / reading.target!) * 100),
          owner: item.owner,
        });
      }

      // Pace against the pro-rata target for the current plan period.
      if (target != null && target !== 0 && elapsed > 0.05) {
        const currentReading = numericReadings.find(
          (reading) => reading.periodLabel === String(currentYear)
        );
        const actual = currentReading?.actual ?? item.currentValue;
        if (actual != null) {
          const expected = target * elapsed;
          const gapPct = ((expected - actual) / expected) * 100;
          if (gapPct > settings.paceTolerancePct) {
            candidates.push({
              planId: plan.id,
              itemId: item.id,
              reportId: null,
              dedupeKey: `kpi:${item.id}:${currentYear}:BEHIND_PACE`,
              periodLabel: String(currentYear),
              severity: gapPct >= settings.criticalGapPct ? "CRITICAL" : "WARNING",
              rule: "BEHIND_PACE",
              title: `Behind target: ${item.title}`,
              message: `${item.title} stands at ${formatNumber(actual, item.unit)} against a pro-rata target of ${formatNumber(
                expected,
                item.unit
              )} (${pct(elapsed * 100)} through ${plan.periodLabel}).`,
              expected: round(expected),
              actual,
              progress: round((actual / target) * 100),
              owner: item.owner,
            });
          }
        }
      }
    }

    if ((item.kind === "ACTIVITY" || item.kind === "MILESTONE") && item.endDate && item.status !== "Completed") {
      const due = new Date(item.endDate).getTime();
      const daysLeft = Math.ceil((due - today) / DAY);
      if (daysLeft < 0) {
        candidates.push({
          planId: plan.id,
          itemId: item.id,
          reportId: null,
          dedupeKey: `item:${item.id}:OVERDUE`,
          periodLabel: "",
          severity: daysLeft <= -7 ? "CRITICAL" : "WARNING",
          rule: "OVERDUE",
          title: `Overdue: ${item.title}`,
          message: `${item.title} was due ${new Date(item.endDate).toISOString().slice(0, 10)} and is ${Math.abs(
            daysLeft
          )} day(s) overdue (status: ${item.status}).`,
          progress: item.progress,
          owner: item.owner,
        });
      } else if (daysLeft <= settings.dueSoonDays) {
        candidates.push({
          planId: plan.id,
          itemId: item.id,
          reportId: null,
          dedupeKey: `item:${item.id}:DUE_SOON`,
          periodLabel: "",
          severity: daysLeft <= Math.min(3, settings.dueSoonDays) ? "WARNING" : "INFO",
          rule: "DUE_SOON",
          title: `Due soon: ${item.title}`,
          message: `${item.title} is due ${new Date(item.endDate).toISOString().slice(0, 10)} (${daysLeft} day(s) left, status: ${item.status}).`,
          progress: item.progress,
          owner: item.owner,
        });
      }
    }
  }

  // Reporting obligations.
  for (const report of plan.reports) {
    if (report.status === "Submitted" || report.status === "Approved" || report.status === "Waived") {
      continue;
    }
    const due = new Date(report.dueDate).getTime();
    const daysLeft = Math.ceil((due - today) / DAY);
    if (daysLeft < 0) {
      candidates.push({
        planId: plan.id,
        itemId: null,
        reportId: report.id,
        dedupeKey: `report:${report.id}:OVERDUE`,
        periodLabel: report.periodLabel,
        severity: daysLeft <= -7 ? "CRITICAL" : "WARNING",
        rule: "OVERDUE",
        title: `Reporting deadline missed: ${report.title}`,
        message: `${report.title} was due ${new Date(report.dueDate).toISOString().slice(0, 10)} and has not been submitted (${Math.abs(
          daysLeft
        )} day(s) late).`,
        owner: report.owner,
      });
    } else if (daysLeft <= settings.dueSoonDays) {
      candidates.push({
        planId: plan.id,
        itemId: null,
        reportId: report.id,
        dedupeKey: `report:${report.id}:REPORT_DUE`,
        periodLabel: report.periodLabel,
        severity: daysLeft <= Math.min(3, settings.dueSoonDays) ? "WARNING" : "INFO",
        rule: "REPORT_DUE",
        title: `Report due: ${report.title}`,
        message: `${report.title} is due ${new Date(report.dueDate).toISOString().slice(0, 10)} (${daysLeft} day(s) left).`,
        owner: report.owner,
      });
    }
  }

  return candidates;
}

async function resolveRecipients(
  settings: PlanAlertSettings,
  ownerUsernames: (string | null | undefined)[]
): Promise<string[]> {
  const usernames = Array.from(
    new Set(ownerUsernames.filter((name): name is string => Boolean(name && name.trim())))
  );
  const emails = new Set<string>(settings.recipients);

  try {
    const owners = usernames.length
      ? await prisma.user.findMany({
          where: { username: { in: usernames } },
          select: { email: true },
        })
      : [];
    for (const owner of owners) if (owner.email) emails.add(owner.email);
  } catch (error) {
    console.error("[plan-alerts] owner lookup failed", error);
  }

  if (settings.includeAdmins) {
    const admins = await prisma.user.findMany({
      where: { role: "admin", email: { not: null } },
      select: { email: true },
    });
    for (const admin of admins) if (admin.email) emails.add(admin.email);
  }

  return Array.from(emails);
}

function emailBody(candidate: Candidate, plan: PlanForAlerts): { subject: string; html: string; text: string } {
  const color =
    candidate.severity === "CRITICAL" ? "#b91c1c" : candidate.severity === "WARNING" ? "#b45309" : "#0f766e";
  const link = `${appUrl()}/database/${typePath(plan.type)}?plan=${plan.id}`;
  const subject = `[${candidate.severity}] ${plan.title}: ${candidate.title}`;
  const rows: [string, string][] = [
    ["Plan", `${plan.title} (${plan.periodLabel})`],
    ["Severity", candidate.severity],
    ["Alert", candidate.rule.replace(/_/g, " ")],
  ];
  if (candidate.periodLabel) rows.push(["Period", candidate.periodLabel]);
  if (candidate.expected != null) rows.push(["Target", round(candidate.expected).toLocaleString("en-US")]);
  if (candidate.actual != null) rows.push(["Actual", round(candidate.actual).toLocaleString("en-US")]);
  if (candidate.progress != null) rows.push(["Completion", `${Math.round(candidate.progress)}%`]);

  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#1f2937">
  <div style="max-width:620px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${color};height:6px"></div>
      <div style="padding:24px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">BEMS &middot; Plan performance alert</p>
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${candidate.title}</h1>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151">${candidate.message}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="padding:7px 0;color:#6b7280;width:38%">${label}</td><td style="padding:7px 0;font-weight:600">${value}</td></tr>`
            )
            .join("")}
        </table>
        <a href="${link}" style="display:inline-block;margin-top:20px;background:${color};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Open the plan</a>
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;margin-top:14px">Automated message from the BEMS plan management system. Manage recipients and thresholds in Admin &rarr; Plan Alerts.</p>
  </div></body></html>`;

  const text = [
    `${candidate.severity}: ${candidate.title}`,
    candidate.message,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open: ${link}`,
  ].join("\n");

  return { subject, html, text };
}

/** Evaluate every active plan, persist alert state, notify owners and send email. */
export async function runPlanAlerts(
  options: { planId?: string; sendEmail?: boolean; asOf?: Date } = {}
): Promise<AlertRunSummary> {
  const asOf = options.asOf ?? new Date();
  const sendEmail = options.sendEmail !== false;
  const settings = await getPlanAlertSettings();

  const plans = await prisma.plan.findMany({
    where: { status: "Active", ...(options.planId ? { id: options.planId } : {}) },
    include: { items: { include: { targets: true } }, reports: true },
  });

  const summary: AlertRunSummary = {
    created: 0,
    updated: 0,
    resolved: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    evaluated: { plans: plans.length, kpis: 0, milestones: 0, reports: 0 },
  };

  for (const plan of plans) {
    summary.evaluated.kpis += plan.items.filter((item) => item.kind === "KPI").length;
    summary.evaluated.milestones += plan.items.filter(
      (item) => item.kind === "ACTIVITY" || item.kind === "MILESTONE"
    ).length;
    summary.evaluated.reports += plan.reports.length;

    const candidates = evaluatePlan(plan, asOf, settings);
    const keys = candidates.map((candidate) => candidate.dedupeKey);

    for (const candidate of candidates) {
      const existing = await prisma.planAlert.findUnique({
        where: { dedupeKey: candidate.dedupeKey },
      });
      const escalated =
        Boolean(existing) &&
        RANK[candidate.severity] > RANK[(existing!.severity as Severity) ?? "INFO"];

      const alert = await prisma.planAlert.upsert({
        where: { dedupeKey: candidate.dedupeKey },
        create: {
          planId: candidate.planId,
          itemId: candidate.itemId,
          reportId: candidate.reportId,
          tenantId: (plan as any).tenantId ?? null,
          dedupeKey: candidate.dedupeKey,
          periodLabel: candidate.periodLabel,
          severity: candidate.severity,
          rule: candidate.rule,
          title: candidate.title,
          message: candidate.message,
          expected: candidate.expected ?? null,
          actual: candidate.actual ?? null,
          progress: candidate.progress ?? null,
        },
        update: {
          tenantId: (plan as any).tenantId ?? existing?.tenantId ?? null,
          severity: candidate.severity,
          title: candidate.title,
          message: candidate.message,
          expected: candidate.expected ?? null,
          actual: candidate.actual ?? null,
          progress: candidate.progress ?? null,
          status: existing?.status === "Resolved" ? "Open" : existing?.status ?? "Open",
        },
      });

      if (!existing) summary.created += 1;
      else summary.updated += 1;

      if (!existing || escalated) {
        // In-app notification for the responsible owners.
        const owners = Array.from(
          new Set([plan.owner, candidate.owner].filter((name): name is string => Boolean(name)))
        );
        for (const owner of owners) {
          await prisma.notification.create({
            data: {
              tenantId: (plan as any).tenantId ?? null,
              recipient: owner,
              type: "DEADLINE",
              title: alert.title,
              body: alert.message,
              link: `/database/${typePath(plan.type)}?plan=${plan.id}`,
            } as any,
          });
        }

        if (sendEmail && settings.emailEnabled) {
          const recipients = await resolveRecipients(settings, [plan.owner, candidate.owner]);
          if (!recipients.length) {
            summary.emailsSkipped += 1;
          } else {
            const body = emailBody(candidate, plan);
            const result = await sendMail({ to: recipients, ...body });
            await prisma.planAlertMail.create({
              data: {
                tenantId: (plan as any).tenantId ?? null,
                alertId: alert.id,
                to: recipients.join(", "),
                subject: body.subject,
                status: result.status,
                error: result.error,
              } as any,
            });
            if (result.status === "SENT") {
              summary.emailsSent += 1;
              await prisma.planAlert.update({
                where: { id: alert.id },
                data: { emailsSent: { increment: 1 } },
              });
            } else if (result.status === "SKIPPED") {
              summary.emailsSkipped += 1;
            } else {
              summary.emailsFailed += 1;
            }
          }
        }
      }
    }

    const resolved = await prisma.planAlert.updateMany({
      where: {
        planId: plan.id,
        status: "Open",
        ...(keys.length ? { dedupeKey: { notIn: keys } } : {}),
      },
      data: { status: "Resolved" },
    });
    summary.resolved += resolved.count;
  }

  return summary;
}
