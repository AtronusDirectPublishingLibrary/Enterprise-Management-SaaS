import { prisma } from "./prisma";
import { computePlanProgress } from "./planProgress";
import { currentPlanFor, currentPlans } from "./currentPlans";
import { buildReportAiBrief, type AiBrief } from "./executiveAnalytics";

export const REPORT_TYPE_LABELS: Record<string, string> = {
  AOP: "Annual Operational Plan",
  STRATEGIC: "Strategic Plan",
  ROADMAP: "Strategic Roadmap",
};

export const ORGANISATION = {
  name: "Ethio-Biopharma Enterprise",
  shortName: "Ethio-Biopharma",
  tagline: "Building Ethiopia's biopharmaceutical capability",
  address: "Kilinto Industrial Park, Addis Ababa, Ethiopia",
};

export type ReportSection = "kpis" | "milestones" | "activities" | "owners";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const money = (value: number, currency = "ETB") =>
  `${currency} ${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const day = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function kpiStatus(progress: number | null, hasData: boolean) {
  if (!hasData || progress == null) return "No data";
  if (progress >= 85) return "On track";
  if (progress >= 55) return "Behind";
  return "At risk";
}

function deliveryStatus(status?: string | null, progress?: number | null) {
  if (status === "Completed" || (progress ?? 0) >= 100) return "Completed";
  if (status === "At Risk") return "At risk";
  if (status === "In Progress" || (progress ?? 0) > 0) return "In progress";
  return "Planned";
}

function latestText(update?: { reference?: string | null; summary?: string | null } | null) {
  if (!update?.summary) return "";
  const text = update.summary.replace(/\s+/g, " ").trim();
  return update.reference ? `[${update.reference}] ${text}` : text;
}

function isVerified(status?: string | null) {
  return status === "Verified" || status === "Reviewed";
}

function splitLines(value?: string | null) {
  return (value || "")
    .split(/\r?\n|;\s*/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export interface ConsolidatedReport {
  meta: {
    organisation: typeof ORGANISATION;
    title: string;
    type: string;
    typeLabel: string;
    periodLabel: string;
    status: string;
    periodState?: string | null;
    isCurrentPeriod: boolean;
    owner: string;
    generatedAt: string;
    generatedBy: string;
    lastVerifiedAt?: string | null;
    planId: string | null;
    scope: string;
    vision?: string | null;
    mission?: string | null;
    summary?: string | null;
    filename: string;
  };
  headline: {
    completion: number;
    activities: { total: number; completed: number; inProgress: number; atRisk: number; planned: number };
    milestones: { total: number; completed: number; inProgress: number; atRisk: number; planned: number };
    kpis: { total: number; onTrack: number; behind: number; atRisk: number; noData: number };
    budget: number;
    currency: string;
    updates: {
      total: number;
      submitted: number;
      reviewed: number;
      verified: number;
      pending: number;
      owners: number;
      lastUpdate?: string | null;
    };
  };
  ai: AiBrief;
  narrative: {
    overview: string;
    achievements: string[];
    challenges: string[];
    nextSteps: string[];
    outlook: string;
    kpiStory: string;
    milestoneStory: string;
    ownerNotes: { owner: string; text: string; progress: number; status: string }[];
  };
  matrices: {
    kpis: KpiRow[];
    milestones: DeliveryRow[];
    activities: DeliveryRow[];
    owners: OwnerRow[];
  };
  reports: { title: string; periodLabel: string; dueDate: string; status: string }[];
  rollup: { id: string; title: string; type: string; periodLabel: string; completion: number }[];
}

export interface KpiRow {
  code: string;
  kpi: string;
  owner: string;
  unit: string;
  baseline: string;
  target: string;
  actual: string;
  period: string;
  progress: number | null;
  status: string;
  note: string;
}

export interface DeliveryRow {
  code: string;
  item: string;
  owner: string;
  start: string;
  due: string;
  budget: string;
  progress: number;
  status: string;
  latestUpdate: string;
}

export interface OwnerRow {
  owner: string;
  items: number;
  completed: number;
  atRisk: number;
  kpis: number;
  averageProgress: number;
  updates: number;
  latestNarrative: string;
}

async function resolvePlans(type: string, planId?: string, periodLabel?: string) {
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    return plan ? [plan] : [];
  }
  if (periodLabel) {
    return prisma.plan.findMany({ where: { type, periodLabel }, orderBy: { startDate: "desc" } });
  }
  // The current period is resolved from the PlanPeriod lifecycle, so a new
  // active period automatically becomes the subject of the next report.
  const plan = await currentPlanFor(type as "AOP" | "STRATEGIC" | "ROADMAP");
  return plan ? [plan] : [];
}

export async function buildConsolidatedReport(input: {
  type: string;
  planId?: string;
  periodLabel?: string;
  generatedBy?: string;
}): Promise<ConsolidatedReport | null> {
  const type = REPORT_TYPE_LABELS[input.type] ? input.type : "AOP";
  const plans = await resolvePlans(type, input.planId, input.periodLabel);
  if (!plans.length) return null;
  const plan = plans[0];
  const [current, planPeriod] = await Promise.all([
    currentPlans(),
    prisma.planPeriod.findUnique({ where: { id: plan.periodId || "" }, select: { state: true } }).catch(() => null),
  ]);

  const [items, updates, childPlans, reportRows] = await Promise.all([
    prisma.planItem.findMany({
      where: { planId: plan.id },
      include: {
        targets: { orderBy: { periodLabel: "asc" } },
        progressUpdates: { orderBy: { updatedAt: "desc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.progressUpdate.findMany({
      where: { planId: plan.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { parentPlanId: plan.id },
      select: { id: true, title: true, type: true, periodLabel: true },
    }),
    prisma.planReport.findMany({ where: { planId: plan.id }, orderBy: { dueDate: "asc" } }),
  ]);

  const progress = await computePlanProgress(plan.id);
  const itemProgress = progress?.items || {};
  // Only updates verified by the Strategy and Planning Officer feed the
  // report's narrative and the latest-update column of its matrices.
  const verifiedUpdates = updates.filter((update) => isVerified(update.status));
  const latestByItem = new Map<string, (typeof updates)[number]>();
  for (const update of verifiedUpdates) {
    if (!latestByItem.has(update.itemId)) latestByItem.set(update.itemId, update);
  }

  const kpis = items.filter((item) => item.kind === "KPI");
  const milestones = items.filter((item) => item.kind === "MILESTONE");
  const activities = items.filter((item) => item.kind === "ACTIVITY");

  const kpiRows: KpiRow[] = kpis.map((item) => {
    const readings = item.targets.filter((target) => target.actual != null);
    const latest = readings[readings.length - 1];
    const actual = latest?.actual ?? item.currentValue;
    const target = latest?.target ?? item.targetValue;
    const hasData = actual != null && target != null && target !== 0;
    const itemPct = hasData ? itemProgress[item.id]?.progress ?? null : null;
    return {
      code: item.code || "",
      kpi: item.title,
      owner: item.owner || "Unassigned",
      unit: item.unit || "",
      baseline: item.baseline != null ? `${item.baseline}` : "—",
      target: target != null ? `${target}${item.unit ? ` ${item.unit}` : ""}` : item.targetValue != null ? `${item.targetValue}` : "—",
      actual: actual != null ? `${actual}${item.unit ? ` ${item.unit}` : ""}` : "—",
      period: latest?.periodLabel || "—",
      progress: itemPct,
      status: kpiStatus(itemPct, hasData),
      note: latest?.note || latestText(latestByItem.get(item.id)) || "—",
    };
  });

  const deliveryRow = (item: (typeof items)[number]): DeliveryRow => {
    const itemPct = clamp(itemProgress[item.id]?.progress ?? item.progress ?? 0);
    return {
      code: item.code || "",
      item: item.title,
      owner: item.owner || "Unassigned",
      start: day(item.startDate),
      due: day(item.endDate),
      budget: item.budget != null ? money(item.budget) : "—",
      progress: itemPct,
      status: deliveryStatus(item.status, itemPct),
      latestUpdate: latestText(latestByItem.get(item.id)) || "—",
    };
  };
  const milestoneRows = milestones.map(deliveryRow);
  const activityRows = activities.map(deliveryRow);

  const countDelivery = (rows: DeliveryRow[]) => ({
    total: rows.length,
    completed: rows.filter((row) => row.status === "Completed").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    atRisk: rows.filter((row) => row.status === "At risk").length,
    planned: rows.filter((row) => row.status === "Planned").length,
  });
  const activityCounts = countDelivery(activityRows);
  const milestoneCounts = countDelivery(milestoneRows);
  const kpiCounts = {
    total: kpiRows.length,
    onTrack: kpiRows.filter((row) => row.status === "On track").length,
    behind: kpiRows.filter((row) => row.status === "Behind").length,
    atRisk: kpiRows.filter((row) => row.status === "At risk").length,
    noData: kpiRows.filter((row) => row.status === "No data").length,
  };

  const ownerMap = new Map<string, OwnerRow>();
  for (const item of items) {
    const owner = item.owner || "Unassigned";
    const row =
      ownerMap.get(owner) ||
      { owner, items: 0, completed: 0, atRisk: 0, kpis: 0, averageProgress: 0, updates: 0, latestNarrative: "" };
    const itemPct = clamp(itemProgress[item.id]?.progress ?? item.progress ?? 0);
    row.items += 1;
    if (item.kind === "KPI") row.kpis += 1;
    if (item.status === "Completed" || itemPct >= 100) row.completed += 1;
    if (item.status === "At Risk") row.atRisk += 1;
    row.averageProgress += itemPct;
    ownerMap.set(owner, row);
  }
  for (const update of verifiedUpdates) {
    const owner = update.authorName || "Unassigned";
    const row =
      ownerMap.get(owner) ||
      { owner, items: 0, completed: 0, atRisk: 0, kpis: 0, averageProgress: 0, updates: 0, latestNarrative: "" };
    row.updates += 1;
    if (!row.latestNarrative) row.latestNarrative = update.summary;
    ownerMap.set(owner, row);
  }
  const ownerRows = [...ownerMap.values()]
    .map((row) => ({ ...row, averageProgress: clamp(row.items ? row.averageProgress / row.items : 0) }))
    .sort((a, b) => b.averageProgress - a.averageProgress);

  const progressUpdates = updates;
  const reviewed = verifiedUpdates;
  const submitted = progressUpdates.filter((update) => update.status === "Submitted");
  const lastUpdate = verifiedUpdates.length
    ? verifiedUpdates
        .map((update) => update.updatedAt)
        .sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  const completion = clamp(progress?.completion ?? 0);
  const budget = items.reduce((sum, item) => sum + Number(item.budget || 0), 0);

  const achievementsFromUpdates = reviewed
    .flatMap((update) => splitLines(update.achievements))
    .slice(0, 8);
  const achievements =
    achievementsFromUpdates.length
      ? achievementsFromUpdates
      : [
          ...activityRows.filter((row) => row.status === "Completed").slice(0, 4).map((row) => `${row.item} completed.`),
          ...kpiRows.filter((row) => row.status === "On track").slice(0, 4).map((row) => `${row.kpi} at ${row.actual} against a target of ${row.target}.`),
        ];
  const challengesFromUpdates = reviewed.flatMap((update) => splitLines(update.challenges)).slice(0, 8);
  const challenges =
    challengesFromUpdates.length
      ? challengesFromUpdates
      : [
          ...milestoneRows.filter((row) => row.status === "At risk").slice(0, 4).map((row) => `${row.item} is at risk (due ${row.due}).`),
          ...kpiRows.filter((row) => row.status === "At risk" || row.status === "Behind").slice(0, 4).map((row) => `${row.kpi} is ${row.status.toLowerCase()} at ${row.progress ?? 0}% of target.`),
        ];
  const nextStepsFromUpdates = reviewed.flatMap((update) => splitLines(update.nextSteps)).slice(0, 8);
  const upcoming = milestoneRows
    .filter((row) => row.status !== "Completed")
    .slice(0, 4)
    .map((row) => `Deliver ${row.item} by ${row.due}.`);
  const nextSteps = nextStepsFromUpdates.length
    ? nextStepsFromUpdates
    : upcoming.length
    ? upcoming
    : ["Maintain delivery cadence and refresh KPI actuals at the next reporting window."];

  const typeLabel = REPORT_TYPE_LABELS[type];
  const overview = [
    `This consolidated ${typeLabel.toLowerCase()} report covers ${plan.periodLabel} (${day(plan.startDate)} to ${day(plan.endDate)}) and reports ${completion}% overall delivery for ${ORGANISATION.name}.`,
    `${activityCounts.total} activities are tracked: ${activityCounts.completed} completed, ${activityCounts.inProgress} in progress, ${activityCounts.atRisk} at risk and ${activityCounts.planned} not yet started.`,
    `${milestoneCounts.total} milestones are monitored, of which ${milestoneCounts.completed} are complete. ${kpiCounts.total} KPIs are reported: ${kpiCounts.onTrack} on track, ${kpiCounts.behind} behind, ${kpiCounts.atRisk} at risk and ${kpiCounts.noData} without a recorded actual.`,
    `The approved budget under management is ${money(budget)}.`,
  ].join(" ");

  const kpiStory =
    kpiCounts.total === 0
      ? "No KPIs are defined for this plan."
      : kpiCounts.onTrack === kpiCounts.total
      ? `All ${kpiCounts.total} KPIs are on track against their period targets.`
      : `${kpiCounts.onTrack} of ${kpiCounts.total} KPIs are on track; ${kpiCounts.behind} are behind and ${kpiCounts.atRisk} are at risk. Management attention should focus on ${kpiRows
          .filter((row) => row.status === "At risk" || row.status === "Behind")
          .slice(0, 4)
          .map((row) => row.kpi)
          .join("; ") || "the indicators without recorded actuals"}.`;

  const milestoneStory =
    milestoneCounts.total === 0
      ? "No milestones are defined for this plan."
      : `${milestoneCounts.completed} of ${milestoneCounts.total} milestones are complete (${Math.round(
          (milestoneCounts.completed / Math.max(1, milestoneCounts.total)) * 100
        )}%), with ${milestoneCounts.atRisk} flagged at risk.`;

  const outlook = `${plan.title} enters the next reporting window with ${completion}% delivery against its ${typeLabel.toLowerCase()} commitments. ${
    completion >= 75
      ? "Delivery is broadly on trajectory; the focus shifts to closing the remaining milestones and evidencing KPI outcomes."
      : completion >= 40
      ? "Delivery is advancing, but several workstreams need accelerated action to protect the period target."
      : "Delivery is behind trajectory; executive sponsorship and corrective action plans are required for the flagged workstreams."
  }`;

  const ownerNotes = ownerRows
    .filter((row) => row.updates > 0)
    .slice(0, 10)
    .map((row) => ({
      owner: row.owner,
      text:
        verifiedUpdates.find((update) => (update.authorName || "Unassigned") === row.owner && update.summary)?.summary ||
        "",
      progress: row.averageProgress,
      status: row.averageProgress >= 85 ? "On track" : row.averageProgress >= 55 ? "Behind" : "At risk",
    }));

  const slug = `${type.toLowerCase()}-${plan.periodLabel.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
  const generatedAt = new Date();
  const ai = await buildReportAiBrief({
    title: `Consolidated ${typeLabel} Performance Report`,
    periodLabel: plan.periodLabel,
    completion,
    budget,
    kpis: kpiCounts,
    milestones: milestoneCounts,
    activities: activityCounts,
    updates: {
      verified: reviewed.length,
      pending: progressUpdates.length - reviewed.length,
      owners: new Set(verifiedUpdates.map((update) => update.authorId)).size,
    },
    topChallenges: challenges,
    topAchievements: achievements,
  });

  return {
    meta: {
      organisation: ORGANISATION,
      title: `Consolidated ${typeLabel} Performance Report`,
      type,
      typeLabel,
      periodLabel: plan.periodLabel,
      status: plan.status,
      periodState: planPeriod?.state || null,
      isCurrentPeriod: (current as Record<string, { id: string } | undefined>)[type]?.id === plan.id,
      owner: plan.owner || "Office of the CEO",
      generatedAt: generatedAt.toISOString(),
      generatedBy: input.generatedBy || "System",
      lastVerifiedAt: lastUpdate ? lastUpdate.toISOString() : null,
      planId: plan.id,
      scope: plans.length > 1 ? `${plans.length} plans` : plan.title,
      vision: plan.vision,
      mission: plan.mission,
      summary: plan.summary,
      filename: `${slug}-consolidated-report`,
    },
    headline: {
      completion,
      activities: activityCounts,
      milestones: milestoneCounts,
      kpis: kpiCounts,
      budget,
      currency: "ETB",
      updates: {
        total: progressUpdates.length,
        submitted: submitted.length,
        reviewed: reviewed.length,
        verified: reviewed.length,
        pending: progressUpdates.length - reviewed.length,
        owners: new Set(verifiedUpdates.map((update) => update.authorId)).size,
        lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
      },
    },
    ai,
    narrative: { overview, achievements, challenges, nextSteps, outlook, kpiStory, milestoneStory, ownerNotes },
    matrices: { kpis: kpiRows, milestones: milestoneRows, activities: activityRows, owners: ownerRows },
    reports: reportRows.map((report) => ({
      title: report.title,
      periodLabel: report.periodLabel,
      dueDate: day(report.dueDate),
      status: report.status,
    })),
    rollup: (progress?.childPlans || []).map((child) => ({
      id: child.id,
      title: child.title,
      type: child.type,
      periodLabel: child.periodLabel,
      completion: child.completion,
    })),
  };
}

const CSV_HEADERS = [
  "Section",
  "Code",
  "Item",
  "Owner",
  "Baseline",
  "Target",
  "Actual",
  "Period",
  "Due",
  "Budget",
  "Progress %",
  "Status",
  "Narrative",
];

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportToCsv(report: ConsolidatedReport, section?: ReportSection | "all") {
  const rows: string[][] = [];
  const add = (cells: (string | number | null | undefined)[]) => rows.push(cells.map((cell) => csvCell(cell)));

  if (!section || section === "all") {
    add(["AI DECISION BRIEF"]);
    add(["Summary", report.ai.summary]);
    report.ai.findings.forEach((finding, index) => add([`Finding ${index + 1}`, finding]));
    report.ai.actions.forEach((action, index) => add([`Action ${index + 1}`, action]));
    add(["Confidence", `${report.ai.confidence}%`, "Engine", report.ai.engine]);
    add([]);
  }

  if (!section || section === "all" || section === "kpis") {
    add(["KPI MATRIX"]);
    add(CSV_HEADERS);
    for (const row of report.matrices.kpis) {
      add(["KPI", row.code, row.kpi, row.owner, row.baseline, row.target, row.actual, row.period, "", "", row.progress, row.status, row.note]);
    }
    add([]);
  }
  if (!section || section === "all" || section === "milestones") {
    add(["MILESTONE MATRIX"]);
    add(CSV_HEADERS);
    for (const row of report.matrices.milestones) {
      add(["Milestone", row.code, row.item, row.owner, "", "", "", "", row.due, row.budget, row.progress, row.status, row.latestUpdate]);
    }
    add([]);
  }
  if (!section || section === "all" || section === "activities") {
    add(["ACTIVITY MATRIX"]);
    add(CSV_HEADERS);
    for (const row of report.matrices.activities) {
      add(["Activity", row.code, row.item, row.owner, "", "", "", row.start, row.due, row.budget, row.progress, row.status, row.latestUpdate]);
    }
    add([]);
  }
  if (!section || section === "all" || section === "owners") {
    add(["OWNER / TASK-OWNER MATRIX"]);
    add(["Owner", "Items", "Completed", "At risk", "KPIs", "Average progress %", "Updates", "Latest narrative"]);
    for (const row of report.matrices.owners) {
      add([row.owner, row.items, row.completed, row.atRisk, row.kpis, row.averageProgress, row.updates, row.latestNarrative]);
    }
  }
  return `${rows.map((row) => row.join(",")).join("\r\n")}\r\n`;
}

const esc = (value: unknown) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Word-readable HTML (.doc) so the report remains fully editable in Word. */
export function reportToWordHtml(report: ConsolidatedReport) {
  const kpiRows = report.matrices.kpis
    .map(
      (row) => `<tr><td>${esc(row.code)}</td><td>${esc(row.kpi)}</td><td>${esc(row.owner)}</td><td>${esc(row.target)}</td><td>${esc(row.actual)}</td><td>${row.progress ?? "—"}%</td><td>${esc(row.status)}</td></tr>`
    )
    .join("");
  const milestoneRows = report.matrices.milestones
    .map(
      (row) => `<tr><td>${esc(row.item)}</td><td>${esc(row.owner)}</td><td>${esc(row.due)}</td><td>${row.progress}%</td><td>${esc(row.status)}</td></tr>`
    )
    .join("");
  const activityRows = report.matrices.activities
    .map(
      (row) => `<tr><td>${esc(row.item)}</td><td>${esc(row.owner)}</td><td>${esc(row.due)}</td><td>${esc(row.budget)}</td><td>${row.progress}%</td><td>${esc(row.status)}</td></tr>`
    )
    .join("");
  const ownerRows = report.matrices.owners
    .map(
      (row) => `<tr><td>${esc(row.owner)}</td><td>${row.items}</td><td>${row.completed}</td><td>${row.atRisk}</td><td>${row.averageProgress}%</td><td>${row.updates}</td></tr>`
    )
    .join("");
  const list = (items: string[]) =>
    items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "<p>No items recorded.</p>";

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(report.meta.title)} — ${esc(report.meta.periodLabel)}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.45; }
  .brandbar { background: #0B2545; color: #fff; padding: 18px 22px; border-bottom: 5px solid #C9A227; }
  .brandbar .name { font-size: 18pt; font-weight: bold; letter-spacing: 1px; color: #fff; }
  .brandbar .tag { color: #E7D48A; font-size: 9pt; }
  h1 { color: #0B2545; font-size: 20pt; margin: 18px 0 2px; }
  h2 { color: #0B2545; font-size: 13pt; border-bottom: 2px solid #C9A227; padding-bottom: 3px; margin-top: 22px; }
  .meta { color: #555; font-size: 9.5pt; }
  .kpis { width: 100%; border-collapse: collapse; margin: 10px 0 4px; }
  .kpis td { border: 1px solid #d8cfae; padding: 8px; width: 25%; background: #FBF8EF; }
  .kpis .num { font-size: 16pt; font-weight: bold; color: #0B2545; display: block; }
  table.matrix { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 8px 0 12px; }
  table.matrix th { background: #0B2545; color: #fff; text-align: left; padding: 6px; font-size: 8.5pt; }
  table.matrix td { border-bottom: 1px solid #e2dccb; padding: 5px 6px; vertical-align: top; }
  table.matrix tr:nth-child(even) td { background: #FAF8F2; }
  .gold { color: #8a6d1d; font-weight: bold; }
  .footer { margin-top: 26px; font-size: 8.5pt; color: #666; border-top: 1px solid #C9A227; padding-top: 8px; }
</style>
</head>
<body>
  <div class="brandbar">
    <div class="name">${esc(report.meta.organisation.name)}</div>
    <div class="tag">${esc(report.meta.organisation.tagline)}</div>
  </div>
  <h1>${esc(report.meta.title)}</h1>
  <p class="meta"><strong>Period:</strong> ${esc(report.meta.periodLabel)} &nbsp;|&nbsp; <strong>Status:</strong> ${esc(report.meta.status)} &nbsp;|&nbsp; <strong>Owner:</strong> ${esc(report.meta.owner)}<br/>
  <strong>Generated:</strong> ${esc(new Date(report.meta.generatedAt).toLocaleString("en-GB"))} by ${esc(report.meta.generatedBy)}</p>

  <table class="kpis"><tr>
    <td><span class="num">${report.headline.completion}%</span>Overall delivery</td>
    <td><span class="num">${report.headline.kpis.onTrack}/${report.headline.kpis.total}</span>KPIs on track</td>
    <td><span class="num">${report.headline.milestones.completed}/${report.headline.milestones.total}</span>Milestones complete</td>
    <td><span class="num">${report.headline.activities.total}</span>Activities tracked</td>
  </tr></table>

  <h2>1. Executive narrative</h2>
  <p>${esc(report.narrative.overview)}</p>
  <p>${esc(report.narrative.kpiStory)}</p>
  <p>${esc(report.narrative.milestoneStory)}</p>

  <h2>2. AI decision brief</h2>
  <p><strong>${esc(report.ai.summary)}</strong></p>
  <p class="meta">${esc(report.ai.engine)} · confidence ${report.ai.confidence}% · generated ${esc(new Date(report.ai.generatedAt).toLocaleString("en-GB"))}</p>
  <p><strong>What the data says</strong></p>${list(report.ai.findings)}
  <p><strong>Recommended actions</strong></p>${list(report.ai.actions)}

  <h2>3. Achievements</h2>
  ${list(report.narrative.achievements)}
  <h2>4. Challenges and risks</h2>
  ${list(report.narrative.challenges)}
  <h2>5. Next steps</h2>
  ${list(report.narrative.nextSteps)}
  <h2>6. Outlook</h2>
  <p>${esc(report.narrative.outlook)}</p>

  <h2>7. KPI performance matrix</h2>
  <table class="matrix"><thead><tr><th>Code</th><th>KPI</th><th>Owner</th><th>Target</th><th>Latest actual</th><th>Progress</th><th>Status</th></tr></thead><tbody>${kpiRows || '<tr><td colspan="7">No KPIs recorded.</td></tr>'}</tbody></table>

  <h2>8. Milestone matrix</h2>
  <table class="matrix"><thead><tr><th>Milestone</th><th>Owner</th><th>Due</th><th>Progress</th><th>Status</th></tr></thead><tbody>${milestoneRows || '<tr><td colspan="5">No milestones recorded.</td></tr>'}</tbody></table>

  <h2>9. Activity matrix</h2>
  <table class="matrix"><thead><tr><th>Activity</th><th>Owner</th><th>Due</th><th>Budget</th><th>Progress</th><th>Status</th></tr></thead><tbody>${activityRows || '<tr><td colspan="6">No activities recorded.</td></tr>'}</tbody></table>

  <h2>10. Accountability by task owner</h2>
  <table class="matrix"><thead><tr><th>Owner</th><th>Items</th><th>Completed</th><th>At risk</th><th>Avg. progress</th><th>Updates</th></tr></thead><tbody>${ownerRows || '<tr><td colspan="6">No owners assigned.</td></tr>'}</tbody></table>

  <h2>11. Task-owner progress notes</h2>
  ${report.narrative.ownerNotes.length
    ? report.narrative.ownerNotes
        .map((note) => `<p><strong>${esc(note.owner)}</strong> <span class="gold">(${note.progress}% · ${esc(note.status)})</span><br/>${esc(note.text)}</p>`)
        .join("")
    : "<p>No submitted progress updates in this window.</p>"}

  <h2>12. Reporting obligations</h2>
  <table class="matrix"><thead><tr><th>Report</th><th>Period</th><th>Due</th><th>Status</th></tr></thead><tbody>${
    report.reports.map((row) => `<tr><td>${esc(row.title)}</td><td>${esc(row.periodLabel)}</td><td>${esc(row.dueDate)}</td><td>${esc(row.status)}</td></tr>`).join("") ||
    '<tr><td colspan="4">No reporting deadlines.</td></tr>'
  }</tbody></table>

  <div class="footer">${esc(report.meta.organisation.name)} · ${esc(report.meta.organisation.address)}<br/>
  Consolidated automatically from plan data and task-owner progress updates. Figures are as at ${esc(new Date(report.meta.generatedAt).toLocaleString("en-GB"))}.</div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/* Excel export (SpreadsheetML 2003)                                          */
/* -------------------------------------------------------------------------- */

function xml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excelCell(value: unknown, numeric = false) {
  if (value === null || value === undefined || value === "") return "<Cell/>";
  const type = numeric && Number.isFinite(Number(value)) ? "Number" : "String";
  return `<Cell><Data ss:Type="${type}">${xml(value)}</Data></Cell>`;
}

function excelRow(values: unknown[], header = false) {
  const cells = values.map((value) => excelCell(value, !header && typeof value === "number")).join("");
  return `<Row${header ? ' ss:StyleID="header"' : ""}>${cells}</Row>`;
}

function excelSheet(name: string, rows: unknown[][]) {
  return `<Worksheet ss:Name="${xml(name).slice(0, 31)}"><Table>${rows
    .map((row, index) => excelRow(row, index === 0))
    .join("")}</Table></Worksheet>`;
}

/**
 * Real Excel workbook (SpreadsheetML) with one sheet per report matrix, so
 * finance and planning can pivot the figures without re-keying the report.
 */
export function reportToExcel(report: ConsolidatedReport): string {
  const summary: unknown[][] = [
    ["Consolidated performance report"],
    ["Organisation", report.meta.organisation.name],
    ["Report", report.meta.title],
    ["Plan period", report.meta.periodLabel],
    ["Scope", report.meta.scope],
    ["Status", report.meta.status],
    ["Owner", report.meta.owner],
    ["Generated at", new Date(report.meta.generatedAt).toLocaleString("en-GB")],
    ["Generated by", report.meta.generatedBy],
    ["Last verified update", report.meta.lastVerifiedAt ? new Date(report.meta.lastVerifiedAt).toLocaleString("en-GB") : "No verified updates"],
    [],
    ["Overall delivery (%)", report.headline.completion],
    ["KPIs on track", report.headline.kpis.onTrack],
    ["KPIs total", report.headline.kpis.total],
    ["Milestones completed", report.headline.milestones.completed],
    ["Milestones total", report.headline.milestones.total],
    ["Activities tracked", report.headline.activities.total],
    ["Budget under delivery (ETB)", report.headline.budget],
    [],
    ["AI decision brief"],
    ["Headline", report.ai.summary],
    ...report.ai.findings.map((finding, index) => [`Finding ${index + 1}`, finding]),
    ...report.ai.actions.map((action, index) => [`Action ${index + 1}`, action]),
    ["Engine", report.ai.engine],
    ["Confidence (%)", report.ai.confidence],
  ];

  const kpis: unknown[][] = [
    ["Code", "KPI", "Owner", "Baseline", "Target", "Latest actual", "Period", "Progress (%)", "Status"],
    ...report.matrices.kpis.map((row) => [
      row.code, row.kpi, row.owner, row.baseline, row.target, row.actual, row.period, row.progress ?? "", row.status,
    ]),
  ];

  const milestones: unknown[][] = [
    ["Code", "Milestone", "Owner", "Due", "Budget (ETB)", "Progress (%)", "Status", "Latest owner update"],
    ...report.matrices.milestones.map((row) => [
      row.code, row.item, row.owner, row.due, row.budget, row.progress, row.status, row.latestUpdate,
    ]),
  ];

  const activities: unknown[][] = [
    ["Code", "Activity", "Owner", "Due", "Budget (ETB)", "Progress (%)", "Status", "Latest owner update"],
    ...report.matrices.activities.map((row) => [
      row.code, row.item, row.owner, row.due, row.budget, row.progress, row.status, row.latestUpdate,
    ]),
  ];

  const owners: unknown[][] = [
    ["Owner", "Items", "Completed", "At risk", "KPIs", "Avg. progress (%)", "Updates"],
    ...report.matrices.owners.map((row) => [
      row.owner, row.items, row.completed, row.atRisk, row.kpis, row.averageProgress, row.updates,
    ]),
  ];

  const notes: unknown[][] = [
    ["Owner", "Progress (%)", "Status", "Verified note"],
    ...report.narrative.ownerNotes.map((note) => [note.owner, note.progress, note.status, note.text]),
  ];

  const aiSheet: unknown[][] = [
    ["AI decision brief"],
    ["Summary", report.ai.summary],
    ["Engine", report.ai.engine],
    ["Confidence (%)", report.ai.confidence],
    ["Generated at", new Date(report.ai.generatedAt).toLocaleString("en-GB")],
    [],
    ["Findings"],
    ...report.ai.findings.map((finding) => [finding]),
    [],
    ["Recommended actions"],
    ...report.ai.actions.map((action) => [action]),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0B2545" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  ${excelSheet("Summary", summary)}
  ${excelSheet("KPIs", kpis)}
  ${excelSheet("Milestones", milestones)}
  ${excelSheet("Activities", activities)}
  ${excelSheet("Owners", owners)}
  ${excelSheet("Owner notes", notes)}
  ${excelSheet("AI brief", aiSheet)}
</Workbook>`;
}
