import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const UserInput = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  username: z.string().min(2),
  password: z.string().min(4).optional(),
  role: z.enum(["admin", "project_manager", "pi", "viewer"]),
  department: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.user.findMany({
      select: {
        firstName: true,
        lastName: true,
        username: true, 
        role: true, 
        associatedGrants: true,
        department: true, 
        subDepartment: true,
        piName: true, 
        coPiName: true, 
        email: true,
        lastLogin: true, 
        createdDate: true, 
        forceChange: true,
      },
      orderBy: { username: "asc" },
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = UserInput.parse(req.body);
    if (!d.password) return res.status(400).json({ message: "Password is required for new users." });

    const exists = await prisma.user.findUnique({ where: { username: d.username } });
    if (exists) return res.status(409).json({ message: "Username already exists" });

    const passwordHash = await bcrypt.hash(d.password, 12);
    await prisma.user.create({
      data: {
        firstName: d.firstName || null,
        lastName: d.lastName || null,
        username: d.username,
        passwordHash,
        role: d.role,
        department: d.department || null,
        email: d.email || null,
        forceChange: true,
      },
    });
    await logAudit("PMS", "USER_ADDED", req.user!.username, { newUser: d.username, role: d.role });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.put("/:username", async (req, res, next) => {
  try {
    const d = UserInput.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!existing) return res.status(404).json({ message: "User not found" });

    const data: any = {
      firstName: d.firstName || null,
      lastName: d.lastName || null,
      role: d.role,
      department: d.department || null,
      email: d.email || null,
    };

    if (d.password && d.password.length >= 4) {
      data.passwordHash = await bcrypt.hash(d.password, 12);
      data.forceChange = true;
    }

    await prisma.user.update({ where: { username: req.params.username }, data });
    await logAudit("PMS", "USER_UPDATED", req.user!.username, { target: req.params.username });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.delete("/:username", async (req, res, next) => {
  try {
    if (req.params.username === "admin") return res.status(400).json({ message: "Cannot delete admin user" });
    const u = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!u) return res.status(404).json({ message: "User not found" });
    await prisma.user.delete({ where: { username: req.params.username } });
    await logAudit("PMS", "USER_DELETED", req.user!.username, { target: req.params.username });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;