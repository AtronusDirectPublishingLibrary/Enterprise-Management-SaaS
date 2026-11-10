/**
 * Fleet demo seed — idempotent, safe to re-run.
 *
 * Populates:
 *   - 3 vehicles (V001 Sedan, V002 4x4, V003 Minibus) — Available
 *   - 3 drivers (Abebe, Tigist, Dawit) — Available
 *   - 3 ride providers (Ride, ZayRide, Feres) — Active
 *   - All 8 FleetSetting defaults
 *
 * Does NOT seed demo requests (use the UI at /fleet/new to test the flow).
 *
 * Run: npm run seed:fleet
 */
import { PrismaClient } from "@prisma/client";
import { ensureFleetSettingsSeeded } from "../src/lib/fleetSettings";

const prisma = new PrismaClient();

async function seedVehicles() {
  const existing = await prisma.vehicle.count();
  if (existing > 0) {
    console.log(`  ✓ Vehicles already present (${existing}) — skipping`);
    return;
  }
  const vehicles = [
    { vehicleCode: "V001", type: "Sedan",   licensePlate: "AA-DEMO-001", capacity: 4,  fuelType: "Petrol", odometer: 45000 },
    { vehicleCode: "V002", type: "4x4",     licensePlate: "AA-DEMO-002", capacity: 6,  fuelType: "Diesel", odometer: 32000 },
    { vehicleCode: "V003", type: "Minibus", licensePlate: "AA-DEMO-003", capacity: 12, fuelType: "Diesel", odometer: 28000 },
  ];
  for (const v of vehicles) {
    await prisma.vehicle.create({
      data: { ...v, status: "Available", remarks: "Demo seed" },
    });
  }
  console.log(`  ✓ Seeded ${vehicles.length} vehicles`);
}

async function seedDrivers() {
  const existing = await prisma.driver.count();
  if (existing > 0) {
    console.log(`  ✓ Drivers already present (${existing}) — skipping`);
    return;
  }
  const drivers = [
    { driverCode: "D001", name: "Abebe Tesfaye", phone: "+251-911-000-001", email: "abebe.demo@ethiobiopharma.et" },
    { driverCode: "D002", name: "Tigist Bekele", phone: "+251-911-000-002", email: "tigist.demo@ethiobiopharma.et" },
    { driverCode: "D003", name: "Dawit Haile",   phone: "+251-911-000-003", email: "dawit.demo@ethiobiopharma.et" },
  ];
  for (const d of drivers) {
    await prisma.driver.create({
      data: {
        ...d,
        status: "Available",
        licenseExpiry: new Date(new Date().getFullYear() + 2, 11, 31),
      },
    });
  }
  console.log(`  ✓ Seeded ${drivers.length} drivers`);
}

async function seedRideProviders() {
  const existing = await prisma.rideProvider.count();
  if (existing > 0) {
    console.log(`  ✓ Ride providers already present (${existing}) — skipping`);
    return;
  }
  const providers = [
    { name: "Ride",    contactPhone: "+251-111-111-111", pricingNote: "Per-km metering, average ETB 15/km", isActive: true },
    { name: "ZayRide", contactPhone: "+251-222-222-222", pricingNote: "Fixed rate by zone",               isActive: true },
    { name: "Feres",   contactPhone: "+251-333-333-333", pricingNote: "Corporate account — invoice monthly", isActive: true },
  ];
  for (const p of providers) {
    await prisma.rideProvider.create({ data: p });
  }
  console.log(`  ✓ Seeded ${providers.length} ride providers`);
}

async function main() {
  console.log("Seeding fleet demo data...\n");
  await seedVehicles();
  await seedDrivers();
  await seedRideProviders();
  await ensureFleetSettingsSeeded();
  console.log("  ✓ Fleet settings seeded (8 defaults)");
  console.log("\nDone. Next steps:");
  console.log("  1. Log in as hr.manager (or a user with position 'Human Resource and Administration Manager')");
  console.log("  2. Visit /fleet/vehicles, /fleet/drivers, /fleet/rides to see the seeded records");
  console.log("  3. Visit /fleet/new to submit a test request (as any user with a supervisor assigned)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());