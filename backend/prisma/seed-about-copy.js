/**
 * Seeds the copy from the three About sub-pages into Language & Translations.
 * Each page keeps its local English/Amharic fallback but resolves through
 * `localiseCopy`, so a row edited here changes the live page immediately.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FILES = ["AboutBoard.jsx", "AboutMission.jsx", "AboutObjectives.jsx"];

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extractCopy(file) {
  const source = fs.readFileSync(path.join(__dirname, "../../frontend/src/pages/public", file), "utf8");
  const start = source.indexOf("const COPY = {");
  const open = source.indexOf("{", start);
  let depth = 0;
  let close = open;
  for (let cursor = open; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    else if (source[cursor] === "}") {
      depth -= 1;
      if (depth === 0) {
        close = cursor;
        break;
      }
    }
  }
  return eval("(" + source.slice(open, close + 1) + ")");
}

function collect(english, amharic, pairs) {
  if (typeof english === "string") {
    if (typeof amharic === "string" && amharic && amharic !== english) pairs.push([english, amharic]);
    return;
  }
  if (Array.isArray(english)) {
    english.forEach((item, at) => collect(item, Array.isArray(amharic) ? amharic[at] : undefined, pairs));
    return;
  }
  if (english && typeof english === "object") {
    for (const key of Object.keys(english)) collect(english[key], amharic ? amharic[key] : undefined, pairs);
  }
}

async function main() {
  const existing = await prisma.translation.findMany({ select: { en: true } });
  const seen = new Set(existing.map((row) => String(row.en || "").trim().toLowerCase()));
  let created = 0;

  for (const file of FILES) {
    const copy = extractCopy(file);
    const pairs = [];
    collect(copy.en, copy.am, pairs);
    for (const [en, am] of pairs) {
      const normalised = en.trim().toLowerCase();
      if (seen.has(normalised)) continue;
      const key = `about.${slug(en)}-${crypto.createHash("sha1").update(en).digest("hex").slice(0, 6)}`;
      await prisma.translation.create({ data: { key, en, am } });
      seen.add(normalised);
      created += 1;
    }
  }
  console.log(`Added ${created} About copy row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
