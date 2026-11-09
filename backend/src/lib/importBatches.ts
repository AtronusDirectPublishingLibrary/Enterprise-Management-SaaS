import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type ImportInput = {
  module: "PMS_PROJECTS" | "PLAN_ITEMS";
  planId?: string | null;
  user: { sub: string; username: string; role: string };
  fileName?: string | null;
  summary: Record<string, unknown>;
  snapshot: Record<string, unknown>;
};

export async function recordImport(input: ImportInput) {
  return prisma.importBatch.create({
    data: {
      module: input.module,
      planId: input.planId || null,
      userId: input.user.sub,
      userName: input.user.username,
      fileName: input.fileName || null,
      summary: input.summary as Prisma.InputJsonValue,
      snapshot: input.snapshot as Prisma.InputJsonValue,
    },
  });
}

export async function listImports(module: ImportInput["module"], planId?: string) {
  return prisma.importBatch.findMany({
    where: { module, ...(planId ? { planId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      module: true,
      planId: true,
      userName: true,
      fileName: true,
      summary: true,
      createdAt: true,
      rolledBackAt: true,
    },
  });
}

const PLAN_ITEM_FIELDS = [
  "kind", "parentId", "linkedItemId", "code", "title", "description", "owner",
  "sortOrder", "unit", "baseline", "targetValue", "currentValue", "direction",
  "frequency", "dataSource", "isFeatured", "startDate", "endDate", "budget",
  "status", "progress",
] as const;

/** Restore an import created by the two CSV importers. */
export async function rollbackImport(batchId: string, user: { sub: string; role: string }) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Import batch not found.");
  if (batch.rolledBackAt) throw new Error("This import has already been rolled back.");
  if (user.role !== "admin" && batch.userId !== user.sub) {
    throw new Error("Only the importer or an administrator can roll this back.");
  }

  const snapshot = batch.snapshot as any;

  if (batch.module === "PLAN_ITEMS") {
    await prisma.$transaction(async (tx) => {
      for (const targetId of snapshot.targetsCreated || []) {
        await tx.planKpiTarget.deleteMany({ where: { id: targetId } });
      }
      for (const target of snapshot.targetsUpdated || []) {
        await tx.planKpiTarget.update({
          where: { id: target.before.id },
          data: {
            target: target.before.target,
            targetLabel: target.before.targetLabel,
            actual: target.before.actual,
            note: target.before.note,
          },
        });
      }
      for (const id of snapshot.created || []) {
        await tx.planItem.deleteMany({ where: { id } });
      }
      for (const entry of snapshot.updated || []) {
        const before = entry.before || {};
        const data: Record<string, unknown> = {};
        for (const field of PLAN_ITEM_FIELDS) {
          if (field in before) {
            data[field] = ["startDate", "endDate"].includes(field) && before[field]
              ? new Date(before[field])
              : before[field];
          }
        }
        await tx.planItem.update({ where: { id: entry.id }, data });
      }
    });
  } else {
    await prisma.$transaction(async (tx) => {
      for (const projectId of snapshot.created || []) {
        await tx.project.deleteMany({ where: { projectId } });
      }
      for (const entry of snapshot.updated || []) {
        const before = entry.before || {};
        await tx.project.update({
          where: { projectId: entry.projectId },
          data: {
            title: before.title,
            description: before.description,
            sourceOfFunds: before.sourceOfFunds,
            startDate: new Date(before.startDate),
            endDate: new Date(before.endDate),
            status: before.status,
            priority: before.priority,
            progress: before.progress,
            projectCategory: before.projectCategory,
            leadDirectorate: before.leadDirectorate,
            leadDivision: before.leadDivision,
            projectManager: before.projectManager,
          },
        });
      }
    });
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rolledBackAt: new Date() },
  });
  return {
    createdRemoved: (snapshot.created || []).length,
    updatedRestored: (snapshot.updated || []).length,
  };
}
