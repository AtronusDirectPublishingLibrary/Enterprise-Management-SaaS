import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("accounting"));

function genNo(prefix: string) { const d = new Date(); return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req, res) => {
  const [accounts, journals, bills, invoices] = await Promise.all([
    prisma.gLAccount.findMany({ select: { type: true, isActive: true } }),
    prisma.journalEntry.findMany({ select: { status: true, totalDebit: true, totalCredit: true } }),
    prisma.vendorBill.findMany({ select: { status: true, amount: true, balance: true } }),
    prisma.customerInvoice.findMany({ select: { status: true, amount: true, balance: true } }),
  ]);
  res.json({
    accounts: accounts.length,
    activeAccounts: accounts.filter(a=>a.isActive).length,
    journals: journals.length,
    postedJournals: journals.filter(j=>j.status==="POSTED").length,
    apOpen: bills.filter(b=>b.status!=="PAID"&&b.status!=="VOID").reduce((s,b)=>s+Number(b.balance||0),0),
    apTotal: bills.reduce((s,b)=>s+Number(b.amount||0),0),
    arOpen: invoices.filter(i=>i.status!=="PAID"&&i.status!=="VOID").reduce((s,i)=>s+Number(i.balance||0),0),
    arTotal: invoices.reduce((s,i)=>s+Number(i.amount||0),0),
  });
});

// GL Accounts
router.get("/accounts", async (_req, res) => {
  const items = await prisma.gLAccount.findMany({ include: { _count: { select: { journalLines: true } } }, orderBy: [{ type: "asc" }, { code: "asc" }] });
  res.json(items);
});
router.post("/accounts", async (req, res) => {
  const b = req.body || {};
  if (!b.code || !b.name || !b.type) return res.status(400).json({ message: "code, name, type are required" });
  try {
    const item = await prisma.gLAccount.create({ data: { code: String(b.code).trim(), name: String(b.name).trim(), type: String(b.type).toUpperCase(), category: b.category || null, parentId: b.parentId || null, isActive: b.isActive !== false } as any });
    res.status(201).json(item);
  } catch (e: any) { res.status(400).json({ message: e?.code==="P2002" ? "Account code already exists" : (e?.message || "Failed to create account") }); }
});
router.put("/accounts/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const item = await prisma.gLAccount.update({ where: { id: req.params.id }, data: { ...(b.name!==undefined?{name:String(b.name)}:{}), ...(b.category!==undefined?{category:b.category||null}:{}), ...(b.isActive!==undefined?{isActive:!!b.isActive}:{}), ...(b.type!==undefined?{type:String(b.type).toUpperCase()}:{}) } });
    res.json(item);
  } catch { res.status(404).json({ message: "Account not found" }); }
});
router.get("/trial-balance/export", async (_req, res) => {
  const accounts = await prisma.gLAccount.findMany({ where: { isActive: true }, orderBy: [{ type: "asc" }, { code: "asc" }] });
  const lines = await prisma.journalLine.findMany({ where: { entry: { status: "POSTED" } as any }, select: { accountId: true, debit: true, credit: true } });
  const map = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) { const cur = map.get(l.accountId) || { debit: 0, credit: 0 }; cur.debit += Number(l.debit||0); cur.credit += Number(l.credit||0); map.set(l.accountId, cur); }
  const rows = accounts.map(a => { const t = map.get(a.id) || { debit:0, credit:0 }; return { code: a.code, name: a.name, type: a.type, debit: t.debit, credit: t.credit, balance: t.debit - t.credit }; });
  sendCsv(res, "trial-balance.csv", toCsv(rows));
});
router.get("/trial-balance", async (_req, res) => {
  const accounts = await prisma.gLAccount.findMany({ where: { isActive: true }, orderBy: [{ type: "asc" }, { code: "asc" }] });
  const lines = await prisma.journalLine.findMany({ where: { entry: { status: "POSTED" } as any }, select: { accountId: true, debit: true, credit: true } });
  const map = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) { const cur = map.get(l.accountId) || { debit: 0, credit: 0 }; cur.debit += Number(l.debit||0); cur.credit += Number(l.credit||0); map.set(l.accountId, cur); }
  const rows = accounts.map(a => { const t = map.get(a.id) || { debit:0, credit:0 }; const net = t.debit - t.credit; return { ...a, debit: t.debit, credit: t.credit, balance: net }; });
  res.json({ rows, totals: { debit: rows.reduce((s,r)=>s+r.debit,0), credit: rows.reduce((s,r)=>s+r.credit,0) } });
});

// Journals
router.get("/journals/export", async (_req, res) => {
  const items = await prisma.journalEntry.findMany({ include: { lines: true }, orderBy: { date: "desc" } });
  sendCsv(res, "journal-entries.csv", toCsv(items.map(j => ({ entryNo: j.entryNo, date: j.date, status: j.status, source: j.source, memo: j.memo, totalDebit: j.totalDebit, totalCredit: j.totalCredit, lines: j.lines.length }))));
});
router.get("/journals", async (_req, res) => {
  const items = await prisma.journalEntry.findMany({ include: { lines: { include: { account: { select: { id: true, code: true, name: true, type: true } } } } }, orderBy: { date: "desc" }, take: 300 });
  res.json(items);
});
router.post("/journals", async (req, res) => {
  const b = req.body || {};
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (!lines.length) return res.status(400).json({ message: "At least one journal line is required" });
  const normalized = lines.map((l: any) => ({ accountId: String(l.accountId), debit: Math.max(0, Number(l.debit || 0)), credit: Math.max(0, Number(l.credit || 0)), memo: l.memo || null }));
  if (normalized.some((l:any)=>!l.accountId)) return res.status(400).json({ message: "Each line must have an account" });
  if (normalized.some((l:any)=>l.debit===0 && l.credit===0)) return res.status(400).json({ message: "Each line must have a debit or credit amount" });
  const totalDebit = normalized.reduce((s: number, l: any) => s + l.debit, 0);
  const totalCredit = normalized.reduce((s: number, l: any) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ message: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})` });
  try {
    const entry = await prisma.journalEntry.create({ data: { entryNo: b.entryNo || genNo("JE"), date: b.date ? new Date(b.date) : new Date(), memo: b.memo || null, source: b.source || "MANUAL", status: b.status || "POSTED", totalDebit, totalCredit, createdBy: (req as any).user?.username || null, lines: { create: normalized as any } } as any, include: { lines: { include: { account: { select: { id: true, code: true, name: true, type: true } } } } } });
    res.status(201).json(entry);
  } catch (e: any) { res.status(400).json({ message: e?.code==="P2002" ? "Journal entry number already exists" : (e?.message || "Failed to create journal entry") }); }
});
router.put("/journals/:id/void", async (req, res) => {
  try {
    const j = await prisma.journalEntry.findFirst({ where: { id: req.params.id } });
    if (!j) return res.status(404).json({ message: "Journal entry not found" });
    if (j.status === "VOID") return res.status(409).json({ message: "Entry already voided" });
    const updated = await prisma.journalEntry.update({ where: { id: j.id }, data: { status: "VOID", memo: [j.memo, `VOIDED by ${(req as any).user?.username || "system"}`].filter(Boolean).join(" | ") } });
    res.json(updated);
  } catch { res.status(404).json({ message: "Journal entry not found" }); }
});

// AP - Vendor bills
router.get("/bills/export", async (_req, res) => { const items = await prisma.vendorBill.findMany({ orderBy: { issueDate: "desc" } }); sendCsv(res, "vendor-bills.csv", toCsv(items.map(b => ({ billNo: b.billNo, vendorName: b.vendorName, status: b.status, currency: b.currency, amount: b.amount, balance: b.balance, issueDate: b.issueDate, dueDate: b.dueDate, reference: b.reference })))); });
router.get("/bills", async (_req, res) => res.json(await prisma.vendorBill.findMany({ orderBy: { issueDate: "desc" }, take: 400 })));
router.post("/bills", async (req, res) => {
  const b = req.body || {};
  if (!b.vendorName || b.amount == null) return res.status(400).json({ message: "vendorName and amount are required" });
  const amount = Number(b.amount);
  const item = await prisma.vendorBill.create({ data: { billNo: b.billNo || genNo("BILL"), vendorName: String(b.vendorName), vendorId: b.vendorId || null, issueDate: b.issueDate ? new Date(b.issueDate) : new Date(), dueDate: b.dueDate ? new Date(b.dueDate) : null, currency: b.currency || "ETB", amount, balance: b.balance != null ? Number(b.balance) : amount, status: b.status || "OPEN", reference: b.reference || null, notes: b.notes || null } as any });
  res.status(201).json(item);
});
router.put("/bills/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const existing = await prisma.vendorBill.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Bill not found" });
    let data: any = {};
    if (b.status !== undefined) data.status = b.status;
    if (b.notes !== undefined) data.notes = b.notes || null;
    if (b.dueDate !== undefined) data.dueDate = b.dueDate ? new Date(b.dueDate) : null;
    if (b.paymentAmount != null) {
      const pay = Number(b.paymentAmount);
      const newBalance = Math.max(0, Number(existing.balance) - pay);
      data.balance = newBalance;
      data.status = newBalance <= 0 ? "PAID" : "PARTIAL";
    } else if (b.balance !== undefined) {
      data.balance = Number(b.balance);
      data.status = Number(b.balance) <= 0 ? "PAID" : (Number(b.balance) < Number(existing.amount) ? "PARTIAL" : "OPEN");
    }
    res.json(await prisma.vendorBill.update({ where: { id: req.params.id }, data }));
  } catch { res.status(404).json({ message: "Bill not found" }); }
});

// AR - Customer invoices
router.get("/invoices/export", async (_req, res) => { const items = await prisma.customerInvoice.findMany({ orderBy: { issueDate: "desc" } }); sendCsv(res, "customer-invoices.csv", toCsv(items.map(i => ({ invoiceNo: i.invoiceNo, customerName: i.customerName, status: i.status, currency: i.currency, amount: i.amount, balance: i.balance, issueDate: i.issueDate, dueDate: i.dueDate, reference: i.reference })))); });
router.get("/invoices", async (_req, res) => res.json(await prisma.customerInvoice.findMany({ orderBy: { issueDate: "desc" }, take: 400 })));
router.post("/invoices", async (req, res) => {
  const b = req.body || {};
  if (!b.customerName || b.amount == null) return res.status(400).json({ message: "customerName and amount are required" });
  const amount = Number(b.amount);
  const item = await prisma.customerInvoice.create({ data: { invoiceNo: b.invoiceNo || genNo("INV"), customerName: String(b.customerName), issueDate: b.issueDate ? new Date(b.issueDate) : new Date(), dueDate: b.dueDate ? new Date(b.dueDate) : null, currency: b.currency || "ETB", amount, balance: b.balance != null ? Number(b.balance) : amount, status: b.status || "OPEN", reference: b.reference || null, notes: b.notes || null } as any });
  res.status(201).json(item);
});
router.put("/invoices/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const existing = await prisma.customerInvoice.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Invoice not found" });
    let data: any = {};
    if (b.status !== undefined) data.status = b.status;
    if (b.notes !== undefined) data.notes = b.notes || null;
    if (b.dueDate !== undefined) data.dueDate = b.dueDate ? new Date(b.dueDate) : null;
    if (b.paymentAmount != null) {
      const pay = Number(b.paymentAmount);
      const newBalance = Math.max(0, Number(existing.balance) - pay);
      data.balance = newBalance;
      data.status = newBalance <= 0 ? "PAID" : "PARTIAL";
    } else if (b.balance !== undefined) {
      data.balance = Number(b.balance);
      data.status = Number(b.balance) <= 0 ? "PAID" : (Number(b.balance) < Number(existing.amount) ? "PARTIAL" : "OPEN");
    }
    res.json(await prisma.customerInvoice.update({ where: { id: req.params.id }, data }));
  } catch { res.status(404).json({ message: "Invoice not found" }); }
});

export default router;
