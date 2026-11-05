import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const D = (s: string) => new Date(s);

async function main() {
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} projects. Seeding milestones...`);

  for (const p of projects) {
    // Create 3 milestones per project, spread over the last 6 months
    const milestones = [
      { title: "Phase 1: Planning & Setup", start: "2026-01-01", end: "2026-02-15", status: "Complete", progress: 100 },
      { title: "Phase 2: Execution", start: "2026-02-16", end: "2026-05-30", status: "Complete", progress: 100 },
      { title: "Phase 3: Review & Handover", start: "2026-06-01", end: "2026-09-30", status: "In Progress", progress: 50 }
    ];

    for (const ms of milestones) {
      const exists = await prisma.milestone.findFirst({ where: { projectId: p.projectId, title: ms.title } });
      if (!exists) {
        await prisma.milestone.create({
          data: {
            projectId: p.projectId,
            milestoneId: `${p.projectId}-M-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.floor(Math.random()*100)}`,
            title: ms.title,
            startDate: D(ms.start),
            endDate: D(ms.end),
            status: ms.status,
            progress: ms.progress,
            createdBy: "admin"
          }
        });
      }
    }
  }
  console.log("Milestones seeded successfully.");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());