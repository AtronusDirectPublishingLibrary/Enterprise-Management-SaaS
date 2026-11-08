import { prisma } from "../src/lib/prisma";
import {
  ensurePlanPeriod,
  linkPeriodSuccessions,
  syncPeriodFromPlan,
} from "../src/lib/planPeriods";
import { generatePlanReports } from "../src/lib/planReports";

/**
 * Rebuilds the three EBPE planning documents as linked plans:
 *   Roadmap 2026-2035 → Strategic Plan 2026-2030 → Annual Plan 2019 EFY (Jul 2026 – Jun 2027).
 *
 * Content follows the attached source documents: Strategic Roadmap (Feb 2026),
 * 5-Year Strategic Plan (2026-2030) and the Annual Workplan 2019 E.C. v1.2 with
 * its consolidated Annex totals (ETB 13,118,732,359).
 */
type Kind =
  | "PILLAR"
  | "GOAL"
  | "OBJECTIVE"
  | "STRATEGY"
  | "ACTIVITY"
  | "KPI"
  | "MILESTONE";

interface KpiTarget {
  periodLabel: string;
  target?: number;
  targetLabel?: string;
}

interface Node {
  kind: Kind;
  code?: string;
  title: string;
  description?: string;
  owner?: string;
  unit?: string;
  baseline?: number;
  targetValue?: number;
  direction?: string;
  frequency?: string;
  dataSource?: string;
  isFeatured?: boolean;
  budget?: number;
  status?: string;
  progress?: number;
  startDate?: Date;
  endDate?: Date;
  targets?: KpiTarget[];
  children?: Node[];
}

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

// EBPE fiscal quarters for 2019 E.C. (July 2026 – June 2027).
const Q = {
  1: { start: d("2026-07-01"), end: d("2026-09-30") },
  2: { start: d("2026-10-01"), end: d("2026-12-31") },
  3: { start: d("2027-01-01"), end: d("2027-03-31") },
  4: { start: d("2027-04-01"), end: d("2027-06-30") },
};
const span = (from: number, to = from) => ({
  startDate: Q[from as 1 | 2 | 3 | 4].start,
  endDate: Q[to as 1 | 2 | 3 | 4].end,
});

// ─── Roadmap 2026-2035 ───────────────────────────────────────────────────────

const ROADMAP_ITEMS: Node[] = [
  {
    kind: "PILLAR",
    code: "PHASE0",
    title: "Phase 0 — Pre-Launch & Foundation (Q4 2025 – Q2 2026)",
    description:
      "Secure funding, finalise designs and establish the legal and regulatory framework for all units.",
    children: [
      { kind: "MILESTONE", title: "Financing and partnerships secured", endDate: d("2026-06-30"), status: "In Progress" },
      { kind: "ACTIVITY", title: "Core leadership and technical recruitment", startDate: d("2025-10-01"), endDate: d("2026-06-30") },
      { kind: "ACTIVITY", title: "People-centred talent management plan", startDate: d("2026-01-01"), endDate: d("2026-06-30") },
    ],
  },
  {
    kind: "PILLAR",
    code: "PHASE1",
    title: "Phase 1 — Groundbreaking & Quick-Win Build-Out (Q3 2026 – Q4 2028)",
    description: "Manufacturing campus groundbreaking; construct all units in parallel and commission quick-wins within 18–24 months.",
    children: [
      { kind: "ACTIVITY", title: "Diagnostics, PPE & Medical Supplies — construction complete", endDate: d("2028-03-31") },
      { kind: "ACTIVITY", title: "Diagnostics, PPE & Medical Supplies — commissioning and validation", startDate: d("2028-01-01"), endDate: d("2028-09-30") },
      { kind: "MILESTONE", title: "Diagnostics, PPE & Medical Supplies — commercial launch", endDate: d("2028-12-31") },
      { kind: "ACTIVITY", title: "Medicines & Input Materials — construction complete", endDate: d("2028-03-31") },
      { kind: "ACTIVITY", title: "Medicines & Input Materials — commissioning and validation", startDate: d("2028-04-01"), endDate: d("2028-09-30") },
      { kind: "MILESTONE", title: "Medicines & Input Materials — commercial launch", endDate: d("2028-12-31") },
      { kind: "ACTIVITY", title: "ShieldVax civil works complete", endDate: d("2027-12-31") },
      { kind: "MILESTONE", title: "Workforce of 200–250 recruited and trained", endDate: d("2028-12-31") },
    ],
  },
  {
    kind: "PILLAR",
    code: "PHASE2",
    title: "Phase 2 — ShieldVax Commissioning & Quick-Win Scale-Up (2028 – 2030)",
    description: "Commission the vaccine fill-finish facility; scale quick-wins to profitability and regional export readiness.",
    children: [
      { kind: "ACTIVITY", title: "Installation and qualification (IQ/OQ) of fill-finish equipment", startDate: d("2028-01-01"), endDate: d("2028-09-30") },
      { kind: "MILESTONE", title: "Commissioning and validation complete", endDate: d("2028-12-31") },
      { kind: "MILESTONE", title: "First commercial vaccine batches", endDate: d("2029-12-31") },
      { kind: "MILESTONE", title: "16 million doses per year operational throughput", endDate: d("2030-12-31") },
      { kind: "MILESTONE", title: "Quick-win units at 40% capacity and operational profit", endDate: d("2030-12-31") },
      { kind: "MILESTONE", title: "Workforce of 400+ staff", endDate: d("2030-12-31") },
    ],
  },
  {
    kind: "PILLAR",
    code: "PHASE3",
    title: "Phase 3 — Integrated Operations & Vertical Expansion (2030 – 2032)",
    description: "All units operational; partial upstream planning for antigen/API and regional expansion.",
    children: [
      { kind: "MILESTONE", title: "ShieldVax at 30 million doses per year", endDate: d("2032-12-31") },
      { kind: "ACTIVITY", title: "Add injectables and liquid oral dosage lines", startDate: d("2030-01-01"), endDate: d("2032-12-31") },
      { kind: "MILESTONE", title: "10% market share in targeted essential generics", endDate: d("2032-12-31") },
      { kind: "MILESTONE", title: "WHO-PQ applications submitted for selected products", endDate: d("2032-12-31") },
      { kind: "MILESTONE", title: "Workforce of 600+ staff", endDate: d("2032-12-31") },
    ],
  },
  {
    kind: "PILLAR",
    code: "PHASE4",
    title: "Phase 4 — R&D, Innovation & Global Competitiveness (2032 – 2035)",
    description: "Transition from manufacturer to innovation-driven biopharma enterprise.",
    children: [
      { kind: "MILESTONE", title: "55 million doses per year operational throughput", endDate: d("2035-12-31") },
      { kind: "MILESTONE", title: "Biopharma R&D and Innovation Centre operational", endDate: d("2035-12-31") },
      { kind: "MILESTONE", title: "Three API products manufactured", endDate: d("2035-12-31") },
      { kind: "MILESTONE", title: "WHO-PQ for 2–3 selected products", endDate: d("2035-12-31") },
      { kind: "MILESTONE", title: "10% of revenue generated from exports", endDate: d("2035-12-31") },
      { kind: "MILESTONE", title: "Workforce of 1,000+ staff", endDate: d("2035-12-31") },
    ],
  },
  {
    kind: "KPI",
    code: "RM-KPI-1",
    title: "Vaccine doses per year (operational throughput)",
    description: "Long-run vaccine manufacturing throughput.",
    unit: "million doses",
    targetValue: 55,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [{ periodLabel: "2030", target: 16 }, { periodLabel: "2032", target: 30 }, { periodLabel: "2035", target: 55 }],
  },
  {
    kind: "KPI",
    code: "RM-KPI-2",
    title: "Direct jobs created",
    description: "Direct jobs across the integrated campus.",
    unit: "jobs",
    targetValue: 1000,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [{ periodLabel: "2030", target: 400 }, { periodLabel: "2032", target: 600 }, { periodLabel: "2035", target: 1000 }],
  },
  {
    kind: "KPI",
    code: "RM-KPI-3",
    title: "Local generics market share",
    description: "Share of the Ethiopian generics market served by EBPE (Roadmap KPI table target).",
    unit: "%",
    targetValue: 20,
    direction: "increase",
    frequency: "Annual",
    isFeatured: true,
    targets: [{ periodLabel: "2032", target: 10 }, { periodLabel: "2035", target: 20 }],
  },
  {
    kind: "KPI",
    code: "RM-KPI-4",
    title: "Export revenue share",
    description: "Share of total revenue earned in hard currency from exports.",
    unit: "%",
    targetValue: 10,
    direction: "increase",
    frequency: "Annual",
    targets: [{ periodLabel: "2035", target: 10 }],
  },
  {
    kind: "KPI",
    code: "RM-KPI-5",
    title: "WHO-PQ prequalified products",
    description: "Products prequalified by WHO for UN procurement.",
    unit: "products",
    targetValue: 3,
    direction: "increase",
    frequency: "Annual",
    targets: [{ periodLabel: "2035", target: 3 }],
  },
];

// ─── Strategic Plan 2026-2030 ────────────────────────────────────────────────

const STRATEGIC_ITEMS: Node[] = [
  {
    kind: "PILLAR",
    code: "P1",
    title: "Infrastructure and Integrated Campus Construction",
    description: "Deliver the integrated Kilinto campus and make the quick-win units market-ready.",
    children: [
      {
        kind: "OBJECTIVE",
        code: "SO1",
        title: "SO1 — Rapid infrastructure development and market entry",
        children: [
          { kind: "STRATEGY", title: "Stage-gated EPCM delivery with monthly design and construction reviews" },
          { kind: "STRATEGY", title: "Import substitution on high-demand essential medicines" },
          {
            kind: "KPI",
            title: "Campus construction packages completed",
            unit: "%",
            targetValue: 100,
            direction: "increase",
            frequency: "Annual",
            isFeatured: true,
            targets: [{ periodLabel: "2027", target: 40 }, { periodLabel: "2028", target: 80 }, { periodLabel: "2030", target: 100 }],
          },
        ],
      },
      {
        kind: "OBJECTIVE",
        code: "SO2",
        title: "SO2 — ShieldVax facility construction and readiness",
        children: [
          { kind: "STRATEGY", title: "Concessional finance from AfDB, IFC and global health partners" },
          {
            kind: "KPI",
            title: "ShieldVax fill-finish facility commissioned",
            unit: "%",
            targetValue: 100,
            direction: "increase",
            frequency: "Annual",
            targets: [{ periodLabel: "2028", target: 50 }, { periodLabel: "2030", target: 100 }],
          },
        ],
      },
    ],
  },
  {
    kind: "PILLAR",
    code: "P2",
    title: "Technology Transfer, Smart Manufacturing, R&D and Innovation",
    description: "Secure technology transfer partners and build digital, innovation-led manufacturing.",
    children: [
      {
        kind: "OBJECTIVE",
        code: "SO-TT",
        title: "Secure technology transfer partnerships for priority vaccines",
        children: [
          { kind: "STRATEGY", title: "Partner-led technology transfer with milestone gate reviews" },
          { kind: "STRATEGY", title: "Smart manufacturing: ERP, digital batch records and IoT monitoring" },
          {
            kind: "KPI",
            title: "Technology transfer agreements signed",
            unit: "agreements",
            targetValue: 3,
            direction: "increase",
            frequency: "Annual",
            isFeatured: true,
            targets: [{ periodLabel: "2027", target: 2 }, { periodLabel: "2028", target: 3 }],
          },
        ],
      },
      {
        kind: "OBJECTIVE",
        code: "SO-RD",
        title: "Build R&D and innovation capability",
        children: [
          { kind: "STRATEGY", title: "Biopharma R&D centre with university and institute partnerships" },
          {
            kind: "KPI",
            title: "R&D projects initiated",
            unit: "projects",
            targetValue: 3,
            direction: "increase",
            frequency: "Annual",
            targets: [{ periodLabel: "2029", target: 1 }, { periodLabel: "2030", target: 3 }],
          },
        ],
      },
    ],
  },
  {
    kind: "PILLAR",
    code: "P3",
    title: "Regulatory Excellence",
    description: "Achieve EFDA compliance and the WHO prequalification pathway.",
    children: [
      {
        kind: "OBJECTIVE",
        code: "SO5",
        title: "SO5 — Regulatory and quality systems",
        children: [
          { kind: "STRATEGY", title: "Phased QMS implementation with early EFDA engagement" },
          { kind: "STRATEGY", title: "ISO 13485 certification for diagnostics manufacturing" },
          {
            kind: "KPI",
            title: "QMS / PQS implementation",
            unit: "%",
            targetValue: 100,
            direction: "increase",
            frequency: "Annual",
            isFeatured: true,
            targets: [{ periodLabel: "2027", target: 50 }, { periodLabel: "2028", target: 80 }, { periodLabel: "2030", target: 100 }],
          },
          {
            kind: "KPI",
            title: "WHO-PQ prequalified products",
            unit: "products",
            targetValue: 1,
            direction: "increase",
            frequency: "Annual",
            targets: [{ periodLabel: "2030", target: 1 }],
          },
        ],
      },
    ],
  },
  {
    kind: "PILLAR",
    code: "P4",
    title: "Human Capital and Talent Management",
    description: "Build a GMP-capable workforce and a talent-first institutional culture.",
    children: [
      {
        kind: "OBJECTIVE",
        code: "SO3",
        title: "SO3 — Workforce and capacity building",
        children: [
          { kind: "STRATEGY", title: "Competency-based recruitment aligned to the workforce roadmap" },
          { kind: "STRATEGY", title: "EBPE Academy with partner-delivered certification tracks" },
          {
            kind: "KPI",
            title: "Staff recruited",
            unit: "staff",
            targetValue: 400,
            direction: "increase",
            frequency: "Annual",
            isFeatured: true,
            targets: [{ periodLabel: "2028", target: 250 }, { periodLabel: "2030", target: 400 }],
          },
          {
            kind: "KPI",
            title: "Staff GMP-certified",
            unit: "staff",
            targetValue: 200,
            direction: "increase",
            frequency: "Annual",
            targets: [{ periodLabel: "2029", target: 100 }, { periodLabel: "2030", target: 200 }],
          },
        ],
      },
    ],
  },
  {
    kind: "PILLAR",
    code: "P5",
    title: "Market Development",
    description: "Grow domestic share, regional exports and a sustainable commercial model.",
    children: [
      {
        kind: "OBJECTIVE",
        code: "SO-MD",
        title: "Develop domestic and regional markets",
        children: [
          { kind: "STRATEGY", title: "Centralized procurement with EPSS framework agreements and regional distributors" },
          {
            kind: "KPI",
            title: "Local generics market share",
            unit: "%",
            targetValue: 5,
            direction: "increase",
            frequency: "Annual",
            targets: [{ periodLabel: "2030", target: 5 }],
          },
          {
            kind: "KPI",
            title: "Export revenue share",
            unit: "%",
            targetValue: 2,
            direction: "increase",
            frequency: "Annual",
            targets: [{ periodLabel: "2030", target: 2 }],
          },
        ],
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "SO4",
    title: "SO4 — Financial sustainability foundation",
    description:
      "Cross-cutting: blended finance, cross-subsidisation from quick-wins and financial discipline.",
    children: [
      { kind: "STRATEGY", title: "Structured debt-to-equity raise with EIH, impact investors and DFIs" },
      { kind: "STRATEGY", title: "Mandatory reinvestment of quick-win profits into ShieldVax" },
      {
        kind: "KPI",
        title: "Blended finance secured",
        unit: "USD million",
        targetValue: 207,
        direction: "increase",
        frequency: "Annual",
        dataSource: "Finance / EIH reporting",
        targets: [{ periodLabel: "2028", target: 120 }, { periodLabel: "2030", target: 207 }],
      },
    ],
  },
];

// ─── Annual Plan 2019 EFY (July 2026 – June 2027) ───────────────────────────

const AOP_ITEMS: Node[] = [
  {
    kind: "OBJECTIVE",
    code: "MA.4.1",
    title: "Phase I — Civil Construction for ShieldVax Project",
    description:
      "Complete civil and structural works across the six construction packages, with client-side supervision and formal handover.",
    owner: "Engineering Team",
    budget: 7_068_265_108,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Site mobilisation, earthworks and excavation", owner: "Engineering Team", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Foundations and reinforced concrete structures", owner: "Engineering Team", ...span(1, 3) },
      { kind: "ACTIVITY", title: "Structural steel works and roofing", owner: "Engineering Team", ...span(2, 4) },
      { kind: "ACTIVITY", title: "Underground utility corridors and drainage systems", owner: "Engineering Team", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Client-side supervision, payment certificates and interim reporting", owner: "Techinvention / PMU", ...span(1, 4) },
      { kind: "ACTIVITY", title: "Project close-out and handover documentation", owner: "Engineering Team", ...span(4) },
      {
        kind: "KPI",
        code: "MA.4.1-KPI",
        title: "Percentage of Phase I civil construction completed",
        unit: "%",
        targetValue: 100,
        direction: "increase",
        frequency: "Quarterly",
        isFeatured: true,
        targets: [{ periodLabel: "Q1 2026/27", target: 25 }, { periodLabel: "Q3 2026/27", target: 75 }, { periodLabel: "Q4 2026/27", target: 100 }],
      },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "MA.4.2",
    title: "Engage TT Partner(s) for Fill-Finish of Priority Vaccines",
    description:
      "Establish a TT working group, complete due diligence and sign the TT, Quality and Supply agreements.",
    owner: "CEO Office",
    budget: 2_565_634,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Establish the TT working group with agreed terms of reference", owner: "CEO Office", ...span(1) },
      { kind: "ACTIVITY", title: "Define priority vaccine products and TT scope", owner: "CEO Office", ...span(1) },
      { kind: "ACTIVITY", title: "Review WHO GMP/TRS and Africa CDC TT guidance", owner: "QA & RA", ...span(1) },
      { kind: "ACTIVITY", title: "Draft TT protocol and TT/quality/supply agreement templates", owner: "CEO Office / Legal", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Due diligence on shortlisted TT partners", owner: "CEO Office", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Negotiate and sign TT, quality and supply agreements", owner: "CEO Office", ...span(2, 3) },
      { kind: "ACTIVITY", title: "TT implementation kick-off and readiness assessment", owner: "PMU", ...span(3, 4) },
      {
        kind: "KPI",
        code: "MA.4.2-KPI",
        title: "At least two TT agreements signed",
        unit: "agreements",
        targetValue: 2,
        direction: "increase",
        frequency: "Quarterly",
        isFeatured: true,
        targets: [{ periodLabel: "Q1 2026/27", target: 1, targetLabel: "TT protocol and selection criteria" }, { periodLabel: "Q2 2026/27", target: 2, targetLabel: "Two agreements signed" }],
      },
      { kind: "MILESTONE", title: "At least 2 TT agreements signed", owner: "CEO Office", endDate: d("2026-12-31") },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "MA.4.3",
    title: "Finalize Preparation for Phase II Project Implementation of ShieldVax",
    description:
      "EPC procurement, URS finalisation, design review and long-lead equipment procurement cleared by the World Bank.",
    owner: "PMU & Engineering",
    budget: 5_922_390_157,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Define EPC procurement strategy, contract model and bidder criteria", owner: "PMU", ...span(1) },
      { kind: "ACTIVITY", title: "Obtain World Bank No Objection on bid documents", owner: "PMU / Finance", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Publish EPC tender and evaluate proposals", owner: "Procurement", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Sign EPC contract, performance security and advance payment", owner: "CEO / Procurement", ...span(3) },
      { kind: "ACTIVITY", title: "Finalise process, utility, QC/QA and laboratory URS", owner: "Engineering / TT partner", ...span(1, 2) },
      { kind: "ACTIVITY", title: "BIM-based design review and clash detection", owner: "Engineering", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Submit RFP packages and float long-lead equipment procurement", owner: "Procurement", ...span(3, 4) },
      {
        kind: "KPI",
        code: "MA.4.3-KPI",
        title: "Percentage of Phase II preparatory activities completed",
        unit: "%",
        targetValue: 100,
        direction: "increase",
        frequency: "Quarterly",
        isFeatured: true,
        targets: [{ periodLabel: "Q1 2026/27", target: 15 }, { periodLabel: "Q2 2026/27", target: 55 }, { periodLabel: "Q3 2026/27", target: 80 }, { periodLabel: "Q4 2026/27", target: 100 }],
      },
      { kind: "MILESTONE", title: "Long-lead equipment and utility procurement initiated", owner: "Procurement", endDate: d("2027-06-30") },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "MA.4.4",
    title: "Operationalizing Ethio-BioPharma Enterprise",
    description:
      "Institutional policies, delegation of authority, office mobilisation, recruitment and PMU establishment.",
    owner: "CEO Office / HR",
    budget: 49_154_260,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Finalise HR policies and procedures", owner: "HR Manager", ...span(1) },
      { kind: "ACTIVITY", title: "Approve the customized procurement manual", owner: "Procurement", ...span(1) },
      { kind: "ACTIVITY", title: "Approve financial policies and delegation of authority matrix", owner: "Finance", ...span(1) },
      { kind: "ACTIVITY", title: "Mobilise office space at Kilinto SEZ", owner: "HR & Admin", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Procure furniture, IT, vehicles and corporate identity", owner: "Procurement", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Finalise job descriptions and recruit approved positions", owner: "HR Manager", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Establish the PMU as the MoH–EBPE–World Bank coordination unit", owner: "Sr. Project Coordinator", ...span(1) },
      { kind: "ACTIVITY", title: "Recruit Technical Advisors (finance, procurement, engineering, GMP, regulatory)", owner: "Sr. Project Coordinator / CEO", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Board meetings, committee sessions and annual retreat", owner: "Board Secretary", ...span(1, 4) },
      { kind: "ACTIVITY", title: "Install accounting software and prepare quarterly financial statements", owner: "Finance Manager", ...span(2, 4) },
      { kind: "ACTIVITY", title: "Set up procurement tracking system and approved supplier list", owner: "Procurement", ...span(2, 3) },
      {
        kind: "KPI",
        code: "MA.4.4-KPI",
        title: "Percentage of operationalization milestones completed",
        unit: "%",
        targetValue: 100,
        direction: "increase",
        frequency: "Quarterly",
        targets: [{ periodLabel: "Q1 2026/27", target: 75 }, { periodLabel: "Q2 2026/27", target: 100 }],
      },
      { kind: "MILESTONE", title: "EBPE fully operational (policies, systems, staffing, office)", owner: "CEO Office", endDate: d("2026-11-30") },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "MA.4.5",
    title: "Build Pharmaceutical Quality System for Regulatory Compliance Readiness",
    description:
      "Document control, QMS development, EFDA/WHO-PQ readiness roadmap and quality oversight reporting.",
    owner: "QA & RA Team",
    budget: 4_503_000,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Establish document storage and controlled archiving", owner: "QA & RA", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Prepare the eQMS transition roadmap", owner: "QA & RA", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Develop Quality Policy, Quality Manual and QMS framework", owner: "QA & RA", ...span(1, 2) },
      { kind: "ACTIVITY", title: "Write system-level SOPs, templates, forms and registers", owner: "QA & RA", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Train staff on the Quality Manual and implemented procedures", owner: "QA & RA / HR", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Develop EFDA approval and WHO-PQ regulatory readiness roadmap", owner: "Regulatory Affairs", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Develop the TT Quality Roadmap aligned to WHO-PQ", owner: "QA & RA", ...span(2, 3) },
      { kind: "ACTIVITY", title: "Quarterly QA alignment meetings with contractors", owner: "QA & RA", ...span(1, 4) },
      { kind: "ACTIVITY", title: "Monthly and quarterly QA/QC reports to leadership", owner: "QA & RA", ...span(1, 4) },
      {
        kind: "KPI",
        code: "MA.4.5-KPI",
        title: "Establish the Pharmaceutical Quality System",
        unit: "%",
        targetValue: 100,
        direction: "increase",
        frequency: "Quarterly",
        targets: [{ periodLabel: "Q1 2026/27", target: 50 }, { periodLabel: "Q2 2026/27", target: 75 }, { periodLabel: "Q4 2026/27", target: 100 }],
      },
      { kind: "MILESTONE", title: "QMS documentation implemented and partial eQMS in place", owner: "QA & RA", endDate: d("2027-05-31") },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "MA.4.6",
    title: "Build Workforce Capacity",
    description:
      "Training needs assessment, workforce development plan and structured training for at least 15 staff.",
    owner: "HR Manager",
    budget: 4_376_200,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Complete the training needs assessment", owner: "HR / PMU", ...span(1) },
      { kind: "ACTIVITY", title: "Develop and approve the workforce development plan", owner: "HR Manager", ...span(1) },
      { kind: "ACTIVITY", title: "Deliver project management training", owner: "HR Manager", ...span(2) },
      { kind: "ACTIVITY", title: "Deliver leadership and governance training for senior staff", owner: "HR Manager", ...span(2) },
      { kind: "ACTIVITY", title: "Deliver procurement (eGP) and contract administration training", owner: "HR Manager", ...span(2) },
      { kind: "ACTIVITY", title: "Deliver IPSAS/IFRS finance training", owner: "Finance / HR", ...span(3) },
      { kind: "ACTIVITY", title: "Deliver TT and IP governance training", owner: "CEO Office / HR", ...span(3) },
      { kind: "ACTIVITY", title: "Maintain the training matrix and staff progress records", owner: "HR Manager", ...span(1, 4) },
      {
        kind: "KPI",
        code: "MA.4.6-KPI",
        title: "Percentage of the 15-staff target cohort trained",
        unit: "%",
        targetValue: 100,
        direction: "increase",
        frequency: "Quarterly",
        isFeatured: true,
        targets: [{ periodLabel: "Q1 2026/27", target: 50 }, { periodLabel: "Q2 2026/27", target: 70 }, { periodLabel: "Q3 2026/27", target: 100 }],
      },
      { kind: "MILESTONE", title: "At least 15 staff complete documented training", owner: "HR Manager", endDate: d("2027-02-28") },
    ],
  },
  {
    kind: "OBJECTIVE",
    code: "MA.4.7",
    title: "Establish Additional Business Units",
    description:
      "Business case, bankable feasibility study, BoD appraisal, financing mobilisation, design and JV partnership.",
    owner: "CEO Office",
    budget: 67_478_000,
    status: "In Progress",
    ...span(1, 4),
    children: [
      { kind: "ACTIVITY", title: "Develop the business case and strategic assessment for additional units", owner: "CEO Office", ...span(1) },
      { kind: "ACTIVITY", title: "Commission the bankable feasibility study", owner: "CEO Office", ...span(1, 2) },
      { kind: "ACTIVITY", title: "BoD appraisal of feasibility findings and priority endorsement", owner: "CEO / Board Secretary", ...span(3) },
      { kind: "ACTIVITY", title: "Initiate financing mobilisation with DFIs and investors", owner: "Finance Manager", ...span(3, 4) },
      { kind: "ACTIVITY", title: "Procure a design consultant and commence facility design", owner: "Procurement / Engineering", ...span(3, 4) },
      { kind: "ACTIVITY", title: "Shortlist JV partners, complete due diligence and sign agreements", owner: "CEO Office", ...span(3, 4) },
      {
        kind: "KPI",
        code: "MA.4.7-KPI",
        title: "Feasibility stages completed (1–4)",
        unit: "stage",
        targetValue: 4,
        direction: "increase",
        frequency: "Quarterly",
        targets: [{ periodLabel: "Q1 2026/27", target: 1 }, { periodLabel: "Q2 2026/27", target: 2 }, { periodLabel: "Q3 2026/27", target: 3 }, { periodLabel: "Q4 2026/27", target: 4 }],
      },
      { kind: "MILESTONE", title: "Bankable feasibility study and facility design completed", owner: "CEO Office", endDate: d("2027-06-30") },
    ],
  },
];

// ─── Creation helpers ───────────────────────────────────────────────────────

async function createItems(planId: string, nodes: Node[], parentId: string | null = null): Promise<number> {
  let count = 0;
  let order = 0;
  for (const node of nodes) {
    const item = await prisma.planItem.create({
      data: {
        planId,
        parentId,
        kind: node.kind,
        code: node.code ?? null,
        title: node.title,
        description: node.description ?? null,
        owner: node.owner ?? null,
        sortOrder: order,
        unit: node.unit ?? null,
        baseline: node.baseline ?? null,
        targetValue: node.targetValue ?? null,
        direction: node.direction ?? null,
        frequency: node.frequency ?? null,
        dataSource: node.dataSource ?? null,
        isFeatured: node.isFeatured ?? false,
        startDate: node.startDate ?? null,
        endDate: node.endDate ?? null,
        budget: node.budget ?? null,
        status: node.status ?? "Planned",
        progress: node.progress ?? 0,
        targets: node.targets?.length
          ? {
              create: node.targets.map((target) => ({
                periodLabel: target.periodLabel,
                target: target.target ?? null,
                targetLabel: target.targetLabel ?? null,
              })),
            }
          : undefined,
      },
    });
    count += 1;
    order += 1;
    if (node.children?.length) count += await createItems(planId, node.children, item.id);
  }
  return count;
}

async function upsertPlan(input: {
  type: string;
  title: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  vision: string;
  mission: string;
  parentPlanId: string | null;
  items: Node[];
}) {
  const plan = await prisma.plan.upsert({
    where: { type_periodLabel: { type: input.type, periodLabel: input.periodLabel } },
    update: {},
    create: {
      type: input.type,
      title: input.title,
      periodLabel: input.periodLabel,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "Active",
      summary: input.summary,
      vision: input.vision,
      mission: input.mission,
      owner: "admin",
      parentPlanId: input.parentPlanId,
      isPublished: true,
      createdBy: "seed",
    },
  });

  const existing = await prisma.planItem.count({ where: { planId: plan.id } });
  const created = existing === 0 ? await createItems(plan.id, input.items) : 0;
  return { plan, created, existing };
}

async function align(childPlanId: string, parentPlanId: string, byCode: Record<string, string>) {
  const [childItems, parentItems] = await Promise.all([
    prisma.planItem.findMany({ where: { planId: childPlanId }, select: { id: true, code: true } }),
    prisma.planItem.findMany({
      where: { planId: parentPlanId, code: { not: null } },
      select: { id: true, code: true },
    }),
  ]);
  const parentByCode = new Map(parentItems.map((item) => [item.code as string, item.id]));
  let linked = 0;
  for (const item of childItems) {
    const targetCode = item.code ? byCode[item.code] : undefined;
    const targetId = targetCode ? parentByCode.get(targetCode) : undefined;
    if (!targetId) continue;
    await prisma.planItem.update({ where: { id: item.id }, data: { linkedItemId: targetId } });
    linked += 1;
  }
  return linked;
}

async function main() {
  const vision =
    "To be among Africa's leading integrated biopharmaceutical campus, ensuring health security and pharmaceutical sovereignty for Ethiopia and the continent.";
  const mission =
    "To develop, manufacture and deliver high-quality, affordable essential medicines, vaccines, diagnostics and medical supplies through a self-sustaining ecosystem of manufacturing businesses.";

  const roadmap = await upsertPlan({
    type: "ROADMAP",
    title: "Ethio-Biopharma Strategic Roadmap 2026-2035",
    periodLabel: "2026-2035",
    startDate: d("2026-01-01"),
    endDate: d("2035-12-31"),
    summary:
      "Ten-year roadmap: pre-launch foundation, quick-win build-out, ShieldVax commissioning, integrated operations and innovation-driven expansion.",
    vision,
    mission,
    parentPlanId: null,
    items: ROADMAP_ITEMS,
  });

  const strategic = await upsertPlan({
    type: "STRATEGIC",
    title: "Ethio-Biopharma 5-Year Strategic Plan (2026-2030)",
    periodLabel: "2026-2030",
    startDate: d("2026-01-01"),
    endDate: d("2030-12-31"),
    summary:
      "Five strategic pillars, five strategic objectives, USD 207M investment envelope and the blended-finance path to sustainability.",
    vision,
    mission,
    parentPlanId: roadmap.plan.id,
    items: STRATEGIC_ITEMS,
  });

  const aop = await upsertPlan({
    type: "AOP",
    title: "Annual Workplan 2019 E.C. (July 2026 – June 2027)",
    periodLabel: "2026/27 EFY",
    startDate: d("2026-07-01"),
    endDate: d("2027-06-30"),
    summary:
      "Seven major activities with a consolidated budget of ETB 13,118,732,359 (EIH and World Bank HEPRR), seven KPIs and quarterly milestones.",
    vision,
    mission,
    parentPlanId: strategic.plan.id,
    items: AOP_ITEMS,
  });

  // Alignment: annual objectives → strategic pillars, strategic pillars → roadmap phases.
  const aopToStrategic: Record<string, string> = {
    "MA.4.1": "P1",
    "MA.4.2": "P2",
    "MA.4.3": "P1",
    "MA.4.4": "P4",
    "MA.4.5": "P3",
    "MA.4.6": "P4",
    "MA.4.7": "P5",
  };
  const strategicToRoadmap: Record<string, string> = {
    P1: "PHASE1",
    P2: "PHASE2",
    P3: "PHASE2",
    P4: "PHASE1",
    P5: "PHASE3",
  };
  const aopLinks = await align(aop.plan.id, strategic.plan.id, aopToStrategic);
  const strategicLinks = await align(strategic.plan.id, roadmap.plan.id, strategicToRoadmap);

  // Periods: create and link, then generate the reporting calendar.
  await ensurePlanPeriod(roadmap.plan.id, "seed");
  await ensurePlanPeriod(strategic.plan.id, "seed");
  await ensurePlanPeriod(aop.plan.id, "seed");
  for (const type of ["ROADMAP", "STRATEGIC", "AOP"] as const) {
    await linkPeriodSuccessions(type);
  }
  await syncPeriodFromPlan(roadmap.plan.id);
  await syncPeriodFromPlan(strategic.plan.id);
  await syncPeriodFromPlan(aop.plan.id);

  const [aopReports, strategicReports, roadmapReports] = await Promise.all([
    generatePlanReports(aop.plan.id),
    generatePlanReports(strategic.plan.id),
    generatePlanReports(roadmap.plan.id),
  ]);

  console.log("Seeded EBPE plans:");
  console.log(`  ROADMAP    ${roadmap.plan.periodLabel}  items=${roadmap.created || roadmap.existing}  reports=${roadmapReports.created}`);
  console.log(`  STRATEGIC  ${strategic.plan.periodLabel}  items=${strategic.created || strategic.existing}  reports=${strategicReports.created}`);
  console.log(`  AOP        ${aop.plan.periodLabel}  items=${aop.created || aop.existing}  reports=${aopReports.created}`);
  console.log(`  Alignment: AOP→Strategic ${aopLinks}, Strategic→Roadmap ${strategicLinks}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
