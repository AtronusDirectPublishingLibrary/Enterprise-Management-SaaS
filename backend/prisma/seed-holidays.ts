import { prisma } from "../src/lib/prisma";

/**
 * Ethiopian public holidays for the current and next two fiscal years.
 *
 * Liturgical dates (Fasika, Siklet, Timket, Meskel, New Year) follow the
 * Ethiopian calendar; Eid al-Fitr, Eid al-Adha and Mawlid follow lunar
 * sighting, so the published dates can shift by a day. Verify against the
 * official proclamation before relying on them for payroll.
 *
 * Dates are stored at UTC midnight so they render on the same calendar day in
 * every client timezone. “Derg Downfall Day” is intentionally not part of the
 * current public-holiday proclamation and has been removed.
 *
 *   npm run seed:holidays
 */
const HOLIDAYS: Array<{ name: string; date: string }> = [
  // 2026
  { name: "Ethiopian Christmas (Genna)", date: "2026-01-07" },
  { name: "Timket (Epiphany)", date: "2026-01-19" },
  { name: "Adwa Victory Day", date: "2026-03-02" },
  { name: "Eid al-Fitr", date: "2026-03-20" },
  { name: "Siklet (Good Friday)", date: "2026-04-10" },
  { name: "Fasika (Easter)", date: "2026-04-12" },
  { name: "International Labour Day", date: "2026-05-01" },
  { name: "Patriots' Victory Day", date: "2026-05-05" },
  { name: "Eid al-Adha (Arafa)", date: "2026-05-27" },
  { name: "Mawlid (Prophet's Birthday)", date: "2026-08-25" },
  { name: "Ethiopian New Year (Enkutatash)", date: "2026-09-11" },
  { name: "Meskel (Finding of the True Cross)", date: "2026-09-27" },

  // 2027
  { name: "Ethiopian Christmas (Genna)", date: "2027-01-07" },
  { name: "Timket (Epiphany)", date: "2027-01-19" },
  { name: "Adwa Victory Day", date: "2027-03-02" },
  { name: "Eid al-Fitr", date: "2027-03-10" },
  { name: "Siklet (Good Friday)", date: "2027-04-30" },
  { name: "International Labour Day", date: "2027-05-01" },
  { name: "Fasika (Easter)", date: "2027-05-02" },
  { name: "Patriots' Victory Day", date: "2027-05-05" },
  { name: "Eid al-Adha (Arafa)", date: "2027-05-17" },
  { name: "Mawlid (Prophet's Birthday)", date: "2027-08-15" },
  { name: "Ethiopian New Year (Enkutatash)", date: "2027-09-12" },
  { name: "Meskel (Finding of the True Cross)", date: "2027-09-28" },

  // 2028 (fixed dates confirmed; movable feasts to be confirmed)
  { name: "Ethiopian Christmas (Genna)", date: "2028-01-07" },
  { name: "Timket (Epiphany)", date: "2028-01-19" },
  { name: "Eid al-Fitr", date: "2028-02-27" },
  { name: "Adwa Victory Day", date: "2028-03-02" },
  { name: "International Labour Day", date: "2028-05-01" },
  { name: "Patriots' Victory Day", date: "2028-05-05" },
];

const KNOWN_NAMES = [
  ...new Set([
    ...HOLIDAYS.map((holiday) => holiday.name),
    // Names created by the two earlier seed runs. Removing them by name lets
    // this seed repair the duplicated, off-by-one-date catalogue.
    "Genna (Ethiopian Christmas)",
    "Ethiopian Good Friday",
    "Eid al-Adha",
    "Ethiopian New Year",
    "Derg Downfall Day",
  ]),
];

const utcDay = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  // Remove the superseded rows (and the retired Derg holiday) before adding
  // the canonical list. Custom holidays with other names are preserved.
  await prisma.publicHoliday.deleteMany({
    where: { name: { in: KNOWN_NAMES } },
  });

  let created = 0;
  for (const holiday of HOLIDAYS) {
    const date = utcDay(holiday.date);
    await prisma.publicHoliday.create({
      data: { name: holiday.name, date, year: date.getUTCFullYear() },
    });
    created += 1;
  }
  const total = await prisma.publicHoliday.count();
  console.log(`holiday catalogue rebuilt: ${created} canonical holidays, ${total} total`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
