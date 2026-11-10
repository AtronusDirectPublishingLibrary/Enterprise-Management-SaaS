import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireAccess } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3),
  email: z.string().email().optional().nullable(),
  userId: z.string().optional().nullable(),
  licenseExpiry: z.string().optional().nullable(),
});
const updateSchema = createSchema.partial().extend({
  status: z.enum(["Available", "On Leave", "Suspended"]).optional(),
});
const statusSchema = z.object({
  status: z.enum(["Available", "On Leave", "Suspended"]),
});

async function nextDriverCode(): Promise<string> {
  const last = await prisma.driver.findFirst({
    where: { driverCode: { startsWith: "D" } },
    orderBy: { driverCode: "desc" },
    select: { driverCode: true },
  });
  const n = last ? parseInt(last.driverCode.slice(1), 10) + 1 : 1;
  return "D" + String(n).padStart(3, "0");
}

router.get("/", async (_req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        vehicles: { select: { id: true, vehicleCode: true, licensePlate: true } },
        user: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
      orderBy: { driverCode: "asc" },
    });
    res.json(drivers);
  } catch { res.status(500).json({ error: "Failed to fetch drivers" }); }
});

router.get("/available", async (_req, res) => {
  try {
    const drivers = await prisma.driver.findMany({ where: { status: "Available" }, orderBy: { driverCode: "asc" } });
    res.json(drivers);
  } catch { res.status(500).json({ error: "Failed to fetch available drivers" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: true,
        user: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
        requests: {
          select: { id: true, requestCode: true, status: true, departureDate: true, destination: true },
          orderBy: { departureDate: "desc" },
          take: 20,
        },
      },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    res.json(driver);
  } catch { res.status(500).json({ error: "Failed to fetch driver" }); }
});

router.post("/", requireAccess("fleet"), async (req: any, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;
    const driverCode = await nextDriverCode();
    const driver = await prisma.driver.create({
      data: {
        driverCode,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        userId: data.userId ?? null,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
        status: "Available",
      },
    });
    await logAudit("FLEET", "DRIVER_CREATED", req.user?.username || "system", {
      driverId: driver.id, driverCode: driver.driverCode,
    });
    res.json(driver);
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Driver code or linked user already in use" });
    res.status(500).json({ error: "Failed to create driver" });
  }
});

router.put("/:id", requireAccess("fleet"), async (req: any, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.licenseExpiry !== undefined && { licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    await logAudit("FLEET", "DRIVER_UPDATED", req.user?.username || "system", {
      driverId: driver.id, changes: Object.keys(data),
    });
    res.json(driver);
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Driver not found" });
    if (err?.code === "P2002") return res.status(409).json({ error: "Linked user already assigned to another driver" });
    res.status(500).json({ error: "Failed to update driver" });
  }
});

router.put("/:id/status", requireAccess("fleet"), async (req: any, res) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid status" });
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });
    await logAudit("FLEET", "DRIVER_STATUS_CHANGED", req.user?.username || "system", {
      driverId: driver.id, status: parsed.data.status,
    });
    res.json(driver);
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Driver not found" });
    res.status(500).json({ error: "Failed to change status" });
  }
});

router.delete("/:id", requireAccess("fleet"), async (req: any, res) => {
  try {
    const active = await prisma.vehicleRequest.count({
      where: {
        driverId: req.params.id,
        status: { in: ["PENDING", "SUPERVISOR_APPROVED", "FLEET_APPROVED", "ASSIGNED", "IN_PROGRESS"] },
      },
    });
    if (active > 0) return res.status(409).json({ error: `Cannot delete: ${active} active request(s) reference this driver` });
    const driver = await prisma.driver.delete({ where: { id: req.params.id } });
    await logAudit("FLEET", "DRIVER_DELETED", req.user?.username || "system", { driverCode: driver.driverCode });
    res.json({ success: true });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Driver not found" });
    res.status(500).json({ error: "Failed to delete driver" });
  }
});

export default router;