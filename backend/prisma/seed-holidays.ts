import { prisma } from "../src/lib/prisma";

/**
 * Ethiopian public holidays for the current and next two fiscal years.
 *
 * Liturgical dates (Fasika, Siklet, Timket, Meskel, New Year) follow the
 * Ethiopian calendar; Eid al-Fitr, Eid al-Adha and Mawlid follow lunar
 * sighting, so the published dates can shift by a day. Verify against the
 * official proclamation before relying on them for payroll.
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
  { name: "Derg Downfall Day", date: "2026-05-28" },
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
  { name: "Derg Downfall Day", date: "2027-05-28" },
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

async function main() {
  let created = 0;
  for (const holiday of HOLIDAYS) {
    const date = new Date(`${holiday.date}T00:00:00`);
    const existing = await prisma.publicHoliday.findUnique({ where: { date } });
    if (existing) {
      await prisma.publicHoliday.update({ where: { date }, data: { name: holiday.name, year: date.getFullYear() } });
      continue;
    }
    await prisma.publicHoliday.create({
      data: { name: holiday.name, date, year: date.getFullYear() },
    });
    created += 1;
  }
  const total = await prisma.publicHoliday.count();
  console.log(`holiday catalogue: ${created} added, ${total} total`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
