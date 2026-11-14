import fs from "fs";
import path from "path";

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const s = fs.readFileSync(schemaPath, "utf8");
const models = s.split(/^model /m).slice(1);
const out: { name: string; table: string; col: string }[] = [];
for (const m of models) {
  const name = m.split(/\s/)[0];
  const hasTenant = /tenantId\s+String/.test(m) || /tenant_id/.test(m);
  if (!hasTenant) continue;
  const map = m.match(/@@map\("([^"]+)"\)/);
  const table = map ? map[1] : name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const col = m.includes('@map("tenant_id")') ? "tenant_id" : "tenantId";
  out.push({ name, table, col });
}
const lines = [
  "-- RLS policies for tenant-scoped tables (generated). REVIEW before applying.",
  "-- Requires app to SET LOCAL app.tenant_id and app.bypass_rls per request/transaction.",
  "-- With Prisma, integrate via $extends/$transaction hooks or connection-level settings.",
  "BEGIN;",
];
for (const t of out) {
  lines.push("");
  lines.push(`-- ${t.name} -> ${t.table}`);
  lines.push(`ALTER TABLE "${t.table}" ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE "${t.table}" FORCE ROW LEVEL SECURITY;`);
  lines.push(`DROP POLICY IF EXISTS tenant_isolation ON "${t.table}";`);
  lines.push(`CREATE POLICY tenant_isolation ON "${t.table}" USING (current_setting('app.bypass_rls', true) = 'on' OR "${t.col}"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "${t.col}"::text = current_setting('app.tenant_id', true));`);
}
lines.push("", "COMMIT;", "");
const dest = path.join(__dirname, "..", "..", "docs", "rls-tenant-policies.sql");
fs.writeFileSync(dest, lines.join("\n"));
console.log("tables=" + out.length + " -> " + dest);
