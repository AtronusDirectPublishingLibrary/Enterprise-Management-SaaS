/**
 * Appraisals run twice per Ethiopian fiscal year (8 July – 7 July):
 * H1 covers 8 Jul – 31 Dec, H2 covers 1 Jan – 7 Jul.
 */
export type AppraisalCycle = {
  cycle: string;
  fiscalYear: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
};

const FY_START_MONTH = 6; // July (0-based)
const FY_START_DAY = 8;

export function cycleForDate(date = new Date()): AppraisalCycle {
  const year = date.getFullYear();
  const fyStart = new Date(year, FY_START_MONTH, FY_START_DAY);
  const midYear = new Date(year, 0, 1);

  if (date >= fyStart) {
    return {
      cycle: `${year}-H1`,
      fiscalYear: `${year}/${year + 1}`,
      periodLabel: `H1 · Jul – Dec ${year}`,
      periodStart: fyStart,
      periodEnd: new Date(year, 11, 31),
    };
  }

  return {
    cycle: `${year - 1}-H2`,
    fiscalYear: `${year - 1}/${year}`,
    periodLabel: `H2 · Jan – Jul ${year}`,
    periodStart: midYear,
    periodEnd: new Date(year, FY_START_MONTH, FY_START_DAY - 1),
  };
}

/** The previous cycle, for late reviews and for "last appraisal" context. */
export function previousCycle(date = new Date()): AppraisalCycle {
  const current = cycleForDate(date);
  return cycleForDate(new Date(current.periodStart.getTime() - 24 * 60 * 60 * 1000));
}

/** Cycle list for admin dropdowns: the next one, the current and three back. */
export function cycleOptions(date = new Date()): AppraisalCycle[] {
  const current = cycleForDate(date);
  // Current cycle first (the one staff are working in), then the upcoming one,
  // then the previous cycles newest-first for reference.
  const options: AppraisalCycle[] = [
    current,
    cycleForDate(new Date(current.periodEnd.getTime() + 24 * 60 * 60 * 1000)),
  ];
  let cursor = new Date(current.periodStart.getTime() - 24 * 60 * 60 * 1000);
  for (let index = 0; index < 3; index += 1) {
    const cycle = cycleForDate(cursor);
    options.push(cycle);
    cursor = new Date(cycle.periodStart.getTime() - 24 * 60 * 60 * 1000);
  }
  return options;
}

export const DEFAULT_APPRAISAL_ITEMS = [
  "Job knowledge and technical quality",
  "Delivery, ownership and timeliness",
  "Quality, compliance and documentation",
  "Collaboration and communication",
  "Initiative, learning and development",
];

/** Induction checklist created for every new joiner. */
export const DEFAULT_INDUCTION_TASKS = [
  { title: "Sign employment contract and personal data form", category: "DOCUMENTS", offsetDays: 0 },
  { title: "Submit ID copy, photograph and bank details", category: "DOCUMENTS", offsetDays: 2 },
  { title: "Collect access badge, laptop and PPE", category: "IT", offsetDays: 1 },
  { title: "Create email, ERP and QMS accounts", category: "IT", offsetDays: 1 },
  { title: "GMP and data-integrity induction", category: "COMPLIANCE", offsetDays: 5 },
  { title: "Health, safety and emergency briefing", category: "COMPLIANCE", offsetDays: 3 },
  { title: "HR orientation: policies, leave and timesheets", category: "MEETINGS", offsetDays: 2 },
  { title: "Meet the supervisor and agree 90-day goals", category: "MEETINGS", offsetDays: 3 },
  { title: "Team introduction and site tour", category: "MEETINGS", offsetDays: 4 },
  { title: "Complete mandatory QMS e-learning", category: "TRAINING", offsetDays: 21 },
];
