import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireAccess } from "../middleware/auth";

const router = Router();
router.use(requireAccess("fleet"));

const dateInput = z.string().min(1).transform((value) => new Date(value));
const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value ? new Date(value) : null));
const money = z.coerce.number().min(0).default(0);
const number = z.coerce.number().min(0).optional().nullable();

const fuelSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  date: dateInput,
  odometer: number,
  litres: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  totalCost: money,
  fuelType: z.string().optional().nullable(),
  station: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  title: z.string().min(2),
  type: z.string().default("Scheduled"),
  status: z.string().default("Scheduled"),
  scheduledDate: optionalDate,
  completedDate: optionalDate,
  odometer: number,
  vendor: z.string().optional().nullable(),
  laborCost: money,
  partsCost: money,
  totalCost: money,
  invoiceNo: z.string().optional().nullable(),
  nextServiceDate: optionalDate,
  nextServiceOdometer: number,
  notes: z.string().optional().nullable(),
});

const partSchema = z.object({
  vehicleId: z.string().min(1),
  date: dateInput,
  partName: z.string().min(2),
  partNumber: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.01).default(1),
  unitCost: z.coerce.number().min(0),
  totalCost: money,
  supplier: z.string().optional().nullable(),
  odometer: number,
  maintenanceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const tyreSchema = z.object({
  vehicleId: z.string().min(1),
  date: dateInput,
  position: z.string().min(1),
  brand: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.01).default(1),
  unitCost: z.coerce.number().min(0),
  totalCost: money,
  odometer: number,
  action: z.string().default("Fitted"),
  notes: z.string().optional().nullable(),
});

const clean = (value?: string | null) => {
  const text = (value || "").trim();
  return text || null;
};

function actor(req: any) {
  return {
    recordedById: req.user?.sub || null,
    recordedBy: req.user?.username || "system",
  };
}

function described<T>(label: string, action: string, req: any, details: Record<string, unknown>) {
  return logAudit("FLEET", action, req.user?.username || "system", { area: label, ...details });
}

/* ------------------------------------------------------------------ fuel */

router.get("/fuel", async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (Number.isFinite(year) && year > 2000) {
      where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
    const rows = await prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: { select: { vehicleCode: true, licensePlate: true, type: true } },
        driver: { select: { driverCode: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post("/fuel", async (req: any, res, next) => {
  try {
    const parsed = fuelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the fuel entry.", details: parsed.error.flatten() });
    const data = parsed.data;
    const total = data.totalCost || Math.round(data.litres * data.unitCost * 100) / 100;
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.fuelLog.create({
        data: {
          vehicleId: data.vehicleId,
          driverId: clean(data.driverId),
          date: data.date,
          odometer: data.odometer ?? null,
          litres: data.litres,
          unitCost: data.unitCost,
          totalCost: total,
          fuelType: clean(data.fuelType),
          station: clean(data.station),
          reference: clean(data.reference),
          receiptUrl: clean(data.receiptUrl),
          notes: clean(data.notes),
          ...actor(req),
        },
        include: { vehicle: { select: { vehicleCode: true, licensePlate: true } } },
      });
      if (data.odometer != null) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: data.vehicleId }, select: { odometer: true } });
        if (vehicle && (vehicle.odometer == null || data.odometer > vehicle.odometer)) {
          await tx.vehicle.update({ where: { id: data.vehicleId }, data: { odometer: data.odometer } });
        }
      }
      return row;
    });
    await described("fuel", "FUEL_LOGGED", req, {
      id: created.id,
      vehicle: created.vehicle.vehicleCode,
      litres: created.litres,
      cost: created.totalCost,
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

router.put("/fuel/:id", async (req: any, res, next) => {
  try {
    const parsed = fuelSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the fuel entry.", details: parsed.error.flatten() });
    const data = parsed.data;
    const updated = await prisma.fuelLog.update({
      where: { id: req.params.id },
      data: {
        ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
        ...(data.driverId !== undefined ? { driverId: clean(data.driverId) } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.odometer !== undefined ? { odometer: data.odometer } : {}),
        ...(data.litres !== undefined ? { litres: data.litres } : {}),
        ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
        ...(data.totalCost !== undefined ? { totalCost: data.totalCost } : {}),
        ...(data.fuelType !== undefined ? { fuelType: clean(data.fuelType) } : {}),
        ...(data.station !== undefined ? { station: clean(data.station) } : {}),
        ...(data.reference !== undefined ? { reference: clean(data.reference) } : {}),
        ...(data.receiptUrl !== undefined ? { receiptUrl: clean(data.receiptUrl) } : {}),
        ...(data.notes !== undefined ? { notes: clean(data.notes) } : {}),
      },
    });
    await described("fuel", "FUEL_UPDATED", req, { id: updated.id, cost: updated.totalCost });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Fuel entry not found." });
    next(e);
  }
});

router.delete("/fuel/:id", async (req: any, res, next) => {
  try {
    const deleted = await prisma.fuelLog.delete({ where: { id: req.params.id } });
    await described("fuel", "FUEL_DELETED", req, { id: deleted.id, cost: deleted.totalCost });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Fuel entry not found." });
    next(e);
  }
});

/* ----------------------------------------------------------- maintenance */

router.get("/maintenance", async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (Number.isFinite(year) && year > 2000) {
      where.OR = [
        { scheduledDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
        { completedDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      ];
    }
    const rows = await prisma.maintenanceRecord.findMany({
      where,
      include: { vehicle: { select: { vehicleCode: true, licensePlate: true, type: true, odometer: true } } },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post("/maintenance", async (req: any, res, next) => {
  try {
    const parsed = maintenanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the maintenance record.", details: parsed.error.flatten() });
    const data = parsed.data;
    const total = data.totalCost || data.laborCost + data.partsCost;
    const created = await prisma.maintenanceRecord.create({
      data: {
        vehicleId: data.vehicleId,
        title: data.title,
        type: data.type,
        status: data.status,
        scheduledDate: data.scheduledDate,
        completedDate: data.completedDate,
        odometer: data.odometer ?? null,
        vendor: clean(data.vendor),
        laborCost: data.laborCost,
        partsCost: data.partsCost,
        totalCost: total,
        invoiceNo: clean(data.invoiceNo),
        nextServiceDate: data.nextServiceDate,
        nextServiceOdometer: data.nextServiceOdometer ?? null,
        notes: clean(data.notes),
        ...actor(req),
      },
      include: { vehicle: { select: { vehicleCode: true, licensePlate: true } } },
    });
    if (data.status === "Completed") {
      await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: {
          lastMaintenance: data.completedDate || new Date(),
          nextMaintenance: data.nextServiceDate || undefined,
        },
      });
    }
    await described("maintenance", "MAINTENANCE_CREATED", req, {
      id: created.id,
      vehicle: created.vehicle.vehicleCode,
      status: created.status,
      cost: created.totalCost,
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

router.put("/maintenance/:id", async (req: any, res, next) => {
  try {
    const parsed = maintenanceSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the maintenance record.", details: parsed.error.flatten() });
    const data = parsed.data;
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Maintenance record not found." });
    const labor = data.laborCost ?? existing.laborCost;
    const parts = data.partsCost ?? existing.partsCost;
    const updated = await prisma.maintenanceRecord.update({
      where: { id: existing.id },
      data: {
        ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.scheduledDate !== undefined ? { scheduledDate: data.scheduledDate } : {}),
        ...(data.completedDate !== undefined ? { completedDate: data.completedDate } : {}),
        ...(data.odometer !== undefined ? { odometer: data.odometer } : {}),
        ...(data.vendor !== undefined ? { vendor: clean(data.vendor) } : {}),
        ...(data.laborCost !== undefined ? { laborCost: data.laborCost } : {}),
        ...(data.partsCost !== undefined ? { partsCost: data.partsCost } : {}),
        totalCost: data.totalCost || labor + parts,
        ...(data.invoiceNo !== undefined ? { invoiceNo: clean(data.invoiceNo) } : {}),
        ...(data.nextServiceDate !== undefined ? { nextServiceDate: data.nextServiceDate } : {}),
        ...(data.nextServiceOdometer !== undefined ? { nextServiceOdometer: data.nextServiceOdometer } : {}),
        ...(data.notes !== undefined ? { notes: clean(data.notes) } : {}),
      },
    });
    if (updated.status === "Completed" && updated.vehicleId) {
      await prisma.vehicle.update({
        where: { id: updated.vehicleId },
        data: {
          lastMaintenance: updated.completedDate || new Date(),
          nextMaintenance: updated.nextServiceDate || undefined,
        },
      });
    }
    await described("maintenance", "MAINTENANCE_UPDATED", req, {
      id: updated.id,
      status: updated.status,
      cost: updated.totalCost,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/maintenance/:id", async (req: any, res, next) => {
  try {
    const deleted = await prisma.maintenanceRecord.delete({ where: { id: req.params.id } });
    await described("maintenance", "MAINTENANCE_DELETED", req, { id: deleted.id });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Maintenance record not found." });
    next(e);
  }
});

/* ------------------------------------------------------------- spare parts */

router.get("/parts", async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (Number.isFinite(year) && year > 2000) {
      where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
    const rows = await prisma.sparePartRecord.findMany({
      where,
      include: { vehicle: { select: { vehicleCode: true, licensePlate: true, type: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post("/parts", async (req: any, res, next) => {
  try {
    const parsed = partSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the spare-part record.", details: parsed.error.flatten() });
    const data = parsed.data;
    const created = await prisma.sparePartRecord.create({
      data: {
        vehicleId: data.vehicleId,
        date: data.date,
        partName: data.partName,
        partNumber: clean(data.partNumber),
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost: data.totalCost || Math.round(data.quantity * data.unitCost * 100) / 100,
        supplier: clean(data.supplier),
        odometer: data.odometer ?? null,
        maintenanceId: clean(data.maintenanceId),
        notes: clean(data.notes),
        ...actor(req),
      },
      include: { vehicle: { select: { vehicleCode: true, licensePlate: true } } },
    });
    await described("parts", "SPARE_PART_LOGGED", req, {
      id: created.id,
      vehicle: created.vehicle.vehicleCode,
      part: created.partName,
      cost: created.totalCost,
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

router.put("/parts/:id", async (req: any, res, next) => {
  try {
    const parsed = partSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the spare-part record.", details: parsed.error.flatten() });
    const data = parsed.data;
    const existing = await prisma.sparePartRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Spare-part record not found." });
    const quantity = data.quantity ?? existing.quantity;
    const unitCost = data.unitCost ?? existing.unitCost;
    const updated = await prisma.sparePartRecord.update({
      where: { id: existing.id },
      data: {
        ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.partName ? { partName: data.partName } : {}),
        ...(data.partNumber !== undefined ? { partNumber: clean(data.partNumber) } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
        totalCost: data.totalCost || Math.round(quantity * unitCost * 100) / 100,
        ...(data.supplier !== undefined ? { supplier: clean(data.supplier) } : {}),
        ...(data.odometer !== undefined ? { odometer: data.odometer } : {}),
        ...(data.maintenanceId !== undefined ? { maintenanceId: clean(data.maintenanceId) } : {}),
        ...(data.notes !== undefined ? { notes: clean(data.notes) } : {}),
      },
    });
    await described("parts", "SPARE_PART_UPDATED", req, { id: updated.id, cost: updated.totalCost });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/parts/:id", async (req: any, res, next) => {
  try {
    const deleted = await prisma.sparePartRecord.delete({ where: { id: req.params.id } });
    await described("parts", "SPARE_PART_DELETED", req, { id: deleted.id });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Spare-part record not found." });
    next(e);
  }
});

/* ----------------------------------------------------------------- tyres */

router.get("/tyres", async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (Number.isFinite(year) && year > 2000) {
      where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
    const rows = await prisma.tyreRecord.findMany({
      where,
      include: { vehicle: { select: { vehicleCode: true, licensePlate: true, type: true, odometer: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post("/tyres", async (req: any, res, next) => {
  try {
    const parsed = tyreSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the tyre record.", details: parsed.error.flatten() });
    const data = parsed.data;
    const created = await prisma.tyreRecord.create({
      data: {
        vehicleId: data.vehicleId,
        date: data.date,
        position: data.position,
        brand: clean(data.brand),
        size: clean(data.size),
        serialNumber: clean(data.serialNumber),
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost: data.totalCost || Math.round(data.quantity * data.unitCost * 100) / 100,
        odometer: data.odometer ?? null,
        action: data.action,
        notes: clean(data.notes),
        ...actor(req),
      },
      include: { vehicle: { select: { vehicleCode: true, licensePlate: true } } },
    });
    await described("tyres", "TYRE_LOGGED", req, {
      id: created.id,
      vehicle: created.vehicle.vehicleCode,
      position: created.position,
      cost: created.totalCost,
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

router.put("/tyres/:id", async (req: any, res, next) => {
  try {
    const parsed = tyreSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Check the tyre record.", details: parsed.error.flatten() });
    const data = parsed.data;
    const existing = await prisma.tyreRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Tyre record not found." });
    const quantity = data.quantity ?? existing.quantity;
    const unitCost = data.unitCost ?? existing.unitCost;
    const updated = await prisma.tyreRecord.update({
      where: { id: existing.id },
      data: {
        ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.position ? { position: data.position } : {}),
        ...(data.brand !== undefined ? { brand: clean(data.brand) } : {}),
        ...(data.size !== undefined ? { size: clean(data.size) } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: clean(data.serialNumber) } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
        totalCost: data.totalCost || Math.round(quantity * unitCost * 100) / 100,
        ...(data.odometer !== undefined ? { odometer: data.odometer } : {}),
        ...(data.action ? { action: data.action } : {}),
        ...(data.notes !== undefined ? { notes: clean(data.notes) } : {}),
      },
    });
    await described("tyres", "TYRE_UPDATED", req, { id: updated.id, cost: updated.totalCost });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/tyres/:id", async (req: any, res, next) => {
  try {
    const deleted = await prisma.tyreRecord.delete({ where: { id: req.params.id } });
    await described("tyres", "TYRE_DELETED", req, { id: deleted.id });
    res.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Tyre record not found." });
    next(e);
  }
});

/* -------------------------------------------------------- cost analytics */

router.get("/analytics", async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const [vehicles, fuel, maintenance, parts, tyres] = await Promise.all([
      prisma.vehicle.findMany({
        select: {
          id: true,
          vehicleCode: true,
          licensePlate: true,
          type: true,
          status: true,
          odometer: true,
          nextMaintenance: true,
          assignedDriver: { select: { name: true } },
        },
        orderBy: { vehicleCode: "asc" },
      }),
      prisma.fuelLog.findMany({
        where: { date: { gte: start, lt: end } },
        orderBy: [{ vehicleId: "asc" }, { date: "asc" }],
      }),
      prisma.maintenanceRecord.findMany({
        where: {
          OR: [
            { scheduledDate: { gte: start, lt: end } },
            { completedDate: { gte: start, lt: end } },
          ],
        },
        orderBy: [{ scheduledDate: "asc" }],
      }),
      prisma.sparePartRecord.findMany({ where: { date: { gte: start, lt: end } } }),
      prisma.tyreRecord.findMany({ where: { date: { gte: start, lt: end } } }),
    ]);

    const blank = () => ({
      fuelCost: 0,
      fuelLitres: 0,
      fuelEntries: 0,
      maintenanceCost: 0,
      maintenanceCount: 0,
      partsCost: 0,
      partsCount: 0,
      tyreCost: 0,
      tyreCount: 0,
      totalCost: 0,
    });
    const byVehicle = new Map<string, ReturnType<typeof blank>>();
    for (const vehicle of vehicles) byVehicle.set(vehicle.id, blank());

    for (const row of fuel) {
      const bucket = byVehicle.get(row.vehicleId);
      if (!bucket) continue;
      bucket.fuelCost += row.totalCost;
      bucket.fuelLitres += row.litres;
      bucket.fuelEntries += 1;
    }
    for (const row of maintenance) {
      const bucket = byVehicle.get(row.vehicleId);
      if (!bucket) continue;
      bucket.maintenanceCost += row.totalCost;
      bucket.maintenanceCount += 1;
    }
    for (const row of parts) {
      const bucket = byVehicle.get(row.vehicleId);
      if (!bucket) continue;
      bucket.partsCost += row.totalCost;
      bucket.partsCount += 1;
    }
    for (const row of tyres) {
      const bucket = byVehicle.get(row.vehicleId);
      if (!bucket) continue;
      bucket.tyreCost += row.totalCost;
      bucket.tyreCount += 1;
    }

    // Distance and fuel efficiency from consecutive odometer readings.
    const fuelByVehicle = new Map<string, typeof fuel>();
    for (const row of fuel) {
      const list = fuelByVehicle.get(row.vehicleId) || [];
      list.push(row);
      fuelByVehicle.set(row.vehicleId, list);
    }
    const vehicleRows = vehicles.map((vehicle) => {
      const costs = byVehicle.get(vehicle.id) || blank();
      const logs = (fuelByVehicle.get(vehicle.id) || []).filter((row) => row.odometer != null);
      const first = logs[0]?.odometer ?? null;
      const last = logs[logs.length - 1]?.odometer ?? vehicle.odometer ?? null;
      const distance = first != null && last != null && last >= first ? last - first : 0;
      const litresForDistance = logs.slice(1).reduce((sum, row) => sum + row.litres, 0);
      const efficiency = litresForDistance > 0 ? distance / litresForDistance : null;
      const totalCost = costs.fuelCost + costs.maintenanceCost + costs.partsCost + costs.tyreCost;
      return {
        ...costs,
        totalCost,
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
        status: vehicle.status,
        odometer: vehicle.odometer,
        driver: vehicle.assignedDriver?.name || null,
        distance,
        efficiency: efficiency == null ? null : Math.round(efficiency * 10) / 10,
        costPerKm: distance > 0 ? Math.round((totalCost / distance) * 100) / 100 : null,
        nextMaintenance: vehicle.nextMaintenance,
      };
    });

    const total = vehicleRows.reduce(
      (acc, row) => {
        acc.fuelCost += row.fuelCost;
        acc.fuelLitres += row.fuelLitres;
        acc.maintenanceCost += row.maintenanceCost;
        acc.partsCost += row.partsCost;
        acc.tyreCost += row.tyreCost;
        acc.totalCost += row.totalCost;
        acc.distance += row.distance;
        return acc;
      },
      { fuelCost: 0, fuelLitres: 0, maintenanceCost: 0, partsCost: 0, tyreCost: 0, totalCost: 0, distance: 0 }
    );

    const monthly = Array.from({ length: 12 }, (_, month) => {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 1);
      const inMonth = (value?: Date | null) => value && value >= monthStart && value < monthEnd;
      return {
        month: month + 1,
        label: monthStart.toLocaleString("en-GB", { month: "short" }),
        fuel: fuel.filter((row) => inMonth(row.date)).reduce((sum, row) => sum + row.totalCost, 0),
        maintenance: maintenance
          .filter((row) => inMonth(row.completedDate || row.scheduledDate))
          .reduce((sum, row) => sum + row.totalCost, 0),
        parts: parts.filter((row) => inMonth(row.date)).reduce((sum, row) => sum + row.totalCost, 0),
        tyres: tyres.filter((row) => inMonth(row.date)).reduce((sum, row) => sum + row.totalCost, 0),
      };
    });

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);
    const dueMaintenance = maintenance
      .filter(
        (row) =>
          !["Completed", "Cancelled"].includes(row.status) &&
          row.scheduledDate &&
          row.scheduledDate <= in30
      )
      .slice(0, 12)
      .map((row) => {
        const vehicle = vehicles.find((v) => v.id === row.vehicleId);
        return {
          id: row.id,
          vehicleId: row.vehicleId,
          vehicleCode: vehicle?.vehicleCode || "—",
          plate: vehicle?.licensePlate || "—",
          title: row.title,
          status: row.status,
          scheduledDate: row.scheduledDate,
          odometer: row.odometer,
          overdue: Boolean(row.scheduledDate && row.scheduledDate < now),
        };
      });

    const latestTyreByPosition = new Map<string, (typeof tyres)[number]>();
    for (const row of tyres) {
      const key = `${row.vehicleId}:${row.position}`;
      const current = latestTyreByPosition.get(key);
      if (!current || row.date > current.date) latestTyreByPosition.set(key, row);
    }
    const tyrePositions = Array.from(latestTyreByPosition.values()).map((row) => {
      const vehicle = vehicles.find((v) => v.id === row.vehicleId);
      return {
        id: row.id,
        vehicleId: row.vehicleId,
        vehicleCode: vehicle?.vehicleCode || "—",
        plate: vehicle?.licensePlate || "—",
        position: row.position,
        brand: row.brand,
        size: row.size,
        action: row.action,
        fittedAt: row.date,
        odometer: row.odometer,
        cost: row.totalCost,
      };
    });

    res.json({
      year,
      generatedAt: new Date().toISOString(),
      totals: {
        ...total,
        vehicles: vehicles.length,
        fuelEntries: fuel.length,
        maintenanceCount: maintenance.length,
        partsCount: parts.length,
        tyreCount: tyres.length,
        costPerKm: total.distance > 0 ? Math.round((total.totalCost / total.distance) * 100) / 100 : null,
        efficiency: total.fuelLitres > 0 ? Math.round((total.distance / total.fuelLitres) * 10) / 10 : null,
      },
      composition: [
        { key: "fuel", label: "Fuel", value: total.fuelCost },
        { key: "maintenance", label: "Maintenance", value: total.maintenanceCost },
        { key: "parts", label: "Spare parts", value: total.partsCost },
        { key: "tyres", label: "Tyres", value: total.tyreCost },
      ],
      vehicles: vehicleRows.sort((a, b) => b.totalCost - a.totalCost),
      monthly,
      dueMaintenance,
      tyrePositions,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
