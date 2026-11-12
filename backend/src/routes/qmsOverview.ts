import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const dueCutoff = new Date(now);
    dueCutoff.setDate(dueCutoff.getDate() + 30);

    const [
      documentsTotal,
      documentsApproved,
      documentsInReview,
      documentsDue,
      deviationsTotal,
      deviationsOpen,
      deviationsInvestigating,
      criticalDeviationsOpen,
      capasTotal,
      capasOpen,
      capasPendingVerification,
      capasOverdue,
      changesTotal,
      changesInReview,
      changesApproved,
      changesImplemented,
      recentDocuments,
      recentDeviations,
      recentCapas,
      recentChanges,
    ] = await prisma.$transaction([
      prisma.qmsDocument.count(),
      prisma.qmsDocument.count({ where: { status: "APPROVED" } }),
      prisma.qmsDocument.count({ where: { status: "IN_REVIEW" } }),
      prisma.qmsDocument.count({
        where: { status: "APPROVED", reviewDueAt: { not: null, lte: dueCutoff } },
      }),
      prisma.qmsDeviation.count(),
      prisma.qmsDeviation.count({ where: { status: "OPEN" } }),
      prisma.qmsDeviation.count({ where: { status: "UNDER_INVESTIGATION" } }),
      prisma.qmsDeviation.count({ where: { status: { not: "CLOSED" }, severity: "Critical" } }),
      prisma.qmsCapa.count(),
      prisma.qmsCapa.count({ where: { status: { not: "CLOSED" } } }),
      prisma.qmsCapa.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.qmsCapa.count({
        where: { status: { not: "CLOSED" }, dueAt: { not: null, lt: now } },
      }),
      prisma.qmsChangeControl.count(),
      prisma.qmsChangeControl.count({ where: { status: "IN_REVIEW" } }),
      prisma.qmsChangeControl.count({ where: { status: "APPROVED" } }),
      prisma.qmsChangeControl.count({ where: { status: "IMPLEMENTED" } }),
      prisma.qmsDocument.findMany({
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.qmsDeviation.findMany({
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.qmsCapa.findMany({
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.qmsChangeControl.findMany({
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const recent = [
      ...recentDocuments.map((item) => ({ ...item, type: "Document", path: `/qms/documents/${item.id}` })),
      ...recentDeviations.map((item) => ({ ...item, type: "Deviation", path: "/qms/deviations" })),
      ...recentCapas.map((item) => ({ ...item, type: "CAPA", path: "/qms/capa" })),
      ...recentChanges.map((item) => ({ ...item, type: "Change", path: "/qms/changes" })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);

    res.json({
      documents: {
        total: documentsTotal,
        approved: documentsApproved,
        inReview: documentsInReview,
        dueForReview: documentsDue,
      },
      deviations: {
        total: deviationsTotal,
        open: deviationsOpen,
        investigating: deviationsInvestigating,
        criticalOpen: criticalDeviationsOpen,
      },
      capas: {
        total: capasTotal,
        open: capasOpen,
        pendingVerification: capasPendingVerification,
        overdue: capasOverdue,
      },
      changes: {
        total: changesTotal,
        inReview: changesInReview,
        approved: changesApproved,
        implemented: changesImplemented,
      },
      recent,
    });
  } catch (error) {
    console.error("qms overview failed", error);
    res.status(500).json({ error: "Failed to load QMS overview" });
  }
});

export default router;
