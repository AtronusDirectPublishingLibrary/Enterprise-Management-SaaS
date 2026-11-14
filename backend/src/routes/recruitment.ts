import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { DEFAULT_INDUCTION_TASKS } from "../lib/hrCycles";
import { logAudit } from "../lib/audit";
import { isAdminUser } from "../lib/access";

const router = Router();

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "ON_HOLD"] as const;

const jobSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional(),
  openings: z.number().int().min(1).max(99).optional(),
  closesAt: z.string().nullable().optional(),
  targetHire: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "FILLED"]).optional(),
});

/** Vacancies with pipeline counts, for the admin table. */
router.get("/jobs", async (_req, res, next) => {
  try {
    const jobs = await prisma.jobPosting.findMany({
      include: { _count: { select: { applicants: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    const grouped = await prisma.applicant.groupBy({
      by: ["jobId", "stage"],
      _count: { _all: true },
    });

    res.json(
      jobs.map((job) => ({
        ...job,
        applicantCount: job._count.applicants,
        pipeline: grouped
          .filter((row) => row.jobId === job.id)
          .reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.stage]: row._count._all }), {}),
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post("/jobs", async (req, res, next) => {
  try {
    const body = jobSchema.parse(req.body);
    const status = body.status || "DRAFT";
    const job = await prisma.jobPosting.create({
      data: {
        title: body.title,
        department: body.department,
        summary: body.summary || null,
        description: body.description || null,
        requirements: body.requirements || null,
        responsibilities: body.responsibilities || null,
        location: body.location || "Kilinto, Addis Ababa",
        employmentType: body.employmentType || "FULL_TIME",
        openings: body.openings || 1,
        closesAt: body.closesAt ? new Date(body.closesAt) : null,
        targetHire: body.targetHire ? new Date(body.targetHire) : null,
        status,
        publishedAt: status === "OPEN" ? new Date() : null,
      },
    });
    await logAudit("HR", "VACANCY_CREATED", req.user!.username, { jobId: job.id, title: job.title });
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.put("/jobs/:id", async (req, res, next) => {
  try {
    const body = jobSchema.partial().parse(req.body);
    const existing = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Vacancy not found" });

    const job = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.department ? { department: body.department } : {}),
        ...(body.summary !== undefined ? { summary: body.summary || null } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.requirements !== undefined ? { requirements: body.requirements || null } : {}),
        ...(body.responsibilities !== undefined ? { responsibilities: body.responsibilities || null } : {}),
        ...(body.location !== undefined ? { location: body.location || null } : {}),
        ...(body.employmentType ? { employmentType: body.employmentType } : {}),
        ...(body.openings ? { openings: body.openings } : {}),
        ...(body.closesAt !== undefined ? { closesAt: body.closesAt ? new Date(body.closesAt) : null } : {}),
        ...(body.targetHire !== undefined ? { targetHire: body.targetHire ? new Date(body.targetHire) : null } : {}),
        ...(body.status
          ? {
              status: body.status,
              publishedAt: body.status === "OPEN" ? existing.publishedAt || new Date() : existing.publishedAt,
            }
          : {}),
      },
    });
    await logAudit("HR", "VACANCY_UPDATED", req.user!.username, { jobId: job.id, status: job.status });
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.delete("/jobs/:id", async (req, res, next) => {
  try {
    await prisma.jobPosting.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** Every applicant, optionally filtered to one vacancy. */
router.get("/applicants", async (req, res, next) => {
  try {
    const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
    const applicants = await prisma.applicant.findMany({
      where: jobId ? { jobId } : undefined,
      include: { job: { select: { id: true, title: true, department: true } } },
      orderBy: [{ stageUpdatedAt: "desc" }, { createdAt: "desc" }],
    });
    res.json(applicants);
  } catch (error) {
    next(error);
  }
});

router.get("/jobs/:id/applicants", async (req, res, next) => {
  try {
    const applicants = await prisma.applicant.findMany({
      where: { jobId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(applicants);
  } catch (error) {
    next(error);
  }
});

/** Move an applicant through the pipeline, score them or record feedback. */
router.put("/applicants/:id", async (req, res, next) => {
  try {
    const body = z
      .object({
        stage: z.enum(STAGES).optional(),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        notes: z.string().nullable().optional(),
        interviewAt: z.string().nullable().optional(),
        rejectionReason: z.string().nullable().optional(),
      })
      .parse(req.body);

    const applicant = await prisma.applicant.update({
      where: { id: req.params.id },
      data: {
        ...(body.stage ? { stage: body.stage, stageUpdatedAt: new Date() } : {}),
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.interviewAt !== undefined
          ? { interviewAt: body.interviewAt ? new Date(body.interviewAt) : null }
          : {}),
        ...(body.rejectionReason !== undefined ? { rejectionReason: body.rejectionReason } : {}),
        ...(body.stage === "REJECTED" ? { rejectionReason: body.rejectionReason || "Not successful" } : {}),
      },
    });
    res.json(applicant);
  } catch (error) {
    next(error);
  }
});

/**
 * Deploy a hire: create the staff account, open their induction checklist and
 * close the vacancy when the last opening is filled.
 */
router.post("/applicants/:id/hire", async (req, res, next) => {
  try {
    const body = z
      .object({
        username: z.string().min(3).optional(),
        startDate: z.string().optional(),
        jobTitle: z.string().optional(),
        department: z.string().optional(),
      })
      .parse(req.body || {});

    const applicant = await prisma.applicant.findUnique({
      where: { id: req.params.id },
      include: { job: true },
    });
    if (!applicant) return res.status(404).json({ message: "Applicant not found" });
    if (applicant.userId) return res.status(400).json({ message: "This applicant already has an account" });

    const [firstName, ...rest] = applicant.name.trim().split(/\s+/);
    const lastName = rest.join(" ") || null;

    let base = (body.username || applicant.email.split("@")[0] || "staff")
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 24) || "staff";
    let username = base;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${base}${suffix}`;
      suffix += 1;
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const user = await prisma.user.create({
      data: {
        tenantId: (req as any).user?.tenantId,
        username,
        passwordHash: await bcrypt.hash("Welcome123!", 12),
        firstName,
        lastName,
        email: applicant.email,
        phone: applicant.phone,
        role: "staff",
        department: body.department || applicant.job.department,
        jobTitle: body.jobTitle || applicant.job.title,
        hireDate: startDate,
        forceChange: true,
      } as any,
    });

    const induction = await prisma.induction.create({
      data: {
        userId: user.id,
        startDate,
        status: "ACTIVE",
        tasks: {
          create: DEFAULT_INDUCTION_TASKS.map((task, index) => ({
            title: task.title,
            category: task.category,
            dueAt: new Date(startDate.getTime() + task.offsetDays * 86_400_000),
            sortOrder: index,
          })),
        },
      },
    });

    await prisma.applicant.update({
      where: { id: applicant.id },
      data: { stage: "HIRED", hiredAt: new Date(), userId: user.id, stageUpdatedAt: new Date() },
    });

    const hiredCount = await prisma.applicant.count({
      where: { jobId: applicant.jobId, stage: "HIRED" },
    });
    if (hiredCount >= applicant.job.openings) {
      await prisma.jobPosting.update({ where: { id: applicant.jobId }, data: { status: "FILLED" } });
    }

    res.status(201).json({
      user: { id: user.id, username: user.username, forceChange: user.forceChange },
      induction: { id: induction.id, tasks: DEFAULT_INDUCTION_TASKS.length },
    });
  } catch (error) {
    next(error);
  }
});

// --- Recruitment requisitions (request form → signed approval → vacancy) ---

const requestSchema = z.object({
  positionTitle: z.string().trim().min(2).max(180),
  department: z.string().trim().min(2).max(180),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional(),
  positions: z.number().int().min(1).max(99).optional(),
  reason: z.enum(["NEW", "REPLACEMENT", "TEMPORARY"]).optional(),
  grade: z.string().trim().max(80).optional().nullable(),
  budgetStatus: z.enum(["BUDGETED", "UNBUDGETED", "APPROVED"]).optional(),
  targetStartDate: z.string().nullable().optional(),
  justification: z.string().trim().max(4000).optional().nullable(),
  requirements: z.string().trim().max(8000).optional().nullable(),
});

async function nextRequestNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.recruitmentRequest.count({
    where: { requestNumber: { startsWith: `RR-${year}-` } },
  });
  for (let index = count + 1; index < count + 1000; index += 1) {
    const candidate = `RR-${year}-${String(index).padStart(4, "0")}`;
    const exists = await prisma.recruitmentRequest.findUnique({ where: { requestNumber: candidate } });
    if (!exists) return candidate;
  }
  return `RR-${year}-${Date.now()}`;
}

function canDecideRecruitment(user: Express.Request["user"]) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return ["executive"].includes(user.role) ||
    /human resource|hr manager|strategy/i.test(user.position || "");
}

router.get("/requests", async (req, res, next) => {
  try {
    const requests = await prisma.recruitmentRequest.findMany({
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, username: true, position: true, department: true } },
        approver: { select: { id: true, firstName: true, lastName: true, username: true } },
        jobPosting: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const signatures = await prisma.signatureRecord.findMany({
      where: {
        entityType: "RECRUITMENT_REQUEST",
        entityId: { in: requests.map((request) => request.id) },
      },
      include: { user: { select: { firstName: true, lastName: true, username: true } } },
      orderBy: { signedAt: "desc" },
    });
    res.json(
      requests.map((request) => ({
        ...request,
        signatures: signatures.filter((signature) => signature.entityId === request.id),
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post("/requests", async (req, res, next) => {
  try {
    const body = requestSchema.parse(req.body);
    const request = await prisma.recruitmentRequest.create({
      data: {
        requestNumber: await nextRequestNumber(),
        requestedById: req.user!.sub,
        positionTitle: body.positionTitle,
        department: body.department,
        employmentType: body.employmentType || "FULL_TIME",
        positions: body.positions || 1,
        reason: body.reason || "NEW",
        grade: body.grade || null,
        budgetStatus: body.budgetStatus || "BUDGETED",
        targetStartDate: body.targetStartDate ? new Date(body.targetStartDate) : null,
        justification: body.justification || null,
        requirements: body.requirements || null,
      },
    });
    await logAudit("HR", "RECRUITMENT_REQUEST_CREATED", req.user!.username, {
      requestId: request.id,
      requestNumber: request.requestNumber,
    });
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

router.put("/requests/:id", async (req, res, next) => {
  try {
    const existing = await prisma.recruitmentRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Recruitment request not found" });
    if (existing.status !== "DRAFT" && !isAdminUser(req.user!)) {
      return res.status(400).json({ message: "Only draft requests can be edited" });
    }
    if (existing.requestedById !== req.user!.sub && !isAdminUser(req.user!)) {
      return res.status(403).json({ message: "Only the requester can edit this request" });
    }
    const body = requestSchema.partial().parse(req.body);
    const request = await prisma.recruitmentRequest.update({
      where: { id: existing.id },
      data: {
        ...(body.positionTitle !== undefined ? { positionTitle: body.positionTitle } : {}),
        ...(body.department !== undefined ? { department: body.department } : {}),
        ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
        ...(body.positions !== undefined ? { positions: body.positions } : {}),
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
        ...(body.grade !== undefined ? { grade: body.grade || null } : {}),
        ...(body.budgetStatus !== undefined ? { budgetStatus: body.budgetStatus } : {}),
        ...(body.targetStartDate !== undefined
          ? { targetStartDate: body.targetStartDate ? new Date(body.targetStartDate) : null }
          : {}),
        ...(body.justification !== undefined ? { justification: body.justification || null } : {}),
        ...(body.requirements !== undefined ? { requirements: body.requirements || null } : {}),
      },
    });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.delete("/requests/:id", async (req, res, next) => {
  try {
    const existing = await prisma.recruitmentRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Recruitment request not found" });
    if (existing.status !== "DRAFT" && !isAdminUser(req.user!)) {
      return res.status(400).json({ message: "Only a draft request can be deleted" });
    }
    await prisma.recruitmentRequest.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** Requester signs and submits the requisition to HR. */
router.post("/requests/:id/submit", async (req, res, next) => {
  try {
    const body = z.object({ signedName: z.string().trim().min(3).max(160) }).parse(req.body);
    const existing = await prisma.recruitmentRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Recruitment request not found" });
    if (existing.requestedById !== req.user!.sub && !isAdminUser(req.user!)) {
      return res.status(403).json({ message: "Only the requester can submit this request" });
    }
    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      return res.status(400).json({ message: `This request is already ${existing.status.toLowerCase()}` });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { signatureUrl: true, initialsUrl: true, initialsText: true },
    });
    const [request] = await prisma.$transaction([
      prisma.recruitmentRequest.update({
        where: { id: existing.id },
        data: { status: "SUBMITTED", rejectionReason: null },
      }),
      prisma.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "RECRUITMENT_REQUEST",
          entityId: existing.id,
          decision: "SUBMITTED",
          signedName: body.signedName,
          signatureUrl: user?.signatureUrl || null,
          initialsUrl: user?.initialsUrl || null,
          initialsText: user?.initialsText || null,
        },
      }),
    ]);
    const approvers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ["admin", "executive"] } },
          { position: { contains: "Human Resource", mode: "insensitive" } },
        ],
      },
      select: { username: true },
    });
    const recipients = approvers.filter((approver) => approver.username !== req.user!.username);
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((approver) => ({
          recipient: approver.username,
          type: "STATUS_CHANGE",
          title: "Recruitment request awaiting approval",
          body: `${request.requestNumber} · ${request.positionTitle} (${request.department})`,
          link: "/recruitment",
        })),
      });
    }
    await logAudit("HR", "RECRUITMENT_REQUEST_SUBMITTED", req.user!.username, {
      requestId: request.id,
      requestNumber: request.requestNumber,
    });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

/** HR / executive signs the decision; approval can open a draft vacancy. */
router.post("/requests/:id/decision", async (req, res, next) => {
  try {
    const body = z
      .object({
        decision: z.enum(["APPROVED", "REJECTED"]),
        signedName: z.string().trim().min(3).max(160),
        rejectionReason: z.string().trim().max(2000).optional(),
        note: z.string().trim().max(2000).optional(),
        createVacancy: z.boolean().optional(),
      })
      .parse(req.body);
    if (!canDecideRecruitment(req.user)) {
      return res.status(403).json({ message: "Your position cannot approve recruitment requests" });
    }
    const existing = await prisma.recruitmentRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Recruitment request not found" });
    if (existing.status !== "SUBMITTED") {
      return res.status(400).json({ message: "Only submitted requests can be decided" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { signatureUrl: true, initialsUrl: true, initialsText: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.recruitmentRequest.update({
        where: { id: existing.id },
        data: {
          status: body.decision,
          approverId: req.user!.sub,
          decidedAt: new Date(),
          rejectionReason: body.decision === "REJECTED" ? body.rejectionReason || "Not approved" : null,
        },
      });
      let jobPosting = null;
      if (body.decision === "APPROVED" && body.createVacancy !== false) {
        jobPosting = await tx.jobPosting.create({
          data: {
            title: request.positionTitle,
            department: request.department,
            summary: request.justification || null,
            description: request.justification || null,
            requirements: request.requirements || null,
            employmentType: request.employmentType,
            openings: request.positions,
            targetHire: request.targetStartDate,
            status: "DRAFT",
          },
        });
        await tx.recruitmentRequest.update({
          where: { id: request.id },
          data: { jobPostingId: jobPosting.id },
        });
      }
      await tx.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "RECRUITMENT_REQUEST",
          entityId: request.id,
          decision: body.decision,
          signedName: body.signedName,
          signatureUrl: user?.signatureUrl || null,
          initialsUrl: user?.initialsUrl || null,
          initialsText: user?.initialsText || null,
          note: body.note || body.rejectionReason || null,
        },
      });
      return { request, jobPosting };
    });

    const requester = await prisma.user.findUnique({
      where: { id: existing.requestedById },
      select: { username: true },
    });
    if (requester) {
      await prisma.notification.create({
        data: {
          recipient: requester.username,
          type: "STATUS_CHANGE",
          title: `Recruitment request ${body.decision.toLowerCase()}`,
          body: `${existing.requestNumber} · ${existing.positionTitle}${result.jobPosting ? " — draft vacancy created" : ""}`,
          link: "/recruitment",
        },
      }).catch(() => undefined);
    }
    await logAudit("HR", `RECRUITMENT_REQUEST_${body.decision}`, req.user!.username, {
      requestId: existing.id,
      jobPostingId: result.jobPosting?.id || null,
    });
    res.json({ ...result.request, jobPosting: result.jobPosting });
  } catch (error) {
    next(error);
  }
});

export default router;
