import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { cycleForDate, DEFAULT_APPRAISAL_ITEMS, DEFAULT_INDUCTION_TASKS } from "../src/lib/hrCycles";

/**
 * Demo data for the staff self-service portal.
 *
 *   npx ts-node prisma/seed-hr-demo.ts [username]           # fill a staff member's workspace
 *   npx ts-node prisma/seed-hr-demo.ts [username] --clear   # remove it again
 *   npx ts-node prisma/seed-hr-demo.ts --create-user hrdemo # temporary login for trying the page
 *
 * The data is attached to a real user, so remove it with --clear before going live.
 */

const DAY = 86_400_000;
const fromNow = (days: number, hour = 9) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Date(date.getTime() + days * DAY);
};
const year = new Date().getFullYear();

const LEAVE_TYPES = [
  { name: "Annual Leave", code: "ANNUAL", defaultDays: 24, maxRolloverDays: 5, rolloverExpireYr: 1 },
  { name: "Sick Leave", code: "SICK", defaultDays: 14, maxRolloverDays: 0, rolloverExpireYr: 0 },
  { name: "Maternity Leave", code: "MATERNITY", defaultDays: 120, maxRolloverDays: 0, rolloverExpireYr: 0 },
  { name: "Unpaid Leave", code: "UNPAID", defaultDays: 0, maxRolloverDays: 0, rolloverExpireYr: 0 },
];

async function main() {
  const args = process.argv.slice(2);
  const clear = args.includes("--clear");
  const createUser = args.includes("--create-user");
  const username = args.find((arg) => !arg.startsWith("--")) || "admin";

  if (createUser) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      await prisma.user.create({
        data: {
          username,
          passwordHash: await bcrypt.hash("Demo12345!", 12),
          firstName: "Hirut",
          lastName: "Bekele",
          role: "staff",
          department: "Quality Assurance",
          email: `${username}@ethio-biopharma.example`,
        },
      });
      console.log(`created ${username} / Demo12345!`);
    }
    process.exit(0);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`No user called "${username}".`);
    process.exit(1);
  }

  if (clear) {
    await prisma.staffTask.deleteMany({ where: { userId: user.id } });
    await prisma.staffDocument.deleteMany({ where: { userId: user.id } });
    await prisma.training.deleteMany({ where: { userId: user.id } });
    await prisma.leaveRequest.deleteMany({ where: { userId: user.id } });
    await prisma.leaveBalance.deleteMany({ where: { userId: user.id } });
    await prisma.annualLeavePlan.deleteMany({ where: { userId: user.id } });
    await prisma.timesheet.deleteMany({ where: { userId: user.id } });
    await prisma.induction.deleteMany({ where: { userId: user.id } });
    await prisma.appraisal.deleteMany({ where: { userId: user.id } });
    await prisma.salaryRecord.deleteMany({ where: { userId: user.id } });
    const demoReport = await prisma.user.findUnique({ where: { username: "demo.staff" } });
    if (demoReport) await prisma.user.delete({ where: { id: demoReport.id } });
    const demoJobs = await prisma.jobPosting.findMany({ where: { title: "Quality Assurance Officer" } });
    for (const job of demoJobs) await prisma.jobPosting.delete({ where: { id: job.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { jobTitle: null, employeeNo: null, hireDate: null, probationEnd: null, contractEnd: null, phone: null, profession: null, requiresLicence: false, profileCompletedAt: null },
    });
    console.log(`cleared demo HR data for ${username}`);
    process.exit(0);
  }

  for (const type of LEAVE_TYPES) {
    await prisma.leaveType.upsert({ where: { code: type.code }, update: {}, create: type });
  }

  let employeeNo = user.employeeNo;
  if (!employeeNo) {
    let candidate = 142;
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.user.findFirst({ where: { employeeNo: `EBPE-0${candidate}` } })) candidate += 1;
    employeeNo = `EBPE-0${candidate}`;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      jobTitle: user.jobTitle || "Quality Assurance Officer",
      employeeNo,
      phone: user.phone || null,
      hireDate: user.hireDate || fromNow(-740),
      probationEnd: user.probationEnd || fromNow(-560),
      contractEnd: user.contractEnd || fromNow(120),
    },
  });

  await prisma.staffTask.deleteMany({ where: { userId: user.id } });
  await prisma.staffDocument.deleteMany({ where: { userId: user.id } });
  await prisma.training.deleteMany({ where: { userId: user.id } });
  await prisma.leaveRequest.deleteMany({ where: { userId: user.id } });
  await prisma.leaveBalance.deleteMany({ where: { userId: user.id } });

  await prisma.training.createMany({
    data: [
      { userId: user.id, title: "GMP Foundations", provider: "Ethiopian Food and Drug Authority", completedAt: fromNow(-540), expiresAt: fromNow(-12) },
      { userId: user.id, title: "Good Documentation Practice", provider: "EBPE Quality Unit", completedAt: fromNow(-345), expiresAt: fromNow(20) },
      { userId: user.id, title: "Biosafety Level 2", provider: "Armauer Hansen Research Institute", completedAt: fromNow(-120), expiresAt: fromNow(245) },
      { userId: user.id, title: "Data Integrity for GxP", provider: "WHO Academy", completedAt: fromNow(-60), expiresAt: null },
    ],
  });

  await prisma.staffDocument.createMany({
    data: [
      { userId: user.id, title: "Site access permit", category: "OTHER", reference: "EBPE/SEC/2026/08", issuedAt: fromNow(-470), expiresAt: fromNow(-8) },
      { userId: user.id, title: "National ID", category: "ID", reference: "3912 4488 0021", issuedAt: fromNow(-2200), expiresAt: fromNow(45) },
      { userId: user.id, title: "Employment contract", category: "CONTRACT", reference: "EBPE/HR/2024/142", issuedAt: fromNow(-740), expiresAt: fromNow(120) },
      { userId: user.id, title: "Occupational health certificate", category: "MEDICAL", issuedAt: fromNow(-200), expiresAt: fromNow(300) },
    ],
  });

  const openTasks = [
    { title: "Send the signed GMP training certificate to HR", priority: "HIGH", dueAt: fromNow(-3) },
    { title: "Review the deviation report before the QA meeting", priority: "NORMAL", dueAt: fromNow(0) },
    { title: "Book the annual medical check-up", priority: "NORMAL", dueAt: fromNow(4) },
    { title: "Confirm 2027 leave dates with the supervisor", priority: "LOW", dueAt: fromNow(18) },
    { title: "Renew the site access badge", priority: "NORMAL", dueAt: null },
  ];
  await prisma.staffTask.createMany({
    data: [
      ...openTasks.map((task) => ({ userId: user.id, ...task })),
      { userId: user.id, title: "Complete data-integrity e-learning", priority: "NORMAL", dueAt: fromNow(-25), status: "DONE", completedAt: fromNow(-24) },
    ],
  });

  await prisma.leaveBalance.createMany({
    data: [
      { userId: user.id, year, leaveType: "ANNUAL", entitledDays: 24, usedDays: 7, rolloverDays: 3 },
      { userId: user.id, year, leaveType: "SICK", entitledDays: 14, usedDays: 2, rolloverDays: 0 },
    ],
  });

  const plan = await prisma.annualLeavePlan.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: {},
    create: { userId: user.id, year, status: "DRAFT" },
  });
  await prisma.annualLeavePlanItem.deleteMany({ where: { planId: plan.id } });
  await prisma.annualLeavePlanItem.createMany({
    data: [
      { planId: plan.id, startDate: fromNow(40), endDate: fromNow(54), days: 10, leaveType: "ANNUAL", notes: "Family visit" },
      { planId: plan.id, startDate: fromNow(180), endDate: fromNow(186), days: 5, leaveType: "ANNUAL", notes: "" },
    ],
  });

  await prisma.leaveRequest.createMany({
    data: [
      { userId: user.id, type: "ANNUAL", startDate: fromNow(21), endDate: fromNow(25), status: "PENDING", reason: "Family event" },
      { userId: user.id, type: "SICK", startDate: fromNow(-30), endDate: fromNow(-29), status: "APPROVED", reason: "Flu" },
    ],
  });

  await prisma.timesheet.upsert({
    where: { userId_month_year: { userId: user.id, month: new Date().getMonth() + 1, year } },
    update: {},
    create: {
      userId: user.id,
      month: new Date().getMonth() + 1,
      year,
      status: "DRAFT",
      entries: {
        create: Array.from({ length: 5 }, (_, index) => ({
          date: new Date(year, new Date().getMonth(), index + 1),
          hours: 8,
          projectName: "QA operations",
        })),
      },
    },
  });

  await prisma.timesheetSetting.upsert({
    where: { id: (await prisma.timesheetSetting.findFirst())?.id || "default" },
    update: {},
    create: { id: "default", submissionDay: 25 },
  }).catch(() => undefined);

  const nextOccurrence = (month: number, day: number) => {
    const now = new Date();
    const candidate = new Date(now.getFullYear(), month - 1, day);
    return candidate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
      ? candidate
      : new Date(now.getFullYear() + 1, month - 1, day);
  };
  const holidays = [
    { name: "Ethiopian Christmas (Genna)", date: nextOccurrence(1, 7), year: nextOccurrence(1, 7).getFullYear() },
    { name: "Adwa Victory Day", date: nextOccurrence(3, 2), year: nextOccurrence(3, 2).getFullYear() },
    { name: "International Labour Day", date: nextOccurrence(5, 1), year: nextOccurrence(5, 1).getFullYear() },
  ];
  for (const holiday of holidays) {
    await prisma.publicHoliday.upsert({
      where: { date: new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate()) },
      update: {},
      create: { name: holiday.name, date: new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate()), year },
    });
  }

  // --- Induction, appraisal, payslip ------------------------------------
  const appCycle = cycleForDate();
  await prisma.induction.deleteMany({ where: { userId: user.id } });
  await prisma.induction.create({
    data: {
      userId: user.id,
      startDate: fromNow(-20),
      status: "ACTIVE",
      tasks: {
        create: DEFAULT_INDUCTION_TASKS.map((task, index) => ({
          title: task.title,
          category: task.category,
          dueAt: new Date(fromNow(-20).getTime() + task.offsetDays * DAY),
          sortOrder: index,
          completedAt: index < 3 ? fromNow(-18 + index) : null,
        })),
      },
    },
  });

  await prisma.appraisal.upsert({
    where: { userId_cycle: { userId: user.id, cycle: appCycle.cycle } },
    update: {},
    create: {
      userId: user.id,
      cycle: appCycle.cycle,
      periodLabel: appCycle.periodLabel,
      periodStart: appCycle.periodStart,
      periodEnd: appCycle.periodEnd,
      status: "DRAFT",
      items: {
        create: DEFAULT_APPRAISAL_ITEMS.map((title, index) => ({ title, weight: 20, sortOrder: index })),
      },
    },
  });

  await prisma.salaryRecord.createMany({
    data: [
      { userId: user.id, baseSalary: 42000, allowance: 3500, currency: "ETB", effectiveAt: fromNow(-370) },
      { userId: user.id, baseSalary: 46500, allowance: 4000, currency: "ETB", effectiveAt: fromNow(-35), notes: "Annual review" },
    ],
  });

  // --- A vacancy with a live pipeline, for the Careers + Recruitment demo --
  const existingJob = await prisma.jobPosting.findFirst({ where: { title: "Quality Assurance Officer" } });
  if (!existingJob) {
    const job = await prisma.jobPosting.create({
      data: {
        title: "Quality Assurance Officer",
        department: "Quality Assurance",
        summary: "Own batch documentation, deviations and the internal audit programme at the Kilinto campus.",
        description:
          "You will safeguard GMP compliance across vaccine and pharmaceutical production: reviewing batch records, running the deviation and CAPA system, preparing for EFDA and WHO inspections, and coaching production teams on documentation practice.",
        requirements:
          "BSc in pharmacy, chemistry, biology or a related field. 3+ years in a GMP manufacturing environment. Working knowledge of WHO prequalification and data-integrity expectations. Strong written English and Amharic.",
        responsibilities:
          "Batch record review and release support; deviation, CAPA and change control; internal audit schedule; supplier qualification support; inspection readiness.",
        location: "Kilinto, Addis Ababa",
        employmentType: "FULL_TIME",
        openings: 2,
        status: "OPEN",
        publishedAt: fromNow(-9),
        closesAt: fromNow(21),
        targetHire: fromNow(60),
        applicants: {
          create: [
            { name: "Selam Girma", email: "selam.girma@example.com", stage: "INTERVIEW", rating: 4, interviewAt: fromNow(3), source: "WEBSITE" },
            { name: "Yohannes Tadesse", email: "yohannes.t@example.com", stage: "SCREENING", rating: 3, source: "WEBSITE" },
            { name: "Mariam Hassen", email: "mariam.h@example.com", stage: "OFFER", rating: 5, source: "REFERRAL" },
            { name: "Dawit Alemu", email: "dawit.alemu@example.com", stage: "APPLIED", source: "WEBSITE" },
          ],
        },
      },
    });
    console.log(`seeded vacancy ${job.id}`);
  }

  // --- One direct report so the supervisor view has content ---------------
  const existingReport = await prisma.user.findUnique({ where: { username: "demo.staff" } });
  const report =
    existingReport ||
    (await prisma.user.create({
      data: {
        username: "demo.staff",
        passwordHash: await bcrypt.hash("Welcome123!", 12),
        firstName: "Tsion",
        lastName: "Mekonnen",
        role: "staff",
        department: "Quality Assurance",
        jobTitle: "QA Analyst",
        email: "demo.staff@ethio-biopharma.example",
        immediateSupervisorId: user.id,
        hireDate: fromNow(-420),
        profession: "QC_ANALYST",
      },
    }));

  await prisma.training.deleteMany({ where: { userId: report.id } });
  await prisma.training.create({
    data: {
      userId: report.id,
      title: "Data Integrity for GxP",
      provider: "WHO Academy",
      completedAt: fromNow(-390),
      expiresAt: fromNow(-6),
    },
  });
  await prisma.leaveRequest.create({
    data: {
      userId: report.id,
      type: "ANNUAL",
      startDate: fromNow(9),
      endDate: fromNow(12),
      status: "PENDING",
      reason: "Family wedding",
      supervisorId: user.id,
    },
  });

  console.log(`seeded demo HR data for ${username} (${user.id})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
