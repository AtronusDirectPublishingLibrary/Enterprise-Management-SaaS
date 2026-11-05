import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fiscalYear, insertAopTemplate } from "../src/lib/aopTemplate";

const prisma = new PrismaClient();

type Kind = "PILLAR" | "GOAL" | "OBJECTIVE" | "STRATEGY" | "ACTIVITY" | "KPI" | "MILESTONE";

interface SeedTarget {
  periodLabel: string;
  target?: number;
  targetLabel?: string;
  actual?: number;
}

interface SeedItem {
  kind: Kind;
  code?: string;
  title: string;
  description?: string;
  owner?: string;
  unit?: string;
  targetValue?: number;
  currentValue?: number;
  direction?: string;
  frequency?: string;
  isFeatured?: boolean;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  progress?: number;
  targets?: SeedTarget[];
  children?: SeedItem[];
}

async function createItems(planId: string, items: SeedItem[], parentId: string | null = null): Promise<number> {
  let count = 0;
  let order = 0;
  for (const node of items) {
    const { children, targets, ...rest } = node;
    const item = await prisma.planItem.create({
      data: {
        ...rest,
        planId,
        parentId,
        sortOrder: order,
        targets: targets?.length
          ? {
              create: targets.map((target) => ({
                periodLabel: target.periodLabel,
                target: target.target ?? null,
                targetLabel: target.targetLabel ?? null,
                actual: target.actual ?? null,
              })),
            }
          : undefined,
      },
    });
    count += 1;
    if (children?.length) count += await createItems(planId, children, item.id);
    order += 1;
  }
  return count;
}

const STRATEGIC_ITEMS: SeedItem[] = [
  {
    kind: "PILLAR",
    code: "P1",
    title: "Infrastructure & Market Entry",
    description: "Deliver the Kilinto campus assets and open commercial routes to market.",
    children: [
      { kind: "STRATEGY", title: "Phased EPCM delivery with stage-gated design and construction reviews" },
      { kind: "STRATEGY", title: "Import substitution on high-demand essential medicines" },
      { kind: "STRATEGY", title: "Centralized procurement with EPSS framework agreements and regional distributors" },
    ],
  },
  {
    kind: "PILLAR",
    code: "P2",
    title: "ShieldVax Vaccine Facility",
    description: "Establish a WHO-GMP vaccine facility with partner-led technology transfer.",
    children: [
      { kind: "STRATEGY", title: "Partner-led technology transfer with milestone gate reviews" },
      { kind: "STRATEGY", title: "Concessional finance from AfDB, IFC and global health partners" },
      { kind: "STRATEGY", title: "Cross-subsidization from quick-win business units" },
    ],
  },
  {
    kind: "PILLAR",
    code: "P3",
    title: "Human Capital & Workforce",
    description: "Recruit, train and certify a GMP-capable technical and managerial workforce.",
    children: [
      { kind: "STRATEGY", title: "Competency-based recruitment aligned to the workforce roadmap" },
      { kind: "STRATEGY", title: "EBPE Academy with partner-delivered certification tracks" },
    ],
  },
  {
    kind: "PILLAR",
    code: "P4",
    title: "Financial Sustainability & Partnerships",
    description: "Mobilize USD 207M+ in blended finance and turn the quick-win units cash-positive.",
    children: [
      { kind: "STRATEGY", title: "Structured debt-to-equity raise with EIH, impact investors and DFIs" },
      { kind: "STRATEGY", title: "Mandatory reinvestment of quick-win profits into ShieldVax" },
    ],
  },
  {
    kind: "PILLAR",
    code: "P5",
    title: "Regulatory Excellence & Quality Systems",
    description: "Achieve WHO-GMP compliance and register the initial generic portfolio with EFDA.",
    children: [
      { kind: "STRATEGY", title: "Phased QMS implementation with early EFDA engagement" },
      { kind: "STRATEGY", title: "ISO 13485 certification for diagnostics manufacturing" },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "SO1",
    title: "Secure infrastructure readiness and market entry",
    description:
      "Complete designs, construction, validation and commissioning of the Medicines, Diagnostics and PPE units.",
    children: [
      {
        kind: "ACTIVITY",
        title: "Complete detailed design and EPCM contracts",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-09-30"),
        status: "In Progress",
        progress: 65,
      },
      {
        kind: "ACTIVITY",
        title: "Complete building shells and roofing for all units",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-12-31"),
        status: "In Progress",
        progress: 15,
      },
      {
        kind: "ACTIVITY",
        title: "Commission Diagnostics, Medicines and PPE units",
        startDate: new Date("2028-01-01"),
        endDate: new Date("2028-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "Facilities commissioned within 18-24 months",
        endDate: new Date("2028-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "SO2",
    title: "Commission ShieldVax and reach 16 million doses per year by 2030",
    description:
      "Install, validate and operate the vaccine fill-finish and formulation capability with a technology partner.",
    children: [
      {
        kind: "ACTIVITY",
        title: "Execute the technology transfer agreement",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-08-31"),
        status: "Completed",
        progress: 100,
      },
      {
        kind: "ACTIVITY",
        title: "Install and qualify the fill-finish line",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2028-06-30"),
        status: "Planned",
      },
      {
        kind: "ACTIVITY",
        title: "Produce the first commercial vaccine batch",
        startDate: new Date("2029-01-01"),
        endDate: new Date("2029-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "16 million doses annual operational throughput",
        endDate: new Date("2030-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "SO3",
    title: "Build a 400+ strong GMP-capable workforce by 2030",
    description: "Recruit, onboard and certify the technical and managerial team required by the campus.",
    children: [
      {
        kind: "ACTIVITY",
        title: "Launch the workforce development roadmap",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        status: "Completed",
        progress: 100,
      },
      {
        kind: "ACTIVITY",
        title: "Recruit and onboard 200 core staff and technicians",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
        status: "Planned",
      },
      {
        kind: "ACTIVITY",
        title: "Establish the EBPE Academy",
        startDate: new Date("2027-06-01"),
        endDate: new Date("2028-06-30"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "400+ direct jobs established and operational",
        endDate: new Date("2030-06-30"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "SO4",
    title: "Mobilize USD 207M+ in blended finance and reach financial sustainability",
    description:
      "Close the USD 126M funding gap through equity, concessional debt and development assistance.",
    children: [
      {
        kind: "ACTIVITY",
        title: "Prepare the investor data room and financial model",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-09-30"),
        status: "In Progress",
        progress: 45,
      },
      {
        kind: "ACTIVITY",
        title: "Close equity for the Medicines and Diagnostics units",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-12-31"),
        status: "Planned",
      },
      {
        kind: "ACTIVITY",
        title: "Secure concessional loans for ShieldVax",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2028-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "USD 207M blended financing secured",
        endDate: new Date("2030-06-30"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "SO5",
    title: "Achieve WHO-GMP compliance and EFDA registration",
    description: "Build the quality management system and register the initial generic portfolio.",
    children: [
      {
        kind: "ACTIVITY",
        title: "Approve the comprehensive Quality Manual",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        status: "Completed",
        progress: 100,
      },
      {
        kind: "ACTIVITY",
        title: "Qualify analytical and microbiology QC laboratories",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
        status: "In Progress",
        progress: 35,
      },
      {
        kind: "ACTIVITY",
        title: "Achieve ISO 13485 certification",
        startDate: new Date("2028-01-01"),
        endDate: new Date("2028-12-31"),
        status: "Planned",
      },
      {
        kind: "ACTIVITY",
        title: "Register five generic products with EFDA",
        startDate: new Date("2028-01-01"),
        endDate: new Date("2029-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "WHO-PQ prequalification of 2-3 products",
        endDate: new Date("2030-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "KPI",
    title: "Vaccine doses per year (operational throughput)",
    description: "Annual vaccine manufacturing throughput once ShieldVax is commissioned.",
    unit: "million doses",
    targetValue: 16,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2026", target: 0 },
      { periodLabel: "2027", target: 0 },
      { periodLabel: "2028", target: 0 },
      { periodLabel: "2029", target: 1 },
      { periodLabel: "2030", target: 16 },
    ],
  },
  {
    kind: "KPI",
    title: "Blended financing secured",
    description: "Equity, concessional debt and development assistance mobilized for the campus.",
    unit: "USD M",
    targetValue: 207,
    currentValue: 81,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2026", target: 81, actual: 81 },
      { periodLabel: "2027", target: 100 },
      { periodLabel: "2028", target: 120 },
      { periodLabel: "2029", target: 130 },
      { periodLabel: "2030", target: 207 },
    ],
  },
  {
    kind: "KPI",
    title: "Direct jobs created",
    description: "Direct technical and managerial staff employed across the campus.",
    unit: "staff",
    targetValue: 400,
    currentValue: 40,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2026", target: 40 },
      { periodLabel: "2027", target: 200 },
      { periodLabel: "2028", target: 280 },
      { periodLabel: "2029", target: 340 },
      { periodLabel: "2030", target: 400 },
    ],
  },
  {
    kind: "KPI",
    title: "Combined quick-win annual revenue",
    description: "Medicines, RDT and syringe revenue that cross-subsidizes ShieldVax.",
    unit: "USD M",
    targetValue: 10,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2026", target: 0 },
      { periodLabel: "2027", target: 0.5 },
      { periodLabel: "2028", target: 2 },
      { periodLabel: "2029", target: 6 },
      { periodLabel: "2030", target: 10 },
    ],
  },
  {
    kind: "KPI",
    title: "Local market share in targeted generics",
    description: "Share of the Ethiopian market captured in targeted essential generics.",
    unit: "%",
    targetValue: 10,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2026", target: 0 },
      { periodLabel: "2027", target: 0 },
      { periodLabel: "2028", target: 0 },
      { periodLabel: "2029", target: 5 },
      { periodLabel: "2030", target: 10 },
    ],
  },
  {
    kind: "KPI",
    title: "EFDA-registered generic products",
    description: "Products registered with the Ethiopian Food and Drug Authority.",
    unit: "products",
    targetValue: 5,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    targets: [
      { periodLabel: "2028", target: 0 },
      { periodLabel: "2029", target: 2 },
      { periodLabel: "2030", target: 5 },
    ],
  },
  {
    kind: "KPI",
    title: "WHO-GMP QMS compliance",
    description: "Implementation progress of the WHO-GMP compliant quality management system.",
    unit: "%",
    targetValue: 100,
    currentValue: 25,
    direction: "increase",
    frequency: "Annual",
    targets: [
      { periodLabel: "2026", target: 25 },
      { periodLabel: "2027", target: 55 },
      { periodLabel: "2028", target: 75 },
      { periodLabel: "2029", target: 90 },
      { periodLabel: "2030", target: 100 },
    ],
  },
];

const ROADMAP_ITEMS: SeedItem[] = [
  {
    kind: "OBJECTIVE",
    code: "Phase 0",
    title: "Phase 0 - Pre-launch foundation (Q4 2025 - Q2 2026)",
    description: "Legal, land, utility and partner agreements that unlock construction.",
    status: "Completed",
    startDate: new Date("2025-10-01"),
    endDate: new Date("2026-06-30"),
    children: [
      {
        kind: "MILESTONE",
        title: "Legal, land and utility agreements signed",
        endDate: new Date("2026-06-30"),
        status: "Completed",
        progress: 100,
      },
      {
        kind: "ACTIVITY",
        title: "Complete market, feasibility and financial studies",
        endDate: new Date("2026-05-31"),
        status: "Completed",
        progress: 100,
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "Phase 1",
    title: "Phase 1 - Groundbreaking and quick-win delivery (Q3 2026 - Q4 2028)",
    description: "Build and commission the Medicines, Diagnostics and PPE units.",
    status: "In Progress",
    startDate: new Date("2026-07-01"),
    endDate: new Date("2028-12-31"),
    children: [
      {
        kind: "ACTIVITY",
        title: "Complete detailed designs and EPCM contracts",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
        status: "In Progress",
        progress: 45,
      },
      {
        kind: "ACTIVITY",
        title: "Construct Medicines, Diagnostics and PPE units",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2028-06-30"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "Quick-win units commissioned and validated",
        endDate: new Date("2028-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "Phase 2",
    title: "Phase 2 - ShieldVax commissioning (2028 - 2030)",
    description: "Validate the vaccine facility and start commercial production.",
    startDate: new Date("2028-01-01"),
    endDate: new Date("2030-12-31"),
    children: [
      {
        kind: "ACTIVITY",
        title: "Install and qualify the vaccine fill-finish line",
        startDate: new Date("2028-01-01"),
        endDate: new Date("2029-06-30"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "First commercial vaccine batch released",
        endDate: new Date("2029-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "16 million doses per year capacity achieved",
        endDate: new Date("2030-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "Phase 3",
    title: "Phase 3 - Integrated operations (2030 - 2032)",
    description: "Digitalize operations, raise utilization and enter regional markets.",
    startDate: new Date("2030-01-01"),
    endDate: new Date("2032-12-31"),
    children: [
      {
        kind: "ACTIVITY",
        title: "Integrate ERP and digital quality systems",
        startDate: new Date("2030-01-01"),
        endDate: new Date("2031-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "30% capacity utilization in all units",
        endDate: new Date("2031-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "WHO-PQ prequalification for 2-3 products",
        endDate: new Date("2032-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "Phase 4",
    title: "Phase 4 - R&D and global expansion (2032 - 2035)",
    description: "Build the R&D pipeline and export into regional and global markets.",
    startDate: new Date("2032-01-01"),
    endDate: new Date("2035-12-31"),
    children: [
      {
        kind: "ACTIVITY",
        title: "Launch the R&D pipeline and regional subsidiaries",
        startDate: new Date("2032-01-01"),
        endDate: new Date("2035-06-30"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "55 million doses per year and 1000+ jobs",
        endDate: new Date("2035-12-31"),
        status: "Planned",
      },
      {
        kind: "MILESTONE",
        title: "10% of revenue from exports",
        endDate: new Date("2035-12-31"),
        status: "Planned",
      },
    ],
  },
  {
    kind: "KPI",
    title: "Vaccine doses per year",
    description: "Long-run vaccine manufacturing throughput.",
    unit: "million doses",
    targetValue: 55,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2030", target: 16 },
      { periodLabel: "2032", target: 30 },
      { periodLabel: "2035", target: 55 },
    ],
  },
  {
    kind: "KPI",
    title: "Direct jobs",
    description: "Direct jobs created across the integrated campus.",
    unit: "jobs",
    targetValue: 1000,
    currentValue: 40,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2030", target: 400 },
      { periodLabel: "2032", target: 600 },
      { periodLabel: "2035", target: 1000 },
    ],
  },
  {
    kind: "KPI",
    title: "Local generics market share",
    description: "Share of the Ethiopian generics market served by EBPE.",
    unit: "%",
    targetValue: 20,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [
      { periodLabel: "2032", target: 10 },
      { periodLabel: "2035", target: 20 },
    ],
  },
  {
    kind: "KPI",
    title: "Export revenue share",
    description: "Share of total revenue earned in hard currency from exports.",
    unit: "%",
    targetValue: 10,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [{ periodLabel: "2035", target: 10 }],
  },
  {
    kind: "KPI",
    title: "WHO-PQ prequalified products",
    description: "Products prequalified by WHO for UN procurement.",
    unit: "products",
    targetValue: 3,
    currentValue: 0,
    direction: "increase",
    frequency: "Annual",
    targets: [{ periodLabel: "2035", target: 3 }],
  },
];

async function ensureReports(
  planId: string,
  frequency: "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL",
  start: Date,
  end: Date,
  dueDays: number
): Promise<number> {
  const existing = await prisma.planReport.findMany({
    where: { planId, type: frequency },
    select: { periodLabel: true },
  });
  const labels = new Set(existing.map((report) => report.periodLabel));
  const rows: { planId: string; title: string; type: string; periodLabel: string; dueDate: Date }[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    let label = "";
    let windowEnd: Date;

    if (frequency === "QUARTERLY") {
      const quarter = Math.floor(month / 3) + 1;
      label = `Q${quarter} ${year}`;
      windowEnd = new Date(Date.UTC(year, quarter * 3, 0));
      cursor.setUTCMonth((quarter - 1) * 3 + 3);
    } else if (frequency === "SEMI_ANNUAL") {
      const half = month < 6 ? 1 : 2;
      label = `H${half} ${year}`;
      windowEnd = new Date(Date.UTC(year, half * 6, 0));
      cursor.setUTCMonth((half - 1) * 6 + 6);
    } else {
      label = `FY ${year}`;
      windowEnd = new Date(Date.UTC(year, 11, 31));
      cursor.setUTCFullYear(year + 1, 0, 1);
    }

    if (!labels.has(label) && windowEnd >= start) {
      rows.push({
        planId,
        title: `${label} performance report`,
        type: frequency,
        periodLabel: label,
        dueDate: new Date(windowEnd.getTime() + dueDays * 86_400_000),
      });
    }
  }

  if (rows.length) await prisma.planReport.createMany({ data: rows });
  return rows.length;
}

async function main() {
  const roadmap = await prisma.plan.upsert({
    where: { type_periodLabel: { type: "ROADMAP", periodLabel: "2026-2035" } },
    update: {},
    create: {
      type: "ROADMAP",
      title: "Ethio-Biopharma Roadmap 2026-2035",
      periodLabel: "2026-2035",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2035-12-31"),
      status: "Active",
      summary:
        "Ten-year roadmap from pre-launch foundation to an integrated biopharmaceutical campus with 55 million vaccine doses per year, 1000+ jobs and export revenue by 2035.",
      vision:
        "An integrated, self-reliant biopharmaceutical enterprise serving Ethiopia and the region with affordable, quality-assured medicines and vaccines.",
      mission:
        "Build world-class manufacturing capability, a GMP-capable workforce and a sustainable financing model that guarantees national health security.",
      owner: "admin",
      isPublished: true,
      createdBy: "admin",
    },
  });

  const strategic = await prisma.plan.upsert({
    where: { type_periodLabel: { type: "STRATEGIC", periodLabel: "2026-2030" } },
    update: {},
    create: {
      type: "STRATEGIC",
      title: "Ethio-Biopharma Strategic Plan 2026-2030",
      periodLabel: "2026-2030",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2030-12-31"),
      status: "Active",
      summary:
        "Five-year strategy to deliver the Kilinto campus, commission ShieldVax, build a 400+ workforce, mobilize USD 207M in blended finance and achieve WHO-GMP compliance.",
      vision:
        "By 2035, EBPE is Africa's trusted, self-reliant biopharmaceutical enterprise, anchoring national health security.",
      mission:
        "Manufacture affordable, WHO-quality medicines, vaccines and diagnostics; substitute imports; and reinvest quick-win profits into vaccine sovereignty.",
      owner: "admin",
      parentPlanId: roadmap.id,
      isPublished: true,
      createdBy: "admin",
    },
  });

  const strategicCount = await prisma.planItem.count({ where: { planId: strategic.id } });
  if (strategicCount === 0) {
    const created = await createItems(strategic.id, STRATEGIC_ITEMS);
    console.log(`Strategic plan: ${created} items seeded`);
  }

  const roadmapCount = await prisma.planItem.count({ where: { planId: roadmap.id } });
  if (roadmapCount === 0) {
    const created = await createItems(roadmap.id, ROADMAP_ITEMS);
    console.log(`Roadmap: ${created} items seeded`);
  }

  const fy = fiscalYear(2026);
  const aopPeriod = `${fy.label} EFY`;
  let aop = await prisma.plan.findUnique({
    where: { type_periodLabel: { type: "AOP", periodLabel: aopPeriod } },
  });
  if (!aop) {
    aop = await prisma.plan.create({
      data: {
        type: "AOP",
        title: `Annual Operational Plan ${aopPeriod}`,
        periodLabel: aopPeriod,
        startDate: fy.start,
        endDate: fy.end,
        status: "Active",
        owner: "admin",
        parentPlanId: strategic.id,
        isPublished: true,
        summary:
          "Annual operational plan generated from the EBPE standard template: five strategic pillars, ten annual objectives, quarterly major activities and KPI targets with quarterly actuals.",
        createdBy: "admin",
      },
    });
    const created = await insertAopTemplate(aop.id, 2026);
    console.log(`AOP ${aopPeriod}: ${created} items created from template`);
  }

  // Align AOP items to their strategic pillar by code prefix (P1 -> P1).
  const strategicPillars = await prisma.planItem.findMany({
    where: { planId: strategic.id, code: { not: null } },
    select: { id: true, code: true },
  });
  const pillarByCode = new Map(strategicPillars.map((item) => [item.code!, item.id]));
  const aopItems = await prisma.planItem.findMany({
    where: { planId: aop.id, linkedItemId: null },
    select: { id: true, code: true },
  });
  let aligned = 0;
  for (const item of aopItems) {
    const pillarCode = item.code?.match(/^P\d+/)?.[0];
    const target = pillarCode ? pillarByCode.get(pillarCode) : undefined;
    if (!target) continue;
    await prisma.planItem.update({ where: { id: item.id }, data: { linkedItemId: target } });
    aligned += 1;
  }
  console.log(`AOP alignment: ${aligned} items linked to strategic pillars`);

  const [aopReports, strategicReports, roadmapReports] = await Promise.all([
    ensureReports(aop.id, "QUARTERLY", fy.start, fy.end, 15),
    ensureReports(strategic.id, "SEMI_ANNUAL", strategic.startDate, strategic.endDate, 30),
    ensureReports(roadmap.id, "ANNUAL", roadmap.startDate, roadmap.endDate, 45),
  ]);
  console.log(
    `Reporting schedule: AOP ${aopReports}, strategic ${strategicReports}, roadmap ${roadmapReports} new deadlines`
  );

  console.log("\nSeeded plans:");
  const plans = await prisma.plan.findMany({
    include: { _count: { select: { items: true, reports: true } } },
    orderBy: { type: "asc" },
  });
  for (const plan of plans) {
    console.log(
      `  ${plan.type.padEnd(10)} ${plan.periodLabel.padEnd(12)} ${plan.status.padEnd(7)} items=${plan._count.items} reports=${plan._count.reports} published=${plan.isPublished}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
