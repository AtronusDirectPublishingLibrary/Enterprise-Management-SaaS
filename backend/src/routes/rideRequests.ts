import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireAccess } from "../middleware/auth";
import { isAdminUser, isFleetManager } from "../lib/access";

const router = Router();
const requireFleet = requireAccess("fleet");

function isSupervisorOf(request: { supervisorId: string | null }, user: any) {
  return request.supervisorId !== null && request.supervisorId === user?.sub;
}
function isOwnerOf(request: { requesterId: string }, user: any) {
  return request.requesterId === user?.sub;
}
function canView(request: any, user: any) {
  return isOwnerOf(request, user) || isSupervisorOf(request, user) || isFleetManager(user) || isAdminUser(user);
}

async function nextRideCode(): Promise<string> {
  const prefix = "RIDE-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-";
  const last = await prisma.rideRequest.findFirst({
    where: { requestCode: { startsWith: prefix } },
    orderBy: { requestCode: "desc" },
    select: { requestCode: true },
  });
  const n = last ? parseInt(last.requestCode.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(n).padStart(4, "0");
}

async function fleetManagerUsernames(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { position: "Human Resource and Administration Manager" },
    select: { username: true },
  });
  return users.map((u) => u.username);
}

async function notifyFleetManagers(title: string, body: string, link: string) {
  const recipients = await fleetManagerUsernames();
  if (recipients.length === 0) return 0;
  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      recipient,
      type: "FLEET_APPROVAL",
      title,
      body,
      link,
    })),
  });
  return recipients.length;
}

// --- Schemas ---
const createSchema = z.object({
  tripPurpose: z.string().min(2),
  pickupLocation: z.string().min(2),
  destination: z.string().min(2),
  departureDate: z.coerce.date(),
  departureTime: z.string().min(1),
  returnTime: z.string().optional().nullable(),
  passengers: z.coerce.number().int().positive().default(1),
  linkedVehicleRequestId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const fleetApproveSchema = z.object({
  providerId: z.string().min(1),
  estimatedFare: z.coerce.number().nonnegative().optional().nullable(),
});

const rejectSchema = z.object({ reason: z.string().min(2) });
const completeSchema = z.object({
  actualFare: z.coerce.number().nonnegative().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

// --- Reads ---
router.get("/my-requests", async (req: any, res) => {
  try {
    const items = await prisma.rideRequest.findMany({
      where: { requesterId: req.user.sub },
      include: {
        provider: { select: { id: true, name: true, contactPhone: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, username: true } },
        approver: { select: { id: true, firstName: true, lastName: true, username: true } },
        linkedVehicleRequest: { select: { id: true, requestCode: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 200,
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch your ride requests" }); }
});

router.get("/pending", async (req: any, res) => {
  try {
    const items = await prisma.rideRequest.findMany({
      where: { supervisorId: req.user.sub, status: "PENDING" },
      include: { requester: { select: { id: true, firstName: true, lastName: true, username: true } } },
      orderBy: { requestedAt: "asc" },
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch pending ride approvals" }); }
});

router.get("/fleet-queue", requireFleet, async (_req, res) => {
  try {
    const items = await prisma.rideRequest.findMany({
      where: { status: "SUPERVISOR_APPROVED" },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, username: true, department: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
      orderBy: { requestedAt: "asc" },
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch fleet queue" }); }
});

router.get("/all", requireFleet, async (req: any, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.from || req.query.to) {
      where.departureDate = {};
      if (req.query.from) where.departureDate.gte = new Date(String(req.query.from));
      if (req.query.to) where.departureDate.lte = new Date(String(req.query.to));
    }
    const items = await prisma.rideRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, username: true, department: true } },
        provider: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 500,
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch ride requests" }); }
});

router.get("/:id", async (req: any, res) => {
  try {
    const request = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, username: true, email: true, department: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, username: true, email: true } },
        approver: { select: { id: true, firstName: true, lastName: true, username: true } },
        provider: true,
        linkedVehicleRequest: { select: { id: true, requestCode: true, status: true } },
      },
    });
    if (!request) return res.status(404).json({ error: "Ride request not found" });
    if (!canView(request, req.user)) return res.status(403).json({ error: "Forbidden" });
    res.json(request);
  } catch { res.status(500).json({ error: "Failed to fetch ride request" }); }
});

// --- Create ---
router.post("/", async (req: any, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const data = parsed.data;

    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, username: true, immediateSupervisorId: true },
    });
    if (!me) return res.status(401).json({ error: "User not found" });
    if (!me.immediateSupervisorId) {
      return res.status(400).json({
        error: "You do not have a supervisor assigned. Ask HR to set your immediate supervisor before requesting a ride.",
      });
    }

    const requestCode = await nextRideCode();
    const created = await prisma.rideRequest.create({
      data: {
        requestCode,
        requesterId: me.id,
        tripPurpose: data.tripPurpose,
        pickupLocation: data.pickupLocation,
        destination: data.destination,
        departureDate: data.departureDate,
        departureTime: data.departureTime,
        returnTime: data.returnTime ?? null,
        passengers: data.passengers,
        linkedVehicleRequestId: data.linkedVehicleRequestId ?? null,
        supervisorId: me.immediateSupervisorId,
        status: "PENDING",
        remarks: data.remarks ?? null,
      },
    });
    await logAudit("FLEET", "RIDE_REQUEST_CREATED", me.username, {
      requestCode: created.requestCode,
      destination: created.destination,
      departureDate: created.departureDate.toISOString().slice(0, 10),
    });

    const sup = await prisma.user.findUnique({ where: { id: me.immediateSupervisorId }, select: { username: true } });
    if (sup) {
      await prisma.notification.create({
        data: {
          recipient: sup.username,
          type: "FLEET_APPROVAL",
          title: `Ride request pending: ${created.requestCode}`,
          body: `${me.username} requested a ride to ${created.destination}.`,
          link: "/fleet/approvals",
        },
      });
    }

    res.json(created);
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Ride code collision - try again" });
    res.status(500).json({ error: "Failed to create ride request" });
  }
});

// --- Supervisor approve ---
router.post("/:id/supervisor-approve", async (req: any, res) => {
  try {
    const request = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { username: true } } },
    });
    if (!request) return res.status(404).json({ error: "Ride request not found" });
    if (!isSupervisorOf(request, req.user) && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Only the assigned supervisor can approve" });
    }
    if (request.requesterId === req.user.sub) {
      return res.status(403).json({ error: "You cannot approve your own request" });
    }
    if (request.status !== "PENDING") {
      return res.status(409).json({ error: `Ride is ${request.status}, not PENDING` });
    }
    const updated = await prisma.rideRequest.update({
      where: { id: request.id },
      data: { status: "SUPERVISOR_APPROVED" },
    });
    await logAudit("FLEET", "RIDE_SUPERVISOR_APPROVED", req.user.username || "system", {
      requestCode: updated.requestCode,
    });
    await notifyFleetManagers(
      `Ride approval needed: ${updated.requestCode}`,
      `${request.requester.username} requested a ride to ${updated.destination} on ${updated.departureDate.toISOString().slice(0, 10)}.`,
      "/fleet/approvals"
    );
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to approve" }); }
});

// --- Fleet approve ---
router.post("/:id/fleet-approve", requireFleet, async (req: any, res) => {
  try {
    const parsed = fleetApproveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const { providerId, estimatedFare } = parsed.data;

    const request = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { username: true } } },
    });
    if (!request) return res.status(404).json({ error: "Ride request not found" });
    if (request.status !== "SUPERVISOR_APPROVED") {
      return res.status(409).json({ error: `Ride is ${request.status}, not SUPERVISOR_APPROVED` });
    }
    const provider = await prisma.rideProvider.findUnique({ where: { id: providerId } });
    if (!provider) return res.status(404).json({ error: "Ride provider not found" });
    if (!provider.isActive) return res.status(409).json({ error: `Provider ${provider.name} is inactive` });

    const updated = await prisma.rideRequest.update({
      where: { id: request.id },
      data: {
        status: "ASSIGNED",
        providerId,
        approverId: req.user.sub,
        ...(estimatedFare !== undefined && { estimatedFare }),
      },
    });
    await logAudit("FLEET", "RIDE_FLEET_APPROVED", req.user.username || "system", {
      requestCode: updated.requestCode,
      providerId,
      estimatedFare: updated.estimatedFare,
    });
    await prisma.notification.create({
      data: {
        recipient: request.requester.username,
        type: "RIDE_APPROVED",
        title: `Ride approved: ${updated.requestCode}`,
        body: `${provider.name} has been assigned for your ride to ${updated.destination}.`,
        link: `/fleet/rides/${updated.id}`,
      },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to approve" }); }
});

// --- Reject ---
router.post("/:id/reject", async (req: any, res) => {
  try {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Rejection reason required" });
    const request = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { username: true } } },
    });
    if (!request) return res.status(404).json({ error: "Ride request not found" });
    if (request.requesterId === req.user.sub) {
      return res.status(403).json({ error: "You cannot reject your own request" });
    }
    const isSup = isSupervisorOf(request, req.user);
    const isFleet = isFleetManager(req.user) || isAdminUser(req.user);
    if (request.status === "PENDING" && !isSup && !isFleet) {
      return res.status(403).json({ error: "Only supervisor or fleet manager can reject" });
    }
    if (request.status === "SUPERVISOR_APPROVED" && !isFleet) {
      return res.status(403).json({ error: "Only fleet manager can reject after supervisor approval" });
    }
    if (!["PENDING", "SUPERVISOR_APPROVED"].includes(request.status)) {
      return res.status(409).json({ error: `Cannot reject a ride in status ${request.status}` });
    }
    const updated = await prisma.rideRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", rejectionReason: parsed.data.reason },
    });
    await logAudit("FLEET", "RIDE_REJECTED", req.user.username || "system", {
      requestCode: updated.requestCode,
      reason: parsed.data.reason,
    });
    await prisma.notification.create({
      data: {
        recipient: request.requester.username,
        type: "FLEET_APPROVAL",
        title: `Ride rejected: ${updated.requestCode}`,
        body: parsed.data.reason,
        link: `/fleet/rides/${updated.id}`,
      },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to reject" }); }
});

// --- Cancel ---
router.post("/:id/cancel", async (req: any, res) => {
  try {
    const request = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Ride request not found" });
    if (!isOwnerOf(request, req.user) && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Only the requester can cancel" });
    }
    if (!["PENDING", "SUPERVISOR_APPROVED"].includes(request.status)) {
      return res.status(409).json({ error: `Cannot cancel a ride in status ${request.status}` });
    }
    const updated = await prisma.rideRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });
    await logAudit("FLEET", "RIDE_CANCELLED", req.user.username || "system", {
      requestCode: updated.requestCode,
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to cancel" }); }
});

// --- Complete ---
router.post("/:id/complete", async (req: any, res) => {
  try {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const request = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Ride request not found" });
    if (!isOwnerOf(request, req.user) && !isFleetManager(req.user) && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (request.status !== "ASSIGNED") {
      return res.status(409).json({ error: `Ride is ${request.status}, not ASSIGNED` });
    }
    const updated = await prisma.rideRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        ...(parsed.data.actualFare !== undefined && { actualFare: parsed.data.actualFare }),
        ...(parsed.data.receiptUrl !== undefined && { receiptUrl: parsed.data.receiptUrl }),
      },
    });
    await logAudit("FLEET", "RIDE_COMPLETED", req.user.username || "system", {
      requestCode: updated.requestCode,
      actualFare: updated.actualFare,
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to complete" }); }
});

export default router;