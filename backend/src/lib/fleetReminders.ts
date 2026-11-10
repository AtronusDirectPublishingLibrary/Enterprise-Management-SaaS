import { prisma } from "./prisma";
import { getFleetSettings } from "./fleetSettings";

/**
 * Fleet reminder + cleanup sweep. Mirrors hrReminders.ts:
 *   - Expires vehicle/ride requests whose return date is older than
 *     `autoCleanupDays` and whose status is already terminal.
 *   - Nudges the assigned supervisor when a request has been PENDING longer
 *     than `notifySupervisorAfterHours`.
 *   - Nudges the fleet manager when a request has been SUPERVISOR_APPROVED
 *     longer than `notifyFleetAfterHours`.
 *
 * Notifications are de-duplicated per recipient per day per reason, so
 * running the sweep hourly is idempotent.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export type FleetReminderResult = {
  expiredVehicle: number;
  expiredRide: number;
  supervisorNudges: number;
  fleetNudges: number;
};

export async function runFleetReminders(): Promise<FleetReminderResult> {
  const settings = await getFleetSettings();
  const now = new Date();
  const today = startOfToday();
  const cleanupCutoff = new Date(now.getTime() - settings.autoCleanupDays * DAY);
  const supervisorCutoff = new Date(now.getTime() - settings.notifySupervisorAfterHours * HOUR);
  const fleetCutoff = new Date(now.getTime() - settings.notifyFleetAfterHours * HOUR);

  const result: FleetReminderResult = {
    expiredVehicle: 0,
    expiredRide: 0,
    supervisorNudges: 0,
    fleetNudges: 0,
  };

  const TERMINAL = ["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"];

  // --- 1. Expire stale terminal requests ---
  const [staleVehicles, staleRides] = await Promise.all([
    prisma.vehicleRequest.updateMany({
      where: {
        status: { in: TERMINAL },
        returnDate: { lt: cleanupCutoff },
      },
      data: { status: "EXPIRED" },
    }),
    prisma.rideRequest.updateMany({
      where: {
        status: { in: TERMINAL },
        departureDate: { lt: cleanupCutoff },
      },
      data: { status: "EXPIRED" },
    }),
  ]);
  result.expiredVehicle = staleVehicles.count;
  result.expiredRide = staleRides.count;

  // --- 2. Nudge supervisors of stale PENDING requests ---
  const pendingVehicles = await prisma.vehicleRequest.findMany({
    where: { status: "PENDING", requestedAt: { lt: supervisorCutoff } },
    include: { supervisor: { select: { username: true } }, requester: { select: { username: true } } },
  });
  for (const req of pendingVehicles) {
    const recipient = req.supervisor?.username;
    if (!recipient) continue;
    const title = `Fleet approval pending: ${req.requestCode}`;
    const existing = await prisma.notification.findFirst({
      where: { recipient, title, createdAt: { gte: today } },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        recipient,
        type: "FLEET_APPROVAL",
        title,
        body: `${req.requester.username} requested a vehicle for ${req.destination} on ${req.departureDate.toISOString().slice(0, 10)}.`,
        link: "/fleet/approvals",
      },
    });
    result.supervisorNudges++;
  }

  const pendingRides = await prisma.rideRequest.findMany({
    where: { status: "PENDING", requestedAt: { lt: supervisorCutoff } },
    include: { supervisor: { select: { username: true } }, requester: { select: { username: true } } },
  });
  for (const req of pendingRides) {
    const recipient = req.supervisor?.username;
    if (!recipient) continue;
    const title = `Ride approval pending: ${req.requestCode}`;
    const existing = await prisma.notification.findFirst({
      where: { recipient, title, createdAt: { gte: today } },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        recipient,
        type: "FLEET_APPROVAL",
        title,
        body: `${req.requester.username} requested a ride to ${req.destination} on ${req.departureDate.toISOString().slice(0, 10)}.`,
        link: "/fleet/approvals",
      },
    });
    result.supervisorNudges++;
  }

  // --- 3. Nudge fleet managers of stale SUPERVISOR_APPROVED requests ---
  const fleetManagers = await prisma.user.findMany({
    where: { position: "Human Resource and Administration Manager" },
    select: { username: true },
  });
  const fleetRecipients = fleetManagers.map((u) => u.username);
  if (fleetRecipients.length > 0) {
    const waitingVehicles = await prisma.vehicleRequest.findMany({
      where: { status: "SUPERVISOR_APPROVED", updatedAt: { lt: fleetCutoff } },
      select: { requestCode: true, destination: true },
    });
    for (const req of waitingVehicles) {
      const title = `Fleet assignment pending: ${req.requestCode}`;
      for (const recipient of fleetRecipients) {
        const existing = await prisma.notification.findFirst({
          where: { recipient, title, createdAt: { gte: today } },
        });
        if (existing) continue;
        await prisma.notification.create({
          data: {
            recipient,
            type: "FLEET_APPROVAL",
            title,
            body: `Vehicle request to ${req.destination} has been supervisor-approved and awaits fleet assignment.`,
            link: "/fleet/approvals",
          },
        });
        result.fleetNudges++;
      }
    }

    const waitingRides = await prisma.rideRequest.findMany({
      where: { status: "SUPERVISOR_APPROVED", updatedAt: { lt: fleetCutoff } },
      select: { requestCode: true, destination: true },
    });
    for (const req of waitingRides) {
      const title = `Ride approval pending: ${req.requestCode}`;
      for (const recipient of fleetRecipients) {
        const existing = await prisma.notification.findFirst({
          where: { recipient, title, createdAt: { gte: today } },
        });
        if (existing) continue;
        await prisma.notification.create({
          data: {
            recipient,
            type: "FLEET_APPROVAL",
            title,
            body: `Ride request to ${req.destination} has been supervisor-approved and awaits fleet approval.`,
            link: "/fleet/approvals",
          },
        });
        result.fleetNudges++;
      }
    }
  }

  return result;
}