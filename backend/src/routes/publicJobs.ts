import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/resumes";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

const PUBLIC_FIELDS = {
  id: true,
  title: true,
  department: true,
  summary: true,
  description: true,
  requirements: true,
  responsibilities: true,
  location: true,
  employmentType: true,
  openings: true,
  closesAt: true,
  publishedAt: true,
  createdAt: true,
} as const;

/** GET /api/careers — vacancies currently open to the public. */
router.get("/", async (_req, res) => {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { status: "OPEN" },
      select: PUBLIC_FIELDS,
      orderBy: { publishedAt: "desc" },
    });
    res.json(jobs);
  } catch {
    res.status(500).json({ error: "Failed to fetch vacancies" });
  }
});

/** GET /api/careers/:id — one vacancy. */
router.get("/:id", async (req, res) => {
  try {
    const job = await prisma.jobPosting.findFirst({
      where: { id: req.params.id, status: "OPEN" },
      select: PUBLIC_FIELDS,
    });
    if (!job) return res.status(404).json({ error: "Vacancy not found" });
    res.json(job);
  } catch {
    res.status(500).json({ error: "Failed to fetch vacancy" });
  }
});

/** POST /api/careers/:id/apply — application with an optional CV. */
router.post("/:id/apply", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, notes, coverLetter } = req.body as Record<string, string>;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const job = await prisma.jobPosting.findFirst({ where: { id: req.params.id, status: "OPEN" } });
    if (!job) return res.status(404).json({ error: "Vacancy is no longer open" });

    const duplicate = await prisma.applicant.findFirst({
      where: { jobId: job.id, email: email.trim().toLowerCase() },
    });
    if (duplicate) {
      return res.status(409).json({ error: "You have already applied for this vacancy." });
    }

    const file = req.file as Express.Multer.File | undefined;
    await prisma.applicant.create({
      data: {
        jobId: job.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        coverLetter: coverLetter?.trim() || null,
        resumeUrl: file ? `/uploads/resumes/${file.filename}` : null,
        source: "WEBSITE",
        stage: "APPLIED",
      },
    });

    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to submit application" });
  }
});

export default router;
