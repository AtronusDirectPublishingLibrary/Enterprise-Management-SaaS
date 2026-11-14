import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { PROFESSIONS, findProfession } from "../lib/professions";
import { runHrReminders } from "../lib/hrReminders";
import { cycleForDate } from "../lib/hrCycles";
import { logAudit } from "../lib/audit";
import { withFileScan } from "../lib/fileScan";
import { nextStaffDocumentReference } from "../lib/numbering";

/**
 * Staff self-service. Every authenticated member of staff can read their own
 * workspace here (profile, agenda of due dates, tasks, documents) without the
 * HR-admin role that `/api/hr` requires.
 */
const router = Router();
router.use(requireAuth);

const DAY = 86_400_000;

type Severity = "overdue" | "today" | "soon" | "later" | "info";

type AgendaItem = {
  id: string;
  kind: string;
  title: string;
  detail?: string | null;
  dueAt: string | null;
  severity: Severity;
  link?: string;
  action?: string;
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function severityFor(dueAt: Date | null, now = new Date()): Severity {
  if (!dueAt) return "info";
  const diff = Math.round((startOfDay(dueAt).getTime() - startOfDay(now).getTime()) / DAY);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "soon";
  return "later";
}

function monthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

const isSubmitted = (status?: string | null) => status === "SUBMITTED" || status === "APPROVED";

/** Everything the "My workspace" page needs in one round trip. */
router.get("/overview", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        subDepartment: true,
        jobTitle: true,
        employeeNo: true,
        hireDate: true,
        probationEnd: true,
        contractEnd: true,
        profession: true,
        requiresLicence: true,
        profileCompletedAt: true,
        signatureUrl: true,
        initialsUrl: true,
        initialsText: true,
        signatureUpdatedAt: true,
        avatarUrl: true,
        avatarUpdatedAt: true,
        immediateSupervisor: { select: { firstName: true, lastName: true, username: true } },
      },
    });
    if (!me) return res.status(401).json({ message: "Session user not found" });

    const [
      training,
      documents,
      tasks,
      balances,
      leaves,
      plan,
      timesheet,
      setting,
      holidays,
      approvalsLeave,
      approvalsTimesheets,
      approvalsPlans,
      lastTimesheet,
      leaveTypes,
      induction,
      appraisal,
      payslips,
      reports,
    ] = await Promise.all([
      prisma.training.findMany({ where: { userId }, orderBy: { completedAt: "desc" } }),
      prisma.staffDocument.findMany({ where: { userId }, orderBy: { expiresAt: "asc" } }),
      prisma.staffTask.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] }),
      prisma.leaveBalance.findMany({ where: { userId, year } }),
      prisma.leaveRequest.findMany({ where: { userId }, orderBy: { startDate: "desc" }, take: 15 }),
      prisma.annualLeavePlan.findFirst({
        where: { userId, year },
        include: { items: { orderBy: { startDate: "asc" } } },
      }),
      prisma.timesheet.findFirst({
        where: { userId, month, year },
        include: { entries: { orderBy: { date: "asc" } } },
      }),
      prisma.timesheetSetting.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.publicHoliday.findMany({ where: { date: { gte: startOfDay(now) } }, orderBy: { date: "asc" }, take: 5 }),
      prisma.leaveRequest.findMany({
        where: { supervisorId: userId, status: "PENDING" },
        include: { user: { select: { firstName: true, lastName: true, username: true } } },
        orderBy: { startDate: "asc" },
      }),
      prisma.timesheet.findMany({
        where: { supervisorId: userId, status: "SUBMITTED" },
        include: { user: { select: { firstName: true, lastName: true, username: true } } },
      }),
      prisma.annualLeavePlan.findMany({
        where: { supervisorId: userId, status: "SUBMITTED" },
        include: { user: { select: { firstName: true, lastName: true, username: true } } },
      }),
      prisma.timesheet.findFirst({
        where: { userId, month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year },
      }),
      prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.induction.findFirst({
        where: { userId },
        include: { tasks: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.appraisal.findUnique({
        where: { userId_cycle: { userId, cycle: cycleForDate(now).cycle } },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.salaryRecord.findMany({ where: { userId }, orderBy: { effectiveAt: "desc" }, take: 12 }),
      prisma.user.findMany({
        where: { immediateSupervisorId: userId },
        select: { id: true, firstName: true, lastName: true, username: true, department: true, jobTitle: true },
      }),
    ]);

    const agenda: AgendaItem[] = [];
    const push = (item: AgendaItem) => agenda.push(item);

    // Expiring training / certification
    training.forEach((record) => {
      if (!record.expiresAt) return;
      const severity = severityFor(record.expiresAt, now);
      if (severity === "later" && record.expiresAt.getTime() - now.getTime() > 90 * DAY) return;
      push({
        id: `training-${record.id}`,
        kind: "TRAINING",
        title: record.title,
        detail: severity === "overdue" ? "Certificate expired" : "Certificate expires",
        dueAt: record.expiresAt.toISOString(),
        severity,
        link: "/my-hr",
        action: severity === "overdue" ? "Renew" : "Book renewal",
      });
    });

    // Expiring HR documents
    const documentNoun: Record<string, string> = {
      LICENCE: "Licence",
      CONTRACT: "Contract",
      ID: "ID",
      CERTIFICATE: "Certificate",
      MEDICAL: "Medical certificate",
      OTHER: "Document",
    };
    documents.forEach((doc) => {
      if (!doc.expiresAt) return;
      const severity = severityFor(doc.expiresAt, now);
      if (severity === "later" && doc.expiresAt.getTime() - now.getTime() > 120 * DAY) return;
      push({
        id: `document-${doc.id}`,
        kind: "DOCUMENT",
        title: doc.title,
        detail: `${documentNoun[doc.category] || "Document"} expires`,
        dueAt: doc.expiresAt.toISOString(),
        severity,
        link: "/my-hr",
        action: severity === "overdue" ? "Replace" : "Renew",
      });
    });

    // Profession-aware credential requirements. Only the obligations that apply
    // to this person's profession are raised — most staff hold no licence.
    const profession = findProfession(me.profession);
    const hasLicenceDocument = documents.some((doc) => doc.category === "LICENCE");
    const hasMedicalDocument = documents.some((doc) => doc.category === "MEDICAL");

    if (!me.profileCompletedAt) {
      push({
        id: "profile-setup",
        kind: "PROFILE",
        title: "Complete your HR profile",
        detail: "Choose your profession so we only track the renewals that apply to you.",
        dueAt: null,
        severity: "today",
        link: "/my-hr",
        action: "Set up",
      });
    } else if (profession?.requiresLicence && !hasLicenceDocument) {
      push({
        id: "profile-licence",
        kind: "DOCUMENT",
        title: `Add your ${(profession.licenceLabel || "professional licence").toLowerCase()}`,
        detail: "Required for your profession — nothing else is tracked until it is on file.",
        dueAt: null,
        severity: "soon",
        link: "/my-hr",
        action: "Add",
      });
    }
    if (me.profileCompletedAt && profession?.requiresMedical && !hasMedicalDocument) {
      push({
        id: "profile-medical",
        kind: "DOCUMENT",
        title: `Add your ${(profession.medicalLabel || "medical fitness certificate").toLowerCase()}`,
        detail: "Your profession requires a current medical fitness certificate.",
        dueAt: null,
        severity: "soon",
        link: "/my-hr",
        action: "Add",
      });
    }

    // Induction checklist for new joiners
    if (induction && induction.status === "ACTIVE") {
      induction.tasks
        .filter((task) => !task.completedAt)
        .slice(0, 4)
        .forEach((task) => {
          push({
            id: `induction-${task.id}`,
            kind: "INDUCTION",
            title: task.title,
            detail: "Induction checklist",
            dueAt: task.dueAt ? task.dueAt.toISOString() : null,
            severity: severityFor(task.dueAt, now),
            link: "/my-hr",
            action: "Open",
          });
        });
    }

    // Current appraisal cycle
    const cycle = cycleForDate(now);
    if (appraisal && appraisal.status === "DRAFT") {
      push({
        id: "appraisal-self",
        kind: "APPRAISAL",
        title: `Self-assessment for ${appraisal.periodLabel}`,
        detail: "Rate your half-year and send it to your supervisor.",
        dueAt: appraisal.periodEnd.toISOString(),
        severity: severityFor(appraisal.periodEnd, now),
        link: "/my-hr",
        action: "Complete",
      });
    } else if (appraisal && appraisal.status === "SELF_SUBMITTED") {
      push({
        id: "appraisal-waiting",
        kind: "APPRAISAL",
        title: `Appraisal ${appraisal.periodLabel} submitted`,
        detail: "Waiting for your supervisor's review.",
        dueAt: null,
        severity: "info",
        link: "/my-hr",
      });
    }

    // Contract and probation milestones
    if (me.contractEnd) {
      push({
        id: "profile-contract",
        kind: "CONTRACT",
        title: "Employment contract ends",
        detail: "Contact HR to start the renewal.",
        dueAt: me.contractEnd.toISOString(),
        severity: severityFor(me.contractEnd, now),
        link: "/my-hr",
      });
    }
    if (me.probationEnd && me.probationEnd >= now) {
      push({
        id: "profile-probation",
        kind: "PROBATION",
        title: "Probation review due",
        detail: "Confirm the review with your supervisor.",
        dueAt: me.probationEnd.toISOString(),
        severity: severityFor(me.probationEnd, now),
        link: "/my-hr",
      });
    }

    // Timesheet deadlines: this month, plus the previous month if it was never submitted.
    const submissionDay = setting?.submissionDay ?? 25;
    if (!isSubmitted(timesheet?.status)) {
      const dueAt = new Date(year, month - 1, Math.min(submissionDay, 28));
      push({
        id: "timesheet-current",
        kind: "TIMESHEET",
        title: `Timesheet for ${monthLabel(month, year)}`,
        detail: timesheet
          ? `${timesheet.status.toLowerCase()} · ${timesheet.entries.length} day${timesheet.entries.length === 1 ? "" : "s"} logged`
          : "Not started yet",
        dueAt: dueAt.toISOString(),
        severity: severityFor(dueAt, now),
        link: "/my-hr",
        action: "Complete",
      });
    }
    if (lastTimesheet && !isSubmitted(lastTimesheet.status)) {
      const lastMonth = month === 1 ? 12 : month - 1;
      const lastYear = month === 1 ? year - 1 : year;
      const dueAt = new Date(lastYear, lastMonth - 1, Math.min(submissionDay, 28));
      push({
        id: "timesheet-previous",
        kind: "TIMESHEET",
        title: `Timesheet for ${monthLabel(lastMonth, lastYear)} is outstanding`,
        detail: "Submit it so payroll can close the period.",
        dueAt: dueAt.toISOString(),
        severity: "overdue",
        link: "/my-hr",
        action: "Submit",
      });
    }

    // Annual leave plan (submitted early in the year, reviewed by supervisor)
    if (!plan || plan.status === "DRAFT" || plan.status === "REJECTED") {
      const dueAt = new Date(year, 2, 31);
      push({
        id: "annual-plan",
        kind: "LEAVE_PLAN",
        title: `Annual leave plan ${year}`,
        detail:
          plan?.status === "REJECTED"
            ? `Rejected: ${plan.rejectionReason || "see supervisor"}`
            : plan?.status === "DRAFT"
              ? "Saved as a draft — send it to your supervisor."
              : "Not created yet.",
        dueAt: dueAt.toISOString(),
        severity: severityFor(dueAt, now),
        link: "/my-hr",
        action: "Open plan",
      });
    }

    // Requests waiting on this user as supervisor
    approvalsLeave.forEach((request) => {
      const who = `${request.user.firstName || ""} ${request.user.lastName || ""}`.trim() || request.user.username;
      push({
        id: `approve-leave-${request.id}`,
        kind: "APPROVAL",
        title: `${who}: ${request.type.toLowerCase()} leave`,
        detail: "Waiting for your decision",
        dueAt: request.startDate.toISOString(),
        severity: severityFor(request.startDate, now),
        link: "/approvals",
        action: "Review",
      });
    });
    approvalsTimesheets.forEach((sheet) => {
      const who = `${sheet.user.firstName || ""} ${sheet.user.lastName || ""}`.trim() || sheet.user.username;
      push({
        id: `approve-timesheet-${sheet.id}`,
        kind: "APPROVAL",
        title: `${who}: timesheet ${monthLabel(sheet.month, sheet.year)}`,
        detail: "Waiting for your approval",
        dueAt: null,
        severity: "info",
        link: "/approvals",
        action: "Review",
      });
    });
    approvalsPlans.forEach((annual) => {
      const who = `${annual.user.firstName || ""} ${annual.user.lastName || ""}`.trim() || annual.user.username;
      push({
        id: `approve-plan-${annual.id}`,
        kind: "APPROVAL",
        title: `${who}: annual leave plan ${annual.year}`,
        detail: "Waiting for your approval",
        dueAt: null,
        severity: "info",
        link: "/approvals",
        action: "Review",
      });
    });

    // Upcoming approved leave (informational)
    leaves
      .filter((leave) => leave.status === "APPROVED" && leave.endDate >= startOfDay(now))
      .slice(0, 2)
      .forEach((leave) => {
        push({
          id: `leave-${leave.id}`,
          kind: "LEAVE",
          title: `Approved ${leave.type.toLowerCase()} leave`,
          detail: "Enjoy the break — remember to hand over.",
          dueAt: leave.startDate.toISOString(),
          severity: "info",
          link: "/my-hr",
        });
      });

    // Public holidays
    holidays.forEach((holiday) => {
      push({
        id: `holiday-${holiday.id}`,
        kind: "HOLIDAY",
        title: holiday.name,
        detail: "Public holiday",
        dueAt: holiday.date.toISOString(),
        severity: "info",
        link: "/my-hr",
      });
    });

    const rank: Record<Severity, number> = { overdue: 0, today: 1, soon: 2, later: 3, info: 4 };
    agenda.sort((a, b) => {
      if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return a.dueAt.localeCompare(b.dueAt);
    });

    // Direct reports, for the supervisor card.
    let team: Array<Record<string, unknown>> = [];
    if (reports.length) {
      const reportIds = reports.map((report) => report.id);
      const [reportTraining, reportDocuments, reportTimesheets, reportLeave] = await Promise.all([
        prisma.training.findMany({ where: { userId: { in: reportIds }, expiresAt: { lte: new Date(now.getTime() + 30 * DAY) } }, select: { userId: true, expiresAt: true } }),
        prisma.staffDocument.findMany({ where: { userId: { in: reportIds }, expiresAt: { lte: new Date(now.getTime() + 30 * DAY) } }, select: { userId: true, expiresAt: true } }),
        prisma.timesheet.groupBy({ by: ["userId", "status"], _count: { _all: true }, where: { userId: { in: reportIds } } }),
        prisma.leaveRequest.groupBy({ by: ["userId", "status"], _count: { _all: true }, where: { userId: { in: reportIds } } }),
      ]);

      team = reports.map((report) => {
        const credentials = [...reportTraining, ...reportDocuments].filter((row) => row.userId === report.id);
        const overdue = credentials.filter((row) => row.expiresAt && row.expiresAt < now).length;
        const expiring = credentials.filter(
          (row) => row.expiresAt && row.expiresAt >= now && row.expiresAt <= new Date(now.getTime() + 30 * DAY)
        ).length;
        const pendingTimesheets =
          reportTimesheets.find((row) => row.userId === report.id && row.status === "FORWARDED")?._count._all || 0;
        const pendingLeave =
          reportLeave.find((row) => row.userId === report.id && row.status === "PENDING")?._count._all || 0;
        return { ...report, overdue, expiring, pendingTimesheets, pendingLeave };
      });
    }

    const openTasks = tasks.filter((task) => task.status === "OPEN");
    const taskSeverity = openTasks.map((task) => severityFor(task.dueAt, now));
    const annualBalance = balances.find((balance) => balance.leaveType === "ANNUAL");
    const leaveDaysLeft = annualBalance
      ? annualBalance.entitledDays + annualBalance.rolloverDays - annualBalance.usedDays
      : null;

    res.set("Cache-Control", "no-store");
    res.json({
      today: now.toISOString(),
      profile: me,
      counters: {
        overdue: agenda.filter((item) => item.severity === "overdue").length +
          taskSeverity.filter((severity) => severity === "overdue").length,
        dueSoon: agenda.filter((item) => item.severity === "today" || item.severity === "soon").length +
          taskSeverity.filter((severity) => severity === "today" || severity === "soon").length,
        openTasks: openTasks.length,
        approvals:
          approvalsLeave.length + approvalsTimesheets.length + approvalsPlans.length,
        leaveDaysLeft,
      },
      agenda,
      profession,
      professions: PROFESSIONS,
      profileComplete: Boolean(me.profileCompletedAt),
      requirements: {
        licence: Boolean(profession?.requiresLicence),
        licenceLabel: profession?.licenceLabel || null,
        medical: Boolean(profession?.requiresMedical),
        medicalLabel: profession?.medicalLabel || null,
        hasLicence: hasLicenceDocument,
        hasMedical: hasMedicalDocument,
      },
      tasks,
      induction,
      appraisal,
      appraisalCycle: cycleForDate(now),
      payslips,
      team,
      documents,
      training,
      leaves,
      balances,
      leaveTypes,
      plan,
      timesheet,
      submissionDay,
      approvals: {
        leave: approvalsLeave,
        timesheets: approvalsTimesheets,
        plans: approvalsPlans,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** Admin: run the reminder sweep now (the scheduler also runs it daily). */
router.post("/reminders/run", requireRole("admin"), async (_req, res, next) => {
  try {
    res.json(await runHrReminders());
  } catch (error) {
    next(error);
  }
});

/** The catalogue the setup form shows. */
router.get("/professions", (_req, res) => {
  res.json(
    PROFESSIONS.map((profession) => ({
      code: profession.code,
      label: profession.label,
      group: profession.group,
      requiresLicence: profession.requiresLicence,
      licenceLabel: profession.licenceLabel || null,
      requiresMedical: Boolean(profession.requiresMedical),
      medicalLabel: profession.medicalLabel || null,
      licenceValidityMonths: profession.licenceValidityMonths || null,
    }))
  );
});

/**
 * First-run setup: the person tells us their profession and, only when it
 * applies, their licence / medical certificate. Those become tracked documents.
 */
router.patch("/profile", async (req, res, next) => {
  try {
    const body = z
      .object({
        profession: z.string().min(1),
        phone: z.string().optional(),
        licenceName: z.string().optional(),
        licenceNumber: z.string().optional(),
        licenceExpiry: z.string().nullable().optional(),
        medicalExpiry: z.string().nullable().optional(),
      })
      .parse(req.body);

    const profession = findProfession(body.profession);
    if (!profession) return res.status(400).json({ message: "Unknown profession" });

    const userId = req.user!.sub;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        profession: profession.code,
        requiresLicence: profession.requiresLicence,
        // Omitting the phone keeps the stored number instead of wiping it.
        ...(body.phone !== undefined ? { phone: body.phone.trim() || null } : {}),
        profileCompletedAt: new Date(),
      },
    });

    const syncDocument = async (category: string, title: string, reference?: string, expiry?: string | null) => {
      if (!expiry) return;
      const existing = await prisma.staffDocument.findFirst({ where: { userId, category } });
      const data = {
        title,
        category,
        reference: reference?.trim() || null,
        expiresAt: new Date(expiry),
      };
      if (existing) await prisma.staffDocument.update({ where: { id: existing.id }, data });
      else {
        await prisma.staffDocument.create({
          data: {
            userId,
            ...data,
            reference: data.reference || (await nextStaffDocumentReference()),
          },
        });
      }
    };

    if (profession.requiresLicence) {
      await syncDocument(
        "LICENCE",
        body.licenceName?.trim() || profession.licenceLabel || "Professional licence",
        body.licenceNumber,
        body.licenceExpiry
      );
    }
    if (profession.requiresMedical) {
      await syncDocument(
        "MEDICAL",
        profession.medicalLabel || "Medical fitness certificate",
        undefined,
        body.medicalExpiry
      );
    }

    res.json({
      profile: {
        profession: user.profession,
        requiresLicence: user.requiresLicence,
        phone: user.phone,
        profileCompletedAt: user.profileCompletedAt,
      },
      profession,
    });
  } catch (error) {
    next(error);
  }
});

/** Create a leave request for the signed-in user. */
router.post("/leave", async (req, res, next) => {
  try {
    const body = z
      .object({
        type: z.string().min(1),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        reason: z.string().optional(),
        signedName: z.string().trim().min(3).max(160).optional(),
      })
      .parse(req.body);

    const me = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { immediateSupervisorId: true },
    });

    const request = await prisma.leaveRequest.create({
      data: {
        userId: req.user!.sub,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason || null,
        supervisorId: me?.immediateSupervisorId || null,
        status: "PENDING",
      },
    });
    if (body.signedName) {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { signatureUrl: true, initialsUrl: true, initialsText: true },
      });
      await prisma.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "LEAVE_REQUEST",
          entityId: request.id,
          decision: "SUBMITTED",
          signedName: body.signedName,
          signatureUrl: user?.signatureUrl || null,
          initialsUrl: user?.initialsUrl || null,
          initialsText: user?.initialsText || null,
        },
      });
    }
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

// --- Personal tasks -------------------------------------------------------

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  dueAt: z.string().nullable().optional(),
  link: z.string().optional(),
});

router.post("/tasks", async (req, res, next) => {
  try {
    const body = taskSchema.parse(req.body);
    const task = await prisma.staffTask.create({
      data: {
        userId: req.user!.sub,
        title: body.title,
        description: body.description || null,
        priority: body.priority || "NORMAL",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        link: body.link || null,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
        dueAt: z.string().nullable().optional(),
        status: z.enum(["OPEN", "DONE"]).optional(),
      })
      .parse(req.body);

    const existing = await prisma.staffTask.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) return res.status(404).json({ message: "Task not found" });

    const task = await prisma.staffTask.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
        ...(body.status
          ? { status: body.status, completedAt: body.status === "DONE" ? new Date() : null }
          : {}),
      },
    });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const deleted = await prisma.staffTask.deleteMany({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!deleted.count) return res.status(404).json({ message: "Task not found" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Personal HR documents -----------------------------------------------

const documentSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["CONTRACT", "ID", "LICENCE", "CERTIFICATE", "MEDICAL", "OTHER"]).optional(),
  reference: z.string().optional(),
  issuedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/documents", async (req, res, next) => {
  try {
    const body = documentSchema.parse(req.body);
    const document = await prisma.staffDocument.create({
      data: {
        userId: req.user!.sub,
        title: body.title,
        category: body.category || "OTHER",
        reference: body.reference?.trim() || (await nextStaffDocumentReference()),
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        fileUrl: body.fileUrl || null,
        notes: body.notes || null,
      },
    });
    await logAudit("HR", "STAFF_DOCUMENT_CREATED", req.user!.username, { documentId: document.id });
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

router.delete("/documents/:id", async (req, res, next) => {
  try {
    const deleted = await prisma.staffDocument.deleteMany({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!deleted.count) return res.status(404).json({ message: "Document not found" });
    await logAudit("HR", "STAFF_DOCUMENT_DELETED", req.user!.username, { documentId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Uploads and electronic signature -------------------------------------

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/staff-documents";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, [".pdf", ".png", ".jpg", ".jpeg"].includes(path.extname(file.originalname).toLowerCase()));
  },
});

/** Attach a scan (licence, certificate, contract) to a document already filed. */
router.post("/documents/:id/file", withFileScan(documentUpload.single("file")), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "A PDF or image file is required" });
    const existing = await prisma.staffDocument.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      select: { id: true },
    });
    if (!existing) {
      fs.unlink(req.file.path, () => undefined);
      return res.status(404).json({ message: "Document not found" });
    }

    const document = await prisma.staffDocument.update({
      where: { id: existing.id },
      data: { fileUrl: `/uploads/staff-documents/${req.file.filename}` },
    });
    await logAudit("HR", "STAFF_DOCUMENT_UPLOADED", req.user!.username, {
      documentId: document.id,
      file: req.file.originalname,
    });
    res.json(document);
  } catch (error) {
    next(error);
  }
});

/**
 * Electronic signature: the person types their full name, which is stamped
 * with the moment of signing. Re-signing rewrites both values.
 */
router.post("/documents/:id/sign", async (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(3) }).parse(req.body);
    const existing = await prisma.staffDocument.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      select: { id: true, title: true },
    });
    if (!existing) return res.status(404).json({ message: "Document not found" });
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { signatureUrl: true, initialsUrl: true, initialsText: true },
    });

    const [document] = await prisma.$transaction([
      prisma.staffDocument.update({
        where: { id: existing.id },
        data: { signatureName: body.name.trim(), signedAt: new Date() },
      }),
      prisma.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "STAFF_DOCUMENT",
          entityId: existing.id,
          decision: "SIGNED",
          signedName: body.name.trim(),
          signatureUrl: user?.signatureUrl || null,
          initialsUrl: user?.initialsUrl || null,
          initialsText: user?.initialsText || null,
          note: existing.title,
        },
      }),
    ]);
    await logAudit("HR", "STAFF_DOCUMENT_SIGNED", req.user!.username, { documentId: document.id });
    res.json(document);
  } catch (error) {
    next(error);
  }
});

// --- Optional e-signature assets ---------------------------------------

const signatureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "signatures");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const signatureUpload = multer({
  storage: signatureStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      return cb(new Error("Upload a PNG, JPG or WebP image"));
    }
    cb(null, true);
  },
});

function removeSignatureFile(url?: string | null) {
  if (!url || !url.startsWith("/uploads/signatures/")) return;
  fs.unlink(path.join(process.cwd(), url.replace(/^\//, "")), () => undefined);
}

/**
 * Upload (or replace) the optional signature and initials images, or save typed
 * initials. Images are flattened onto signed records, while the typed name
 * remains the legal act.
 */
router.post(
  "/signature",
  withFileScan(signatureUpload.fields([
    { name: "signature", maxCount: 1 },
    { name: "initials", maxCount: 1 },
  ])),
  async (req, res, next) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const signatureFile = files?.signature?.[0];
      const initialsFile = files?.initials?.[0];
      const typedInitials =
        typeof req.body?.initialsText === "string"
          ? z
              .string()
              .trim()
              .max(8, "Use at most 8 characters for your initials")
              .regex(/^[\p{L}.\s]*$/u, "Initials can only contain letters and full stops")
              .parse(req.body.initialsText)
              .toUpperCase()
          : undefined;
      if (!signatureFile && !initialsFile && typedInitials === undefined) {
        return res.status(400).json({ message: "Choose a signature or initials image, or type your initials" });
      }
      const current = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { signatureUrl: true, initialsUrl: true },
      });
      const data: {
        signatureUpdatedAt: Date;
        signatureUrl?: string;
        initialsUrl?: string;
        initialsText?: string | null;
      } = {
        signatureUpdatedAt: new Date(),
      };
      if (signatureFile) {
        data.signatureUrl = `/uploads/signatures/${signatureFile.filename}`;
        removeSignatureFile(current?.signatureUrl);
      }
      if (initialsFile) {
        data.initialsUrl = `/uploads/signatures/${initialsFile.filename}`;
        removeSignatureFile(current?.initialsUrl);
      }
      if (typedInitials !== undefined) {
        data.initialsText = typedInitials || null;
      }
      const user = await prisma.user.update({ where: { id: req.user!.sub }, data });
      await logAudit("HR", "SIGNATURE_UPDATED", req.user!.username, {
        signature: Boolean(signatureFile),
        initials: Boolean(initialsFile),
        typedInitials: typedInitials !== undefined,
      });
      res.json({
        signatureUrl: user.signatureUrl,
        initialsUrl: user.initialsUrl,
        initialsText: user.initialsText,
        signatureUpdatedAt: user.signatureUpdatedAt,
      });
    } catch (error) {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      files?.signature?.[0] && fs.unlink(files.signature[0].path, () => undefined);
      files?.initials?.[0] && fs.unlink(files.initials[0].path, () => undefined);
      next(error);
    }
  }
);

router.delete("/signature/:kind", async (req, res, next) => {
  try {
    const kind = req.params.kind;
    if (!["signature", "initials"].includes(kind)) {
      return res.status(400).json({ message: "Unknown signature asset" });
    }
    const current = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { signatureUrl: true, initialsUrl: true },
    });
    const data = kind === "signature" ? { signatureUrl: null } : { initialsUrl: null };
    const user = await prisma.user.update({ where: { id: req.user!.sub }, data });
    removeSignatureFile(kind === "signature" ? current?.signatureUrl : current?.initialsUrl);
    res.json({ signatureUrl: user.signatureUrl, initialsUrl: user.initialsUrl });
  } catch (error) {
    next(error);
  }
});

// --- Round portrait avatars ---------------------------------------------

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "avatars");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      return cb(new Error("Upload a PNG, JPG or WebP portrait"));
    }
    cb(null, true);
  },
});

function removeAvatarFile(url?: string | null) {
  if (!url || !url.startsWith("/uploads/avatars/")) return;
  fs.unlink(path.join(process.cwd(), url.replace(/^\//, "")), () => undefined);
}

/** Upload or replace the signed-in person's portrait. */
router.post("/avatar", withFileScan(avatarUpload.single("avatar")), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a portrait photo" });
    const current = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { avatarUrl: true },
    });
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        avatarUrl: `/uploads/avatars/${req.file.filename}`,
        avatarUpdatedAt: new Date(),
      },
    });
    removeAvatarFile(current?.avatarUrl);
    await logAudit("HR", "AVATAR_UPDATED", req.user!.username, { file: req.file.originalname });
    res.json({
      avatarUrl: user.avatarUrl,
      avatarUpdatedAt: user.avatarUpdatedAt,
    });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    next(error);
  }
});

/** Remove the portrait and fall back to initials. */
router.delete("/avatar", async (req, res, next) => {
  try {
    const current = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { avatarUrl: true },
    });
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { avatarUrl: null, avatarUpdatedAt: new Date() },
    });
    removeAvatarFile(current?.avatarUrl);
    await logAudit("HR", "AVATAR_REMOVED", req.user!.username);
    res.json({ avatarUrl: null });
  } catch (error) {
    next(error);
  }
});

export default router;
