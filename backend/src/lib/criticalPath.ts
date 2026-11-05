import { prisma } from "./prisma";

export async function calculateCriticalPath(projectId: string) {
  const activities = await prisma.activity.findMany({
    where: { projectId },
    include: { predecessors: { select: { activityId: true } } },
  });

  if (activities.length === 0) return { activities: [], criticalIds: [] };

  const actMap = new Map(activities.map(a => [a.activityId, a]));
  
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  
  const sorted = [...activities].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  for (const act of sorted) {
    let maxPredEF = 0;
    for (const pred of act.predecessors) {
      maxPredEF = Math.max(maxPredEF, earlyFinish.get(pred.activityId) || 0);
    }
    const es = Math.max(act.startDate.getTime(), maxPredEF);
    const ef = es + (act.duration || 1) * 86400000;
    
    earlyStart.set(act.activityId, es);
    earlyFinish.set(act.activityId, ef);
  }

  const projectEnd = Math.max(...Array.from(earlyFinish.values()));

  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();
  const reversed = [...sorted].reverse();

  for (const act of reversed) {
    let minSuccLS = projectEnd;
    for (const succ of activities) {
      if (succ.predecessors.some(p => p.activityId === act.activityId)) {
        minSuccLS = Math.min(minSuccLS, lateStart.get(succ.activityId) || projectEnd);
      }
    }
    const lf = minSuccLS;
    const ls = lf - (act.duration || 1) * 86400000;
    
    lateStart.set(act.activityId, ls);
    lateFinish.set(act.activityId, lf);
  }

  const result = activities.map(act => {
    const slack = (lateStart.get(act.activityId)! - earlyStart.get(act.activityId)!) / 86400000;
    return {
      activityId: act.activityId,
      title: act.title,
      slack: Math.round(slack),
      isCritical: slack <= 0,
      earlyStart: new Date(earlyStart.get(act.activityId)!),
      earlyFinish: new Date(earlyFinish.get(act.activityId)!),
    };
  });

  return {
    activities: result,
    criticalIds: result.filter(r => r.isCritical).map(r => r.activityId)
  };
}