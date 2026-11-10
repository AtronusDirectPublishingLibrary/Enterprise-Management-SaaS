import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * Fleet analytics summary.
 * One round-trip for the whole dashboard.
 *   - vehicle counts by status
 *   - request counts by status for vehicles and rides
 *   - monthly request volume (last 6 months)
 *   - ride spend (sum of actualFare, completed rides only)
 *   - top destinations (by request count, last 90 days)
 *   - driver workload (assignments in last 90 days)
 */
router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

    const [
      vehicles,
      vehicleRequests,
      rideRequests,
      recentVehicleReqs,
      recentRideReqs,
      drivers,
      vehicleReqByMonth,
      rideReqByMonth,
    ] = await Promise.all([
      prisma.vehicle.findMany({ select: { status: true } }),
      prisma.vehicleRequest.findMany({ select: { status: true } }),
      prisma.rideRequest.findMany({ select: { status: true, actualFare: true, currency: true } }),
      prisma.vehicleRequest.findMany({
        where: { requestedAt: { gte: ninetyDaysAgo } },
        select: { destination: true },
      }),
      prisma.rideRequest.findMany({
        where: { requestedAt: { gte: ninetyDaysAgo } },
        select: { destination: true },
      }),
      prisma.driver.findMany({
        select: {
          driverCode: true,
          name: true,
          _count: { select: { requests: { where: { requestedAt: { gte: ninetyDaysAgo } } } } },
        },
        orderBy: { driverCode: "asc" },
      }),
      prisma.$queryRaw<{ month: Date; count: bigint }[]>`
        SELECT date_trunc('month', "requested_at") AS month, COUNT(*) AS count
        FROM vehicle_request
        WHERE "requested_at" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month ASC
      `,
      prisma.$queryRaw<{ month: Date; count: bigint }[]>`
        SELECT date_trunc('month', "requested_at") AS month, COUNT(*) AS count
        FROM ride_request
        WHERE "requested_at" >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month ASC
      `,
    ]);

    // Vehicle status counts
    const vehicleCounts = { Available: 0, "In Use": 0, "Under Maintenance": 0, Unavailable: 0 };
    vehicles.forEach((v) => { if (v.status in vehicleCounts) (vehicleCounts as any)[v.status]++; });

    // Request counts by status (both types)
    const countStatuses = (list: { status: string }[]) => {
      const out: Record<string, number> = {};
      list.forEach((r) => { out[r.status] = (out[r.status] || 0) + 1; });
      return {
        total: list.length,
        pending: out.PENDING || 0,
        supervisorApproved: out.SUPERVISOR_APPROVED || 0,
        fleetApproved: out.FLEET_APPROVED || 0,
        assigned: out.ASSIGNED || 0,
        inProgress: out.IN_PROGRESS || 0,
        completed: out.COMPLETED || 0,
        rejected: out.REJECTED || 0,
        cancelled: out.CANCELLED || 0,
        expired: out.EXPIRED || 0,
      };
    };

    // Monthly volume: fill gaps with 0
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const vehicleByMonthMap = new Map(vehicleReqByMonth.map((r) => [monthKey(new Date(r.month)), Number(r.count)]));
    const rideByMonthMap = new Map(rideReqByMonth.map((r) => [monthKey(new Date(r.month)), Number(r.count)]));
    const monthlyVolume: { month: string; label: string; vehicle: number; ride: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      monthlyVolume.push({
        month: k,
        label: d.toLocaleString("en-GB", { month: "short", year: "2-digit" }),
        vehicle: vehicleByMonthMap.get(k) || 0,
        ride: rideByMonthMap.get(k) || 0,
      });
    }

    // Ride spend
    const currency = rideRequests[0]?.currency || "ETB";
    const totalRideSpend = rideRequests
      .filter((r) => r.status === "COMPLETED" && r.actualFare != null)
      .reduce((sum, r) => sum + Number(r.actualFare || 0), 0);

    // Top destinations (last 90 days, combined vehicle + ride)
    const destCounts: Record<string, number> = {};
    [...recentVehicleReqs, ...recentRideReqs].forEach((r) => {
      if (r.destination) destCounts[r.destination] = (destCounts[r.destination] || 0) + 1;
    });
    const topDestinations = Object.entries(destCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([destination, count]) => ({ destination, count }));

    // Driver workload
    const driverWorkload = drivers.map((d) => ({
      driverCode: d.driverCode,
      name: d.name,
      trips: d._count.requests,
    }));

    res.json({
      vehicles: {
        total: vehicles.length,
        available: vehicleCounts.Available,
        inUse: vehicleCounts["In Use"],
        maintenance: vehicleCounts["Under Maintenance"],
        unavailable: vehicleCounts.Unavailable,
      },
      requests: {
        vehicle: countStatuses(vehicleRequests),
        ride: countStatuses(rideRequests),
      },
      monthlyVolume,
      rideSpend: { total: totalRideSpend, currency },
      topDestinations,
      driverWorkload,
    });
  } catch (err) {
    console.error("[fleet-analytics] error", err);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
});

export default router;