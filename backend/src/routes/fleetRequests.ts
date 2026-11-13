import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../lib/audit";
import { requireAccess } from "../middleware/auth";
import { isAdminUser, isFleetManager } from "../lib/access";
import { sendGatePassEmail, buildVerifyUrl } from "../lib/gatePass";
import { ensureFleetSettingsSeeded, getFleetSettings } from "../lib/fleetSettings";

const router = Router();
const requireFleet = requireAccess("fleet");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSupervisorOf(request: { supervisorId: string | null }, user: any) {
  return request.supervisorId !== null && request.supervisorId === user?.sub;
}
function isOwnerOf(request: { requesterId: string }, user: any) {
  return request.requesterId === user?.sub;
}
function canView(request: any, user: any) {
  return (
    isOwnerOf(request, user) ||
    isSupervisorOf(request, user) ||
    isFleetManager(user) ||
    isAdminUser(user)
  );
}

async function nextRequestCode(): Promise<string> {
  const prefix = "REQ-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-";
  const last = await prisma.vehicleRequest.findFirst({
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

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  requestType: z.enum(["In-Town", "Field"]),
  tripPurpose: z.string().min(2),
  department: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  vehicleTypePreferred: z.string().optional().nullable(),
  passengers: z.coerce.number().int().positive().default(1),
  departureDate: z.coerce.date(),
  returnDate: z.coerce.date(),
  departureTime: z.string().min(1),
  returnTime: z.string().optional().nullable(),
  pickupLocation: z.string().min(2),
  destination: z.string().min(2),
  distance: z.coerce.number().nonnegative().optional().nullable(),
  odometerStart: z.coerce.number().nonnegative().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const fleetApproveSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  odometerStart: z.coerce.number().nonnegative().optional().nullable(),
});

const rejectSchema = z.object({
  reason: z.string().min(2),
});

const completeSchema = z.object({
  odometerEnd: z.coerce.number().nonnegative().optional().nullable(),
});

const startSchema = z.object({
  odometerStart: z.coerce.number().nonnegative().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

router.get("/my-requests", async (req: any, res) => {
  try {
    const items = await prisma.vehicleRequest.findMany({
      where: { requesterId: req.user.sub },
      include: {
        vehicle: { select: { id: true, vehicleCode: true, licensePlate: true, type: true } },
        driver: { select: { id: true, driverCode: true, name: true, phone: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, username: true } },
        fleetApprover: { select: { id: true, firstName: true, lastName: true, username: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 200,
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch your requests" }); }
});

router.get("/pending", async (req: any, res) => {
  try {
    const items = await prisma.vehicleRequest.findMany({
      where: { supervisorId: req.user.sub, status: "PENDING" },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, username: true, department: true } },
      },
      orderBy: { requestedAt: "asc" },
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch pending approvals" }); }
});

router.get("/fleet-queue", requireFleet, async (_req, res) => {
  try {
    const items = await prisma.vehicleRequest.findMany({
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
    const items = await prisma.vehicleRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, username: true, department: true } },
        vehicle: { select: { id: true, vehicleCode: true, licensePlate: true } },
        driver: { select: { id: true, driverCode: true, name: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 500,
    });
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch requests" }); }
});

router.get("/:id", async (req: any, res) => {
  try {
    const request = await prisma.vehicleRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, username: true, email: true, department: true, position: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, username: true, email: true } },
        fleetApprover: { select: { id: true, firstName: true, lastName: true, username: true } },
        vehicle: true,
        driver: true,
        rideRequests: true,
      },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!canView(request, req.user)) return res.status(403).json({ error: "Forbidden" });
    res.json(request);
  } catch { res.status(500).json({ error: "Failed to fetch request" }); }
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

router.post("/", async (req: any, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }
    const data = parsed.data;

    // Resolve supervisor from DB (JWT payload may not include it)
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, username: true, immediateSupervisorId: true },
    });
    if (!me) return res.status(401).json({ error: "User not found" });
    if (!me.immediateSupervisorId) {
      return res.status(400).json({
        error: "You do not have a supervisor assigned. Ask HR to set your immediate supervisor before requesting a vehicle.",
      });
    }

    const requestCode = await nextRequestCode();
    const created = await prisma.vehicleRequest.create({
      data: {
        requestCode,
        requesterId: me.id,
        requestType: data.requestType,
        tripPurpose: data.tripPurpose,
        department: data.department ?? null,
        division: data.division ?? null,
        vehicleTypePreferred: data.vehicleTypePreferred ?? null,
        passengers: data.passengers,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        departureTime: data.departureTime,
        returnTime: data.returnTime ?? null,
        pickupLocation: data.pickupLocation,
        destination: data.destination,
        distance: data.distance ?? null,
        odometerStart: data.odometerStart ?? null,
        supervisorId: me.immediateSupervisorId,
        status: "PENDING",
        remarks: data.remarks ?? null,
      },
    });
    await logAudit("FLEET", "REQUEST_CREATED", me.username, {
      requestCode: created.requestCode,
      destination: created.destination,
      departureDate: created.departureDate.toISOString().slice(0, 10),
    });

    // Notify the supervisor
    const sup = await prisma.user.findUnique({
      where: { id: me.immediateSupervisorId },
      select: { username: true },
    });
    if (sup) {
      await prisma.notification.create({
        data: {
          recipient: sup.username,
          type: "FLEET_APPROVAL",
          title: `Vehicle request pending: ${created.requestCode}`,
          body: `${me.username} requested a vehicle for ${created.destination}.`,
          link: "/fleet/approvals",
        },
      });
    }

    res.json(created);
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Request code collision - try again" });
    res.status(500).json({ error: "Failed to create request" });
  }
});

// ---------------------------------------------------------------------------
// Supervisor approve
// ---------------------------------------------------------------------------

router.post("/:id/supervisor-approve", async (req: any, res) => {
  try {
    const request = await prisma.vehicleRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { username: true } } },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });

    const canApprove = isSupervisorOf(request, req.user) || isAdminUser(req.user);
    if (!canApprove) return res.status(403).json({ error: "Only the assigned supervisor can approve" });
    if (request.requesterId === req.user.sub) {
      return res.status(403).json({ error: "You cannot approve your own request" });
    }
    if (request.status !== "PENDING") {
      return res.status(409).json({ error: `Request is ${request.status}, not PENDING` });
    }

    const updated = await prisma.vehicleRequest.update({
      where: { id: request.id },
      data: { status: "SUPERVISOR_APPROVED" },
    });
    await logAudit("FLEET", "REQUEST_SUPERVISOR_APPROVED", req.user.username || "system", {
      requestCode: updated.requestCode,
    });

    await notifyFleetManagers(
      `Fleet approval needed: ${updated.requestCode}`,
      `${request.requester.username} requested a vehicle to ${updated.destination} on ${updated.departureDate.toISOString().slice(0, 10)}.`,
      "/fleet/approvals"
    );

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to approve" }); }
});

// ---------------------------------------------------------------------------
// Fleet approve - transaction: assign vehicle + driver, send gate pass
// ---------------------------------------------------------------------------

router.post("/:id/fleet-approve", requireFleet, async (req: any, res) => {
  try {
    const parsed = fleetApproveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    const { vehicleId, driverId, odometerStart } = parsed.data;

    const request = await prisma.vehicleRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { id: true, username: true, email: true, firstName: true, lastName: true, department: true } } },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "SUPERVISOR_APPROVED") {
      return res.status(409).json({ error: `Request is ${request.status}, not SUPERVISOR_APPROVED` });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    if (vehicle.status !== "Available") {
      return res.status(409).json({ error: `Vehicle ${vehicle.vehicleCode} is ${vehicle.status}, not Available` });
    }
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    if (driver.status !== "Available") {
      return res.status(409).json({ error: `Driver ${driver.driverCode} is ${driver.status}, not Available` });
    }

    const approver = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { firstName: true, lastName: true, username: true },
    });
    const approverName =
      approver ? `${approver.firstName ?? ""} ${approver.lastName ?? ""}`.trim() || approver.username : "Fleet Manager";

    const gatePassNo = "GP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" +
      String(Math.floor(Math.random() * 10000)).padStart(4, "0");

    // Atomic: update request, flip vehicle to In Use
    const [updatedRequest] = await prisma.$transaction([
      prisma.vehicleRequest.update({
        where: { id: request.id },
        data: {
          status: "ASSIGNED",
          vehicleId,
          driverId,
          fleetApproverId: req.user.sub,
          gatePassNo,
          ...(odometerStart !== undefined && { odometerStart }),
        },
      }),
      prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: "In Use" },
      }),
      prisma.driver.update({
        where: { id: driverId },
        data: { status: "On Trip" },
      }),
    ]);

    await logAudit("FLEET", "REQUEST_FLEET_APPROVED", req.user.username || "system", {
      requestCode: updatedRequest.requestCode,
      vehicleId,
      driverId,
      gatePassNo,
    });

    // Send gate pass AFTER transaction commits — a mail failure must not roll back assignment
    const requesterName =
      `${request.requester.firstName ?? ""} ${request.requester.lastName ?? ""}`.trim() || request.requester.username;

    const sendResult = await sendGatePassEmail({
      to: [request.requester.email, driver.email].filter((x): x is string => Boolean(x)),
      subject: `Gate Pass - ${updatedRequest.requestCode}`,
      input: {
        requestId: updatedRequest.id,
        requestCode: updatedRequest.requestCode,
        gatePassNo,
        requesterName,
        requesterDepartment: updatedRequest.department ?? request.requester.department,
        driverName: driver.name,
        vehicleCode: vehicle.vehicleCode,
        licensePlate: vehicle.licensePlate,
        passengers: updatedRequest.passengers,
        destination: updatedRequest.destination,
        departureDate: updatedRequest.departureDate,
        departureTime: updatedRequest.departureTime,
        returnDate: updatedRequest.returnDate,
        returnTime: updatedRequest.returnTime,
        approverName,
        odometerStart: updatedRequest.odometerStart,
        odometerEnd: updatedRequest.odometerEnd,
        verifyUrl: buildVerifyUrl(updatedRequest.id),
      },
    });

    if (sendResult.sent) {
      await prisma.vehicleRequest.update({
        where: { id: updatedRequest.id },
        data: { gatePassSentAt: new Date() },
      });
    }

    // Notify requester in-app
    await prisma.notification.create({
      data: {
        recipient: request.requester.username,
        type: "FLEET_GATE_PASS",
        title: `Vehicle assigned: ${updatedRequest.requestCode}`,
        body: `${driver.name} will drive ${vehicle.vehicleCode} (${vehicle.licensePlate}) to ${updatedRequest.destination}.`,
        link: `/fleet/requests/${updatedRequest.id}`,
      },
    });

    res.json({
      request: updatedRequest,
      vehicle,
      driver,
      gatePassNo,
      emailStatus: sendResult.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to approve" });
  }
});

// ---------------------------------------------------------------------------
// Reject (supervisor while PENDING, fleet while SUPERVISOR_APPROVED, admin anytime pre-assignment)
// ---------------------------------------------------------------------------

router.post("/:id/reject", async (req: any, res) => {
  try {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Rejection reason required" });

    const request = await prisma.vehicleRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { username: true } } },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
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
      return res.status(409).json({ error: `Cannot reject a request in status ${request.status}` });
    }

    const updated = await prisma.vehicleRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", rejectionReason: parsed.data.reason },
    });
    await logAudit("FLEET", "REQUEST_REJECTED", req.user.username || "system", {
      requestCode: updated.requestCode,
      reason: parsed.data.reason,
    });
    await prisma.notification.create({
      data: {
        recipient: request.requester.username,
        type: "FLEET_APPROVAL",
        title: `Request rejected: ${updated.requestCode}`,
        body: parsed.data.reason,
        link: `/fleet/requests/${updated.id}`,
      },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to reject" }); }
});

// ---------------------------------------------------------------------------
// Cancel (owner while PENDING or SUPERVISOR_APPROVED)
// ---------------------------------------------------------------------------

router.post("/:id/cancel", async (req: any, res) => {
  try {
    const request = await prisma.vehicleRequest.findUnique({
      where: { id: req.params.id },
      include: { requester: { select: { username: true } } },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!isOwnerOf(request, req.user) && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Only the requester can cancel" });
    }
    if (!["PENDING", "SUPERVISOR_APPROVED"].includes(request.status)) {
      return res.status(409).json({ error: `Cannot cancel a request in status ${request.status}` });
    }
    const updated = await prisma.vehicleRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });
    await logAudit("FLEET", "REQUEST_CANCELLED", req.user.username || "system", {
      requestCode: updated.requestCode,
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to cancel" }); }
});

// ---------------------------------------------------------------------------
// Start / Complete (owner or fleet)
// ---------------------------------------------------------------------------

router.post("/:id/start", async (req: any, res) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const request = await prisma.vehicleRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!isOwnerOf(request, req.user) && !isFleetManager(req.user) && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (request.status !== "ASSIGNED") {
      return res.status(409).json({ error: `Request is ${request.status}, not ASSIGNED` });
    }
    const updated = await prisma.vehicleRequest.update({
      where: { id: request.id },
      data: {
        status: "IN_PROGRESS",
        ...(parsed.data.odometerStart !== undefined && { odometerStart: parsed.data.odometerStart }),
      },
    });
    await logAudit("FLEET", "REQUEST_STARTED", req.user.username || "system", {
      requestCode: updated.requestCode,
      odometerStart: updated.odometerStart,
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to start" }); }
});

router.post("/:id/complete", async (req: any, res) => {
  try {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const request = await prisma.vehicleRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!isOwnerOf(request, req.user) && !isFleetManager(req.user) && !isAdminUser(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!["ASSIGNED", "IN_PROGRESS"].includes(request.status)) {
      return res.status(409).json({ error: `Request is ${request.status}, cannot complete` });
    }

    const updates: any[] = [
      prisma.vehicleRequest.update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          ...(parsed.data.odometerEnd !== undefined && { odometerEnd: parsed.data.odometerEnd }),
        },
      }),
    ];
    if (request.vehicleId) {
      updates.push(
        prisma.vehicle.update({
          where: { id: request.vehicleId },
          data: {
            status: "Available",
            ...(parsed.data.odometerEnd !== undefined && { odometer: parsed.data.odometerEnd }),
          },
        })
      );
    }
    if (request.driverId) {
      updates.push(
        prisma.driver.update({
          where: { id: request.driverId },
          data: { status: "Available" },
        })
      );
    }
    const [updated] = await prisma.$transaction(updates);

    await logAudit("FLEET", "REQUEST_COMPLETED", req.user.username || "system", {
      requestCode: updated.requestCode,
      odometerEnd: updated.odometerEnd,
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to complete" }); }
});

// ---------------------------------------------------------------------------
// Resend gate pass (fleet only)
// ---------------------------------------------------------------------------

router.post("/:id/resend-gate-pass", requireFleet, async (req: any, res) => {
  try {
    const request = await prisma.vehicleRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { firstName: true, lastName: true, username: true, email: true, department: true } },
        vehicle: true,
        driver: true,
        fleetApprover: { select: { firstName: true, lastName: true, username: true } },
      },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!request.gatePassNo) return res.status(409).json({ error: "No gate pass has been issued yet" });
    if (!request.vehicle || !request.driver) return res.status(409).json({ error: "Request has no vehicle/driver assigned" });

    const approverName = request.fleetApprover
      ? `${request.fleetApprover.firstName ?? ""} ${request.fleetApprover.lastName ?? ""}`.trim() || request.fleetApprover.username
      : "Fleet Manager";

    const requesterName =
      `${request.requester.firstName ?? ""} ${request.requester.lastName ?? ""}`.trim() || request.requester.username;

    const sendResult = await sendGatePassEmail({
      to: [request.requester.email, request.driver.email].filter((x): x is string => Boolean(x)),
      subject: `Gate Pass (resend) - ${request.requestCode}`,
      input: {
        requestId: request.id,
        requestCode: request.requestCode,
        gatePassNo: request.gatePassNo,
        requesterName,
        requesterDepartment: request.department ?? request.requester.department,
        driverName: request.driver.name,
        vehicleCode: request.vehicle.vehicleCode,
        licensePlate: request.vehicle.licensePlate,
        passengers: request.passengers,
        destination: request.destination,
        departureDate: request.departureDate,
        departureTime: request.departureTime,
        returnDate: request.returnDate,
        returnTime: request.returnTime,
        approverName,
        odometerStart: request.odometerStart,
        odometerEnd: request.odometerEnd,
        verifyUrl: buildVerifyUrl(request.id),
      },
    });

    await logAudit("FLEET", "REQUEST_GATE_PASS_RESENT", req.user.username || "system", {
      requestCode: request.requestCode,
      gatePassNo: request.gatePassNo,
      status: sendResult.status,
    });
    res.json({ status: sendResult.status, error: sendResult.error });
  } catch { res.status(500).json({ error: "Failed to resend gate pass" }); }
});

export default router;