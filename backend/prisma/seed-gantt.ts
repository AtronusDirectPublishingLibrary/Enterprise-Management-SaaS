import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const D = (s: string) => new Date(s);
const DAY = 86_400_000;
const dur = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

async function main() {
  console.log("Seeding Gantt visualization project (P-2001)...\n");

  const p1 = await prisma.project.upsert({
    where:  { projectId: "P-2001" },
    update: {},
    create: {
      projectId: "P-2001",
      title: "Ethiopia National Biobank Expansion",
      description: "Three-year initiative to expand the national biobank network, upgrade cryogenic storage, and implement LIMS software across 5 regional hubs.",
      sourceOfFunds: "Competitive Grants",
      startDate: D("2024-01-01"),
      endDate: D("2026-12-31"),
      status: "In Progress",
      priority: "Critical",
      progress: 35,
      projectCategory: "Translational",
      leadDepartment: "LMD",
      leadDivision: "Biobank",
      piName: "Dr. Aster Kebede",
      piEmail: "aster@ethiobiopharma.et",
      projectManager: "pm_demo",
      createdBy: "admin",
      lastModifiedBy: "admin",
    },
  });
  console.log(`Project: ${p1.projectId} - ${p1.title}`);

  const wp1 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-2001-WP1" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: "P-2001-WP1",
      title: "WP1 - Infrastructure & Equipment Upgrade",
      startDate: D("2024-01-15"), endDate: D("2024-12-15"),
      progress: 100, status: "Complete", createdBy: "pm_demo",
    },
  });
  
  const wp2 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-2001-WP2" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: "P-2001-WP2",
      title: "WP2 - Sample Collection & Processing",
      startDate: D("2024-06-01"), endDate: D("2026-06-30"),
      progress: 45, status: "In Progress", createdBy: "pm_demo",
    },
  });

  const wp3 = await prisma.workPackage.upsert({
    where: { workPackageId: "P-2001-WP3" }, update: {},
    create: {
      projectId: p1.projectId, workPackageId: "P-2001-WP3",
      title: "WP3 - LIMS Software Implementation",
      startDate: D("2025-01-01"), endDate: D("2026-12-31"),
      progress: 10, status: "In Progress", createdBy: "pm_demo",
    },
  });

  console.log(`  WPs: ${wp1.workPackageId}, ${wp2.workPackageId}, ${wp3.workPackageId}`);

  const acts = [
    // WP1 (2024) - Good for Week/Month views
    { id: "P-2001-A1.1", wp: wp1.workPackageId, title: "Procure Cryogenic Tanks", start: "2024-01-15", end: "2024-03-15", prog: 100, status: "Complete" },
    { id: "P-2001-A1.2", wp: wp1.workPackageId, title: "Install Backup Generators", start: "2024-03-01", end: "2024-04-15", prog: 100, status: "Complete" },
    { id: "P-2001-A1.3", wp: wp1.workPackageId, title: "HVAC System Validation", start: "2024-04-20", end: "2024-06-30", prog: 100, status: "Complete" },
    { id: "P-2001-A1.4", wp: wp1.workPackageId, title: "Safety & Alarm Testing", start: "2024-10-01", end: "2024-12-15", prog: 100, status: "Complete" },
    
    // WP2 (2024-2026) - Good for Quarter/Year views
    { id: "P-2001-A2.1", wp: wp2.workPackageId, title: "Ethics Approval & SOPs", start: "2024-06-01", end: "2024-08-31", prog: 100, status: "Complete" },
    { id: "P-2001-A2.2", wp: wp2.workPackageId, title: "Addis Ababa Hub Collection", start: "2024-09-01", end: "2025-05-31", prog: 80, status: "In Progress" },
    { id: "P-2001-A2.3", wp: wp2.workPackageId, title: "Regional Hub 1 (Amhara)", start: "2025-01-15", end: "2025-10-15", prog: 40, status: "In Progress" },
    { id: "P-2001-A2.4", wp: wp2.workPackageId, title: "Regional Hub 2 (Oromia)", start: "2025-06-01", end: "2026-06-30", prog: 0, status: "Not Started" },

    // WP3 (2025-2026) - Good for Year view
    { id: "P-2001-A3.1", wp: wp3.workPackageId, title: "Vendor Selection & Contract", start: "2025-01-01", end: "2025-04-30", prog: 100, status: "Complete" },
    { id: "P-2001-A3.2", wp: wp3.workPackageId, title: "LIMS Core Installation", start: "2025-05-01", end: "2025-12-31", prog: 15, status: "In Progress" },
    { id: "P-2001-A3.3", wp: wp3.workPackageId, title: "Data Migration & Testing", start: "2026-01-15", end: "2026-09-30", prog: 0, status: "Not Started" },
    { id: "P-2001-A3.4", wp: wp3.workPackageId, title: "National Staff Training", start: "2026-10-01", end: "2026-12-31", prog: 0, status: "Not Started" }
  ];

  for (const a of acts) {
    await prisma.activity.upsert({
      where: { activityId: a.id }, update: {},
      create: {
        projectId: p1.projectId,
        workPackageId: a.wp,
        activityId: a.id,
        title: a.title,
        startDate: D(a.start),
        endDate: D(a.end),
        duration: dur(D(a.start), D(a.end)),
        progress: a.prog,
        status: a.status,
        assignedTo: "Biobank Team",
        financialPlan: Math.floor(Math.random() * 500000) + 100000,
        actualExpenditure: Math.floor(Math.random() * 200000),
        createdBy: "pm_demo",
      },
    });
    console.log(`  Added Activity: ${a.id} - ${a.title}`);
  }

  console.log("\nGantt visualization data seeded successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());