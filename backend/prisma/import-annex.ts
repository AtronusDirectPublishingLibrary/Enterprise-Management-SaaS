import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

/**
 * Import the consolidated Annex workbook into the annual plan.
 *
 *   npm run import:annex -- --file ..\docs\annex.xlsx --dry-run
 *   npm run import:annex -- --file ..\docs\annex.xlsx --replace-activities
 *
 * Two layouts are understood:
 *  - Gantt/sectioned sheet (Objective → Major Activity → Sub-Activity → cost lines,
 *    with one column per month) — the EBPE consolidated Annex.
 *  - Flat sheet with an explicit MA/Ref column.
 *
 * Rows become ACTIVITY items beneath the MA.4.1–MA.4.7 objectives, grouped by
 * sub-activity. The script never invents rows and never rewrites objective budgets:
 * it reconciles line totals against them before writing, and refuses to write on a
 * mismatch unless --allow-mismatch is passed.
 */

interface ParsedLine {
  rowNumber: number;
  ma: string;
  groupCode: string | null;
  groupTitle: string | null;
  code: string | null;
  title: string;
  owner: string | null;
  budget: number | null;
  description: string | null;
  start: Date | null;
  end: Date | null;
}

interface ParsedSheet {
  layout: "gantt" | "flat";
  sheet: string;
  headerRow: number;
  columns: string;
  lines: ParsedLine[];
  skipped: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function normalize(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellText(cell: ExcelJS.Cell | undefined | null): string {
  if (!cell) return "";
  const target = cell.isMerged && cell.master ? cell.master : cell;
  const value = target.value as unknown;
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const anyValue = value as {
      richText?: { text: string }[];
      result?: unknown;
      text?: string;
    };
    if (anyValue.richText) return anyValue.richText.map((part) => part.text).join("").trim();
    if (anyValue.result !== undefined) return scalarText(anyValue.result);
    if (anyValue.text) return anyValue.text.trim();
  }
  return "";
}

function scalarText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
}

function parseBudget(text: string): number | null {
  if (!text) return null;
  const cleaned = text
    .replace(/\u00a0/g, " ")
    .replace(/etb|birr|\/=/gi, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");
  const negative = /^\(.*\)$/.test(cleaned);
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return negative ? -Math.abs(value) : value;
}

/** "MA.4.3", "4.3", "Objective 4" → "MA.4.3" style code. */
function parseMajorActivity(text: string): string | null {
  const match = text.match(/\b(?:MA\s*\.?\s*)?4\s*[.\-]\s*([1-7])\b/i);
  return match ? `MA.4.${match[1]}` : null;
}

const HEADER_ALIASES: Record<"ma" | "title" | "owner" | "budget" | "quarter" | "unit" | "target", string[]> = {
  ma: ["ma", "ma code", "major activity", "major activity code", "component", "component code", "ref", "reference", "code"],
  title: ["activity", "activity description", "description", "sub-activity", "sub activity", "task", "intervention", "activity name", "particulars"],
  owner: ["responsible", "responsibility", "owner", "responsible unit", "responsible party", "unit", "department", "implementer"],
  budget: ["budget", "amount", "total budget", "cost", "etb", "budget etb", "budget (etb)", "total cost"],
  quarter: ["quarter", "q", "timing", "period", "schedule", "implementation period", "quarterly plan"],
  unit: ["uom", "measure", "output unit"],
  target: ["target", "quantity", "output", "annual target"],
};

function matchHeader(header: string, aliases: string[]): boolean {
  return aliases.some(
    (alias) => header === alias || header.startsWith(`${alias} `) || header.startsWith(`${alias}(`) || header.startsWith(`${alias} `)
  );
}

function detectFlatHeader(sheet: ExcelJS.Worksheet): { rowNumber: number; map: Record<string, number> } | null {
  const limit = Math.min(sheet.rowCount, 25);
  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const map: Record<string, number> = {};
    row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const header = normalize(cellText(cell));
      if (!header) return;
      for (const key of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
        if (map[key]) continue;
        if (matchHeader(header, HEADER_ALIASES[key]) && !(key === "budget" && /usd/.test(header))) map[key] = columnNumber;
      }
    });
    if (map.title && Object.keys(map).length >= 2) return { rowNumber, map };
  }
  return null;
}

function monthFromHeader(text: string): { year: number; month: number } | null {
  const match = text.match(/^([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].toLowerCase());
  if (month < 0) return null;
  return { year: Number(match[2]), month };
}

function detectGanttHeader(sheet: ExcelJS.Worksheet): { rowNumber: number; monthColumns: Map<number, { year: number; month: number }> } | null {
  const limit = Math.min(sheet.rowCount, 20);
  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const monthColumns = new Map<number, { year: number; month: number }>();
    let hasTitle = false;
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      const header = cellText(row.getCell(column));
      if (!header) continue;
      const month = monthFromHeader(header);
      if (month) monthColumns.set(column, month);
      else if (matchHeader(normalize(header), HEADER_ALIASES.title)) hasTitle = true;
    }
    if (hasTitle && monthColumns.size >= 3) return { rowNumber, monthColumns };
  }
  return null;
}

/** Column numbers for the description/owner/budget/ref cells of a Gantt sheet. */
function ganttColumns(sheet: ExcelJS.Worksheet, headerRow: number) {
  const columns = { description: 0, owner: 0, budget: 0, funding: 0, code: 0, subRef: 0 };
  const header = sheet.getRow(headerRow);
  for (let column = 1; column <= sheet.columnCount; column += 1) {
    const text = normalize(cellText(header.getCell(column)));
    if (!text) continue;
    if (!columns.description && matchHeader(text, HEADER_ALIASES.title)) columns.description = column;
    else if (!columns.owner && matchHeader(text, HEADER_ALIASES.owner)) columns.owner = column;
    else if (!columns.budget && matchHeader(text, HEADER_ALIASES.budget) && !/usd/.test(text)) columns.budget = column;
    else if (!columns.funding && text.startsWith("funding")) columns.funding = column;
    else if (!columns.code && (text.startsWith("act") || text === "ref" || text === "code")) columns.code = column;
    else if (!columns.subRef && text.startsWith("sub ref")) columns.subRef = column;
  }
  return columns;
}

function parseGanttSheet(sheet: ExcelJS.Worksheet, planStart: Date, planEnd: Date): ParsedSheet | null {
  const header = detectGanttHeader(sheet);
  if (!header) return null;
  const columns = ganttColumns(sheet, header.rowNumber);
  if (!columns.description || !columns.budget) return null;

  const lines: ParsedLine[] = [];
  let currentMa: string | null = null;
  let groupCode: string | null = null;
  let groupTitle: string | null = null;
  let skipped = 0;

  for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const description = cellText(row.getCell(columns.description));
    if (!description) continue;

    const objective = description.match(/^Objective\s+(\d+)/i);
    const major = description.match(/^MAJOR ACTIVITY\s+(\d+)/i);
    if (objective) {
      currentMa = `MA.4.${objective[1]}`;
      groupCode = null;
      groupTitle = null;
      continue;
    }
    if (major) {
      currentMa = `MA.4.${major[1]}`;
      groupCode = null;
      groupTitle = null;
      continue;
    }
    const sub = description.match(/^Sub-Activity\s+([0-9]+\s*[A-Z]?)\s*[:\-]?\s*(.*)$/i);
    if (sub) {
      groupCode = sub[1].replace(/\s+/g, "").toUpperCase();
      groupTitle = sub[2]?.trim() || `Sub-activity ${groupCode}`;
      continue;
    }
    if (/^(sub[-\s]?total|total|grand total|consolidated total)\b/i.test(description)) {
      skipped += 1;
      continue;
    }

    const reconciliation = /^Reconciliation\b/i.test(description);
    const code = cellText(row.getCell(columns.code));
    const isLine = reconciliation ? true : /^\d+(\.\d+)+$/.test(code);
    if (!isLine) {
      skipped += 1;
      continue;
    }

    let start: Date | null = null;
    let end: Date | null = null;
    for (const [column, month] of header.monthColumns) {
      if (!cellText(row.getCell(column))) continue;
      const windowStart = new Date(Date.UTC(month.year, month.month, 1));
      const windowEnd = new Date(Date.UTC(month.year, month.month + 1, 0));
      if (windowStart < planStart || windowEnd > planEnd) continue;
      if (!start || windowStart < start) start = windowStart;
      if (!end || windowEnd > end) end = windowEnd;
    }

    const budget = parseBudget(cellText(row.getCell(columns.budget)));
    const owner = columns.owner ? cellText(row.getCell(columns.owner)) || null : null;
    const funding = columns.funding ? cellText(row.getCell(columns.funding)) : "";

    if (reconciliation) {
      if (budget === null || budget === 0) {
        skipped += 1;
        continue;
      }
      if (!currentMa) {
        skipped += 1;
        continue;
      }
      lines.push({
        rowNumber,
        ma: currentMa,
        groupCode: null,
        groupTitle: null,
        code: null,
        title: "Other budgeted costs — payroll, OPEX & allocations",
        owner: null,
        budget,
        description: "Reconciliation line from the Annex: payroll, OPEX and allocations carried in Activity_Budget.",
        start: null,
        end: null,
      });
      continue;
    }

    if (!currentMa) {
      skipped += 1;
      continue;
    }

    lines.push({
      rowNumber,
      ma: currentMa,
      groupCode,
      groupTitle,
      code: code || null,
      title: description,
      owner,
      budget,
      description: funding ? `Funding: ${funding}` : null,
      start,
      end,
    });
  }

  const map = `description=${columns.description}, owner=${columns.owner}, budget=${columns.budget}, code=${columns.code}, months=${header.monthColumns.size}`;
  return { layout: "gantt", sheet: sheet.name, headerRow: header.rowNumber, columns: map, lines, skipped };
}

function parseFlatSheet(sheet: ExcelJS.Worksheet, planStart: Date, planEnd: Date): ParsedSheet | null {
  const header = detectFlatHeader(sheet);
  if (!header) return null;
  const { map } = header;
  const lines: ParsedLine[] = [];
  let inheritedMa: string | null = null;
  let skipped = 0;

  for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const get = (column?: number) => (column ? cellText(row.getCell(column)) : "");
    const title = get(map.title);
    if (!title) continue;

    const maCell = get(map.ma);
    const parsedMa = parseMajorActivity(maCell) ?? parseMajorActivity(title);
    if (parsedMa) inheritedMa = parsedMa;
    const ma = parsedMa ?? inheritedMa;

    if (!ma) {
      skipped += 1;
      continue;
    }
    if (/^(sub[-\s]?total|total)\b/i.test(title)) {
      skipped += 1;
      continue;
    }

    lines.push({
      rowNumber,
      ma,
      groupCode: null,
      groupTitle: null,
      code: maCell || null,
      title,
      owner: get(map.owner) || null,
      budget: parseBudget(get(map.budget)),
      description: get(map.unit) || get(map.target) ? [get(map.target) && `Target: ${get(map.target)}`, get(map.unit) && `Unit: ${get(map.unit)}`].filter(Boolean).join(" · ") : null,
      start: null,
      end: null,
    });
  }

  return { layout: "flat", sheet: sheet.name, headerRow: header.rowNumber, columns: Object.keys(map).join(", "), lines, skipped };
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {
    "dry-run": false,
    "allow-mismatch": false,
    "replace-activities": false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

const money = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = typeof args.file === "string" ? args.file : null;
  if (!file) {
    console.error("Usage: npm run import:annex -- --file <annex.xlsx | annex.csv> [--sheet <name>] [--plan <periodLabel>] [--dry-run] [--replace-activities] [--allow-mismatch]");
    process.exitCode = 2;
    return;
  }

  const periodLabel = typeof args.plan === "string" ? args.plan : "2026/27 EFY";
  const plan = await prisma.plan.findFirst({ where: { type: "AOP", periodLabel } });
  if (!plan) {
    console.error(`No annual plan found with period label "${periodLabel}".`);
    process.exitCode = 2;
    return;
  }

  const workbook = new ExcelJS.Workbook();
  if (file.toLowerCase().endsWith(".csv")) await workbook.csv.readFile(file);
  else await workbook.xlsx.readFile(file);

  const requestedSheet = typeof args.sheet === "string" ? args.sheet : null;
  const sheets = requestedSheet
    ? workbook.worksheets.filter((sheet) => normalize(sheet.name) === normalize(requestedSheet))
    : workbook.worksheets;
  if (!sheets.length) {
    console.error(`Sheet "${requestedSheet}" not found. Sheets: ${workbook.worksheets.map((s) => s.name).join(", ")}`);
    process.exitCode = 2;
    return;
  }

  const parsed: ParsedSheet[] = [];
  for (const sheet of sheets) {
    const gantt = parseGanttSheet(sheet, plan.startDate, plan.endDate);
    if (gantt && gantt.lines.length) {
      parsed.push(gantt);
      continue;
    }
    const flat = parseFlatSheet(sheet, plan.startDate, plan.endDate);
    if (flat && flat.lines.length) parsed.push(flat);
  }

  if (!parsed.length) {
    console.error("No activity rows found. Check --sheet or the column headers.");
    process.exitCode = 1;
    return;
  }

  const chosen = requestedSheet
    ? parsed
    : parsed.sort((a, b) => b.lines.length - a.lines.length).slice(0, 1);
  const lines: ParsedLine[] = chosen.flatMap((sheet) => sheet.lines);

  for (const sheet of chosen) {
    console.log(`Sheet "${sheet.sheet}": ${sheet.layout} layout, header row ${sheet.headerRow} (${sheet.columns}), ${sheet.lines.length} line(s), ${sheet.skipped} skipped row(s)`);
  }

  const objectives = await prisma.planItem.findMany({
    where: { planId: plan.id, kind: "OBJECTIVE", code: { not: null } },
    select: { id: true, code: true, title: true, budget: true },
  });
  const objectiveByCode = new Map(objectives.map((item) => [item.code as string, item]));

  const byMa = new Map<string, ParsedLine[]>();
  const orphans: ParsedLine[] = [];
  for (const line of lines) {
    if (!objectiveByCode.has(line.ma)) {
      orphans.push(line);
      continue;
    }
    const group = byMa.get(line.ma) ?? [];
    group.push(line);
    byMa.set(line.ma, group);
  }

  console.log(`\nWorkbook: ${file}`);
  console.log(`Target plan: ${plan.title} (${plan.periodLabel})\n`);
  console.log("MA       lines  groups   workbook total        plan budget            delta");
  let grandTotal = 0;
  let totalDelta = 0;
  for (const code of [...byMa.keys()].sort()) {
    const group = byMa.get(code) as ParsedLine[];
    const total = group.reduce((sum, line) => sum + (line.budget ?? 0), 0);
    const planned = objectiveByCode.get(code)?.budget ?? 0;
    const delta = total - planned;
    const groups = new Set(group.map((line) => line.groupCode).filter(Boolean)).size;
    grandTotal += total;
    totalDelta += delta;
    console.log(
      `${code.padEnd(8)} ${String(group.length).padStart(5)} ${String(groups).padStart(6)}   ${money(total).padStart(18)}   ${money(planned).padStart(18)}   ${money(delta).padStart(14)}`
    );
  }

  const expectedArg = typeof args.expected === "string" ? parseBudget(args.expected) : null;
  const expected = expectedArg ?? 13_118_732_359;
  const tolerance = typeof args.tolerance === "string" ? Number(args.tolerance) : 1;
  const grandDelta = grandTotal - expected;

  console.log(`\nLines: ${lines.length} (${lines.filter((line) => line.budget !== null).length} budgeted, ${lines.filter((line) => line.start).length} scheduled)`);
  console.log(`Workbook grand total: ${money(grandTotal)} ETB`);
  console.log(`Expected grand total: ${money(expected)} ETB (difference ${grandDelta.toFixed(2)})`);
  console.log(`Sum of per-MA differences: ${totalDelta.toFixed(2)} ETB (tolerance ${tolerance})`);
  if (orphans.length) {
    console.log(`\n${orphans.length} line(s) reference an MA missing from the plan:`);
    for (const line of orphans.slice(0, 10)) console.log(`  row ${line.rowNumber}: ${line.ma} — ${line.title}`);
  }

  const mismatch =
    Math.abs(grandDelta) > tolerance ||
    [...byMa.entries()].some(([code, group]) => {
      const total = group.reduce((sum, line) => sum + (line.budget ?? 0), 0);
      return Math.abs(total - (objectiveByCode.get(code)?.budget ?? 0)) > tolerance;
    }) ||
    orphans.length > 0;

  if (mismatch) {
    console.log("\nReconciliation is not clean. Nothing was written.");
    if (!args["allow-mismatch"]) {
      console.log("Fix the mapping or budgets, or rerun with --allow-mismatch to import anyway.");
      process.exitCode = 1;
      return;
    }
  }

  if (args["dry-run"]) {
    console.log("\nDry run: no rows written.");
    return;
  }

  const existing = await prisma.planItem.findMany({
    where: { planId: plan.id, kind: "ACTIVITY" },
    select: { id: true, parentId: true, title: true, code: true, description: true, owner: true, budget: true, sortOrder: true, startDate: true, endDate: true },
  });
  const existingTitles = new Set(existing.map((item) => normalize(item.title)));

  if (args["replace-activities"]) {
    const direct = existing.filter((item) => objectives.some((objective) => objective.id === item.parentId));
    if (direct.length) {
      const directory = path.join(__dirname, "backups");
      fs.mkdirSync(directory, { recursive: true });
      const backup = path.join(directory, `aop-activities-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      fs.writeFileSync(backup, JSON.stringify(direct, null, 2));
      console.log(`\nBacked up ${direct.length} existing activit${direct.length === 1 ? "y" : "ies"} to ${path.relative(process.cwd(), backup)}`);
      await prisma.planItem.deleteMany({ where: { id: { in: direct.map((item) => item.id) } } });
      for (const item of direct) existingTitles.delete(normalize(item.title));
      console.log(`Removed ${direct.length} narrative activit${direct.length === 1 ? "y" : "ies"} before the import.`);
    }
  }

  let createdLines = 0;
  let createdGroups = 0;
  let skipped = 0;

  for (const [code, groupLines] of byMa) {
    const objective = objectiveByCode.get(code);
    if (!objective) continue;

    const current = await prisma.planItem.findMany({
      where: { planId: plan.id, parentId: objective.id },
      select: { title: true, sortOrder: true },
    });
    const titles = new Set(current.map((item) => normalize(item.title)));
    let order = current.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;

    const groups = new Map<string, string>();
    for (const line of groupLines) {
      if (!line.groupCode || !line.groupTitle) continue;
      if (groups.has(line.groupCode)) continue;
      const existingGroup = await prisma.planItem.findFirst({
        where: { planId: plan.id, parentId: objective.id, code: line.groupCode, title: line.groupTitle },
        select: { id: true },
      });
      if (existingGroup) {
        groups.set(line.groupCode, existingGroup.id);
        continue;
      }
      const created = await prisma.planItem.create({
        data: {
          planId: plan.id,
          parentId: objective.id,
          kind: "ACTIVITY",
          code: line.groupCode,
          title: line.groupTitle,
          sortOrder: order,
          status: "Planned",
        },
      });
      groups.set(line.groupCode, created.id);
      createdGroups += 1;
      order += 1;
    }

    const childOrder = new Map<string, number>();
    // Lines that sit directly under the objective (reconciliation rows) come after the groups.
    childOrder.set(objective.id, order);
    for (const line of groupLines) {
      const key = normalize(line.title);
      if (titles.has(key)) {
        skipped += 1;
        continue;
      }
      const parentId = line.groupCode ? groups.get(line.groupCode) ?? objective.id : objective.id;
      const sortOrder = childOrder.get(parentId) ?? 0;
      await prisma.planItem.create({
        data: {
          planId: plan.id,
          parentId,
          kind: "ACTIVITY",
          code: line.code,
          title: line.title,
          description: line.description,
          owner: line.owner,
          sortOrder,
          budget: line.budget,
          startDate: line.start,
          endDate: line.end,
          status: "Planned",
        },
      });
      childOrder.set(parentId, sortOrder + 1);
      titles.add(key);
      createdLines += 1;
    }
  }

  console.log(`\nImported ${createdLines} activity line(s) in ${createdGroups} new sub-activity group(s) (${skipped} already present).`);
  if (mismatch) console.log("Note: imported with --allow-mismatch; totals need review.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
