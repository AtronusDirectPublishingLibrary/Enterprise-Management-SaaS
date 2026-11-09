import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { allows } from "../lib/access";

const router = Router();
router.use(requireAuth);

const planPath = (type: string) =>
  type === "AOP" ? "/database/aop" : type === "ROADMAP" ? "/database/roadmap" : "/database/strategic-plan";

/** One lightweight search across the records a signed-in person may see. */
router.get("/", async (req: any, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ query: q, projects: [], plans: [], items: [], people: [], documents: [] });
    const user = req.user!;
    const contains = { contains: q, mode: "insensitive" as const };

    const [projects, plans, items, people, documents] = await Promise.all([
      allows(user, "pms")
        ? prisma.project.findMany({
            where: { OR: [{ title: contains }, { projectId: contains }, { description: contains }] },
            select: { projectId: true, title: true, status: true },
            take: 5,
            orderBy: { lastModifiedDate: "desc" },
          })
        : [],
      allows(user, "pms") || allows(user, "reports")
        ? prisma.plan.findMany({
            where: { OR: [{ title: contains }, { periodLabel: contains }] },
            select: { id: true, type: true, title: true, periodLabel: true, status: true },
            take: 5,
            orderBy: { startDate: "desc" },
          })
        : [],
      allows(user, "pms") || allows(user, "reports") || allows(user, "aop")
        ? prisma.planItem.findMany({
            where: { OR: [{ title: contains }, { code: contains }] },
            select: {
              id: true,
              title: true,
              kind: true,
              code: true,
              plan: { select: { id: true, type: true, title: true } },
            },
            take: 8,
            orderBy: { updatedAt: "desc" },
          })
        : [],
      user.role === "admin" || allows(user, "hr") || allows(user, "hrAnalytics")
        ? prisma.user.findMany({
            where: {
              OR: [
                { username: contains },
                { firstName: contains },
                { lastName: contains },
                { email: contains },
                { employeeNo: contains },
              ],
            },
            select: { username: true, firstName: true, lastName: true, position: true, department: true },
            take: 5,
            orderBy: { firstName: "asc" },
          })
        : [],
      allows(user, "archive") || allows(user, "documents")
        ? prisma.document.findMany({
            where: { OR: [{ title: contains }, { docNumber: contains }, { folderPath: contains }] },
            select: { id: true, title: true, type: true, version: true },
            take: 5,
            orderBy: { uploadDate: "desc" },
          })
        : [],
    ]);

    res.json({
      query: q,
      projects,
      plans: plans.map((plan) => ({ ...plan, path: `${planPath(plan.type)}?plan=${plan.id}` })),
      items: items.map((item) => ({
        ...item,
        path: `${planPath(item.plan.type)}?plan=${item.plan.id}`,
      })),
      people,
      documents,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
