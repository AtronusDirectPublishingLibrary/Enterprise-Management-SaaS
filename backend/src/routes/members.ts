import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

async function canManageProject(projectId: string, user: any) {
  if (!user) return false;
  if (["admin", "executive", "project_manager"].includes(user.role)) return true;
  const project = await prisma.project.findUnique({
    where: { projectId },
    select: { projectManager: true },
  });
  if (!project?.projectManager) return false;
  const me = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { username: true, firstName: true, lastName: true },
  });
  const name = [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim();
  return [me?.username, name].filter(Boolean).includes(project.projectManager.trim());
}

/** Staff who can be assigned work on this project (team roster + candidates). */
router.get("/candidates/:projectId", requireAccess("pms"), async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const [members, users] = await Promise.all([
      prisma.projectMember.findMany({ where: { projectId: req.params.projectId } }),
      prisma.user.findMany({
        where: q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { position: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: {
          username: true,
          firstName: true,
          lastName: true,
          position: true,
          department: true,
          role: true,
          avatarUrl: true,
        },
        orderBy: [{ firstName: "asc" }, { username: "asc" }],
        take: 250,
      }),
    ]);
    res.json({
      members,
      candidates: users.map((user) => ({
        ...user,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
      })),
    });
  } catch (e) { next(e); }
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { addedAt: "asc" },
    });
    res.json(members);
  } catch (e) { next(e); }
});

router.post("/:projectId", async (req: any, res, next) => {
  try {
    if (!(await canManageProject(req.params.projectId, req.user))) {
      return res.status(403).json({ message: "Only the project manager can change the project team." });
    }
    const { username, role } = z.object({
      username: z.string().min(1),
      role: z.string().optional().default("member"),
    }).parse(req.body);

    const staff = await prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!staff) return res.status(404).json({ message: "No staff member found with that username." });

    const member = await prisma.projectMember.upsert({
      where: { projectId_username: { projectId: req.params.projectId, username } },
      update: { role },
      create: { projectId: req.params.projectId, username, role, addedBy: req.user!.username },
    });
    res.json({ success: true, member });
  } catch (e) { next(e); }
});

router.delete("/:projectId/:username", async (req: any, res, next) => {
  try {
    if (!(await canManageProject(req.params.projectId, req.user))) {
      return res.status(403).json({ message: "Only the project manager can change the project team." });
    }
    await prisma.projectMember.delete({
      where: { projectId_username: { projectId: req.params.projectId, username: req.params.username } },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;