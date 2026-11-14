/**
 * Full HR Suite demonstration data.
 *
 *   npm run seed:hr-suite
 *
 * Creates one hypothetical staff member for each real position, then fills
 * every HR module — leave, balances, training, holidays, recruitment,
 * induction, appraisals, timesheets, documents, tasks and payroll/payslips —
 * so every screen has realistic data to demonstrate before go-live.
 * Idempotent: re-running updates the same records instead of duplicating them.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { calculatePayroll } from "../src/lib/payroll";
import { POSITION_ACCESS } from "../src/lib/access";
import { cycleForDate, DEFAULT_APPRAISAL_ITEMS, DEFAULT_INDUCTION_TASKS } from "../src/lib/hrCycles";

const PASSWORD = "Demo12345!";
const DAY = 86_400_000;
const at = (days: number, hour = 9) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Date(date.getTime() + days * DAY);
};
const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;
const previousMonth = month === 1 ? 12 : month - 1;
const previousYear = month === 1 ? year - 1 : year;

const PEOPLE = [
  {
    username: "ceo",
    firstName: "Dr. Markos",
    lastName: "Abebe",
    position: "Chief Executive Officer",
    role: "executive",
    department: "Office of the CEO",
    salary: 145000,
    allowance: 35000,
    reportsTo: null,
    profession: "Executive leadership",
    hiredDaysAgo: 1600,
  },
  {
    username: "board.secretary",
    firstName: "Tewodros",
    lastName: "Alemu",
    position: "Board Secretary",
    role: "viewer",
    department: "Board & Governance",
    salary: 78000,
    allowance: 15000,
    reportsTo: "ceo",
    profession: "Corporate governance",
    hiredDaysAgo: 1100,
  },
  {
    username: "audit.officer",
    firstName: "Mahlet",
    lastName: "Assefa",
    position: "Internal Audit Officer",
    role: "viewer",
    department: "Internal Audit",
    salary: 72000,
    allowance: 12000,
    reportsTo: "ceo",
    profession: "Internal audit",
    hiredDaysAgo: 840,
  },
  {
    username: "qa.officer",
    firstName: "Hirut",
    lastName: "Bekele",
    position: "QA and regulatory Affairs Officer",
    role: "project_manager",
    department: "Quality & Regulatory Affairs",
    salary: 68000,
    allowance: 10000,
    reportsTo: "operations.manager",
    profession: "Pharmaceutical quality assurance",
    requiresLicence: true,
    hiredDaysAgo: 620,
  },
  {
    username: "strategy.officer",
    firstName: "Dessalew",
    lastName: "Adane",
    position: "Strategy and Planning Officer",
    role: "project_manager",
    department: "Strategy & Planning",
    salary: 76000,
    allowance: 12000,
    reportsTo: "ceo",
    profession: "Strategy and corporate planning",
    hiredDaysAgo: 700,
  },
  {
    username: "legal.counsel",
    firstName: "Rahel",
    lastName: "Tesfaye",
    position: "Legal Counsel",
    role: "viewer",
    department: "Legal Services",
    salary: 82000,
    allowance: 14000,
    reportsTo: "ceo",
    profession: "Corporate and regulatory law",
    hiredDaysAgo: 950,
  },
  {
    username: "operations.manager",
    firstName: "Yonas",
    lastName: "Kebede",
    position: "Operation Manager",
    role: "project_manager",
    department: "Operations",
    salary: 92000,
    allowance: 18000,
    reportsTo: "ceo",
    profession: "Pharmaceutical operations",
    hiredDaysAgo: 1250,
  },
  {
    username: "engineer",
    firstName: "Bereket",
    lastName: "Haile",
    position: "Engineer",
    role: "viewer",
    department: "Engineering",
    salary: 64000,
    allowance: 9000,
    reportsTo: "operations.manager",
    profession: "Mechanical engineering",
    requiresLicence: true,
    hiredDaysAgo: 410,
  },
  {
    username: "it.officer",
    firstName: "Nahom",
    lastName: "Sisay",
    position: "IT Officer",
    role: "viewer",
    department: "ICT",
    salary: 58000,
    allowance: 8000,
    reportsTo: "operations.manager",
    profession: "Information technology",
    hiredDaysAgo: 520,
  },
  {
    username: "hr.manager",
    firstName: "Tegest",
    lastName: "Aschalew",
    position: "Human Resource and Administration Manager",
    role: "executive",
    department: "Human Resource & Administration",
    salary: 88000,
    allowance: 17000,
    reportsTo: "ceo",
    profession: "Human resource management",
    hiredDaysAgo: 1380,
  },
  {
    username: "property.officer",
    firstName: "Kalkidan",
    lastName: "Abera",
    position: "Property Management Officer",
    role: "viewer",
    department: "Property Management",
    salary: 52000,
    allowance: 7000,
    reportsTo: "operations.manager",
    profession: "Facilities and property management",
    hiredDaysAgo: 330,
  },
  {
    username: "procurement.officer",
    firstName: "Samuel",
    lastName: "Getachew",
    position: "Procurement Officer",
    role: "viewer",
    department: "Procurement",
    salary: 55000,
    allowance: 7500,
    reportsTo: "finance.manager",
    profession: "Procurement and supply chain",
    hiredDaysAgo: 470,
  },
  {
    username: "finance.manager",
    firstName: "Meseret",
    lastName: "Desta",
    position: "Finance Manager",
    role: "executive",
    department: "Finance",
    salary: 95000,
    allowance: 19000,
    reportsTo: "ceo",
    profession: "Finance and accounting",
    hiredDaysAgo: 1300,
  },
  {
    username: "finance.officer",
    firstName: "Abel",
    lastName: "Tadesse",
    position: "Finance Officer",
    role: "staff",
    department: "Finance",
    salary: 48000,
    allowance: 6500,
    reportsTo: "finance.manager",
    profession: "Accounting",
    hiredDaysAgo: 280,
  },
];

const HOLIDAYS = [
  { name: "Ethiopian New Year", month: 9, day: 11 },
  { name: "Meskel (Finding of the True Cross)", month: 9, day: 27 },
  { name: "Genna (Ethiopian Christmas)", month: 1, day: 7 },
  { name: "Timket (Epiphany)", month: 1, day: 19 },
  { name: "Adwa Victory Day", month: 3, day: 2 },
  { name: "International Labour Day", month: 5, day: 1 },
  { name: "Patriots' Victory Day", month: 5, day: 5 },
  { name: "Ethiopian Good Friday", month: 4, day: 10 },
  { name: "Eid al-Fitr", month: 3, day: 30 },
  { name: "Eid al-Adha", month: 6, day: 6 },
];

async function main() {
  console.log("Seeding HR Suite demo data…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // 1. One hypothetical person per position.
  const users: Record<string, { id: string; username: string; firstName: string | null; lastName: string | null }> = {};
  let counter = 1001;
  for (const person of PEOPLE) {
    const hireDate = at(-person.hiredDaysAgo);
    const user = await prisma.user.upsert({
      where: { username: person.username },
      update: {
        firstName: person.firstName,
        lastName: person.lastName,
        role: person.role,
        position: person.position,
        department: person.department,
        jobTitle: person.position,
        profession: person.profession,
        requiresLicence: Boolean(person.requiresLicence),
        email: `${person.username}@ethio-biopharma.example`,
        phone: `+251911${String(counter).slice(-6)}`,
        hireDate,
        contractEnd: at(365),
        profileCompletedAt: hireDate,
      },
      create: {
        tenantId: "tenant_default_ethio_biopharma",
        username: person.username,
        passwordHash,
        firstName: person.firstName,
        lastName: person.lastName,
        role: person.role,
        position: person.position,
        department: person.department,
        jobTitle: person.position,
        profession: person.profession,
        requiresLicence: Boolean(person.requiresLicence),
        email: `${person.username}@ethio-biopharma.example`,
        phone: `+251911${String(counter).slice(-6)}`,
        employeeNo: `EBPE-${counter}`,
        hireDate,
        probationEnd: new Date(hireDate.getTime() + 90 * DAY),
        contractEnd: at(365),
        profileCompletedAt: hireDate,
        forceChange: false,
      } as any,
    });
    users[person.username] = user;
    counter += 1;
  }

  // 2. Reporting lines.
  for (const person of PEOPLE) {
    if (!person.reportsTo) continue;
    await prisma.user.update({
      where: { id: users[person.username].id },
      data: { immediateSupervisorId: users[person.reportsTo]?.id || null },
    });
  }

  // 3. Position list available to every dropdown.
  for (const position of Object.keys(POSITION_ACCESS)) {
    await prisma.dropdownOption.upsert({
      where: { category_value: { category: "POSITION", value: position } },
      create: { category: "POSITION", value: position },
      update: {},
    });
  }

  // 4. Salary records and last month's payslips.
  for (const person of PEOPLE) {
    const user = users[person.username];
    const existing = await prisma.salaryRecord.findFirst({ where: { userId: user.id, notes: "Demo salary" } });
    if (!existing) {
      await prisma.salaryRecord.create({
        data: {
          userId: user.id,
          baseSalary: person.salary,
          allowance: person.allowance,
          currency: "ETB",
          effectiveAt: at(-400),
          notes: "Demo salary",
        },
      });
    }
    const calc = calculatePayroll(person.salary, person.allowance);
    await prisma.payslip.upsert({
      where: { userId_year_month: { userId: user.id, year: previousYear, month: previousMonth } },
      create: {
        userId: user.id,
        year: previousYear,
        month: previousMonth,
        baseSalary: calc.baseSalary,
        allowance: calc.allowance,
        gross: calc.gross,
        pension: calc.pension,
        tax: calc.tax,
        otherDeductions: 0,
        net: calc.net,
        currency: "ETB",
        status: "Generated",
      },
      update: {
        baseSalary: calc.baseSalary,
        allowance: calc.allowance,
        gross: calc.gross,
        pension: calc.pension,
        tax: calc.tax,
        net: calc.net,
      },
    });
  }

  // 5. Leave catalogue, balances and requests.
  const leaveTypes = [
    { name: "Annual Leave", code: "ANNUAL", defaultDays: 24, maxRolloverDays: 5, rolloverExpireYr: 1 },
    { name: "Sick Leave", code: "SICK", defaultDays: 14, maxRolloverDays: 0, rolloverExpireYr: 0 },
    { name: "Maternity Leave", code: "MATERNITY", defaultDays: 120, maxRolloverDays: 0, rolloverExpireYr: 0 },
    { name: "Paternity Leave", code: "PATERNITY", defaultDays: 10, maxRolloverDays: 0, rolloverExpireYr: 0 },
    { name: "Unpaid Leave", code: "UNPAID", defaultDays: 0, maxRolloverDays: 0, rolloverExpireYr: 0 },
  ];
  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: leaveType.code },
      create: { ...leaveType, isActive: true },
      update: { name: leaveType.name, defaultDays: leaveType.defaultDays, maxRolloverDays: leaveType.maxRolloverDays, isActive: true },
    });
  }
  for (const [index, person] of PEOPLE.entries()) {
    await prisma.leaveBalance.upsert({
      where: { userId_year_leaveType: { userId: users[person.username].id, year, leaveType: "ANNUAL" } },
      create: {
        userId: users[person.username].id,
        year,
        leaveType: "ANNUAL",
        entitledDays: 24,
        rolloverDays: index % 3 === 0 ? 4 : 0,
        usedDays: [0, 3, 5, 8, 2][index % 5],
      },
      update: {},
    });
  }

  const leaveRequests = [
    { user: "qa.officer", type: "ANNUAL", start: at(12), end: at(16), status: "PENDING", reason: "Demo: family visit" },
    { user: "engineer", type: "SICK", start: at(-2), end: at(1), status: "PENDING", reason: "Demo: medical leave" },
    { user: "finance.officer", type: "ANNUAL", start: at(35), end: at(39), status: "APPROVED", reason: "Demo: annual leave" },
    { user: "procurement.officer", type: "UNPAID", start: at(-20), end: at(-15), status: "REJECTED", reason: "Demo: personal travel" },
  ];
  for (const request of leaveRequests) {
    const user = users[request.user];
    const existing = await prisma.leaveRequest.findFirst({ where: { userId: user.id, reason: request.reason } });
    const supervisor = PEOPLE.find((person) => person.username === request.user)?.reportsTo;
    if (!existing) {
      await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          type: request.type,
          startDate: request.start,
          endDate: request.end,
          status: request.status,
          reason: request.reason,
          supervisorId: supervisor ? users[supervisor].id : null,
          approvedById: request.status === "APPROVED" && supervisor ? users[supervisor].id : null,
          rejectionReason: request.status === "REJECTED" ? "Operational coverage could not be arranged." : null,
        },
      });
    }
  }

  // 6. Training with a mix of valid, expiring and expired certificates.
  const training = [
    { user: "qa.officer", title: "GMP for sterile manufacturing", provider: "EFDA Academy", completed: at(-300), expires: at(65) },
    { user: "qa.officer", title: "ISO 13485 internal auditor", provider: "TÜV SÜD", completed: at(-500), expires: at(-30) },
    { user: "engineer", title: "Cleanroom HVAC validation", provider: "ASHRAE Ethiopia", completed: at(-180), expires: at(180) },
    { user: "operations.manager", title: "Lean manufacturing in pharma", provider: "PharmaTech Institute", completed: at(-420), expires: at(300) },
    { user: "it.officer", title: "Data integrity and 21 CFR Part 11", provider: "ISPE", completed: at(-120), expires: at(240) },
    { user: "finance.officer", title: "IFRS for public enterprises", provider: "EBPE Finance Academy", completed: at(-90), expires: null },
  ];
  for (const record of training) {
    const user = users[record.user];
    const existing = await prisma.training.findFirst({ where: { userId: user.id, title: record.title } });
    if (!existing) {
      await prisma.training.create({
        data: {
          userId: user.id,
          title: record.title,
          provider: record.provider,
          completedAt: record.completed,
          expiresAt: record.expires,
        },
      });
    }
  }

  // 7. Public holidays for this and next year.
  for (const targetYear of [year, year + 1]) {
    for (const holiday of HOLIDAYS) {
      const date = new Date(Date.UTC(targetYear, holiday.month - 1, holiday.day));
      await prisma.publicHoliday.upsert({
        where: { date },
        create: { name: holiday.name, date, year: targetYear },
        update: { name: holiday.name, year: targetYear },
      });
    }
  }

  // 8. Timesheet deadline.
  const settings = await prisma.timesheetSetting.findFirst();
  if (!settings) await prisma.timesheetSetting.create({ data: { submissionDay: 25 } });

  // 9. Timesheets for current and previous month.
  const timesheetUsers = [
    { user: "engineer", project: "ShieldVax Fill-Finish Line Qualification", status: "SUBMITTED", entries: 5 },
    { user: "qa.officer", project: "Regulatory Dossier & ISO 13485 Readiness", status: "DRAFT", entries: 4 },
    { user: "it.officer", project: "National Cold-Chain & QC Laboratory Digitalisation", status: "APPROVED", entries: 5 },
  ];
  for (const record of timesheetUsers) {
    const user = users[record.user];
    for (const [targetYear, targetMonth] of [[year, month], [previousYear, previousMonth]] as const) {
      const timesheet = await prisma.timesheet.upsert({
        where: { userId_month_year: { userId: user.id, month: targetMonth, year: targetYear } },
        create: {
          userId: user.id,
          month: targetMonth,
          year: targetYear,
          status: targetYear === previousYear ? "APPROVED" : record.status,
          supervisorId: users[PEOPLE.find((p) => p.username === record.user)?.reportsTo || "ceo"]?.id || null,
          submittedAt: at(-12),
          approvedAt: targetYear === previousYear ? at(-8) : null,
        },
        update: {},
      });
      const existingEntries = await prisma.timesheetEntry.count({ where: { timesheetId: timesheet.id } });
      if (!existingEntries) {
        for (let index = 0; index < record.entries; index += 1) {
          await prisma.timesheetEntry.create({
            data: {
              timesheetId: timesheet.id,
              date: new Date(Date.UTC(targetYear, targetMonth - 1, index + 1)),
              hours: 8,
              projectName: record.project,
              description: ["Site supervision", "Validation protocol review", "Vendor coordination", "Documentation", "Team meeting"][index % 5],
            },
          });
        }
      }
    }
  }

  // 10. Staff tasks, documents, induction and appraisals.
  const tasks = [
    { user: "qa.officer", title: "Close out deviation DEV-2026-014", priority: "HIGH", due: at(4), status: "OPEN" },
    { user: "qa.officer", title: "Update site master file", priority: "NORMAL", due: at(12), status: "OPEN" },
    { user: "engineer", title: "Upload HVAC commissioning report", priority: "HIGH", due: at(-1), status: "OPEN" },
    { user: "hr.manager", title: "Confirm October leave plan", priority: "NORMAL", due: at(3), status: "OPEN" },
    { user: "finance.officer", title: "Prepare pension schedule", priority: "HIGH", due: at(2), status: "OPEN" },
    { user: "it.officer", title: "Rotate backup credentials", priority: "NORMAL", due: at(-3), status: "DONE" },
  ];
  for (const task of tasks) {
    const user = users[task.user];
    const existing = await prisma.staffTask.findFirst({ where: { userId: user.id, title: task.title } });
    if (!existing) {
      await prisma.staffTask.create({
        data: {
          userId: user.id,
          title: task.title,
          priority: task.priority,
          dueAt: task.due,
          status: task.status,
          completedAt: task.status === "DONE" ? at(-2) : null,
        },
      });
    }
  }

  const documents = [
    { user: "qa.officer", title: "EFDA professional licence", category: "LICENCE", expires: at(40) },
    { user: "engineer", title: "Engineering practising certificate", category: "LICENCE", expires: at(-10) },
    { user: "finance.officer", title: "Employment contract", category: "CONTRACT", expires: at(365) },
    { user: "it.officer", title: "Information security acknowledgement", category: "OTHER", expires: null },
  ];
  for (const document of documents) {
    const user = users[document.user];
    const existing = await prisma.staffDocument.findFirst({ where: { userId: user.id, title: document.title } });
    if (!existing) {
      await prisma.staffDocument.create({
        data: {
          userId: user.id,
          title: document.title,
          category: document.category,
          issuedAt: at(-300),
          expiresAt: document.expires,
          signatureName: `${user.firstName} ${user.lastName}`,
          signedAt: at(-300),
        },
      });
    }
  }

  for (const username of ["engineer", "finance.officer", "property.officer"]) {
    const user = users[username];
    const existing = await prisma.induction.findFirst({ where: { userId: user.id } });
    if (!existing) {
      const induction = await prisma.induction.create({
        data: {
          userId: user.id,
          startDate: at(-20),
          status: username === "engineer" ? "ACTIVE" : "COMPLETED",
          completedAt: username === "engineer" ? null : at(-10),
        },
      });
      await prisma.inductionTask.createMany({
        data: DEFAULT_INDUCTION_TASKS.map((task, index) => ({
          inductionId: induction.id,
          title: task.title,
          category: task.category,
          dueAt: at(-20 + task.offsetDays),
          completedAt: index < (username === "engineer" ? 4 : DEFAULT_INDUCTION_TASKS.length) ? at(-18 + index) : null,
          sortOrder: index,
        })),
      });
    }
  }

  const cycle = cycleForDate();
  const appraisalUsers = ["qa.officer", "engineer", "finance.officer", "it.officer", "procurement.officer"];
  for (const [index, username] of appraisalUsers.entries()) {
    const user = users[username];
    const status = ["COMPLETED", "MANAGER_REVIEWED", "SELF_SUBMITTED", "DRAFT", "COMPLETED"][index];
    await prisma.appraisal.upsert({
      where: { userId_cycle: { userId: user.id, cycle: cycle.cycle } },
      create: {
        userId: user.id,
        cycle: cycle.cycle,
        periodLabel: cycle.periodLabel,
        periodStart: cycle.periodStart,
        periodEnd: cycle.periodEnd,
        status,
        selfSummary: status === "DRAFT" ? null : "Delivered the assigned workstreams and closed the priority compliance actions for the period.",
        managerSummary: status === "COMPLETED" ? "Consistent delivery with strong ownership of quality records. Ready for expanded responsibility." : null,
        selfRating: status === "DRAFT" ? null : 3.8,
        managerRating: status === "COMPLETED" ? 4.1 : null,
        submittedAt: status === "DRAFT" ? null : at(-14),
        reviewedAt: status === "COMPLETED" ? at(-7) : null,
        items: {
          create: DEFAULT_APPRAISAL_ITEMS.map((title, itemIndex) => ({
            title,
            weight: 20,
            selfScore: status === "DRAFT" ? null : [4, 3.5, 4, 3.8, 4][itemIndex],
            managerScore: status === "COMPLETED" ? [4, 4, 4.2, 4, 4.2][itemIndex] : null,
            sortOrder: itemIndex,
          })),
        },
      },
      update: {},
    });
  }

  // 11. Annual leave plans.
  for (const [index, username] of ["qa.officer", "finance.officer"].entries()) {
    const user = users[username];
    const plan = await prisma.annualLeavePlan.upsert({
      where: { userId_year: { userId: user.id, year } },
      create: {
        userId: user.id,
        year,
        status: index === 0 ? "SUBMITTED" : "APPROVED",
        submittedAt: at(-30),
        supervisorId: users[PEOPLE.find((p) => p.username === username)?.reportsTo || "ceo"]?.id || null,
        approvedAt: index === 1 ? at(-25) : null,
      },
      update: {},
    });
    const existingItems = await prisma.annualLeavePlanItem.count({ where: { planId: plan.id } });
    if (!existingItems) {
      await prisma.annualLeavePlanItem.createMany({
        data: [
          { planId: plan.id, startDate: at(45), endDate: at(54), days: 8, leaveType: "ANNUAL", notes: "Planned family holiday" },
          { planId: plan.id, startDate: at(120), endDate: at(124), days: 5, leaveType: "ANNUAL", notes: "Mid-year break" },
        ],
      });
    }
  }

  // 12. Recruitment pipeline.
  const jobs = [
    {
      title: "Validation Engineer",
      department: "Engineering",
      summary: "Lead qualification of fill-finish equipment and cleanroom utilities.",
      status: "OPEN",
      applicants: [
        { name: "Liya Fikru", email: "liya.fikru@example.com", stage: "INTERVIEW", rating: 4 },
        { name: "Henok Terefe", email: "henok.terefe@example.com", stage: "SCREENING", rating: 3 },
      ],
    },
    {
      title: "Regulatory Affairs Specialist",
      department: "Quality & Regulatory Affairs",
      summary: "Prepare and maintain dossiers for national and regional filings.",
      status: "OPEN",
      applicants: [
        { name: "Saron Getu", email: "saron.getu@example.com", stage: "OFFER", rating: 5 },
        { name: "Mikias Lema", email: "mikias.lema@example.com", stage: "APPLIED", rating: null },
      ],
    },
    {
      title: "Finance Analyst",
      department: "Finance",
      summary: "Management reporting, budgeting and payroll reconciliation.",
      status: "DRAFT",
      applicants: [],
    },
  ];
  for (const job of jobs) {
    let posting = await prisma.jobPosting.findFirst({ where: { title: job.title } });
    if (!posting) {
      posting = await prisma.jobPosting.create({
        data: {
          title: job.title,
          department: job.department,
          summary: job.summary,
          description: "Demo posting created by the HR Suite seed.",
          requirements: "Relevant degree and 3+ years in a regulated manufacturing environment.",
          responsibilities: "Deliver the assigned workstream, maintain GMP documentation and report progress monthly.",
          status: job.status,
          closesAt: at(30),
          publishedAt: job.status === "OPEN" ? at(-10) : null,
        },
      });
    }
    for (const applicant of job.applicants) {
      const existing = await prisma.applicant.findFirst({ where: { jobId: posting.id, email: applicant.email } });
      if (!existing) {
        await prisma.applicant.create({
          data: {
            jobId: posting.id,
            name: applicant.name,
            email: applicant.email,
            phone: "+251911123456",
            source: "Website",
            stage: applicant.stage,
            rating: applicant.rating ?? undefined,
            interviewAt: applicant.stage === "INTERVIEW" ? at(5) : null,
          },
        });
      }
    }
  }

  console.log("HR Suite demo data ready.");
  console.log(`  Sign in with any demo user and password ${PASSWORD}`);
  console.log("  Users: " + PEOPLE.map((person) => person.username).join(", "));
  console.log("  Positions: " + PEOPLE.map((person) => person.position).join(" · "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
