export function toCsv(rows: Array<Record<string, any>>, columns?: string[]): string {
  if (!rows.length) return columns && columns.length ? columns.join(",") + "\n" : "";
  const inferred = rows.reduce<Set<string>>((set, r) => {
    Object.keys(r || {}).forEach((k) => set.add(k));
    return set;
  }, new Set<string>());
  const cols = columns && columns.length ? columns : Array.from(inferred);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = cols.join(",");
  const lines = rows.map(r => cols.map(c => esc(r ? (r as any)[c] : "")).join(","));
  return [header, ...lines].join("\n") + "\n";
}

export function sendCsv(res: any, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\ufeff" + csv); // BOM for Excel
}
