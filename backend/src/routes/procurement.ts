import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("procurement"));

function genNo(prefix: string) {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const PO_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"] as const;
const canReceive = new Set(["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"]);

function calcTotals(items: any[], tax = 0) {
  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  return { subtotal, tax: Number(tax || 0), total: subtotal + Number(tax || 0) };
}

// --- Vendors ---
router.get("/vendors/export", async (_req, res) => {
  const vendors = await prisma.vendor.findMany({ orderBy: { createdAt: "desc" } });
  sendCsv(res, "vendors.csv", toCsv(vendors.map(v => ({ name: v.name, code: v.code, status: v.status, category: v.category, contactName: v.contactName, email: v.email, phone: v.phone, paymentTerms: v.paymentTerms, rating: v.rating }))));
});
router.get("/vendors", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim();
  const vendors = await prisma.vendor.findMany({ orderBy: { createdAt: "desc" } });
  let filtered = vendors as any[];
  if (status) filtered = filtered.filter((v) => v.status === status);
  if (q) filtered = filtered.filter((v) => [v.name, v.code, v.email, v.category, v.contactName].some((x) => String(x || "").toLowerCase().includes(q)));
  const poAgg = await prisma.purchaseOrder.groupBy({ by: ["vendorId"], _count: { _all: true }, _sum: { total: true } }).catch(() => [] as any[]);
  const map = new Map(poAgg.map((x: any) => [x.vendorId, x]));
  res.json(filtered.map((v) => ({ ...v, poCount: map.get(v.id)?._count?._all || 0, spend: map.get(v.id)?._sum?.total || 0 })));
});

router.post("/vendors", async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ message: "Vendor name is required" });
  const item = await prisma.vendor.create({
    data: {
      name: String(b.name).trim(),
      code: b.code?.trim() || null,
      contactName: b.contactName || null,
      email: b.email || null,
      phone: b.phone || null,
      address: b.address || null,
      category: b.category || null,
      status: b.status || "ACTIVE",
      rating: b.rating != null ? Math.max(0, Math.min(5, Number(b.rating))) : 0,
      paymentTerms: b.paymentTerms || null,
      notes: b.notes || null,
    } as any,
  });
  await logAudit("PROCUREMENT", "VENDOR_CREATED", (req as any).user?.username || "system", { vendorId: item.id, name: item.name });
  res.status(201).json(item);
});

router.put("/vendors/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
        ...(b.code !== undefined ? { code: b.code || null } : {}),
        ...(b.contactName !== undefined ? { contactName: b.contactName || null } : {}),
        ...(b.email !== undefined ? { email: b.email || null } : {}),
        ...(b.phone !== undefined ? { phone: b.phone || null } : {}),
        ...(b.address !== undefined ? { address: b.address || null } : {}),
        ...(b.category !== undefined ? { category: b.category || null } : {}),
        ...(b.status !== undefined ? { status: b.status } : {}),
        ...(b.rating !== undefined ? { rating: Math.max(0, Math.min(5, Number(b.rating))) } : {}),
        ...(b.paymentTerms !== undefined ? { paymentTerms: b.paymentTerms || null } : {}),
        ...(b.notes !== undefined ? { notes: b.notes || null } : {}),
      },
    });
    res.json(updated);
  } catch { res.status(404).json({ message: "Vendor not found" }); }
});

router.delete("/vendors/:id", async (req, res) => {
  try {
    const poCount = await prisma.purchaseOrder.count({ where: { vendorId: req.params.id } });
    if (poCount > 0) return res.status(409).json({ message: "Cannot delete vendor with existing purchase orders. Set status to INACTIVE instead." });
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch { res.status(404).json({ message: "Vendor not found" }); }
});

// --- Purchase Orders ---
router.get("/summary", async (_req, res) => {
  const [vendors, pos] = await Promise.all([
    prisma.vendor.count(),
    prisma.purchaseOrder.findMany({ select: { status: true, total: true } }),
  ]);
  const openStatuses = new Set(["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"]);
  const open = pos.filter((p) => openStatuses.has(p.status));
  res.json({
    vendors,
    totalPOs: pos.length,
    openPOs: open.length,
    totalSpend: pos.filter((p) => p.status !== "CANCELLED").reduce((s, p) => s + Number(p.total || 0), 0),
    byStatus: PO_STATUSES.map((s) => ({ status: s, count: pos.filter((p) => p.status === s).length })),
  });
});

router.get("/purchase-orders/export", async (_req, res) => {
  const items = await prisma.purchaseOrder.findMany({ include: { vendor: true, items: true }, orderBy: { createdAt: "desc" } });
  sendCsv(res, "purchase-orders.csv", toCsv(items.map(p => ({ poNumber: p.poNumber, vendor: p.vendor?.name || "", status: p.status, currency: p.currency, subtotal: p.subtotal, tax: p.tax, total: p.total, itemsCount: p.items.length, orderDate: p.orderDate, expectedAt: p.expectedAt, requestedBy: p.requestedBy, approvedBy: p.approvedBy }))));
});
router.get("/purchase-orders", async (req, res) => {
  const status = String(req.query.status || "").trim();
  const vendorId = String(req.query.vendorId || "").trim();
  const q = String(req.query.q || "").trim().toLowerCase();
  const items = await prisma.purchaseOrder.findMany({
    where: { ...(status ? { status } : {}), ...(vendorId ? { vendorId } : {}) },
    include: { vendor: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  const filtered = q ? items.filter((p) => [p.poNumber, p.vendor?.name, p.notes].some((x) => String(x || "").toLowerCase().includes(q))) : items;
  res.json(filtered);
});

router.get("/purchase-orders/:id", async (req, res) => {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id }, include: { vendor: true, items: true } });
  if (!po) return res.status(404).json({ message: "Purchase order not found" });
  res.json(po);
});

router.post("/purchase-orders", async (req, res) => {
  const b = req.body || {};
  if (!b.vendorId) return res.status(400).json({ message: "vendorId is required" });
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) return res.status(400).json({ message: "At least one line item is required" });
  const normalizedItems = items.map((it: any) => {
    const qty = Math.max(0.001, Number(it.quantity || 1));
    const price = Math.max(0, Number(it.unitPrice || 0));
    return {
      description: String(it.description || "Item").trim(),
      sku: it.sku || null,
      quantity: qty,
      unit: it.unit || "unit",
      unitPrice: price,
      total: qty * price,
      receivedQty: 0,
    };
  });
  const totals = calcTotals(normalizedItems, b.tax);
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: b.poNumber || genNo("PO"),
      vendorId: String(b.vendorId),
      status: PO_STATUSES.includes(b.status) ? b.status : "DRAFT",
      orderDate: b.orderDate ? new Date(b.orderDate) : new Date(),
      expectedAt: b.expectedAt ? new Date(b.expectedAt) : null,
      currency: b.currency || "ETB",
      ...totals,
      notes: b.notes || null,
      requestedBy: (req as any).user?.username || null,
      items: { create: normalizedItems as any },
    } as any,
    include: { vendor: true, items: true },
  });
  await logAudit("PROCUREMENT", "PO_CREATED", (req as any).user?.username || "system", { poId: po.id, poNumber: po.poNumber, total: po.total });
  res.status(201).json(po);
});

router.put("/purchase-orders/:id", async (req, res) => {
  const b = req.body || {};
  const existing = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id }, include: { items: true } });
  if (!existing) return res.status(404).json({ message: "Purchase order not found" });
  try {
    if (existing.status === "CLOSED" || existing.status === "CANCELLED") return res.status(409).json({ message: `Cannot modify a ${existing.status} purchase order` });
    if (Array.isArray(b.items) && b.items.length) {
      const normalizedItems = b.items.map((it: any) => {
        const qty = Math.max(0.001, Number(it.quantity || 1));
        const price = Math.max(0, Number(it.unitPrice || 0));
        return { description: String(it.description || "Item").trim(), sku: it.sku || null, quantity: qty, unit: it.unit || "unit", unitPrice: price, total: qty * price, receivedQty: Number(it.receivedQty || 0) };
      });
      const totals = calcTotals(normalizedItems, b.tax ?? existing.tax);
      const po = await prisma.$transaction(async (tx) => {
        await tx.purchaseOrderItem.deleteMany({ where: { orderId: existing.id } });
        return tx.purchaseOrder.update({
          where: { id: existing.id },
          data: {
            ...(b.status && PO_STATUSES.includes(b.status) ? { status: b.status } : {}),
            ...(b.notes !== undefined ? { notes: b.notes || null } : {}),
            ...(b.expectedAt !== undefined ? { expectedAt: b.expectedAt ? new Date(b.expectedAt) : null } : {}),
            ...totals,
            items: { create: normalizedItems as any },
          } as any,
          include: { vendor: true, items: true },
        });
      });
      return res.json(po);
    }
    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...(b.status && PO_STATUSES.includes(b.status) ? { status: b.status } : {}),
        ...(b.notes !== undefined ? { notes: b.notes || null } : {}),
        ...(b.expectedAt !== undefined ? { expectedAt: b.expectedAt ? new Date(b.expectedAt) : null } : {}),
        ...(b.status === "APPROVED" ? { approvedBy: (req as any).user?.username || existing.approvedBy } : {}),
      },
      include: { vendor: true, items: true },
    });
    res.json(po);
  } catch (e: any) { res.status(400).json({ message: e?.message || "Failed to update purchase order" }); }
});

router.post("/purchase-orders/:id/receive", async (req, res) => {
  const b = req.body || {};
  const po = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id }, include: { items: true, vendor: true } });
  if (!po) return res.status(404).json({ message: "Purchase order not found" });
  if (!canReceive.has(po.status)) return res.status(409).json({ message: `Cannot receive a PO in ${po.status} status` });
  const receipts: Array<{ itemId: string; qty: number }> = Array.isArray(b.items) ? b.items : [];
  try {
    const updated = await prisma.$transaction(async (tx) => {
      for (const r of receipts) {
        const item = po.items.find((i) => i.id === r.itemId);
        if (!item) continue;
        const qty = Math.max(0, Number(r.qty || 0));
        const newReceived = Math.min(Number(item.quantity), Number(item.receivedQty || 0) + qty);
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: newReceived } });
      }
      const refreshed = await tx.purchaseOrder.findFirst({ where: { id: po.id }, include: { items: true } });
      const allReceived = refreshed?.items.every((i) => Number(i.receivedQty) >= Number(i.quantity));
      const anyReceived = refreshed?.items.some((i) => Number(i.receivedQty) > 0);
      const status = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;
      return tx.purchaseOrder.update({ where: { id: po.id }, data: { status }, include: { vendor: true, items: true } });
    });
    await logAudit("PROCUREMENT", "PO_RECEIVED", (req as any).user?.username || "system", { poId: po.id, status: updated.status });
    res.json(updated);
  } catch (e: any) { res.status(400).json({ message: e?.message || "Failed to receive items" }); }
});

export default router;
