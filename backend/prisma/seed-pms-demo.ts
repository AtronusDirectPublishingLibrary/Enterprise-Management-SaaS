/**
 * Demonstrable Project Management System (PMS) data.
 *
 *   npm run seed:pms-demo
 *
 * Four hypothetical projects with real-shaped work packages, milestones,
 * activities, members, goals, briefs, announcements, comments and timesheets.
 * The staff accounts mirror the HR Suite positions so every role-based view can
 * be demonstrated before real project data replaces this seed.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const PASSWORD = "Demo12345!";
const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY);

const STAFF = [
  { username: "operations.manager", first: "Yonas", last: "Kebede", position: "Operation Manager", role: "project_manager" },
  { username: "qa.officer", first: "Hirut", last: "Bekele", position: "QA and regulatory Affairs Officer", role: "project_manager" },
  { username: "engineer", first: "Bereket", last: "Haile", position: "Engineer", role: "viewer" },
  { username: "it.officer", first: "Nahom", last: "Sisay", position: "IT Officer", role: "viewer" },
  { username: "procurement.officer", first: "Samuel", last: "Getachew", position: "Procurement Officer", role: "viewer" },
  { username: "finance.officer", first: "Abel", last: "Tadesse", position: "Finance Officer", role: "staff" },
  { username: "property.officer", first: "Kalkidan", last: "Abera", position: "Property Management Officer", role: "viewer" },
  { username: "legal.counsel", first: "Rahel", last: "Tesfaye", position: "Legal Counsel", role: "viewer" },
  { username: "strategy.officer", first: "Dessalew", last: "Adane", position: "Strategy and Planning Officer", role: "project_manager" },
  { username: "hr.manager", first: "Tegest", last: "Aschalew", position: "Human Resource and Administration Manager", role: "executive" },
  { username: "finance.manager", first: "Meseret", last: "Desta", position: "Finance Manager", role: "executive" },
  { username: "board.secretary", first: "Tewodros", last: "Alemu", position: "Board Secretary", role: "viewer" },
  { username: "ceo", first: "Dr. Markos", last: "Abebe", position: "Chief Executive Officer", role: "executive" },
];

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const PERIOD = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

/**
 * Assign named owners to selected plan items and capture their progress
 * narratives, so the consolidated annual / strategic / roadmap reports have
 * real task-owner content from day one.
 */
const PLAN_UPDATES = [
  {
    type: "AOP",
    match: "Construct Fill and Finish Block",
    user: "operations.manager",
    progress: 64,
    status: "In Progress",
    summary: "Substructure and superstructure are complete; RC works continue on the upper utility deck.",
    achievements: "Fill-finish block substructure completed and signed off by QA.\nContractor mobilisation finished ahead of schedule.",
    challenges: "Reinforcement steel delivery slipped by two weeks, affecting the RC pour sequence.",
    nextSteps: "Complete the utility deck by next month and release the cleanroom envelope package.",
    review: "Reviewed",
  },
  {
    type: "AOP",
    match: "Initiate procurement — HVAC and GMP cleanroom systems",
    user: "procurement.officer",
    progress: 55,
    status: "In Progress",
    summary: "Technical specification issued to five pre-qualified vendors; two bids received to date.",
    achievements: "Vendor pre-qualification completed and the evaluation matrix approved.",
    challenges: "Two bidders requested an extension for AHU compliance evidence.",
    nextSteps: "Close the tender window and convene the evaluation committee.",
    review: "Reviewed",
  },
  {
    type: "AOP",
    match: "Develop Quality Policy, Quality Manual, and QMS framework",
    user: "qa.officer",
    progress: 72,
    status: "In Progress",
    summary: "Quality policy approved; 14 of 21 QMS procedures are drafted and under review.",
    achievements: "Quality policy signed by the CEO.\nDocument control procedure operational in the shared drive.",
    challenges: "Equipment qualification procedures depend on the final vendor package.",
    nextSteps: "Complete the remaining seven procedures and schedule the first internal audit.",
    review: "Reviewed",
  },
  {
    type: "AOP",
    match: "Develop and approve HR Management Policy",
    user: "hr.manager",
    progress: 86,
    status: "In Progress",
    summary: "HR policy benchmarked against EIH directives and reviewed by Legal; consultation with staff representatives is complete.",
    achievements: "Leave, discipline and grievance chapters cleared legal review.",
    challenges: "Final grading alignment awaits the job evaluation committee.",
    nextSteps: "Table the policy at the next management meeting for approval.",
    review: "Reviewed",
  },
  {
    type: "AOP",
    match: "Install and configure IPSAS accounting software",
    user: "finance.manager",
    progress: 60,
    status: "In Progress",
    summary: "Chart of accounts migrated and two months of opening balances loaded into the IPSAS environment.",
    achievements: "Opening balances reconciled to the prior-year audited statements.",
    challenges: "Asset register integration needs a clean-up before go-live.",
    nextSteps: "Run parallel reporting for one month and train finance users.",
    review: "Submitted",
  },
  {
    type: "AOP",
    match: "Facilitate monthly Board meetings",
    user: "board.secretary",
    progress: 92,
    status: "In Progress",
    summary: "Board packs circulated on time for every scheduled meeting this year; action register is current.",
    achievements: "Attendance and resolution registers are fully digitised.",
    challenges: "Two action items await input from the finance committee.",
    nextSteps: "Close the outstanding actions before the next quarterly Board meeting.",
    review: "Reviewed",
  },
  {
    type: "AOP",
    match: "Develop regulatory compliance (EFDA approval and WHO-PQ)",
    user: "legal.counsel",
    progress: 45,
    status: "In Progress",
    summary: "Regulatory roadmap approved. Legal review of product representations is underway.",
    achievements: "Regulatory roles and responsibilities documented.",
    challenges: "WHO-PQ guidance updates require a refresh of the dossier index.",
    nextSteps: "Finalise the inspection readiness checklist with QA.",
    review: "Submitted",
  },
  {
    type: "AOP",
    match: "Conduct training needs assessment and identify skills gaps",
    user: "hr.manager",
    progress: 78,
    status: "In Progress",
    summary: "Skills assessment completed for 82% of staff; the 2026/27 training plan is being costed.",
    achievements: "Departmental skills matrices completed for Operations, QA and Finance.",
    challenges: "Engineering and ICT assessments are pending supervisor input.",
    nextSteps: "Publish the consolidated training plan and book priority GMP courses.",
    review: "Reviewed",
  },
  {
    type: "AOP",
    match: "Project Management Fundamentals training",
    user: "strategy.officer",
    progress: 52,
    status: "In Progress",
    summary: "Three of six cohorts trained; the remaining cohorts are scheduled after the quarterly close.",
    achievements: "Pre/post assessment scores improved by 28% across completed cohorts.",
    challenges: "Operational commitments delayed two cohorts.",
    nextSteps: "Deliver the remaining cohorts and publish the competency record.",
    review: "Submitted",
  },
  {
    type: "ROADMAP",
    match: "Financing and partnerships secured",
    user: "finance.manager",
    progress: 70,
    status: "In Progress",
    summary: "Blended financing structure agreed with EIH; two DFI term sheets are under review.",
    achievements: "Board approval obtained for the financing structure.",
    challenges: "Counter-guarantee documentation is still in legal review.",
    nextSteps: "Conclude due diligence with the lead DFI and sign the first term sheet.",
    review: "Reviewed",
  },
  {
    type: "ROADMAP",
    match: "Core leadership and technical recruitment",
    user: "hr.manager",
    progress: 82,
    status: "In Progress",
    summary: "11 of 14 leadership and technical roles filled; the validation engineer and regulatory specialist are in final stages.",
    achievements: "All department managers appointed and inducted.",
    challenges: "Specialist validation talent is scarce in the local market.",
    nextSteps: "Close the two remaining specialist roles and complete onboarding.",
    review: "Reviewed",
  },
  {
    type: "ROADMAP",
    match: "Installation and qualification (IQ/OQ) of fill-finish equipment",
    user: "engineer",
    progress: 58,
    status: "In Progress",
    summary: "Vial filler installed; isolator glove integrity and CIP/SIP commissioning are underway.",
    achievements: "Factory acceptance test closed with zero critical findings.",
    challenges: "Utility redundancy testing is waiting on the substation energisation.",
    nextSteps: "Complete CIP/SIP commissioning and issue the IQ protocol for approval.",
    review: "Reviewed",
  },
  {
    type: "STRATEGIC",
    match: "QMS / PQS implementation",
    user: "qa.officer",
    progress: 55,
    status: "In Progress",
    summary: "QMS framework adopted; 14 procedures released and the deviation system is live in the LIMS pilot.",
    achievements: "Quality policy and document control operational.",
    challenges: "Training coverage for the new deviation workflow is incomplete.",
    nextSteps: "Complete training and run the first management review.",
    review: "Reviewed",
  },
  {
    type: "STRATEGIC",
    match: "ShieldVax fill-finish facility commissioned",
    user: "operations.manager",
    progress: 62,
    status: "In Progress",
    summary: "Facility readiness at 62%; SAT is the current gate before IQ/OQ.",
    achievements: "Cleanroom envelope and utility distribution are substantially complete.",
    challenges: "Single-use assembly lead times could delay PPQ.",
    nextSteps: "Close SAT observations and lock the PPQ schedule.",
    review: "Reviewed",
  },
  {
    type: "STRATEGIC",
    match: "Staff recruited",
    user: "hr.manager",
    progress: 68,
    status: "In Progress",
    summary: "82 of the planned 120 phase-I positions are filled; the recruitment pipeline has 19 active candidates.",
    achievements: "Graduate trainee intake completed across technical functions.",
    challenges: "Competition for experienced GMP operators.",
    nextSteps: "Run the October recruitment wave and complete induction.",
    review: "Submitted",
  },
  {
    type: "STRATEGIC",
    match: "Campus construction packages completed",
    user: "property.officer",
    progress: 47,
    status: "In Progress",
    summary: "Three of seven construction packages complete; cleanroom and utilities packages are in progress.",
    achievements: "Substation and main distribution board nearly complete.",
    challenges: "Rainy-season access constraints and HVAC control imports.",
    nextSteps: "Seal the cleanroom envelope and start HVAC balancing.",
    review: "Reviewed",
  },
];

async function seedPlanUpdates(users: Record<string, { id: string; name: string }>) {
  const plans = await prisma.plan.findMany({ select: { id: true, type: true } });
  for (const seed of PLAN_UPDATES) {
    const plan = plans.find((entry) => entry.type === seed.type);
    if (!plan) continue;
    const item = await prisma.planItem.findFirst({ where: { planId: plan.id, title: { contains: seed.match, mode: "insensitive" } } });
    if (!item) continue;
    const author = users[seed.user];
    if (!author) continue;

    if (["ACTIVITY", "MILESTONE"].includes(item.kind)) {
      await prisma.planItem.update({
        where: { id: item.id },
        data: { owner: author.name, progress: pct(seed.progress), status: seed.status },
      });
    } else {
      await prisma.planItem.update({ where: { id: item.id }, data: { owner: author.name } });
    }

    await prisma.progressUpdate.upsert({
      where: { itemId_periodLabel: { itemId: item.id, periodLabel: PERIOD } },
      create: {
        planId: plan.id,
        itemId: item.id,
        periodLabel: PERIOD,
        authorId: author.id,
        authorName: author.name,
        progress: pct(seed.progress),
        status: seed.review,
        summary: seed.summary,
        achievements: seed.achievements,
        challenges: seed.challenges,
        nextSteps: seed.nextSteps,
        reviewedBy: seed.review === "Reviewed" ? "ceo" : null,
        reviewedAt: seed.review === "Reviewed" ? at(-2) : null,
        reviewerNote: seed.review === "Reviewed" ? "Accepted for the consolidated report." : null,
      },
      update: {
        authorId: author.id,
        authorName: author.name,
        progress: pct(seed.progress),
        status: seed.review,
        summary: seed.summary,
        achievements: seed.achievements,
        challenges: seed.challenges,
        nextSteps: seed.nextSteps,
      },
    });
  }
}

async function ensureUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users: Record<string, { id: string; name: string }> = {};
  for (const person of STAFF) {
    const existing = await prisma.user.findUnique({ where: { username: person.username } });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            position: existing.position || person.position,
            jobTitle: existing.jobTitle || person.position,
            department: existing.department || person.position.split(" ")[0],
          },
        })
      : await prisma.user.create({
          data: {
            username: person.username,
            passwordHash,
            firstName: person.first,
            lastName: person.last,
            role: person.role,
            position: person.position,
            jobTitle: person.position,
            email: `${person.username}@ethio-biopharma.example`,
            hireDate: at(-500),
            profileCompletedAt: at(-500),
          },
        });
    users[person.username] = { id: user.id, name: `${person.first} ${person.last}` };
  }
  return users;
}

type ActivitySeed = {
  title: string;
  owner: string;
  start: number;
  end: number;
  progress: number;
  status: string;
  budget: number;
  spent: number;
  milestone?: string;
};

type ProjectSeed = {
  projectId: string;
  title: string;
  description: string;
  sourceOfFunds: string;
  category: string;
  priority: string;
  status: string;
  progress: number;
  manager: string;
  pi: string;
  start: number;
  end: number;
  members: string[];
  workPackages: { id: string; title: string; start: number; end: number; progress: number; status: string }[];
  milestones: { id: string; title: string; start: number; end: number; progress: number; status: string }[];
  activities: ActivitySeed[];
  brief: string;
  messages: { title: string; body: string; author: string; pinned?: boolean }[];
};

const PROJECTS: ProjectSeed[] = [
  {
    projectId: "EBPE-PRJ-001",
    title: "ShieldVax Fill-Finish Line Qualification",
    description:
      "Qualify the ShieldVax vial and prefilled-syringe fill-finish line from URS through process performance qualification, ready for EFDA inspection.",
    sourceOfFunds: "Government of Ethiopia / EIH capital budget",
    category: "Manufacturing",
    priority: "High",
    status: "In Progress",
    progress: 58,
    manager: "operations.manager",
    pi: "qa.officer",
    start: -240,
    end: 300,
    members: ["operations.manager", "qa.officer", "engineer", "procurement.officer", "finance.officer", "ceo"],
    workPackages: [
      { id: "EBPE-PRJ-001-WP1", title: "Design, URS and vendor qualification", start: -240, end: -60, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-001-WP2", title: "Installation and commissioning", start: -90, end: 90, progress: 62, status: "In Progress" },
      { id: "EBPE-PRJ-001-WP3", title: "Qualification and validation", start: 30, end: 300, progress: 18, status: "In Progress" },
    ],
    milestones: [
      { id: "EBPE-PRJ-001-MS1", title: "User requirement specification approved", start: -240, end: -210, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-001-MS2", title: "Factory acceptance test signed off", start: -150, end: -120, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-001-MS3", title: "Site acceptance test complete", start: -20, end: 30, progress: 70, status: "In Progress" },
      { id: "EBPE-PRJ-001-MS4", title: "Installation qualification / operational qualification", start: 40, end: 120, progress: 15, status: "In Progress" },
      { id: "EBPE-PRJ-001-MS5", title: "Process performance qualification batches", start: 130, end: 220, progress: 0, status: "Planned" },
      { id: "EBPE-PRJ-001-MS6", title: "EFDA pre-inspection readiness", start: 240, end: 300, progress: 0, status: "Planned" },
    ],
    activities: [
      { title: "Approve URS and traceability matrix", owner: "qa.officer", start: -240, end: -215, progress: 100, status: "Completed", budget: 250000, spent: 238000, milestone: "EBPE-PRJ-001-MS1" },
      { title: "Complete vendor FAT at supplier site", owner: "engineer", start: -150, end: -125, progress: 100, status: "Completed", budget: 1800000, spent: 1750000, milestone: "EBPE-PRJ-001-MS2" },
      { title: "Install vial filling machine and isolator", owner: "engineer", start: -70, end: -10, progress: 90, status: "In Progress", budget: 5200000, spent: 4300000, milestone: "EBPE-PRJ-001-MS3" },
      { title: "Commission CIP/SIP and utilities interfaces", owner: "engineer", start: -30, end: 35, progress: 55, status: "In Progress", budget: 1400000, spent: 720000, milestone: "EBPE-PRJ-001-MS3" },
      { title: "Draft IQ/OQ protocols and risk assessment", owner: "qa.officer", start: 10, end: 60, progress: 35, status: "In Progress", budget: 320000, spent: 110000, milestone: "EBPE-PRJ-001-MS4" },
      { title: "Execute IQ/OQ with QA witness", owner: "qa.officer", start: 60, end: 120, progress: 0, status: "Planned", budget: 480000, spent: 0, milestone: "EBPE-PRJ-001-MS4" },
      { title: "Run three PPQ batches and stability pull", owner: "operations.manager", start: 130, end: 220, progress: 0, status: "Planned", budget: 3600000, spent: 0, milestone: "EBPE-PRJ-001-MS5" },
      { title: "Close EFDA inspection observations", owner: "qa.officer", start: 240, end: 300, progress: 0, status: "Planned", budget: 200000, spent: 0, milestone: "EBPE-PRJ-001-MS6" },
      { title: "Procure single-use assemblies and spares", owner: "procurement.officer", start: -60, end: 45, progress: 65, status: "In Progress", budget: 950000, spent: 610000, milestone: "EBPE-PRJ-001-MS3" },
    ],
    brief:
      "## Purpose\nQualify the ShieldVax fill-finish line so the enterprise can supply priority vaccines.\n\n## Current focus\nSite acceptance testing is 70% complete. CIP/SIP commissioning is the critical path before IQ/OQ protocol approval.\n\n## Risks\n- Single-use assembly lead time (procurement)\n- Utility redundancy during commissioning\n\n## Decisions needed\nApprove the PPQ batch schedule so media fills can be booked with Operations.",
    messages: [
      { title: "SAT window confirmed", body: "The vendor will be on site for SAT from next Monday. QA and Engineering should confirm witness availability.", author: "operations.manager", pinned: true },
      { title: "Single-use assemblies landed", body: "The first two pallets cleared customs. Stores have been notified and sampling is booked.", author: "procurement.officer" },
    ],
  },
  {
    projectId: "EBPE-PRJ-002",
    title: "Kilinto Campus Phase I — Utilities & Cleanrooms",
    description:
      "Deliver phase I civil works, cleanroom envelopes, HVAC and utility distribution for the integrated biopharmaceutical campus.",
    sourceOfFunds: "Development partners and government counterpart funding",
    category: "Infrastructure",
    priority: "Critical",
    status: "In Progress",
    progress: 47,
    manager: "property.officer",
    pi: "engineer",
    start: -400,
    end: 500,
    members: ["property.officer", "engineer", "operations.manager", "finance.officer", "procurement.officer", "ceo"],
    workPackages: [
      { id: "EBPE-PRJ-002-WP1", title: "Civil works and site infrastructure", start: -400, end: 120, progress: 68, status: "In Progress" },
      { id: "EBPE-PRJ-002-WP2", title: "Cleanroom envelope and HVAC", start: -120, end: 330, progress: 34, status: "In Progress" },
      { id: "EBPE-PRJ-002-WP3", title: "Utilities, safety and environment", start: -60, end: 420, progress: 22, status: "In Progress" },
    ],
    milestones: [
      { id: "EBPE-PRJ-002-MS1", title: "Site grading and foundations complete", start: -400, end: -300, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-002-MS2", title: "Structural frame topped out", start: -240, end: -120, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-002-MS3", title: "Cleanroom envelope sealed", start: -20, end: 110, progress: 45, status: "In Progress" },
      { id: "EBPE-PRJ-002-MS4", title: "HVAC balancing and pressure cascade", start: 130, end: 260, progress: 0, status: "Planned" },
      { id: "EBPE-PRJ-002-MS5", title: "Utilities tie-in and energisation", start: 260, end: 420, progress: 0, status: "Planned" },
    ],
    activities: [
      { title: "Complete substation and main distribution board", owner: "engineer", start: -180, end: -30, progress: 95, status: "In Progress", budget: 8200000, spent: 7700000, milestone: "EBPE-PRJ-002-MS2" },
      { title: "Install cleanroom wall and ceiling panels", owner: "engineer", start: -20, end: 95, progress: 48, status: "In Progress", budget: 12500000, spent: 5800000, milestone: "EBPE-PRJ-002-MS3" },
      { title: "Install air handling units and ductwork", owner: "property.officer", start: 10, end: 150, progress: 25, status: "In Progress", budget: 9700000, spent: 2300000, milestone: "EBPE-PRJ-002-MS3" },
      { title: "Procure purified water generation skid", owner: "procurement.officer", start: -80, end: 40, progress: 60, status: "In Progress", budget: 6300000, spent: 3700000, milestone: "EBPE-PRJ-002-MS5" },
      { title: "Commission fire detection and suppression", owner: "property.officer", start: 100, end: 210, progress: 0, status: "Planned", budget: 2800000, spent: 0, milestone: "EBPE-PRJ-002-MS5" },
      { title: "Run HVAC balancing and pressure mapping", owner: "engineer", start: 150, end: 260, progress: 0, status: "Planned", budget: 1900000, spent: 0, milestone: "EBPE-PRJ-002-MS4" },
      { title: "Landscape and access road completion", owner: "property.officer", start: 200, end: 380, progress: 0, status: "Planned", budget: 2400000, spent: 0, milestone: "EBPE-PRJ-002-MS5" },
      { title: "Energy efficiency and solar readiness review", owner: "strategy.officer", start: 60, end: 180, progress: 20, status: "In Progress", budget: 450000, spent: 90000, milestone: "EBPE-PRJ-002-MS4" },
    ],
    brief:
      "## Purpose\nDeliver a compliant, expandable campus envelope for vaccine and essential-medicine manufacturing.\n\n## Current focus\nCleanroom panel installation and AHU placement. Substation is nearly complete and will support commissioning power.\n\n## Risks\n- Rainy-season access constraints\n- Import clearance for HVAC controls\n\n## Decisions needed\nConfirm the purified-water skid vendor so the utilities tie-in date holds.",
    messages: [
      { title: "Cleanroom mock-up approved", body: "QA signed off the cleanroom mock-up including coving and penetrations. Panel installation proceeds.", author: "property.officer", pinned: true },
      { title: "Power shutdown window", body: "A planned shutdown is required to connect the new substation. FM will circulate the notice.", author: "engineer" },
    ],
  },
  {
    projectId: "EBPE-PRJ-003",
    title: "National Cold-Chain & QC Laboratory Digitalisation",
    description:
      "Digitise cold-chain telemetry and quality-control laboratory workflows, including LIMS, audit trails and central dashboards.",
    sourceOfFunds: "Digital transformation fund",
    category: "Digital",
    priority: "High",
    status: "In Progress",
    progress: 66,
    manager: "it.officer",
    pi: "qa.officer",
    start: -200,
    end: 240,
    members: ["it.officer", "qa.officer", "engineer", "operations.manager", "finance.officer"],
    workPackages: [
      { id: "EBPE-PRJ-003-WP1", title: "Cold-chain telemetry network", start: -200, end: 60, progress: 78, status: "In Progress" },
      { id: "EBPE-PRJ-003-WP2", title: "LIMS, audit trails and dashboards", start: -90, end: 240, progress: 54, status: "In Progress" },
    ],
    milestones: [
      { id: "EBPE-PRJ-003-MS1", title: "Telemetry devices installed in all cold rooms", start: -200, end: -90, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-003-MS2", title: "Central monitoring dashboard live", start: -30, end: 45, progress: 80, status: "In Progress" },
      { id: "EBPE-PRJ-003-MS3", title: "LIMS validation complete", start: 60, end: 170, progress: 15, status: "In Progress" },
      { id: "EBPE-PRJ-003-MS4", title: "Paperless QC release in production", start: 180, end: 240, progress: 0, status: "Planned" },
    ],
    activities: [
      { title: "Install temperature and humidity sensors", owner: "it.officer", start: -180, end: -100, progress: 100, status: "Completed", budget: 1200000, spent: 1150000, milestone: "EBPE-PRJ-003-MS1" },
      { title: "Configure alerting and escalation rules", owner: "it.officer", start: -80, end: 20, progress: 85, status: "In Progress", budget: 300000, spent: 240000, milestone: "EBPE-PRJ-003-MS2" },
      { title: "Integrate cold-room dashboard with ERP", owner: "engineer", start: -20, end: 45, progress: 60, status: "In Progress", budget: 500000, spent: 280000, milestone: "EBPE-PRJ-003-MS2" },
      { title: "Configure LIMS master data and workflows", owner: "qa.officer", start: -40, end: 80, progress: 45, status: "In Progress", budget: 2100000, spent: 940000, milestone: "EBPE-PRJ-003-MS3" },
      { title: "Validate LIMS against data-integrity requirements", owner: "qa.officer", start: 80, end: 170, progress: 0, status: "Planned", budget: 800000, spent: 0, milestone: "EBPE-PRJ-003-MS3" },
      { title: "Train QC analysts on electronic worksheets", owner: "qa.officer", start: 140, end: 200, progress: 0, status: "Planned", budget: 250000, spent: 0, milestone: "EBPE-PRJ-003-MS4" },
      { title: "Retire paper release checklist", owner: "operations.manager", start: 200, end: 240, progress: 0, status: "Planned", budget: 90000, spent: 0, milestone: "EBPE-PRJ-003-MS4" },
    ],
    brief:
      "## Purpose\nGive operations and QC a single, auditable view of product quality and cold-chain integrity.\n\n## Current focus\nThe dashboard is in user acceptance testing. LIMS master data is 45% configured.\n\n## Risks\n- Data migration from legacy worksheets\n- Network resilience at remote cold rooms\n\n## Decisions needed\nConfirm the go-live date for paperless QC release.",
    messages: [
      { title: "Dashboard UAT starts Monday", body: "QC supervisors will run the acceptance scripts. Please log issues in the project board.", author: "it.officer", pinned: true },
      { title: "Sensor coverage complete", body: "All six cold rooms now report to the central gateway with 15-minute intervals.", author: "engineer" },
    ],
  },
  {
    projectId: "EBPE-PRJ-004",
    title: "Regulatory Dossier & ISO 13485 Readiness",
    description:
      "Prepare the product dossier, quality management system and inspection readiness pack for EFDA and future WHO prequalification.",
    sourceOfFunds: "Government of Ethiopia — regulatory strengthening",
    category: "Regulatory",
    priority: "Critical",
    status: "In Progress",
    progress: 39,
    manager: "qa.officer",
    pi: "legal.counsel",
    start: -150,
    end: 420,
    members: ["qa.officer", "legal.counsel", "operations.manager", "strategy.officer", "ceo"],
    workPackages: [
      { id: "EBPE-PRJ-004-WP1", title: "Product dossier and regulatory filings", start: -150, end: 300, progress: 42, status: "In Progress" },
      { id: "EBPE-PRJ-004-WP2", title: "ISO 13485 quality management system", start: -60, end: 420, progress: 36, status: "In Progress" },
    ],
    milestones: [
      { id: "EBPE-PRJ-004-MS1", title: "Dossier gap assessment complete", start: -150, end: -90, progress: 100, status: "Completed" },
      { id: "EBPE-PRJ-004-MS2", title: "Module 3 chemistry, manufacturing and controls drafted", start: -60, end: 120, progress: 45, status: "In Progress" },
      { id: "EBPE-PRJ-004-MS3", title: "ISO 13485 internal audit cycle complete", start: 120, end: 300, progress: 0, status: "Planned" },
      { id: "EBPE-PRJ-004-MS4", title: "EFDA submission and inspection", start: 300, end: 420, progress: 0, status: "Planned" },
    ],
    activities: [
      { title: "Map dossier requirements against evidence", owner: "qa.officer", start: -150, end: -95, progress: 100, status: "Completed", budget: 350000, spent: 330000, milestone: "EBPE-PRJ-004-MS1" },
      { title: "Draft module 3 CMC sections", owner: "qa.officer", start: -60, end: 110, progress: 48, status: "In Progress", budget: 900000, spent: 410000, milestone: "EBPE-PRJ-004-MS2" },
      { title: "Compile validation evidence pack", owner: "engineer", start: 40, end: 160, progress: 10, status: "In Progress", budget: 500000, spent: 60000, milestone: "EBPE-PRJ-004-MS2" },
      { title: "Legal review of regulatory representations", owner: "legal.counsel", start: -20, end: 60, progress: 55, status: "In Progress", budget: 180000, spent: 95000, milestone: "EBPE-PRJ-004-MS2" },
      { title: "Run ISO 13485 internal audit wave 1", owner: "qa.officer", start: 130, end: 240, progress: 0, status: "Planned", budget: 600000, spent: 0, milestone: "EBPE-PRJ-004-MS3" },
      { title: "Prepare EFDA inspection room and evidence index", owner: "strategy.officer", start: 260, end: 380, progress: 0, status: "Planned", budget: 420000, spent: 0, milestone: "EBPE-PRJ-004-MS4" },
    ],
    brief:
      "## Purpose\nSecure national registration and ISO 13485 certification as the platform for export ambition.\n\n## Current focus\nModule 3 drafting is underway. Legal review of representations is more than half complete.\n\n## Risks\n- Availability of long-term stability data\n- Internal audit capacity\n\n## Decisions needed\nApprove the external audit-readiness budget.",
    messages: [
      { title: "Dossier evidence index v0.3", body: "The evidence index has been updated with the latest validation reports. Review comments are due Friday.", author: "qa.officer", pinned: true },
      { title: "ISO 13485 gap log", body: "The gap log now has 41 open items, of which 12 are documentation-only.", author: "legal.counsel" },
    ],
  },
];

async function main() {
  console.log("Seeding PMS demonstration projects…");
  const users = await ensureUsers();

  // Goals referenced across projects.
  const goalSeeds = [
    { title: "Commission the ShieldVax fill-finish line", description: "Qualify the line and complete PPQ batches.", targetDays: 300, progress: 58, status: "On Track" },
    { title: "Achieve WHO prequalification readiness by 2028", description: "Close the regulatory and QMS readiness gaps.", targetDays: 700, progress: 39, status: "At Risk" },
    { title: "Digitise quality and cold-chain data", description: "Paperless QC release and continuous cold-chain telemetry.", targetDays: 240, progress: 66, status: "On Track" },
  ];
  const goals: Record<string, string> = {};
  for (const goal of goalSeeds) {
    let existing = await prisma.goal.findFirst({ where: { title: goal.title } });
    if (!existing) {
      existing = await prisma.goal.create({
        data: {
          title: goal.title,
          description: goal.description,
          targetDate: at(goal.targetDays),
          progress: goal.progress,
          status: goal.status,
          createdBy: "admin",
        },
      });
    }
    goals[goal.title] = existing.id;
  }

  for (const seed of PROJECTS) {
    const manager = users[seed.manager];
    const pi = users[seed.pi];
    const project = await prisma.project.upsert({
      where: { projectId: seed.projectId },
      update: {
        title: seed.title,
        description: seed.description,
        sourceOfFunds: seed.sourceOfFunds,
        startDate: at(seed.start),
        endDate: at(seed.end),
        status: seed.status,
        priority: seed.priority,
        progress: pct(seed.progress),
        projectCategory: seed.category,
        leadDepartment: seed.category,
        piName: pi.name,
        piEmail: `${seed.pi}@ethio-biopharma.example`,
        projectManager: manager.name,
      },
      create: {
        projectId: seed.projectId,
        title: seed.title,
        description: seed.description,
        sourceOfFunds: seed.sourceOfFunds,
        startDate: at(seed.start),
        endDate: at(seed.end),
        status: seed.status,
        priority: seed.priority,
        progress: pct(seed.progress),
        createdBy: manager.name,
        projectCategory: seed.category,
        leadDepartment: seed.category,
        leadDivision: "Programme delivery",
        piName: pi.name,
        piEmail: `${seed.pi}@ethio-biopharma.example`,
        projectManager: manager.name,
      },
    });

    for (const member of seed.members) {
      await prisma.projectMember.upsert({
        where: { projectId_username: { projectId: seed.projectId, username: member } },
        create: {
          projectId: seed.projectId,
          username: member,
          role: member === seed.manager ? "manager" : member === seed.pi ? "pi" : "member",
          addedBy: seed.manager,
        },
        update: { role: member === seed.manager ? "manager" : member === seed.pi ? "pi" : "member" },
      });
    }

    for (const workPackage of seed.workPackages) {
      await prisma.workPackage.upsert({
        where: { workPackageId: workPackage.id },
        update: {
          title: workPackage.title,
          startDate: at(workPackage.start),
          endDate: at(workPackage.end),
          progress: workPackage.progress,
          status: workPackage.status,
        },
        create: {
          projectId: seed.projectId,
          workPackageId: workPackage.id,
          title: workPackage.title,
          startDate: at(workPackage.start),
          endDate: at(workPackage.end),
          progress: workPackage.progress,
          status: workPackage.status,
          createdBy: manager.name,
        },
      });
    }

    for (const milestone of seed.milestones) {
      await prisma.milestone.upsert({
        where: { milestoneId: milestone.id },
        update: {
          title: milestone.title,
          startDate: at(milestone.start),
          endDate: at(milestone.end),
          progress: milestone.progress,
          status: milestone.status,
        },
        create: {
          projectId: seed.projectId,
          milestoneId: milestone.id,
          title: milestone.title,
          startDate: at(milestone.start),
          endDate: at(milestone.end),
          progress: milestone.progress,
          status: milestone.status,
          createdBy: manager.name,
        },
      });
    }

    for (const [index, activity] of seed.activities.entries()) {
      const activityId = `${seed.projectId}-ACT${String(index + 1).padStart(2, "0")}`;
      const workPackageId = seed.workPackages[Math.min(seed.workPackages.length - 1, Math.floor(index / 3))].id;
      await prisma.activity.upsert({
        where: { activityId },
        update: {
          title: activity.title,
          startDate: at(activity.start),
          endDate: at(activity.end),
          progress: activity.progress,
          status: activity.status,
          assignedTo: activity.owner,
          financialPlan: activity.budget,
          actualExpenditure: activity.spent,
          workPackageId,
          milestoneId: activity.milestone || null,
          description: `${activity.title} — owner ${users[activity.owner]?.name || activity.owner}.`,
        },
        create: {
          projectId: seed.projectId,
          activityId,
          workPackageId,
          milestoneId: activity.milestone || null,
          title: activity.title,
          description: `${activity.title} — owner ${users[activity.owner]?.name || activity.owner}.`,
          startDate: at(activity.start),
          endDate: at(activity.end),
          duration: Math.max(1, activity.end - activity.start),
          progress: activity.progress,
          assignedTo: activity.owner,
          status: activity.status,
          financialPlan: activity.budget,
          actualExpenditure: activity.spent,
          createdBy: manager.name,
        },
      });

      const existingTime = await prisma.timeEntry.findFirst({
        where: { projectId: seed.projectId, username: activity.owner, description: activity.title },
      });
      if (!existingTime) {
        await prisma.timeEntry.create({
          data: {
            projectId: seed.projectId,
            activityId,
            username: activity.owner,
            hours: 6,
            description: activity.title,
            date: at(-3),
          },
        });
      }
    }

    await prisma.projectBrief.upsert({
      where: { projectId: seed.projectId },
      update: { content: seed.brief, updatedBy: manager.name },
      create: { projectId: seed.projectId, content: seed.brief, format: "markdown", updatedBy: manager.name },
    });

    for (const message of seed.messages) {
      const existing = await prisma.projectMessage.findFirst({ where: { projectId: seed.projectId, title: message.title } });
      if (!existing) {
        await prisma.projectMessage.create({
          data: {
            projectId: seed.projectId,
            title: message.title,
            body: message.body,
            author: message.author,
            pinned: Boolean(message.pinned),
          },
        });
      }
    }

    // A short, realistic discussion on every project.
    const comments = [
      `Kick-off held with the full delivery team; actions assigned to each work package owner.`,
      `Progress update: current delivery is ${seed.progress}% against the approved plan. The next gate is being scheduled.`,
    ];
    for (const [index, body] of comments.entries()) {
      const author = index === 0 ? seed.manager : seed.pi;
      const existing = await prisma.comment.findFirst({ where: { targetType: "PROJECT", targetId: seed.projectId, body } });
      if (!existing) {
        await prisma.comment.create({
          data: {
            targetType: "PROJECT",
            targetId: seed.projectId,
            body,
            author,
            authorName: users[author]?.name || author,
          },
        });
      }
    }

    const goalTitle =
      seed.projectId === "EBPE-PRJ-001"
        ? "Commission the ShieldVax fill-finish line"
        : seed.projectId === "EBPE-PRJ-003"
        ? "Digitise quality and cold-chain data"
        : "Achieve WHO prequalification readiness by 2028";
    await prisma.projectGoal.upsert({
      where: { goalId_projectId: { goalId: goals[goalTitle], projectId: seed.projectId } },
      create: { goalId: goals[goalTitle], projectId: seed.projectId },
      update: {},
    });
  }

  await seedPlanUpdates(users);

  const counts = {
    projects: await prisma.project.count(),
    progressUpdates: await prisma.progressUpdate.count(),
    workPackages: await prisma.workPackage.count(),
    milestones: await prisma.milestone.count(),
    activities: await prisma.activity.count(),
  };
  console.log("PMS demo data ready:", counts);
  console.log(`  Demo accounts use password ${PASSWORD} (e.g. operations.manager, qa.officer, engineer).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
