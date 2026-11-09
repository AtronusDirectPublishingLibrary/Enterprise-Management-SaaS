import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth, requireRole } from "../middleware/auth";
import { mailConfigured, sendMail } from "../lib/mailer";
import { calculatePayroll, monthLabel } from "../lib/payroll";
import { ORGANISATION } from "../lib/consolidatedReport";
import { canManagePayroll } from "../lib/payrollAccess";

const router = Router();
router.use(requireAuth);

function managerOnly(req: any, res: any, next: any) {
  if (!canManagePayroll(req.user)) {
    return res.status(403).json({ message: "Only executives, Finance and HR can manage payslips for all staff." });
  }
  next();
}

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

function periodBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { start, end };
}

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  department: true,
  jobTitle: true,
  position: true,
  employeeNo: true,
  hireDate: true,
  phone: true,
} as const;

/** Latest salary record effective on or before the pay period end. */
async function salaryAsAt(end: Date) {
  const records = await prisma.salaryRecord.findMany({
    where: { effectiveAt: { lte: end }, approvalStatus: "Approved" },
    include: { user: { select: employeeSelect } },
    orderBy: { effectiveAt: "desc" },
  });
  const latest = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    if (!latest.has(record.userId)) latest.set(record.userId, record);
  }
  return [...latest.values()];
}

/** Payroll register preview for a month: who would be paid and how much. */
router.get("/register", requireAccess("payroll"), managerOnly, async (req, res, next) => {
  try {
    // A missing period means "this pay month"; the register is also safe to
    // open directly (e.g. from a bookmark) without query parameters.
    const now = new Date();
    const { year, month } = periodSchema.parse({
      year: req.query.year ?? now.getFullYear(),
      month: req.query.month ?? now.getMonth() + 1,
    });
    const { end } = periodBounds(year, month);
    const [salaries, payslips] = await Promise.all([
      salaryAsAt(end),
      prisma.payslip.findMany({ where: { year, month } }),
    ]);
    const byUser = new Map(payslips.map((slip) => [slip.userId, slip]));

    const rows = salaries.map((record) => {
      const calc = calculatePayroll(
        record.baseSalary,
        record.allowance,
        record.otherEarnings,
        record.otherDeductions
      );
      const slip = byUser.get(record.userId);
      return {
        userId: record.userId,
        employee: record.user,
        currency: record.currency,
        ...calc,
        payslipId: slip?.id || null,
        status: slip?.status || "Not generated",
        sentAt: slip?.sentAt || null,
      };
    });
    res.json({
      year,
      month,
      label: monthLabel(year, month),
      mailConfigured: mailConfigured(),
      totalGross: rows.reduce((sum, row) => sum + row.gross, 0),
      totalNet: rows.reduce((sum, row) => sum + row.net, 0),
      totalTax: rows.reduce((sum, row) => sum + row.tax, 0),
      totalPension: rows.reduce((sum, row) => sum + row.pension, 0),
      totalOtherEarnings: rows.reduce((sum, row) => sum + row.otherEarnings, 0),
      totalOtherDeductions: rows.reduce((sum, row) => sum + row.otherDeductions, 0),
      rows,
    });
  } catch (e) { next(e); }
});

router.get("/", requireAccess("payroll"), async (req, res, next) => {
  try {
    const query = z
      .object({
        year: z.coerce.number().int().optional(),
        month: z.coerce.number().int().optional(),
        userId: z.string().optional(),
      })
      .parse(req.query);
    const manager = canManagePayroll(req.user);
    if (query.userId && !manager && query.userId !== req.user!.sub) {
      return res.status(403).json({ message: "You can only view your own payslips." });
    }
    const payslips = await prisma.payslip.findMany({
      where: {
        ...(query.year ? { year: query.year } : {}),
        ...(query.month ? { month: query.month } : {}),
        userId: manager ? (query.userId || undefined) : req.user!.sub,
      },
      include: { user: { select: employeeSelect } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { net: "desc" }],
      take: 1000,
    });
    res.json(payslips);
  } catch (e) { next(e); }
});

/** Create or refresh a payslip for everyone on the payroll for the month. */
router.post("/generate", requireAccess("payroll"), managerOnly, async (req, res, next) => {
  try {
    const { year, month } = periodSchema.parse(req.body);
    const { end } = periodBounds(year, month);
    const salaries = await salaryAsAt(end);
    if (!salaries.length) {
      return res.status(400).json({
        message: "No salary records are effective for this month. Add them in Payroll first.",
      });
    }

    let created = 0;
    let updated = 0;
    for (const record of salaries) {
      const calc = calculatePayroll(
        record.baseSalary,
        record.allowance,
        record.otherEarnings,
        record.otherDeductions
      );
      const existing = await prisma.payslip.findUnique({
        where: { userId_year_month: { userId: record.userId, year, month } },
      });
      await prisma.payslip.upsert({
        where: { userId_year_month: { userId: record.userId, year, month } },
        create: {
          userId: record.userId,
          year,
          month,
          baseSalary: calc.baseSalary,
          allowance: calc.allowance,
          otherEarnings: calc.otherEarnings,
          gross: calc.gross,
          pension: calc.pension,
          tax: calc.tax,
          otherDeductions: calc.otherDeductions,
          net: calc.net,
          currency: record.currency,
        },
        update: {
          baseSalary: calc.baseSalary,
          allowance: calc.allowance,
          otherEarnings: calc.otherEarnings,
          gross: calc.gross,
          pension: calc.pension,
          tax: calc.tax,
          otherDeductions: calc.otherDeductions,
          net: calc.net,
          currency: record.currency,
        },
      });
      if (existing) updated++; else created++;
    }
    res.status(201).json({ year, month, label: monthLabel(year, month), created, updated, total: salaries.length });
  } catch (e) { next(e); }
});

async function loadPayslip(id: string) {
  return prisma.payslip.findUnique({
    where: { id },
    include: { user: { select: employeeSelect } },
  });
}

router.get("/:id", requireAuth, async (req: any, res, next) => {
  try {
    const payslip = await loadPayslip(req.params.id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found." });
    const privileged = canManagePayroll(req.user);
    if (!privileged && payslip.userId !== req.user.sub) {
      return res.status(403).json({ message: "This payslip belongs to another staff member." });
    }
    res.json({
      ...payslip,
      label: monthLabel(payslip.year, payslip.month),
      employerPension: payslip.baseSalary * 0.11,
      organisation: ORGANISATION,
      mailConfigured: mailConfigured(),
    });
  } catch (e) { next(e); }
});

function payslipEmailHtml(payslip: NonNullable<Awaited<ReturnType<typeof loadPayslip>>>) {
  const employee = payslip.user;
  const name = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.username;
  const row = (label: string, value: string, emphasis = false) =>
    `<tr><td style="padding:7px 12px;color:#55606e;border-bottom:1px solid #ece5d3">${label}</td><td style="padding:7px 12px;text-align:right;border-bottom:1px solid #ece5d3;${emphasis ? "font-weight:700;color:#0B2545" : ""}">${value}</td></tr>`;
  const fmt = (value: number) =>
    `${payslip.currency} ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#1a1a1a">
    <div style="background:#0B2545;border-bottom:4px solid #C9A227;padding:20px 24px;color:#fff">
      <div style="font-size:20px;font-weight:700;letter-spacing:1px">${ORGANISATION.name}</div>
      <div style="color:#E7D48A;font-size:12px">${ORGANISATION.tagline}</div>
    </div>
    <div style="padding:22px 24px">
      <h2 style="margin:0 0 4px;color:#0B2545">Payslip — ${monthLabel(payslip.year, payslip.month)}</h2>
      <p style="margin:0 0 16px;color:#55606e;font-size:13px">${name}${employee.employeeNo ? ` · ${employee.employeeNo}` : ""}${employee.position ? ` · ${employee.position}` : ""}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${row("Base salary", fmt(payslip.baseSalary))}
        ${row("Allowances", fmt(payslip.allowance))}
        ${payslip.otherEarnings ? row("Other earnings", fmt(payslip.otherEarnings)) : ""}
        ${row("Gross pay", fmt(payslip.gross), true)}
        ${row("Pension (employee 7%)", `- ${fmt(payslip.pension)}`)}
        ${row("Income tax (PAYE)", `- ${fmt(payslip.tax)}`)}
        ${payslip.otherDeductions ? row("Other deductions", `- ${fmt(payslip.otherDeductions)}`) : ""}
        ${row("Net pay", fmt(payslip.net), true)}
      </table>
      <p style="font-size:12px;color:#55606e;margin-top:18px">Employer pension contribution (11%): ${fmt(payslip.baseSalary * 0.11)}. Please report any discrepancy to Human Resource &amp; Administration within five working days.</p>
    </div>
    <div style="padding:14px 24px;background:#F5F2EA;color:#55606e;font-size:11px">${ORGANISATION.name} · ${ORGANISATION.address}<br/>This payslip is confidential and intended only for the named employee.</div>
  </div>`;
}

router.post("/:id/send", requireAccess("payroll"), managerOnly, async (req, res, next) => {
  try {
    const payslip = await loadPayslip(req.params.id);
    if (!payslip) return res.status(404).json({ message: "Payslip not found." });
    const email = payslip.user.email;
    if (!email) return res.status(400).json({ message: "This staff member has no email address on file." });

    const name = [payslip.user.firstName, payslip.user.lastName].filter(Boolean).join(" ") || payslip.user.username;
    const result = await sendMail({
      to: [email],
      subject: `Payslip — ${monthLabel(payslip.year, payslip.month)} · ${ORGANISATION.shortName}`,
      html: payslipEmailHtml(payslip),
      text: `Dear ${name}, your ${monthLabel(payslip.year, payslip.month)} payslip has a net pay of ${payslip.currency} ${payslip.net.toLocaleString()}.`,
    });

    if (result.status === "SENT") {
      await prisma.payslip.update({
        where: { id: payslip.id },
        data: { status: "Sent", sentAt: new Date(), sentTo: email },
      });
    }
    res.json({
      status: result.status,
      to: email,
      message:
        result.status === "SENT"
          ? `Payslip emailed to ${email}.`
          : result.status === "SKIPPED"
          ? "SMTP is not configured, so no email was sent. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM."
          : `Email failed: ${result.error || "unknown error"}`,
    });
  } catch (e) { next(e); }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.payslip.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

/** Months that have payroll history, for the payslip month picker. */
router.get("/months/available", requireAccess("payroll"), async (req: any, res, next) => {
  try {
    const records = await prisma.salaryRecord.findMany({
      where: canManagePayroll(req.user) ? undefined : { userId: req.user!.sub },
      select: { effectiveAt: true },
      orderBy: { effectiveAt: "asc" },
    });
    const set = new Map<string, { year: number; month: number; label: string }>();
    for (const record of records) {
      const year = record.effectiveAt.getFullYear();
      const month = record.effectiveAt.getMonth() + 1;
      set.set(`${year}-${month}`, { year, month, label: monthLabel(year, month) });
    }
    res.json([...set.values()].sort((a, b) => b.year - a.year || b.month - a.month));
  } catch (e) { next(e); }
});

export default router;
