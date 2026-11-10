import { prisma } from "./prisma";

/**
 * Human-readable, collision-free references for records created anywhere in
 * the system. The counter is incremented inside a single transaction, so two
 * simultaneous uploads cannot receive the same number.
 */
export async function nextSequence(scope: string, year = new Date().getFullYear()) {
  const row = await prisma.numberSequence.upsert({
    where: { scope_year: { scope, year } },
    create: { scope, year, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });
  return row.value;
}

export const DOCUMENT_TYPE_CODES: Record<string, string> = {
  Policy: "POL",
  Procedure: "PRC",
  Guideline: "GDL",
  Report: "RPT",
  Form: "FRM",
  Template: "TPL",
  Plan: "PLN",
  Other: "OTH",
};

export function documentPrefix(type?: string | null) {
  return DOCUMENT_TYPE_CODES[String(type || "").trim()] || "DOC";
}

export async function nextDocumentNumber(type?: string | null, year = new Date().getFullYear()) {
  const prefix = documentPrefix(type);
  const value = await nextSequence(`document:${prefix}`, year);
  return `EB-${prefix}-${year}-${String(value).padStart(4, "0")}`;
}

export async function nextStaffDocumentReference(year = new Date().getFullYear()) {
  const value = await nextSequence("staff-document", year);
  return `SD-${year}-${String(value).padStart(4, "0")}`;
}