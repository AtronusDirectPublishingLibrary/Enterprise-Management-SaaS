import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { DEFAULT_INDUCTION_TASKS } from "../lib/hrCycles";
import { logAudit } from "../lib/audit";

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
      },
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

export default router;
