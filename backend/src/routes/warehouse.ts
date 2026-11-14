import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("warehouse"));

async function adjustStock(tx: any, itemId: string, warehouseId: string, type: string, quantity: number) {
  const item = await tx.inventoryItem.findFirst({ where: { id: itemId, warehouseId } });
  if (!item) throw new Error("ITEM_NOT_FOUND");
  let newQty = Number(item.quantity || 0);
  const q = Number(quantity);
  if (type === "IN" || type === "TRANSFER_IN" || type === "RETURN") newQty += q;
  else if (type === "OUT" || type === "TRANSFER_OUT" || type === "ISSUE" || type === "DAMAGE") newQty -= q;
  else if (type === "ADJUST") newQty = q;
  else newQty += q;
  return tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: newQty } });
}

router.get("/summary", async (_req, res) => {
  const [warehouses, items, moves] = await Promise.all([
    prisma.warehouse.count(),
    prisma.inventoryItem.findMany({ select: { quantity: true, minLevel: true, reorderPoint: true, unitCost: true } }),
    prisma.stockMovement.count(),
  ]);
  const low = items.filter((i) => Number(i.quantity) <= Number(i.reorderPoint || i.minLevel || 0));
  const totalValue = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitCost || 0), 0);
  res.json({ warehouses, items: items.length, movements: moves, lowStock: low.length, totalValue });
});

router.get("/warehouses", async (_req, res) => {
  const items = await prisma.warehouse.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

router.post("/warehouses", async (req, res) => {
  const b = req.body || {};
  if (!b.code || !b.name) return res.status(400).json({ message: "code and name are required" });
  try {
    const item = await prisma.warehouse.create({ data: { code: String(b.code).trim(), name: String(b.name).trim(), location: b.location || null, type: b.type || "MAIN", status: b.status || "ACTIVE" } as any });
    res.status(201).json(item);
  } catch (e: any) { res.status(400).json({ message: e?.code === "P2002" ? "Warehouse code already exists" : (e?.message || "Failed to create warehouse") }); }
});

router.put("/warehouses/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const item = await prisma.warehouse.update({ where: { id: req.params.id }, data: { ...(b.name !== undefined ? { name: String(b.name) } : {}), ...(b.location !== undefined ? { location: b.location || null } : {}), ...(b.type !== undefined ? { type: b.type } : {}), ...(b.status !== undefined ? { status: b.status } : {}) } });
    res.json(item);
  } catch { res.status(404).json({ message: "Warehouse not found" }); }
});

router.get("/items/export", async (_req, res) => {
  const items = await prisma.inventoryItem.findMany({ include: { warehouse: { select: { name: true, code: true } } }, orderBy: { updatedAt: "desc" } });
  sendCsv(res, "inventory-items.csv", toCsv(items.map(i => ({ sku: i.sku, name: i.name, category: i.category, warehouse: i.warehouse?.name || i.warehouseId, quantity: i.quantity, unit: i.unit, minLevel: i.minLevel, reorderPoint: i.reorderPoint, unitCost: i.unitCost, status: i.status }))));
});
router.get("/items", async (req, res) => {
  const warehouseId = req.query.warehouseId ? String(req.query.warehouseId) : undefined;
  const q = String(req.query.q || "").toLowerCase().trim();
  const low = String(req.query.low || "") === "1";
  const items = await prisma.inventoryItem.findMany({ where: warehouseId ? { warehouseId } : undefined, include: { warehouse: { select: { id: true, name: true, code: true } } }, orderBy: { updatedAt: "desc" } });
  let out = items as any[];
  if (q) out = out.filter((i) => [i.name, i.sku, i.category].some((x) => String(x || "").toLowerCase().includes(q)));
  if (low) out = out.filter((i) => Number(i.quantity) <= Number(i.reorderPoint || i.minLevel || 0));
  res.json(out);
});

router.post("/items", async (req, res) => {
  const b = req.body || {};
  if (!b.warehouseId || !b.sku || !b.name) return res.status(400).json({ message: "warehouseId, sku, name are required" });
  try {
    const item = await prisma.inventoryItem.create({ data: { warehouseId: String(b.warehouseId), sku: String(b.sku).trim(), name: String(b.name).trim(), category: b.category || null, unit: b.unit || "unit", quantity: Number(b.quantity || 0), minLevel: Number(b.minLevel || 0), reorderPoint: Number(b.reorderPoint || 0), unitCost: Number(b.unitCost || 0), status: b.status || "ACTIVE" } as any, include: { warehouse: { select: { id: true, name: true, code: true } } } });
    res.status(201).json(item);
  } catch (e: any) { res.status(400).json({ message: e?.code === "P2002" ? "SKU already exists in this warehouse" : (e?.message || "Failed to create item") }); }
});

router.put("/items/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { ...(b.name !== undefined ? { name: String(b.name) } : {}), ...(b.category !== undefined ? { category: b.category || null } : {}), ...(b.unit !== undefined ? { unit: b.unit || "unit" } : {}), ...(b.minLevel !== undefined ? { minLevel: Number(b.minLevel) } : {}), ...(b.reorderPoint !== undefined ? { reorderPoint: Number(b.reorderPoint) } : {}), ...(b.unitCost !== undefined ? { unitCost: Number(b.unitCost) } : {}), ...(b.status !== undefined ? { status: b.status } : {}), ...(b.sku !== undefined ? { sku: String(b.sku) } : {}) }, include: { warehouse: { select: { id: true, name: true, code: true } } } });
    res.json(item);
  } catch (e: any) { res.status(400).json({ message: e?.code === "P2002" ? "SKU conflict" : "Item not found" }); }
});

router.get("/movements/export", async (_req, res) => {
  const moves = await prisma.stockMovement.findMany({ include: { item: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 2000 });
  sendCsv(res, "stock-movements.csv", toCsv(moves.map(m => ({ createdAt: m.createdAt, type: m.type, item: m.item?.name || m.itemId, sku: m.item?.sku || "", warehouse: m.warehouse?.name || m.warehouseId, quantity: m.quantity, reference: m.reference, reason: m.reason, performedBy: m.performedBy }))));
});
router.get("/movements", async (req, res) => {
  const itemId = req.query.itemId ? String(req.query.itemId) : undefined;
  const moves = await prisma.stockMovement.findMany({ where: itemId ? { itemId } : undefined, include: { item: { select: { id: true, name: true, sku: true } }, warehouse: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  res.json(moves);
});

router.post("/movements", async (req, res) => {
  const b = req.body || {};
  const type = String(b.type || "");
  if (!b.warehouseId || !b.itemId || !type || b.quantity == null) return res.status(400).json({ message: "warehouseId, itemId, type, quantity are required" });
  const qty = Number(b.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: "quantity must be > 0" });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await adjustStock(tx, String(b.itemId), String(b.warehouseId), type, qty);
      if (updated.quantity < 0 && type !== "ADJUST") throw new Error("INSUFFICIENT_STOCK");
      const movement = await tx.stockMovement.create({ data: { warehouseId: String(b.warehouseId), itemId: String(b.itemId), type, quantity: qty, reference: b.reference || null, reason: b.reason || null, performedBy: (req as any).user?.username || null } as any });
      return { movement, item: updated };
    });
    res.status(201).json(result);
  } catch (e: any) {
    if (e?.message === "ITEM_NOT_FOUND") return res.status(404).json({ message: "Inventory item not found in warehouse" });
    if (e?.message === "INSUFFICIENT_STOCK") return res.status(409).json({ message: "Insufficient stock for this operation" });
    res.status(400).json({ message: e?.message || "Failed to record movement" });
  }
});

router.post("/transfer", async (req, res) => {
  const b = req.body || {};
  const { fromWarehouseId, toWarehouseId, itemSku, quantity, reason } = b;
  if (!fromWarehouseId || !toWarehouseId || !itemSku || quantity == null) return res.status(400).json({ message: "fromWarehouseId, toWarehouseId, itemSku, quantity required" });
  if (fromWarehouseId === toWarehouseId) return res.status(400).json({ message: "Source and destination warehouses must differ" });
  const qty = Number(quantity);
  if (qty <= 0) return res.status(400).json({ message: "quantity must be > 0" });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.inventoryItem.findFirst({ where: { warehouseId: String(fromWarehouseId), sku: String(itemSku) } });
      if (!source) throw new Error("SOURCE_NOT_FOUND");
      if (Number(source.quantity) < qty) throw new Error("INSUFFICIENT_STOCK");
      let dest = await tx.inventoryItem.findFirst({ where: { warehouseId: String(toWarehouseId), sku: String(itemSku) } });
      if (!dest) {
        dest = await tx.inventoryItem.create({ data: { warehouseId: String(toWarehouseId), sku: source.sku, name: source.name, category: source.category, unit: source.unit, quantity: 0, minLevel: source.minLevel, reorderPoint: source.reorderPoint, unitCost: source.unitCost, status: "ACTIVE" } as any });
      }
      await adjustStock(tx, source.id, String(fromWarehouseId), "TRANSFER_OUT", qty);
      await adjustStock(tx, dest.id, String(toWarehouseId), "TRANSFER_IN", qty);
      const ref = `TRF-${Date.now()}`;
      await tx.stockMovement.create({ data: { warehouseId: String(fromWarehouseId), itemId: source.id, type: "TRANSFER_OUT", quantity: qty, reference: ref, reason: reason || `Transfer to ${toWarehouseId}`, performedBy: (req as any).user?.username || null } as any });
      await tx.stockMovement.create({ data: { warehouseId: String(toWarehouseId), itemId: dest.id, type: "TRANSFER_IN", quantity: qty, reference: ref, reason: reason || `Transfer from ${fromWarehouseId}`, performedBy: (req as any).user?.username || null } as any });
      return { ok: true, reference: ref };
    });
    res.status(201).json(result);
  } catch (e: any) {
    if (e?.message === "SOURCE_NOT_FOUND") return res.status(404).json({ message: "Source item/SKU not found in source warehouse" });
    if (e?.message === "INSUFFICIENT_STOCK") return res.status(409).json({ message: "Insufficient stock in source warehouse" });
    res.status(400).json({ message: e?.message || "Transfer failed" });
  }
});

export default router;
