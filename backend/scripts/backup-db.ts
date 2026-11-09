import "dotenv/config";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

/**
 * Database backup.
 *
 * Prefers `pg_dump` (full, restorable SQL). When the PostgreSQL client tools
 * are not on PATH it falls back to a JSON export of every public table so a
 * backup still exists. Old backups are pruned by BACKUP_RETENTION_DAYS.
 *
 * Usage: npm run backup   (or: npx ts-node scripts/backup-db.ts)
 */

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.resolve(process.cwd(), process.env.BACKUP_DIR || "backups");
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);

function pruneOldBackups() {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return 0;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    const file = path.join(dir, entry);
    const stat = fs.statSync(file);
    if (stat.isFile() && /^db-.*\.(sql|json)$/.test(entry) && stat.mtimeMs < cutoff) {
      fs.unlinkSync(file);
      removed++;
    }
  }
  return removed;
}

async function main() {
  fs.mkdirSync(dir, { recursive: true });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set in backend/.env");

  const hasPgDump = !spawnSync("pg_dump", ["--version"], { encoding: "utf8" }).error;
  let file: string;
  let format: "sql" | "json";

  if (hasPgDump) {
    file = path.join(dir, `db-${stamp}.sql`);
    const result = spawnSync(
      "pg_dump",
      ["--dbname", databaseUrl, "--no-owner", "--no-privileges", "--file", file],
      { encoding: "utf8" }
    );
    if (result.status !== 0) {
      throw new Error(`pg_dump failed: ${result.stderr || result.error?.message || "unknown error"}`);
    }
    format = "sql";
  } else {
    console.warn("[backup] pg_dump not found on PATH — writing a JSON table export instead.");
    console.warn("[backup] Install PostgreSQL client tools for a full SQL backup.");
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name"
    );
    const dump: Record<string, unknown[]> = {};
    for (const { table_name } of tables) {
      const quoted = table_name.replace(/"/g, '""');
      dump[table_name] = await prisma.$queryRawUnsafe(`select * from "public"."${quoted}"`);
    }
    file = path.join(dir, `db-${stamp}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify(
        { createdAt: new Date().toISOString(), database: "ethiobiopharma_pms", tables: dump },
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      )
    );
    format = "json";
  }

  const size = fs.statSync(file).size;
  const removed = pruneOldBackups();
  console.log(`[backup] ${format.toUpperCase()} backup written: ${file} (${(size / 1024).toFixed(0)} KB)`);
  if (removed) console.log(`[backup] pruned ${removed} backup(s) older than ${retentionDays} days`);
}

main()
  .catch((error) => {
    console.error(`[backup] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
