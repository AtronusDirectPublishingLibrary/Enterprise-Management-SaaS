import { prisma } from "./prisma";

export async function recomputeProjectProgress(projectId: string) {
  const [milestones, activities] = await Promise.all([
    prisma.milestone.findMany({ where: { projectId } }),
    prisma.activity.findMany({ where: { projectId } }),
  ]);
  const list = milestones.length > 0 ? milestones : activities;
  const avg = list.length === 0 ? 0
    : Math.round(list.reduce((s: number, x: any) => s + (x.progress || 0), 0) / list.length);
  await prisma.project.update({ where: { projectId }, data: { progress: avg } }).catch(() => {});
}
