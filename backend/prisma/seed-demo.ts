import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const D = (s: string) => new Date(s);
const DAY = 86_400_000;
const dur = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

async function main() {
  console.log("Seeding demo projects...\n");

  // ============================================================
  // PROJECT 1 — Malaria Vaccine Candidate (Preclinical)
  // ============================================================
  const p1 = await prisma.project.upsert({
    where:  { projectId: "P-1001" },
    update: {},
    create: {
      projectId: "P-1001",
      title: "Malaria Vaccine Candidate - Preclinical Development",
      description: "Development and preclinical evaluation of a novel blood-stage malaria vaccine candidate (PfRH5-based) at AHRI.",
      sourceOfFunds: "Competitive Grants",
      startDate: D("2025-01-01"),
      endDate: D("2027-12-31"),
      status: "In Progress",
      priority: "High",
      progress: 38,
      projectCategory: "Preclinical",
      leadDirectorate: "CNCDRD",
      leadDivision: "MOBD",
      piName: "Dr. Fikre Enquselassie",
      piEmail: "fikre@ethiobiopharma.et",
      projectManager: "pm_demo",
      createdBy: "admin",
      lastModifiedBy: "admin",
    },
  });
  console.log(`Project: ${p1.projectId}  ${p1.title}`);

  const p1wp1 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1001-WP1" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: "P-1001-WP1",
      title: "WP1 - Antigen Design & Expression",
      description: "Design and produce recombinant PfRH5 variants in HEK293 cells.",
      startDate: D("2025-01-01"), endDate: D("2025-09-30"),
      progress: 70, status: "In Progress", createdBy: "pm_demo",
    },
  });
  const p1wp2 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1001-WP2" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: "P-1001-WP2",
      title: "WP2 - Immunogenicity in Animal Models",
      description: "Evaluate antibody titers and functional activity in rabbits and mice.",
      startDate: D("2025-06-01"), endDate: D("2026-06-30"),
      progress: 35, status: "In Progress", createdBy: "pm_demo",
    },
  });
  const p1wp3 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1001-WP3" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: "P-1001-WP3",
      title: "WP3 - Regulatory & GMP Readiness",
      description: "Prepare CMC documentation and identify GMP manufacturing partner.",
      startDate: D("2026-07-01"), endDate: D("2027-12-31"),
      progress: 0, status: "Not Started", createdBy: "pm_demo",
    },
  });
  console.log(`  WPs: ${p1wp1.workPackageId}, ${p1wp2.workPackageId}, ${p1wp3.workPackageId}`);

  const a1_1 = await prisma.activity.upsert({
    where: { activityId: "P-1001-A1" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: p1wp1.workPackageId,
      activityId: "P-1001-A1",
      title: "Clone PfRH5 variants into expression vector",
      description: "Generate 4 variant constructs using Gibson assembly.",
      startDate: D("2025-01-15"), endDate: D("2025-03-15"),
      duration: dur(D("2025-01-15"), D("2025-03-15")),
      progress: 100, status: "Complete", assignedTo: "Dr. Abebe",
      financialPlan: 180000, actualExpenditure: 172500,
      createdBy: "pm_demo",
    },
  });
  const a1_2 = await prisma.activity.upsert({
    where: { activityId: "P-1001-A2" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: p1wp1.workPackageId,
      activityId: "P-1001-A2",
      title: "Transfection & protein purification",
      description: "Transfect HEK293, purify via Ni-NTA and SEC.",
      startDate: D("2025-03-16"), endDate: D("2025-08-31"),
      duration: dur(D("2025-03-16"), D("2025-08-31")),
      progress: 65, status: "In Progress", assignedTo: "Dr. Bekele",
      financialPlan: 420000, actualExpenditure: 265000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1001-A2.1" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: p1wp1.workPackageId,
      parentActivityId: a1_2.activityId,
      activityId: "P-1001-A2.1",
      title: "Small-scale transfection (100 mL)",
      description: "Optimize transfection parameters.",
      startDate: D("2025-03-16"), endDate: D("2025-05-15"),
      duration: dur(D("2025-03-16"), D("2025-05-15")),
      progress: 100, status: "Complete", assignedTo: "Dr. Bekele",
      financialPlan: 60000, actualExpenditure: 58000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1001-A2.2" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: p1wp1.workPackageId,
      parentActivityId: a1_2.activityId,
      activityId: "P-1001-A2.2",
      title: "Scale-up to 2 L bioreactor",
      description: "Transition to bioreactor production for WP2 material.",
      startDate: D("2025-05-16"), endDate: D("2025-08-31"),
      duration: dur(D("2025-05-16"), D("2025-08-31")),
      progress: 40, status: "In Progress", assignedTo: "Dr. Bekele",
      financialPlan: 360000, actualExpenditure: 207000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1001-A3" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: p1wp2.workPackageId,
      activityId: "P-1001-A3",
      title: "Rabbit immunization study",
      description: "3-dose immunization, weeks 0, 4, 8.",
      startDate: D("2025-07-01"), endDate: D("2026-02-28"),
      duration: dur(D("2025-07-01"), D("2026-02-28")),
      progress: 45, status: "In Progress", assignedTo: "Dr. Chala",
      financialPlan: 640000, actualExpenditure: 288000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1001-A4" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: p1wp2.workPackageId,
      activityId: "P-1001-A4",
      title: "Growth inhibition assay (GIA)",
      description: "Functional assay at 3 time points.",
      startDate: D("2025-10-01"), endDate: D("2026-06-30"),
      duration: dur(D("2025-10-01"), D("2026-06-30")),
      progress: 20, status: "In Progress", assignedTo: "Dr. Fikre",
      financialPlan: 380000, actualExpenditure: 76000,
      createdBy: "pm_demo",
    },
  });

  // ============================================================
  // PROJECT 2 — TB Drug Resistance (Basic Biomedical Science)
  // ============================================================
  const p2 = await prisma.project.upsert({
    where:  { projectId: "P-1002" }, update: {},
    create: {
      projectId: "P-1002",
      title: "Molecular Surveillance of MDR-TB in Addis Ababa",
      description: "Whole-genome sequencing of rifampicin-resistant M. tuberculosis isolates to characterize resistance mutations and transmission clusters.",
      sourceOfFunds: "Treasury",
      startDate: D("2024-10-01"),
      endDate: D("2026-09-30"),
      status: "In Progress",
      priority: "Critical",
      progress: 52,
      projectCategory: "Basic Biomedical Science",
      leadDirectorate: "TMMRD",
      leadDivision: "SESRDD",
      piName: "Dr. Genet Mekonnen",
      piEmail: "genet@ethiobiopharma.et",
      projectManager: "pm_demo",
      createdBy: "admin",
      lastModifiedBy: "admin",
    },
  });
  console.log(`Project: ${p2.projectId}  ${p2.title}`);

  const p2wp1 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1002-WP1" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: "P-1002-WP1",
      title: "WP1 - Isolate Collection & DNA Extraction",
      description: "Collect 300 MDR-TB isolates from 5 Addis Ababa health centers.",
      startDate: D("2024-10-01"), endDate: D("2025-06-30"),
      progress: 90, status: "In Progress", createdBy: "pm_demo",
    },
  });
  const p2wp2 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1002-WP2" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: "P-1002-WP2",
      title: "WP2 - Whole-Genome Sequencing",
      description: "Illumina MiSeq sequencing of 300 isolates.",
      startDate: D("2025-01-15"), endDate: D("2025-12-31"),
      progress: 55, status: "In Progress", createdBy: "pm_demo",
    },
  });
  const p2wp3 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1002-WP3" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: "P-1002-WP3",
      title: "WP3 - Phylogenetic & Transmission Analysis",
      description: "Build transmission clusters and analyze resistance-conferring mutations.",
      startDate: D("2025-09-01"), endDate: D("2026-09-30"),
      progress: 15, status: "In Progress", createdBy: "pm_demo",
    },
  });
  console.log(`  WPs: ${p2wp1.workPackageId}, ${p2wp2.workPackageId}, ${p2wp3.workPackageId}`);

  await prisma.activity.upsert({
    where: { activityId: "P-1002-A1" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp1.workPackageId,
      activityId: "P-1002-A1",
      title: "Ethics approval & site agreements",
      description: "Obtain IRB clearance and 5 site MoUs.",
      startDate: D("2024-10-01"), endDate: D("2024-12-31"),
      duration: dur(D("2024-10-01"), D("2024-12-31")),
      progress: 100, status: "Complete", assignedTo: "Dr. Genet",
      financialPlan: 85000, actualExpenditure: 82000,
      createdBy: "pm_demo",
    },
  });
  const a2_2 = await prisma.activity.upsert({
    where: { activityId: "P-1002-A2" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp1.workPackageId,
      activityId: "P-1002-A2",
      title: "Isolate collection from study sites",
      description: "Collect sputum isolates with clinical metadata.",
      startDate: D("2025-01-01"), endDate: D("2025-06-30"),
      duration: dur(D("2025-01-01"), D("2025-06-30")),
      progress: 85, status: "In Progress", assignedTo: "Dr. Worku",
      financialPlan: 190000, actualExpenditure: 162000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1002-A2.1" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp1.workPackageId,
      parentActivityId: a2_2.activityId,
      activityId: "P-1002-A2.1",
      title: "Site 1-3 collection",
      description: "First wave of isolates (n=180).",
      startDate: D("2025-01-01"), endDate: D("2025-04-15"),
      duration: dur(D("2025-01-01"), D("2025-04-15")),
      progress: 100, status: "Complete", assignedTo: "Dr. Worku",
      financialPlan: 110000, actualExpenditure: 105000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1002-A2.2" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp1.workPackageId,
      parentActivityId: a2_2.activityId,
      activityId: "P-1002-A2.2",
      title: "Site 4-5 collection",
      description: "Second wave (n=120).",
      startDate: D("2025-04-16"), endDate: D("2025-06-30"),
      duration: dur(D("2025-04-16"), D("2025-06-30")),
      progress: 65, status: "In Progress", assignedTo: "Dr. Worku",
      financialPlan: 80000, actualExpenditure: 57000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1002-A3" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp2.workPackageId,
      activityId: "P-1002-A3",
      title: "Library prep & sequencing (batch 1)",
      description: "First 150 isolates sequenced on MiSeq.",
      startDate: D("2025-02-01"), endDate: D("2025-08-31"),
      duration: dur(D("2025-02-01"), D("2025-08-31")),
      progress: 80, status: "In Progress", assignedTo: "Dr. Tsegaye",
      financialPlan: 550000, actualExpenditure: 432000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1002-A4" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp2.workPackageId,
      activityId: "P-1002-A4",
      title: "Library prep & sequencing (batch 2)",
      description: "Remaining 150 isolates.",
      startDate: D("2025-06-01"), endDate: D("2025-12-31"),
      duration: dur(D("2025-06-01"), D("2025-12-31")),
      progress: 25, status: "In Progress", assignedTo: "Dr. Tsegaye",
      financialPlan: 550000, actualExpenditure: 138000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1002-A5" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp3.workPackageId,
      activityId: "P-1002-A5",
      title: "Variant calling & resistance profiling",
      description: "Call resistance variants against TB-Profiler database.",
      startDate: D("2025-09-01"), endDate: D("2026-03-31"),
      duration: dur(D("2025-09-01"), D("2026-03-31")),
      progress: 25, status: "In Progress", assignedTo: "Dr. Genet",
      financialPlan: 120000, actualExpenditure: 28000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1002-A6" }, update: {},
    create: {
      projectId: p2.projectId, workPackageId: p2wp3.workPackageId,
      activityId: "P-1002-A6",
      title: "Transmission cluster analysis",
      description: "Build SNP-based phylogeny and identify clusters.",
      startDate: D("2026-01-01"), endDate: D("2026-09-30"),
      duration: dur(D("2026-01-01"), D("2026-09-30")),
      progress: 0, status: "Not Started", assignedTo: "Dr. Genet",
      financialPlan: 95000, actualExpenditure: 0,
      createdBy: "pm_demo",
    },
  });

  // ============================================================
  // PROJECT 3 — Climate & Vector-Borne Disease (Public Health)
  // ============================================================
  const p3 = await prisma.project.upsert({
    where:  { projectId: "P-1003" }, update: {},
    create: {
      projectId: "P-1003",
      title: "Climate Change & Vector-Borne Disease Transmission",
      description: "Four-year longitudinal study of how temperature and rainfall shifts affect malaria and dengue transmission in the Rift Valley.",
      sourceOfFunds: "Grand Challenges Eth.",
      startDate: D("2025-07-01"),
      endDate: D("2028-06-30"),
      status: "In Progress",
      priority: "High",
      progress: 22,
      projectCategory: "Public Health",
      leadDirectorate: "CNCDRD",
      leadDivision: "NCD",
      piName: "Dr. Yohannes Tadesse",
      piEmail: "yohannes@ethiobiopharma.et",
      projectManager: "pm_demo",
      createdBy: "admin",
      lastModifiedBy: "admin",
    },
  });
  console.log(`Project: ${p3.projectId}  ${p3.title}`);

  const p3wp1 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1003-WP1" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: "P-1003-WP1",
      title: "WP1 - Climate & Entomological Monitoring",
      description: "Deploy 20 weather stations and monthly mosquito trapping.",
      startDate: D("2025-07-01"), endDate: D("2028-06-30"),
      progress: 40, status: "In Progress", createdBy: "pm_demo",
    },
  });
  const p3wp2 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1003-WP2" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: "P-1003-WP2",
      title: "WP2 - Human Surveillance & Case Data",
      description: "Passive case detection at 12 health centers.",
      startDate: D("2025-07-01"), endDate: D("2028-06-30"),
      progress: 20, status: "In Progress", createdBy: "pm_demo",
    },
  });
  const p3wp3 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-1003-WP3" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: "P-1003-WP3",
      title: "WP3 - Modeling & Policy Translation",
      description: "Statistical and mechanistic modeling; policy briefs.",
      startDate: D("2026-01-01"), endDate: D("2028-06-30"),
      progress: 0, status: "Not Started", createdBy: "pm_demo",
    },
  });
  console.log(`  WPs: ${p3wp1.workPackageId}, ${p3wp2.workPackageId}, ${p3wp3.workPackageId}`);

  await prisma.activity.upsert({
    where: { activityId: "P-1003-A1" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: p3wp1.workPackageId,
      activityId: "P-1003-A1",
      title: "Procure & install weather stations",
      description: "20 HOBO stations across 4 kebeles.",
      startDate: D("2025-07-01"), endDate: D("2025-12-31"),
      duration: dur(D("2025-07-01"), D("2025-12-31")),
      progress: 100, status: "Complete", assignedTo: "Dr. Tsegaye",
      financialPlan: 320000, actualExpenditure: 318000,
      createdBy: "pm_demo",
    },
  });
  const a3_2 = await prisma.activity.upsert({
    where: { activityId: "P-1003-A2" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: p3wp1.workPackageId,
      activityId: "P-1003-A2",
      title: "Monthly mosquito trapping",
      description: "CDC light traps, 3 nights/month per site.",
      startDate: D("2025-09-01"), endDate: D("2028-06-30"),
      duration: dur(D("2025-09-01"), D("2028-06-30")),
      progress: 30, status: "In Progress", assignedTo: "Dr. Alemayehu",
      financialPlan: 900000, actualExpenditure: 268000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1003-A2.1" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: p3wp1.workPackageId,
      parentActivityId: a3_2.activityId,
      activityId: "P-1003-A2.1",
      title: "Site setup & training",
      description: "Train field teams on trapping protocol.",
      startDate: D("2025-09-01"), endDate: D("2025-10-31"),
      duration: dur(D("2025-09-01"), D("2025-10-31")),
      progress: 100, status: "Complete", assignedTo: "Dr. Alemayehu",
      financialPlan: 120000, actualExpenditure: 114000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1003-A2.2" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: p3wp1.workPackageId,
      parentActivityId: a3_2.activityId,
      activityId: "P-1003-A2.2",
      title: "Month 3-12 trapping cycles",
      description: "Ongoing monthly trapping.",
      startDate: D("2025-11-01"), endDate: D("2026-09-30"),
      duration: dur(D("2025-11-01"), D("2026-09-30")),
      progress: 20, status: "In Progress", assignedTo: "Dr. Alemayehu",
      financialPlan: 500000, actualExpenditure: 98000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1003-A3" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: p3wp2.workPackageId,
      activityId: "P-1003-A3",
      title: "Passive case detection at 12 health centers",
      description: "Routine malaria/dengue RDT + confirmatory PCR.",
      startDate: D("2025-10-01"), endDate: D("2028-06-30"),
      duration: dur(D("2025-10-01"), D("2028-06-30")),
      progress: 15, status: "In Progress", assignedTo: "Dr. Yohannes",
      financialPlan: 1200000, actualExpenditure: 180000,
      createdBy: "pm_demo",
    },
  });
  await prisma.activity.upsert({
    where: { activityId: "P-1003-A4" }, update: {},
    create: {
      projectId: p3.projectId, workPackageId: p3wp2.workPackageId,
      activityId: "P-1003-A4",
      title: "Monthly data quality audits",
      description: "Audit case data for completeness and consistency.",
      startDate: D("2025-11-01"), endDate: D("2028-06-30"),
      duration: dur(D("2025-11-01"), D("2028-06-30")),
      progress: 10, status: "In Progress", assignedTo: "Dr. Genet",
      financialPlan: 240000, actualExpenditure: 24000,
      createdBy: "pm_demo",
    },
  });

  console.log("\nSeed complete.");

  const counts = await Promise.all([
    prisma.project.count(),
    prisma.workPackage.count(),
    prisma.activity.count({ where: { parentActivityId: null } }),
    prisma.activity.count({ where: { parentActivityId: { not: null } } }),
  ]);
  console.log(`  Projects: ${counts[0]}`);
  console.log(`  WorkPackages: ${counts[1]}`);
  console.log(`  Activities (top-level): ${counts[2]}`);
  console.log(`  Sub-activities: ${counts[3]}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());