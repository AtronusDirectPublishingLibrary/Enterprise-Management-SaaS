import { prisma } from "./prisma";

export type ExecutiveFilters = {
  department?: string;
  status?: string;
  fund?: string;
  manager?: string;
};

export type AiBrief = {
  summary: string;
  findings: string[];
  actions: string[];
  confidence: number;
  engine: string;
  generatedAt: string;
  dataQuality?: string[];
};

type ProjectRow = {
  projectId: string;
  title: string;
  status: string;
  priority: string;
  department: string;
  division: string;
  manager: string;
  fund: string;
  startDate: string;
  endDate: string;
  progress: number;
  plan: number;
  actual: number;
  variance: number;
  utilization: number | null;
  health: "On Track" | "Watch" | "At Risk" | "Overdue";
  daysToDue: number;
  activityCount: number;
  milestoneCount: number;
};

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const money = (value: number) =>
  `ETB ${Math.round(Number(value) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function healthFor(project: {
  status: string;
  progress: number;
  startDate: Date;
  endDate: Date;
}) {
  const now = Date.now();
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  if (project.status === "Completed" || project.progress >= 100) return "On Track" as const;
  if (now > end) return "Overdue" as const;
  if (now < start) return project.progress === 0 ? ("Watch" as const) : ("On Track" as const);
  const expected = ((now - start) / Math.max(1, end - start)) * 100;
  if (project.progress + 20 < expected) return "At Risk" as const;
  if (project.progress + 8 < expected) return "Watch" as const;
  return "On Track" as const;
}

function deterministicBrief(input: {
  scope: string;
  projects: ProjectRow[];
  totals: {
    plan: number;
    actual: number;
    variance: number;
    averageProgress: number;
    atRisk: number;
    overdue: number;
    active: number;
    complete: number;
  };
  dimensions: { label: string; progress: number; plan: number; actual: number; count: number }[];
}): AiBrief {
  const { projects, totals, dimensions, scope } = input;
  const overspent = projects.filter((project) => project.plan > 0 && project.actual > project.plan);
  const lagging = [...dimensions].sort((a, b) => a.progress - b.progress)[0];
  const leading = [...dimensions].sort((a, b) => b.progress - a.progress)[0];
  const largestRisk = [...projects]
    .filter((project) => project.health === "At Risk" || project.health === "Overdue")
    .sort((a, b) => b.plan - a.plan)[0];
  const utilization = totals.plan > 0 ? (totals.actual / totals.plan) * 100 : 0;
  const findings: string[] = [];
  const actions: string[] = [];

  findings.push(
    `${totals.active} active project${totals.active === 1 ? "" : "s"} average ${totals.averageProgress}% delivery, with ${totals.atRisk} at risk and ${totals.overdue} overdue.`
  );
  findings.push(
    `Spend is ${money(totals.actual)} against ${money(totals.plan)} (${Math.round(utilization)}% utilisation), leaving a ${totals.variance >= 0 ? "positive" : "negative"} variance of ${money(Math.abs(totals.variance))}.`
  );
  if (overspent.length) {
    findings.push(
      `${overspent.length} project${overspent.length === 1 ? " is" : "s are"} over budget; the largest exposure is ${overspent.sort((a, b) => b.actual - b.plan - (a.actual - a.plan))[0].title}.`
    );
  }
  if (lagging && dimensions.length > 1) {
    findings.push(
      `${lagging.label} is the slowest dimension at ${lagging.progress}%${leading ? `, compared with ${leading.label} at ${leading.progress}%` : ""}.`
    );
  }
  if (largestRisk) {
    findings.push(
      `${largestRisk.title} is the highest-value ${largestRisk.health.toLowerCase()} project (${money(largestRisk.plan)} plan, ${largestRisk.progress}% complete).`
    );
  }

  if (largestRisk) {
    actions.push(`Run a recovery review on ${largestRisk.title}; agree one owner, one date and one measurable recovery action.`);
  }
  if (overspent.length) {
    actions.push(`Freeze discretionary commitments on ${overspent[0].title} until the variance is approved or re-phased.`);
  }
  if (lagging) {
    actions.push(`Review the delivery pipeline in ${lagging.label}; clear the two oldest blockers this week.`);
  }
  actions.push("Refresh verified progress updates before the next consolidated report so the board pack reflects evidence, not plans.");

  const confidence = Math.max(
    55,
    Math.min(96, 60 + Math.min(20, projects.length * 2) + (totals.plan > 0 ? 10 : 0) + (totals.actual > 0 ? 6 : 0))
  );
  return {
    summary: `${scope}: ${totals.complete} of ${projects.length} projects are complete, ${totals.active} remain active and portfolio delivery is ${totals.averageProgress}%. The portfolio is ${utilization > 100 ? "above" : "within"} its financial plan at ${Math.round(utilization)}% utilisation. ${totals.atRisk + totals.overdue ? `${totals.atRisk + totals.overdue} projects need management attention.` : "No project currently breaches the delivery or budget thresholds."}`,
    findings: findings.slice(0, 5),
    actions: [...new Set(actions)].slice(0, 4),
    confidence,
    engine: "EB-EMS Insight Engine · rules + portfolio data",
    generatedAt: new Date().toISOString(),
    dataQuality: [
      `${projects.length} projects`,
      `${projects.reduce((sum, project) => sum + project.activityCount, 0)} activities`,
      `${projects.reduce((sum, project) => sum + project.milestoneCount, 0)} milestones`,
      totals.actual > 0 ? "financial actuals present" : "financial actuals incomplete",
    ],
  };
}

/**
 * Optional LLM refinement. It is deliberately opt-in: AI_PROVIDER=openai and
 * OPENAI_API_KEY must both be configured. Otherwise the deterministic engine
 * runs entirely inside the application and no portfolio data leaves the host.
 */
async function refineWithAi(brief: AiBrief, payload: unknown): Promise<AiBrief> {
  if (process.env.AI_PROVIDER !== "openai" || !process.env.OPENAI_API_KEY) return brief;
  const base = (process.env.AI_API_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a PMO analyst for a biopharmaceutical enterprise. Use only the supplied portfolio metrics. Return JSON with summary (string), findings (3-5 short strings) and actions (3-4 short imperative strings). Do not invent numbers or projects.",
          },
          {
            role: "user",
            content: JSON.stringify({ deterministicBrief: brief, portfolio: payload }),
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return brief;
    const data = (await response.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return brief;
    const parsed = JSON.parse(text);
    if (!parsed?.summary || !Array.isArray(parsed.findings) || !Array.isArray(parsed.actions)) return brief;
    return {
      ...brief,
      summary: String(parsed.summary).slice(0, 1400),
      findings: parsed.findings.slice(0, 5).map((row: unknown) => String(row).slice(0, 500)),
      actions: parsed.actions.slice(0, 4).map((row: unknown) => String(row).slice(0, 500)),
      engine: `AI-assisted · ${model}`,
    };
  } catch {
    return brief;
  }
}

const briefCache = new Map<string, { at: number; brief: AiBrief }>();

export async function buildExecutiveAnalytics(filters: ExecutiveFilters = {}) {
  const [projects, activities, milestones] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdDate: "desc" } }),
    prisma.activity.findMany({
      select: {
        projectId: true,
        financialPlan: true,
        actualExpenditure: true,
        status: true,
        progress: true,
        endDate: true,
      },
    }),
    prisma.milestone.findMany({ select: { projectId: true, status: true, endDate: true } }),
  ]);

  const options = {
    departments: [...new Set(projects.map((project) => project.leadDepartment || "Unassigned"))].sort(),
    statuses: [...new Set(projects.map((project) => project.status))].sort(),
    funds: [...new Set(projects.map((project) => project.sourceOfFunds || "Unspecified"))].sort(),
    managers: [...new Set(projects.map((project) => project.projectManager || project.piName || "Unassigned"))].sort(),
  };

  const filtered = projects.filter((project) => {
    if (filters.department && (project.leadDepartment || "Unassigned") !== filters.department) return false;
    if (filters.status && project.status !== filters.status) return false;
    if (filters.fund && (project.sourceOfFunds || "Unspecified") !== filters.fund) return false;
    if (filters.manager && (project.projectManager || project.piName || "Unassigned") !== filters.manager) return false;
    return true;
  });
  const projectIds = new Set(filtered.map((project) => project.projectId));
  const filteredActivities = activities.filter((activity) => projectIds.has(activity.projectId));
  const filteredMilestones = milestones.filter((milestone) => projectIds.has(milestone.projectId));

  const rows: ProjectRow[] = filtered.map((project) => {
    const ownActivities = filteredActivities.filter((activity) => activity.projectId === project.projectId);
    const ownMilestones = filteredMilestones.filter((milestone) => milestone.projectId === project.projectId);
    const plan = ownActivities.reduce((sum, activity) => sum + Number(activity.financialPlan || 0), 0);
    const actual = ownActivities.reduce((sum, activity) => sum + Number(activity.actualExpenditure || 0), 0);
    const end = new Date(project.endDate);
    return {
      projectId: project.projectId,
      title: project.title,
      status: project.status,
      priority: project.priority,
      department: project.leadDepartment || "Unassigned",
      division: project.leadDivision || "Unassigned",
      manager: project.projectManager || project.piName || "Unassigned",
      fund: project.sourceOfFunds || "Unspecified",
      startDate: new Date(project.startDate).toISOString(),
      endDate: end.toISOString(),
      progress: project.progress,
      plan,
      actual,
      variance: plan - actual,
      utilization: plan > 0 ? Math.round((actual / plan) * 1000) / 10 : null,
      health: healthFor({ ...project, startDate: new Date(project.startDate), endDate: end }),
      daysToDue: Math.ceil((end.getTime() - Date.now()) / 86_400_000),
      activityCount: ownActivities.length,
      milestoneCount: ownMilestones.length,
    };
  });

  const active = rows.filter((row) => !["Completed", "Cancelled"].includes(row.status)).length;
  const complete = rows.filter((row) => row.status === "Completed" || row.progress >= 100).length;
  const atRisk = rows.filter((row) => row.health === "At Risk").length;
  const overdue = rows.filter((row) => row.health === "Overdue").length;
  const plan = rows.reduce((sum, row) => sum + row.plan, 0);
  const actual = rows.reduce((sum, row) => sum + row.actual, 0);
  const averageProgress = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) * 10) / 10
    : 0;

  const groupBy = (field: "department" | "status" | "fund" | "manager") => {
    const bucket = new Map<string, { count: number; progress: number; plan: number; actual: number }>();
    rows.forEach((row) => {
      const key = row[field] || "Unassigned";
      const current = bucket.get(key) || { count: 0, progress: 0, plan: 0, actual: 0 };
      current.count += 1;
      current.progress += row.progress;
      current.plan += row.plan;
      current.actual += row.actual;
      bucket.set(key, current);
    });
    return [...bucket.entries()]
      .map(([label, value]) => ({
        label,
        count: value.count,
        progress: Math.round((value.progress / value.count) * 10) / 10,
        plan: value.plan,
        actual: value.actual,
        variance: value.plan - value.actual,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const dimensions = groupBy("department");

  // Twelve-month delivery and expenditure view, built from activity dates so
  // that it responds to the same filters as the rest of the page.
  const monthly = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - offset), 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const inMonth = filteredActivities.filter((activity) => {
      const due = new Date(activity.endDate);
      return due >= start && due < end;
    });
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-GB", { month: "short", year: "2-digit" }),
      plan: inMonth.reduce((sum, activity) => sum + Number(activity.financialPlan || 0), 0),
      actual: inMonth.reduce((sum, activity) => sum + Number(activity.actualExpenditure || 0), 0),
      completed: inMonth.filter((activity) => activity.status === "Completed").length,
      activities: inMonth.length,
    };
  });

  const byStatus = groupBy("status");
  const byFund = groupBy("fund");
  const byManager = groupBy("manager");
  const totals = { plan, actual, variance: plan - actual, averageProgress, atRisk, overdue, active, complete };
  const scope =
    [
      filters.department && `Department: ${filters.department}`,
      filters.status && `Status: ${filters.status}`,
      filters.fund && `Fund: ${filters.fund}`,
      filters.manager && `Manager: ${filters.manager}`,
    ]
      .filter(Boolean)
      .join(" · ") || "Whole portfolio";

  const briefKey = JSON.stringify({ filters, count: rows.length, plan, actual, averageProgress });
  const cached = briefCache.get(briefKey);
  const baseBrief =
    cached && Date.now() - cached.at < 5 * 60 * 1000
      ? cached.brief
      : deterministicBrief({ scope, projects: rows, totals, dimensions });
  const brief = await refineWithAi(baseBrief, { totals, projects: rows.slice(0, 30), dimensions });
  briefCache.set(briefKey, { at: Date.now(), brief });

  return {
    generatedAt: new Date().toISOString(),
    filters,
    options,
    scope,
    totals: {
      ...totals,
      projects: rows.length,
      utilization: plan > 0 ? Math.round((actual / plan) * 1000) / 10 : null,
    },
    projects: rows.sort((a, b) => {
      const rank = { Overdue: 0, "At Risk": 1, Watch: 2, "On Track": 3 };
      return rank[a.health] - rank[b.health] || b.plan - a.plan;
    }),
    dimensions: {
      department: dimensions,
      status: byStatus,
      fund: byFund,
      manager: byManager,
    },
    monthly,
    risks: {
      overdue: rows.filter((row) => row.health === "Overdue").slice(0, 8),
      atRisk: rows.filter((row) => row.health === "At Risk").slice(0, 8),
      overBudget: rows.filter((row) => row.plan > 0 && row.actual > row.plan).slice(0, 8),
      dueSoon: rows
        .filter((row) => row.daysToDue >= 0 && row.daysToDue <= 30 && row.progress < 100)
        .sort((a, b) => a.daysToDue - b.daysToDue)
        .slice(0, 8),
    },
    ai: brief,
  };
}

/**
 * A compact AI brief for a consolidated plan report. It uses the same insight
 * vocabulary as the executive dashboard and falls back cleanly when no model
 * has been configured.
 */
export async function buildReportAiBrief(input: {
  title: string;
  periodLabel: string;
  completion: number;
  budget: number;
  kpis: { total: number; onTrack: number; behind: number; atRisk: number; noData: number };
  milestones: { total: number; completed: number; atRisk: number };
  activities: { total: number; completed: number; atRisk: number };
  updates: { verified: number; pending: number; owners: number };
  topChallenges: string[];
  topAchievements: string[];
}): Promise<AiBrief> {
  const findings = [
    `${input.kpis.onTrack} of ${input.kpis.total} KPIs are on track; ${input.kpis.behind} are behind and ${input.kpis.atRisk} are at risk.`,
    `${input.milestones.completed} of ${input.milestones.total} milestones and ${input.activities.completed} of ${input.activities.total} activities are complete.`,
    `${input.updates.verified} verified progress update${input.updates.verified === 1 ? "" : "s"} from ${input.updates.owners} owner${input.updates.owners === 1 ? "" : "s"}; ${input.updates.pending} remain unverified.`,
  ];
  if (input.topChallenges.length) findings.push(`Most cited challenge: ${input.topChallenges[0]}`);
  const actions = [
    input.kpis.atRisk
      ? "Assign a recovery action and a named owner to every KPI currently at risk."
      : "Protect the KPIs that are on track and close the evidence gap on KPIs without data.",
    input.updates.pending
      ? "Verify outstanding owner updates before the report is signed so narrative and matrices agree."
      : "Keep the verification cadence; reports are now backed by owner evidence.",
    "Use the next management meeting to review the two lowest-progress activities and confirm funding cover.",
  ];
  const brief: AiBrief = {
    summary: `${input.title} (${input.periodLabel}) is ${input.completion}% delivered against a budget of ${money(input.budget)}. KPI delivery is ${input.kpis.total ? Math.round((input.kpis.onTrack / Math.max(1, input.kpis.total)) * 100) : 0}% on track, with ${input.kpis.atRisk + input.kpis.behind} indicators requiring attention. ${input.topAchievements[0] ? `A notable achievement is ${input.topAchievements[0].replace(/\.$/, "")}.` : ""}`,
    findings,
    actions,
    confidence: Math.max(60, Math.min(94, 58 + input.updates.verified * 2 + (input.kpis.total > 0 ? 8 : 0))),
    engine: "EB-EMS Insight Engine · report evidence",
    generatedAt: new Date().toISOString(),
    dataQuality: [
      `${input.updates.verified} verified updates`,
      `${input.kpis.noData} KPIs without data`,
      `${input.activities.atRisk + input.milestones.atRisk} at-risk delivery items`,
    ],
  };
  return refineWithAi(brief, { ...input, scope: `Report: ${input.title}` });
}
