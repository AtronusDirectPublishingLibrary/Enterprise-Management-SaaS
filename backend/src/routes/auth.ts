import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken, COOKIE_NAME, COOKIE_OPTS } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function permissionsFor(role: string) {
  return {
    canViewAll:              ["admin", "viewer"].includes(role),
    canEdit:                 role !== "viewer",
    canUpdate:               role !== "viewer",
    canDelete:               role === "admin",
    canManageUsers:          role === "admin",
    canExport:               true,
    canManageMultipleProjects: ["admin", "project_manager"].includes(role),
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({
      success: true,
      username: user.username,
      role: user.role,
      email: user.email,
      forceChange: user.forceChange,
      permissions: permissionsFor(user.role),
    });
  } catch (e) { next(e); }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(401).json({ message: "Session user not found" });
    res.json({
      username: user.username,
      role: user.role,
      email: user.email,
      forceChange: user.forceChange,
      permissions: permissionsFor(user.role),
    });
  } catch (e) { next(e); }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(4),
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!await bcrypt.compare(oldPassword, user.passwordHash))
      return res.status(400).json({ message: "Current password is incorrect" });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12), forceChange: false },
    });
    res.json({ success: true, message: "Password changed" });
  } catch (e) { next(e); }
});

export default router;
