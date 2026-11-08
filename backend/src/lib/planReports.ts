import { prisma } from "./prisma";

export type ReportFrequency = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";

export interface ReportWindow {
  periodLabel: string;
  start: Date;
  end: Date;
}

/** Split a period into the reporting windows of a given cadence. */
export function reportWindows(frequency: string, start: Date, end: Date): ReportWindow[] {
  const windows: ReportWindow[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  const push = (label: string, windowStart: Date, windowEnd: Date) => {
    if (windowEnd < start || windowStart > end) return;
    if (windows.some((window) => window.periodLabel === label)) return;
    windows.push({ periodLabel: label, start: windowStart, end: windowEnd });
  };

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();

    if (frequency === "MONTHLY") {
      push(
        cursor.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
        new Date(Date.UTC(year, month, 1)),
        new Date(Date.UTC(year, month + 1, 0))
      );
      cursor.setUTCMonth(month + 1);
    } else if (frequency === "QUARTERLY") {
      const quarter = Math.floor(month / 3) + 1;
      // Plans that start in July follow the Ethiopian fiscal year, so label
      // quarters Q1..Q4 against that fiscal year instead of the calendar one.
      const fiscal = start.getUTCMonth() === 6;
      let label = `Q${quarter} ${year}`;
      if (fiscal) {
        const fyStart = month >= 6 ? year : year - 1;
        const fiscalQuarter = Math.floor(((month - 6 + 12) % 12) / 3) + 1;
        label = `Q${fiscalQuarter} ${fyStart}/${String((fyStart + 1) % 100).padStart(2, "0")}`;
      }
      push(
        label,
        new Date(Date.UTC(year, (quarter - 1) * 3, 1)),
        new Date(Date.UTC(year, quarter * 3, 0))
      );
      cursor.setUTCMonth((quarter - 1) * 3 + 3);
    } else if (frequency === "SEMI_ANNUAL") {
      const half = month < 6 ? 1 : 2;
      push(
        `H${half} ${year}`,
        new Date(Date.UTC(year, (half - 1) * 6, 1)),
        new Date(Date.UTC(year, half * 6, 0))
      );
      cursor.setUTCMonth((half - 1) * 6 + 6);
    } else {
      push(`FY ${year}`, new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31)));
      cursor.setUTCFullYear(year + 1, 0, 1);
    }
  }

  return windows;
}

/** Default reporting cadence per plan level, matching EBPE's reporting obligations. */
export function defaultReportFrequency(type: string): ReportFrequency {
  if (type === "AOP") return "QUARTERLY";
  if (type === "STRATEGIC") return "SEMI_ANNUAL";
  return "ANNUAL";
}

export function defaultDueDays(type: string): number {
  if (type === "AOP") return 15;
  if (type === "STRATEGIC") return 30;
  return 45;
}

export async function generatePlanReports(
  planId: string,
  options: {
    frequency?: ReportFrequency;
    startDate?: Date;
    endDate?: Date;
    dueDaysAfterPeriod?: number;
    owner?: string | null;
  } = {}
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    const error = new Error("Plan not found") as Error & { status?: number };
    error.status = 404;
    throw error;
  }

  const frequency = options.frequency ?? defaultReportFrequency(plan.type);
  const start = options.startDate ?? plan.startDate;
  const end = options.endDate ?? plan.endDate;
  const dueDays = options.dueDaysAfterPeriod ?? defaultDueDays(plan.type);

  const windows = reportWindows(frequency, new Date(start), new Date(end));
  const existing = await prisma.planReport.findMany({
    where: { planId: plan.id, type: frequency },
    select: { periodLabel: true },
  });
  const existingLabels = new Set(existing.map((report) => report.periodLabel));

  const created = windows
    .filter((window) => !existingLabels.has(window.periodLabel))
    .map((window) => ({
      planId: plan.id,
      title: `${window.periodLabel} performance report`,
      type: frequency,
      periodLabel: window.periodLabel,
      dueDate: new Date(window.end.getTime() + dueDays * 86_400_000),
      owner: options.owner ?? plan.owner ?? null,
    }));

  if (created.length) await prisma.planReport.createMany({ data: created });

  return {
    frequency,
    created: created.length,
    skipped: windows.length - created.length,
    windows: windows.length,
  };
}
