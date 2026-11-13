import { Prisma } from "@prisma/client";

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Writes one row per changed field. Call this with the same transaction that
 * performs the update: if the update rolls back, the history rolls back too.
 */
export async function recordFieldChanges(
  tx: Prisma.TransactionClient,
  input: {
    entityType: string;
    entityId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    fields: string[];
    user?: { id?: string; username?: string };
    requestId?: string;
  },
) {
  const rows = input.fields
    .map((field) => ({
      entityType: input.entityType,
      entityId: input.entityId,
      field,
      oldValue: text(input.before[field]),
      newValue: text(input.after[field]),
      changedById: input.user?.id || null,
      changedByName: input.user?.username || null,
      requestId: input.requestId || null,
    }))
    .filter((row) => row.oldValue !== row.newValue);

  if (rows.length) await tx.fieldChange.createMany({ data: rows });
  return rows.length;
}
