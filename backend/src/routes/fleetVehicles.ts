import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireAccess } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  type: z.string().min(1),
  licensePlate: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
  fuelType: z.string().optional().nullable(),
  odometer: z.coerce.number().nonnegative().optional().nullable(),
  lastMaintenance: z.string().optional().nullable(),
  nextMaintenance: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});
const updateSchema = createSchema.partial().extend({
  status: z.enum(["Available", "In Use", "Under Maintenance", "Unavailable"]).optional(),
});
const statusSchema = z.object({
  status: z.enum(["Available", "In Use", "Under Maintenance", "Unavailable"]),
});

async function nextVehicleCode(): Promise<string> {
  const last = await prisma.vehicle.findFirst({
    where: { vehicleCode: { startsWith: "V" } },
    orderBy: { vehicleCode: "desc" },
    select: { vehicleCode: true },
  });
  const n = last ? parseInt(last.vehicleCode.slice(1), 10) + 1 : 1;
  return "V" + String(n).padStart(3, "0");
}

router.get("/", async (_req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { assignedDriver: { select: { id: true, driverCode: true, name: true, phone: true } } },
      orderBy: { vehicleCode: "asc" },
    });
    res.json(vehicles);
  } catch { res.status(500).json({ error: "Failed to fetch vehicles" }); }
});

router.get("/available", async (_req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: "Available" },
      include: { assignedDriver: { select: { id: true, driverCode: true, name: true } } },
      orderBy: { vehicleCode: "asc" },
    });
    res.json(vehicles);
  } catch { res.status(500).json({ error: "Failed to fetch available vehicles" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        assignedDriver: true,
        requests: {
          select: { id: true, requestCode: true, status: true, departureDate: true, destination: true },
          orderBy: { departureDate: "desc" },
          take: 20,
        },
      },
    });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    res.json(vehicle);
  } catch { res.status(500).json({ error: "Failed to fetch vehicle" }); }
});

router.post("/", requireAccess("fleet"), async (req: any, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;
    const vehicleCode = await nextVehicleCode();
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleCode,
        type: data.type,
        licensePlate: data.licensePlate,
        capacity: data.capacity,
        fuelType: data.fuelType ?? null,
        odometer: data.odometer ?? null,
        lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : null,
        nextMaintenance: data.nextMaintenance ? new Date(data.nextMaintenance) : null,
        remarks: data.remarks ?? null,
        status: "Available",
      },
    });
    await logAudit("FLEET", "VEHICLE_CREATED", req.user?.username || "system", {
      vehicleId: vehicle.id, vehicleCode: vehicle.vehicleCode,
    });
    res.json(vehicle);
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "License plate or vehicle code already exists" });
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

router.put("/:id", requireAccess("fleet"), async (req: any, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.licensePlate !== undefined && { licensePlate: data.licensePlate }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.fuelType !== undefined && { fuelType: data.fuelType }),
        ...(data.odometer !== undefined && { odometer: data.odometer }),
        ...(data.lastMaintenance !== undefined && { lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : null }),
        ...(data.nextMaintenance !== undefined && { nextMaintenance: data.nextMaintenance ? new Date(data.nextMaintenance) : null }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    await logAudit("FLEET", "VEHICLE_UPDATED", req.user?.username || "system", {
      vehicleId: vehicle.id, changes: Object.keys(data),
    });
    res.json(vehicle);
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Vehicle not found" });
    if (err?.code === "P2002") return res.status(409).json({ error: "License plate already in use" });
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

router.put("/:id/status", requireAccess("fleet"), async (req: any, res) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid status" });
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });
    await logAudit("FLEET", "VEHICLE_STATUS_CHANGED", req.user?.username || "system", {
      vehicleId: vehicle.id, status: parsed.data.status,
    });
    res.json(vehicle);
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Vehicle not found" });
    res.status(500).json({ error: "Failed to change status" });
  }
});

router.delete("/:id", requireAccess("fleet"), async (req: any, res) => {
  try {
    const active = await prisma.vehicleRequest.count({
      where: {
        vehicleId: req.params.id,
        status: { in: ["PENDING", "SUPERVISOR_APPROVED", "FLEET_APPROVED", "ASSIGNED", "IN_PROGRESS"] },
      },
    });
    if (active > 0) return res.status(409).json({ error: `Cannot delete: ${active} active request(s) reference this vehicle` });
    const vehicle = await prisma.vehicle.delete({ where: { id: req.params.id } });
    await logAudit("FLEET", "VEHICLE_DELETED", req.user?.username || "system", { vehicleCode: vehicle.vehicleCode });
    res.json({ success: true });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Vehicle not found" });
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
});

export default router;