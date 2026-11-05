import { prisma } from "./prisma";

export type PlanItemKind =
  | "PILLAR"
  | "GOAL"
  | "OBJECTIVE"
  | "STRATEGY"
  | "ACTIVITY"
  | "KPI"
  | "MILESTONE";

export interface TemplateKpiTarget {
  periodLabel: string;
  target?: number;
  targetLabel?: string;
}

export interface TemplateNode {
  kind: PlanItemKind;
  code?: string;
  title: string;
  description?: string;
  owner?: string;
  unit?: string;
  targetValue?: number;
  baseline?: number;
  direction?: string;
  frequency?: string;
  dataSource?: string;
  isFeatured?: boolean;
  quarter?: number;
  quarterEnd?: number;
  targets?: TemplateKpiTarget[];
  children?: TemplateNode[];
}

interface FiscalWindow {
  label: string;
  start: Date;
  end: Date;
}

/** Fiscal year runs July -> June (Ethiopian FY). */
export function fiscalYear(startYear: number): { label: string; quarters: FiscalWindow[]; start: Date; end: Date } {
  const label = `${startYear}/${String(startYear + 1).slice(2)}`;
  const quarters: FiscalWindow[] = [
    { label: "Q1", start: new Date(Date.UTC(startYear, 6, 1)), end: new Date(Date.UTC(startYear, 8, 30)) },
    { label: "Q2", start: new Date(Date.UTC(startYear, 9, 1)), end: new Date(Date.UTC(startYear, 11, 31)) },
    { label: "Q3", start: new Date(Date.UTC(startYear + 1, 0, 1)), end: new Date(Date.UTC(startYear + 1, 2, 31)) },
    { label: "Q4", start: new Date(Date.UTC(startYear + 1, 3, 1)), end: new Date(Date.UTC(startYear + 1, 5, 30)) },
  ];
  return { label, quarters, start: quarters[0].start, end: quarters[3].end };
}

function qTargets(fyLabel: string, values: number[]): TemplateKpiTarget[] {
  return values.map((target, index) => ({
    periodLabel: `Q${index + 1} ${fyLabel}`,
    target,
  }));
}

function annualTarget(fyLabel: string, target: number): TemplateKpiTarget {
  return { periodLabel: `FY ${fyLabel}`, target };
}

/**
 * Annual Operational Plan template: 5 strategic pillars, 10 annual objectives,
 * strategies, quarterly major activities and KPIs with quarterly + annual targets.
 * Everything is editable after generation — the template is a starting scaffold.
 */
export function buildAopTemplate(fyStartYear: number): TemplateNode[] {
  const fy = fiscalYear(fyStartYear);
  const fyLabel = fy.label;

  return [
    {
      kind: "PILLAR",
      code: "P1",
      title: "Infrastructure & Market Entry",
      description: "Deliver the Kilinto campus assets and open commercial routes to market.",
      children: [
        {
          kind: "OBJECTIVE",
          code: "P1-O1",
          title: "Complete campus civil works, utilities and validation",
          description: "Hand over fully commissioned Medicines, Diagnostics and PPE facilities.",
          children: [
            {
              kind: "STRATEGY",
              title: "Stage-gated EPCM delivery with monthly design and construction reviews",
            },
            { kind: "ACTIVITY", title: "Finalize architectural, MEP and utility designs", quarter: 1 },
            { kind: "ACTIVITY", title: "Complete building shells and roofing for all units", quarter: 2, quarterEnd: 3 },
            { kind: "ACTIVITY", title: "Commission utilities, HVAC and clean rooms", quarter: 4 },
            {
              kind: "KPI",
              title: "Facility and utility design approval",
              unit: "%",
              targetValue: 100,
              frequency: "Quarterly",
              direction: "increase",
              isFeatured: true,
              targets: [...qTargets(fyLabel, [50, 80, 100, 100]), annualTarget(fyLabel, 100)],
            },
          ],
        },
        {
          kind: "OBJECTIVE",
          code: "P1-O2",
          title: "Operationalize procurement and market access",
          description: "Stand up the Centralized Procurement Office and secure the first supply agreements.",
          children: [
            { kind: "STRATEGY", title: "Framework agreements with EPSS, regional distributors and key buyers" },
            { kind: "ACTIVITY", title: "Stand up the Centralized Procurement Office", quarter: 1 },
            { kind: "ACTIVITY", title: "Negotiate the first EPSS long-term framework agreement", quarter: 2, quarterEnd: 3 },
            { kind: "ACTIVITY", title: "Onboard regional distributors and key accounts", quarter: 4 },
            {
              kind: "KPI",
              title: "EPSS framework agreements signed",
              unit: "agreements",
              targetValue: 1,
              frequency: "Annual",
              direction: "increase",
              targets: [annualTarget(fyLabel, 1)],
            },
          ],
        },
      ],
    },
    {
      kind: "PILLAR",
      code: "P2",
      title: "ShieldVax Vaccine Facility",
      description: "Build, validate and prepare the vaccine facility for commercial production.",
      children: [
        {
          kind: "OBJECTIVE",
          code: "P2-O1",
          title: "Advance ShieldVax construction and technology transfer",
          description: "Install the fill-finish line and run engineering batches with the technology partner.",
          children: [
            { kind: "STRATEGY", title: "Partner-led technology transfer with milestone-based gate reviews" },
            { kind: "ACTIVITY", title: "Execute the technology transfer agreement", quarter: 1 },
            { kind: "ACTIVITY", title: "Install and qualify the fill-finish line", quarter: 3 },
            { kind: "ACTIVITY", title: "Run engineering and validation batches", quarter: 4 },
            {
              kind: "KPI",
              title: "Commercial vaccine batches produced",
              unit: "batches",
              targetValue: 1,
              frequency: "Quarterly",
              direction: "increase",
              isFeatured: true,
              targets: [...qTargets(fyLabel, [0, 0, 0, 1]), annualTarget(fyLabel, 1)],
            },
          ],
        },
        {
          kind: "OBJECTIVE",
          code: "P2-O2",
          title: "Secure Phase 2 bridge financing",
          description: "Close concessional and bridge facilities that protect the ShieldVax launch.",
          children: [
            { kind: "STRATEGY", title: "DFI engagement (AfDB, IFC) plus GAVI/CEPI development assistance" },
            { kind: "ACTIVITY", title: "Negotiate concessional loan terms with AfDB and IFC", quarter: 2 },
            { kind: "ACTIVITY", title: "Finalize bridge facility documentation", quarter: 4 },
            {
              kind: "KPI",
              title: "Phase 2 bridge financing secured",
              unit: "USD M",
              targetValue: 20,
              frequency: "Quarterly",
              direction: "increase",
              targets: [...qTargets(fyLabel, [0, 5, 10, 20]), annualTarget(fyLabel, 20)],
            },
          ],
        },
      ],
    },
    {
      kind: "PILLAR",
      code: "P3",
      title: "Human Capital & Workforce",
      description: "Recruit, train and certify the technical and managerial workforce.",
      children: [
        {
          kind: "OBJECTIVE",
          code: "P3-O1",
          title: "Recruit and onboard the core technical workforce",
          description: "Fill critical technical and managerial roles with GMP-ready staff.",
          children: [
            { kind: "STRATEGY", title: "Workforce roadmap with competency-based recruitment and onboarding" },
            { kind: "ACTIVITY", title: "Complete workforce gap analysis and job architecture", quarter: 1 },
            { kind: "ACTIVITY", title: "Recruit 200 core staff and technicians", quarter: 2, quarterEnd: 3 },
            { kind: "ACTIVITY", title: "Deliver GMP induction and safety training", quarter: 4 },
            {
              kind: "KPI",
              title: "Core staff recruited and onboarded",
              unit: "staff",
              targetValue: 200,
              frequency: "Quarterly",
              direction: "increase",
              isFeatured: true,
              targets: [...qTargets(fyLabel, [30, 90, 160, 200]), annualTarget(fyLabel, 200)],
            },
          ],
        },
        {
          kind: "OBJECTIVE",
          code: "P3-O2",
          title: "Institutionalize GMP capability",
          description: "Build a certified, auditable quality culture across all units.",
          children: [
            { kind: "STRATEGY", title: "EBPE Academy with partner-delivered certification tracks" },
            { kind: "ACTIVITY", title: "Launch the EBPE Academy curriculum", quarter: 2 },
            { kind: "ACTIVITY", title: "Certify aseptic processing operators", quarter: 4 },
            {
              kind: "KPI",
              title: "Staff completing GMP certification",
              unit: "staff",
              targetValue: 120,
              frequency: "Quarterly",
              direction: "increase",
              targets: [...qTargets(fyLabel, [0, 20, 60, 120]), annualTarget(fyLabel, 120)],
            },
          ],
        },
      ],
    },
    {
      kind: "PILLAR",
      code: "P4",
      title: "Financial Sustainability & Partnerships",
      description: "Mobilize blended finance and turn the quick-win units cash-positive.",
      children: [
        {
          kind: "OBJECTIVE",
          code: "P4-O1",
          title: "Close the funding gap for the quick-win units",
          description: "Raise equity and debt for the Medicines and Diagnostics units.",
          children: [
            { kind: "STRATEGY", title: "Structured debt-to-equity raise with EIH, impact investors and DFIs" },
            { kind: "ACTIVITY", title: "Prepare investor data room, teaser and financial model", quarter: 1 },
            { kind: "ACTIVITY", title: "Close the equity round for the Medicines unit", quarter: 3 },
            { kind: "ACTIVITY", title: "Secure debt facilities with DBE and IFC", quarter: 4 },
            {
              kind: "KPI",
              title: "Blended finance mobilized",
              unit: "USD M",
              targetValue: 81,
              frequency: "Quarterly",
              direction: "increase",
              isFeatured: true,
              targets: [...qTargets(fyLabel, [40, 60, 70, 81]), annualTarget(fyLabel, 81)],
            },
          ],
        },
        {
          kind: "OBJECTIVE",
          code: "P4-O2",
          title: "Deliver early quick-win revenue",
          description: "Launch Medicines, RDT and syringe lines and start cross-subsidizing ShieldVax.",
          children: [
            { kind: "STRATEGY", title: "Import substitution on high-demand essential medicines" },
            { kind: "ACTIVITY", title: "Commercial launch of the Medicines unit", quarter: 3 },
            { kind: "ACTIVITY", title: "Launch the RDT and syringe lines", quarter: 4 },
            {
              kind: "KPI",
              title: "Combined quick-win revenue",
              unit: "USD M",
              targetValue: 2,
              frequency: "Quarterly",
              direction: "increase",
              isFeatured: true,
              targets: [...qTargets(fyLabel, [0, 0.4, 1, 2]), annualTarget(fyLabel, 2)],
            },
          ],
        },
      ],
    },
    {
      kind: "PILLAR",
      code: "P5",
      title: "Regulatory Excellence & Quality Systems",
      description: "Achieve WHO-GMP compliance and register products with EFDA.",
      children: [
        {
          kind: "OBJECTIVE",
          code: "P5-O1",
          title: "Build the WHO-GMP quality management system",
          description: "Document, qualify and audit the QMS across active lines.",
          children: [
            { kind: "STRATEGY", title: "Phased QMS implementation with early EFDA engagement" },
            { kind: "ACTIVITY", title: "Approve the comprehensive Quality Manual", quarter: 1 },
            { kind: "ACTIVITY", title: "Qualify analytical and microbiology QC labs", quarter: 3 },
            { kind: "ACTIVITY", title: "Host internal and external GMP audits", quarter: 4 },
            {
              kind: "KPI",
              title: "QMS implementation milestones completed",
              unit: "%",
              targetValue: 100,
              frequency: "Quarterly",
              direction: "increase",
              targets: [...qTargets(fyLabel, [25, 55, 80, 100]), annualTarget(fyLabel, 100)],
            },
          ],
        },
        {
          kind: "OBJECTIVE",
          code: "P5-O2",
          title: "Register products with EFDA",
          description: "Submit and defend dossiers for the initial generic portfolio.",
          children: [
            { kind: "STRATEGY", title: "Parallel dossier preparation with regulatory affairs task force" },
            { kind: "ACTIVITY", title: "Submit dossiers for five generic products", quarter: 2 },
            { kind: "ACTIVITY", title: "Respond to EFDA queries and close gaps", quarter: 3, quarterEnd: 4 },
            {
              kind: "KPI",
              title: "Products registered with EFDA",
              unit: "products",
              targetValue: 5,
              frequency: "Quarterly",
              direction: "increase",
              targets: [...qTargets(fyLabel, [0, 0, 2, 5]), annualTarget(fyLabel, 5)],
            },
          ],
        },
      ],
    },
  ];
}

export interface AopTemplateSummary {
  fyLabel: string;
  startDate: string;
  endDate: string;
  pillars: number;
  objectives: number;
  activities: number;
  kpis: number;
  outline: { code: string; title: string; objectives: string[] }[];
}

export function summarizeAopTemplate(fyStartYear: number): AopTemplateSummary {
  const fy = fiscalYear(fyStartYear);
  const template = buildAopTemplate(fyStartYear);
  let objectives = 0;
  let activities = 0;
  let kpis = 0;
  const outline: AopTemplateSummary["outline"] = [];

  for (const pillar of template) {
    const children = pillar.children ?? [];
    const objectiveTitles: string[] = [];
    for (const child of children) {
      if (child.kind === "OBJECTIVE") {
        objectives += 1;
        objectiveTitles.push(child.title);
        for (const grandchild of child.children ?? []) {
          if (grandchild.kind === "ACTIVITY") activities += 1;
          if (grandchild.kind === "KPI") kpis += 1;
        }
      }
    }
    outline.push({ code: pillar.code ?? "", title: pillar.title, objectives: objectiveTitles });
  }

  return {
    fyLabel: fy.label,
    startDate: fy.start.toISOString(),
    endDate: fy.end.toISOString(),
    pillars: template.length,
    objectives,
    activities,
    kpis,
    outline,
  };
}

/** Persist the template under a plan, resolving fiscal-quarter dates. */
export async function insertAopTemplate(
  planId: string,
  fyStartYear: number
): Promise<number> {
  const fy = fiscalYear(fyStartYear);
  const template = buildAopTemplate(fyStartYear);
  let created = 0;

  async function insert(nodes: TemplateNode[], parentId: string | null, depth: number): Promise<void> {
    let order = 0;
    for (const node of nodes) {
      const quarter = node.quarter ?? (node.kind === "ACTIVITY" ? 1 : undefined);
      const quarterEnd = node.quarterEnd ?? quarter;
      const startDate = quarter ? fy.quarters[quarter - 1]?.start : undefined;
      const endDate = quarterEnd ? fy.quarters[quarterEnd - 1]?.end : undefined;

      const item = await prisma.planItem.create({
        data: {
          planId,
          parentId,
          kind: node.kind,
          code: node.code,
          title: node.title,
          description: node.description,
          owner: node.owner,
          sortOrder: order,
          unit: node.unit,
          baseline: node.baseline,
          targetValue: node.targetValue,
          direction: node.direction,
          frequency: node.frequency,
          dataSource: node.dataSource,
          isFeatured: node.isFeatured ?? false,
          startDate,
          endDate,
          progress: 0,
          targets: node.targets?.length
            ? {
                create: node.targets.map((target) => ({
                  periodLabel: target.periodLabel,
                  target: target.target,
                  targetLabel: target.targetLabel,
                })),
              }
            : undefined,
        },
      });
      created += 1;

      if (node.children?.length) {
        await insert(node.children, item.id, depth + 1);
      }
      order += 1;
    }
  }

  await insert(template, null, 0);
  return created;
}
