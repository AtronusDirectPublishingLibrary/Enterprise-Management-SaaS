import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("maintenance"));

function genNo(prefix: string) { const d = new Date(); return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req, res) => {
  const [assets, wos] = await Promise.all([
    prisma.asset.findMany({ select: { status: true, purchaseCost: true } }),
    prisma.maintenanceWorkOrder.findMany({ select: { status: true, priority: true, type: true, laborCost: true, partsCost: true, downtimeHours: true } }),
  ]);
  const openWOs = wos.filter(w => ["OPEN","IN_PROGRESS","ON_HOLD"].includes(w.status));
  res.json({
    assets: assets.length,
    activeAssets: assets.filter(a=>a.status==="ACTIVE").length,
    inMaintenance: assets.filter(a=>a.status==="IN_MAINTENANCE").length,
    openWorkOrders: openWOs.length,
    overdueCritical: wos.filter(w=>w.priority==="CRITICAL" && w.status!=="COMPLETED" && w.status!=="CANCELLED").length,
    totalMaintenanceCost: wos.reduce((s,w)=>s+Number(w.laborCost||0)+Number(w.partsCost||0),0),
    totalDowntimeHours: wos.reduce((s,w)=>s+Number(w.downtimeHours||0),0),
  });
});

router.get("/assets/export", async (_req, res) => {
  const items = await prisma.asset.findMany({ orderBy: { updatedAt: "desc" } });
  sendCsv(res, "assets.csv", toCsv(items.map(a => ({ assetTag: a.assetTag, name: a.name, category: a.category, status: a.status, location: a.location, custodian: a.custodian, serialNo: a.serialNo, purchaseDate: a.purchaseDate, purchaseCost: a.purchaseCost, warrantyExpiry: a.warrantyExpiry }))));
});
router.get("/assets", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const status = String(req.query.status || "");
  const items = await prisma.asset.findMany({ include: { _count: { select: { workOrders: true } } }, orderBy: { updatedAt: "desc" } });
  let out = items as any[];
  if (status) out = out.filter(a=>a.status===status);
  if (q) out = out.filter(a=> [a.name,a.assetTag,a.category,a.location,a.custodian].some(x=>String(x||"").toLowerCase().includes(q)));
  res.json(out);
});

router.post("/assets", async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ message: "name is required" });
  try {
    const item = await prisma.asset.create({ data: { assetTag: b.assetTag || genNo("AST"), name: String(b.name).trim(), category: b.category || null, location: b.location || null, custodian: b.custodian || null, status: b.status || "ACTIVE", purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : null, purchaseCost: b.purchaseCost != null ? Number(b.purchaseCost) : null, warrantyExpiry: b.warrantyExpiry ? new Date(b.warrantyExpiry) : null, serialNo: b.serialNo || null, notes: b.notes || null } as any });
    res.status(201).json(item);
  } catch (e: any) { res.status(400).json({ message: e?.code==="P2002" ? "Asset tag already exists" : (e?.message || "Failed to create asset") }); }
});

router.put("/assets/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const item = await prisma.asset.update({ where: { id: req.params.id }, data: { ...(b.name!==undefined?{name:String(b.name)}:{}), ...(b.category!==undefined?{category:b.category||null}:{}), ...(b.location!==undefined?{location:b.location||null}:{}), ...(b.custodian!==undefined?{custodian:b.custodian||null}:{}), ...(b.status!==undefined?{status:b.status}:{}), ...(b.serialNo!==undefined?{serialNo:b.serialNo||null}:{}), ...(b.notes!==undefined?{notes:b.notes||null}:{}), ...(b.purchaseCost!==undefined?{purchaseCost:b.purchaseCost!=null?Number(b.purchaseCost):null}:{}), ...(b.purchaseDate!==undefined?{purchaseDate:b.purchaseDate?new Date(b.purchaseDate):null}:{}), ...(b.warrantyExpiry!==undefined?{warrantyExpiry:b.warrantyExpiry?new Date(b.warrantyExpiry):null}:{}) } });
    res.json(item);
  } catch { res.status(404).json({ message: "Asset not found" }); }
});

router.get("/work-orders/export", async (_req, res) => {
  const items = await prisma.maintenanceWorkOrder.findMany({ include: { asset: { select: { name: true, assetTag: true } } }, orderBy: { createdAt: "desc" } });
  sendCsv(res, "work-orders.csv", toCsv(items.map(w => ({ workOrderNo: w.workOrderNo, asset: w.asset?.name || w.assetName || "", type: w.type, priority: w.priority, status: w.status, assignedTo: w.assignedTo, scheduledAt: w.scheduledAt, completedAt: w.completedAt, laborCost: w.laborCost, partsCost: w.partsCost, downtimeHours: w.downtimeHours, description: w.description }))));
});
router.get("/work-orders", async (req, res) => {
  const status = String(req.query.status || "");
  const priority = String(req.query.priority || "");
  const items = await prisma.maintenanceWorkOrder.findMany({ where: { ...(status?{status}:{}), ...(priority?{priority}:{}) }, include: { asset: { select: { id: true, assetTag: true, name: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  res.json(items);
});

router.post("/work-orders", async (req, res) => {
  const b = req.body || {};
  try {
    const item = await prisma.maintenanceWorkOrder.create({ data: { workOrderNo: b.workOrderNo || genNo("WO"), assetId: b.assetId || null, assetName: b.assetName || null, type: b.type || "CORRECTIVE", priority: b.priority || "MEDIUM", status: b.status || "OPEN", description: b.description || null, reportedBy: b.reportedBy || (req as any).user?.username || null, assignedTo: b.assignedTo || null, scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null, completedAt: b.completedAt ? new Date(b.completedAt) : null, laborCost: Number(b.laborCost || 0), partsCost: Number(b.partsCost || 0), downtimeHours: Number(b.downtimeHours || 0), notes: b.notes || null } as any, include: { asset: { select: { id: true, assetTag: true, name: true } } } });
    if (item.assetId && item.status === "IN_PROGRESS") {
      await prisma.asset.update({ where: { id: item.assetId }, data: { status: "IN_MAINTENANCE" } }).catch(()=>{});
    }
    res.status(201).json(item);
  } catch (e: any) { res.status(400).json({ message: e?.code==="P2002" ? "Work order number exists" : (e?.message || "Failed to create work order") }); }
});

router.put("/work-orders/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const existing = await prisma.maintenanceWorkOrder.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Work order not found" });
    const status = b.status ?? existing.status;
    const data: any = {
      ...(b.status !== undefined ? { status: b.status } : {}),
      ...(b.priority !== undefined ? { priority: b.priority } : {}),
      ...(b.assignedTo !== undefined ? { assignedTo: b.assignedTo || null } : {}),
      ...(b.scheduledAt !== undefined ? { scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null } : {}),
      ...(b.laborCost !== undefined ? { laborCost: Number(b.laborCost) } : {}),
      ...(b.partsCost !== undefined ? { partsCost: Number(b.partsCost) } : {}),
      ...(b.downtimeHours !== undefined ? { downtimeHours: Number(b.downtimeHours) } : {}),
      ...(b.notes !== undefined ? { notes: b.notes || null } : {}),
      ...(b.description !== undefined ? { description: b.description || null } : {}),
      ...(b.type !== undefined ? { type: b.type } : {}),
    };
    if (status === "COMPLETED" && !existing.completedAt) data.completedAt = b.completedAt ? new Date(b.completedAt) : new Date();
    else if (b.completedAt !== undefined) data.completedAt = b.completedAt ? new Date(b.completedAt) : null;
    const item = await prisma.maintenanceWorkOrder.update({ where: { id: req.params.id }, data, include: { asset: { select: { id: true, assetTag: true, name: true } } } });
    if (item.assetId) {
      if (status === "IN_PROGRESS") await prisma.asset.update({ where: { id: item.assetId }, data: { status: "IN_MAINTENANCE" } }).catch(()=>{});
      if (status === "COMPLETED" || status === "CANCELLED") {
        const otherOpen = await prisma.maintenanceWorkOrder.count({ where: { assetId: item.assetId, id: { not: item.id }, status: { in: ["OPEN","IN_PROGRESS","ON_HOLD"] } } });
        if (otherOpen === 0) await prisma.asset.update({ where: { id: item.assetId }, data: { status: "ACTIVE" } }).catch(()=>{});
      }
    }
    res.json(item);
  } catch { res.status(404).json({ message: "Work order not found" }); }
});

export default router;
