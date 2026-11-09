import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { monthLabel } from "../lib/payroll";
import { canApprovePayroll, canManagePayroll } from "../lib/payrollAccess";

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function managerOnly(req: any, res: any, next: any) {
  if (!canManagePayroll(req.user)) {
    return res.status(403).json({ message: "Only executives, Finance and HR can manage the payroll register." });
  }
  next();
}

function approvalFields(user: any) {
  const approved = canApprovePayroll(user);
  return {
    approvalStatus: approved ? "Approved" : "Pending",
    submittedBy: user.username,
    approvedBy: approved ? user.username : null,
    approvedAt: approved ? new Date() : null,
  };
}

const moneyField = z.coerce.number().min(0).max(100_000_000);

const salarySchema = z.object({
  userId: z.string().min(1),
  baseSalary: moneyField,
  allowance: moneyField.default(0),
  otherEarnings: moneyField.default(0),
  otherDeductions: moneyField.default(0),
  currency: z.string().trim().min(1).max(8).default("ETB"),
  notes: z.string().trim().max(500).optional().nullable(),
  effectiveAt: z.coerce.date().optional(),
});

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

function periodFrom(query: unknown) {
  const now = new Date();
  const parsed = periodSchema.parse(query);
  return {
    year: parsed.year ?? now.getFullYear(),
    month: parsed.month ?? now.getMonth() + 1,
  };
}

function periodBounds(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

router.get("/", async (req: any, res) => {
  try {
    const records = await prisma.salaryRecord.findMany({
      where: canManagePayroll(req.user) ? undefined : { userId: req.user!.sub },
      include: { user: { select: { firstName: true, lastName: true, username: true, department: true } } },
      orderBy: { effectiveAt: "desc" },
    });
    res.json(records);
  } catch {
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
});

// Minimal staff list for payroll positions that do not have HR Suite access.
router.get("/staff", managerOnly, async (_req, res) => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true, firstName: true, lastName: true, username: true, email: true,
        department: true, position: true, employeeNo: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    res.json(staff);
  } catch {
    res.status(500).json({ message: "Failed to fetch staff" });
  }
});

/** CSV template the finance team fills in for a monthly payroll run. */
router.get("/template", managerOnly, (_req, res) => {
  const csv = [
    "username,baseSalary,allowance,otherEarnings,otherDeductions,notes",
    'jdoe,45000,5000,0,0,"Grade 5, Step 2"',
    'abebe,62000,7500,2500,1000,"Overtime and credit union deduction"',
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="monthly-payroll-template.csv"');
  res.send(`\uFEFF${csv}\n`);
});

function normaliseRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      typeof value === "string" ? value.trim() : value,
    ])
  );
}

function numberFrom(value: unknown) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, "");
  return Number(text || 0);
}

/**
 * Import or correct a month's payroll inputs. Rows are matched by username and
 * update the existing record for that month rather than creating duplicates.
 */
router.post("/upload", managerOnly, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Choose a CSV file to upload." });
    }

    const { year, month } = periodFrom(req.query);
    const { start, end } = periodBounds(year, month);
    let rows: Record<string, unknown>[];
    try {
      rows = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      return res.status(400).json({ message: "The file is not a valid CSV. Download the template and try again." });
    }

    if (!rows.length) {
      return res.status(400).json({ message: "The CSV has no payroll rows." });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, raw] of rows.entries()) {
      const row = normaliseRow(raw);
      const line = index + 2;
      const username = String(row.username || row.staffusername || row.employeeno || "").trim();
      if (!username) {
        skipped++;
        errors.push(`Row ${line}: username is required.`);
        continue;
      }

      const user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
        select: { id: true, username: true },
      });
      if (!user) {
        skipped++;
        errors.push(`Row ${line}: no staff member has the username "${username}".`);
        continue;
      }

      const baseSalary = numberFrom(row.basesalary);
      if (baseSalary <= 0) {
        skipped++;
        errors.push(`Row ${line}: baseSalary must be greater than zero.`);
        continue;
      }

      const allowance = Math.max(0, numberFrom(row.allowance));
      const otherEarnings = Math.max(0, numberFrom(row.otherearnings));
      const otherDeductions = Math.max(0, numberFrom(row.otherdeductions));
      const notes = String(row.notes || "").slice(0, 500) || null;

      const existing = await prisma.salaryRecord.findFirst({
        where: { userId: user.id, effectiveAt: { gte: start, lte: end } },
        orderBy: { effectiveAt: "desc" },
      });

      const approval = approvalFields(req.user);
      if (existing) {
        await prisma.salaryRecord.update({
          where: { id: existing.id },
          data: { baseSalary, allowance, otherEarnings, otherDeductions, notes, ...approval },
        });
        updated++;
      } else {
        await prisma.salaryRecord.create({
          data: {
            userId: user.id,
            baseSalary,
            allowance,
            otherEarnings,
            otherDeductions,
            notes,
            currency: "ETB",
            effectiveAt: start,
            ...approval,
          },
        });
        added++;
      }
    }

    res.json({
      year,
      month,
      label: monthLabel(year, month),
      added,
      updated,
      skipped,
      total: rows.length,
      errors,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", managerOnly, async (req, res) => {
  try {
    const input = salarySchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!user) return res.status(404).json({ message: "Staff member not found." });

    const record = await prisma.salaryRecord.create({
      data: {
        userId: input.userId,
        baseSalary: input.baseSalary,
        allowance: input.allowance,
        otherEarnings: input.otherEarnings,
        otherDeductions: input.otherDeductions,
        currency: input.currency,
        notes: input.notes || null,
        effectiveAt: input.effectiveAt || new Date(),
        ...approvalFields(req.user),
      },
    });
    res.status(201).json(record);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.issues[0]?.message || "Invalid salary record." });
    }
    res.status(500).json({ message: "Failed to create salary record." });
  }
});

router.post("/:id/approve", managerOnly, async (req: any, res) => {
  try {
    if (!canApprovePayroll(req.user)) {
      return res.status(403).json({ message: "Finance officers prepare changes; a Finance Manager, HR Manager or executive approves them." });
    }
    const record = await prisma.salaryRecord.update({
      where: { id: req.params.id },
      data: { approvalStatus: "Approved", approvedBy: req.user.username, approvedAt: new Date(), approvalNote: null },
    });
    res.json(record);
  } catch {
    res.status(404).json({ message: "Salary change not found." });
  }
});

router.post("/:id/reject", managerOnly, async (req: any, res) => {
  try {
    if (!canApprovePayroll(req.user)) {
      return res.status(403).json({ message: "Finance officers prepare changes; a Finance Manager, HR Manager or executive rejects them." });
    }
    const record = await prisma.salaryRecord.update({
      where: { id: req.params.id },
      data: { approvalStatus: "Rejected", approvedBy: req.user.username, approvedAt: new Date(), approvalNote: req.body?.note || "Rejected" },
    });
    res.json(record);
  } catch {
    res.status(404).json({ message: "Salary change not found." });
  }
});

router.delete("/:id", managerOnly, async (req, res) => {
  try {
    await prisma.salaryRecord.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
