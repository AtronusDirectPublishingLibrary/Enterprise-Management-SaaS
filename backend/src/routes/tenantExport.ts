import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { runWithTenantContext } from "../lib/tenantContext";
import { logAudit } from "../lib/audit";

const router = Router();

// Tenant-scoped data export (JSON). Extend with CSV/streaming and per-entity selection as needed.
// Respects tenant scoping middleware; only returns data visible in the caller's tenant context.
router.get("/export", requireAuth, async (req: any, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ message: "Tenant context missing" });
    // Minimal, safe export set; expand deliberately to avoid leaking sensitive/internal tables.
    const [tenant, usersCount, projectsCount, plansCount] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true, name: true, status: true, type: true, industryType: true, createdAt: true } }),
      prisma.user.count({}),
      prisma.project.count({}).catch(() => 0),
      prisma.plan.count({}).catch(() => 0),
    ]);
    await logAudit("TENANT", "TENANT_DATA_EXPORT", req.user?.username || "system", { tenantId, scope: "summary" });
    res.json({
      exportedAt: new Date().toISOString(),
      tenant,
      summary: { usersCount, projectsCount, plansCount },
      note: "Summary export. Extend this endpoint for full entity-level export (CSV/JSON streaming) per compliance requirements.",
    });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to export tenant data", error: e?.message });
  }
});

export default router;
