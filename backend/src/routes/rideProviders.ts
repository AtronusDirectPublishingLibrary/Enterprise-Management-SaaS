import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireAccess } from "../middleware/auth";

const router = Router();
const requireFleet = requireAccess("fleet");

const schema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  pricingNote: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

router.get("/", requireFleet, async (_req, res) => {
  try {
    const items = await prisma.rideProvider.findMany({ orderBy: { name: "asc" } });
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch ride providers" });
  }
});

router.get("/active", async (_req, res) => {
  try {
    const items = await prisma.rideProvider.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch active ride providers" });
  }
});

router.post("/", requireFleet, async (req: any, res) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;
    const provider = await prisma.rideProvider.create({
      data: {
        name: data.name,
        contactName: data.contactName ?? null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        pricingNote: data.pricingNote ?? null,
        isActive: data.isActive ?? true,
      },
    });
    await logAudit("FLEET", "RIDE_PROVIDER_CREATED", req.user?.username || "system", {
      providerId: provider.id,
      name: provider.name,
    });
    res.json(provider);
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "A ride provider with that name already exists" });
    res.status(500).json({ error: "Failed to create ride provider" });
  }
});

router.put("/:id", requireFleet, async (req: any, res) => {
  try {
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;
    const provider = await prisma.rideProvider.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.pricingNote !== undefined && { pricingNote: data.pricingNote }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    await logAudit("FLEET", "RIDE_PROVIDER_UPDATED", req.user?.username || "system", {
      providerId: provider.id,
      changes: Object.keys(data),
    });
    res.json(provider);
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Ride provider not found" });
    if (err?.code === "P2002") return res.status(409).json({ error: "Name already in use" });
    res.status(500).json({ error: "Failed to update ride provider" });
  }
});

router.put("/:id/toggle", requireFleet, async (req: any, res) => {
  try {
    const existing = await prisma.rideProvider.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Ride provider not found" });
    const provider = await prisma.rideProvider.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    await logAudit("FLEET", "RIDE_PROVIDER_TOGGLED", req.user?.username || "system", {
      providerId: provider.id,
      isActive: provider.isActive,
    });
    res.json(provider);
  } catch {
    res.status(500).json({ error: "Failed to toggle ride provider" });
  }
});

router.delete("/:id", requireFleet, async (req: any, res) => {
  try {
    const active = await prisma.rideRequest.count({
      where: {
        providerId: req.params.id,
        status: { in: ["PENDING", "SUPERVISOR_APPROVED", "ASSIGNED"] },
      },
    });
    if (active > 0) {
      return res.status(409).json({ error: `Cannot delete: ${active} active ride request(s) reference this provider` });
    }
    const provider = await prisma.rideProvider.delete({ where: { id: req.params.id } });
    await logAudit("FLEET", "RIDE_PROVIDER_DELETED", req.user?.username || "system", { name: provider.name });
    res.json({ success: true });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Ride provider not found" });
    res.status(500).json({ error: "Failed to delete ride provider" });
  }
});

export default router;