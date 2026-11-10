/**
 * Makes every Careers page string editable in Language & Translations.
 *
 * The page keeps its English/Amharic copy as a local object for offline
 * fallback, but `localiseCopy` looks each string up in the translation table,
 * so these rows let an editor change the wording without a deployment.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function extractCopy() {
  const file = path.join(__dirname, "../../frontend/src/pages/Careers.jsx");
  const source = fs.readFileSync(file, "utf8");
  const start = source.indexOf("const COPY = {");
  let index = source.indexOf("{", start);
  let depth = 0;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    else if (source[cursor] === "}") {
      depth -= 1;
      if (depth === 0) {
        index = cursor;
        break;
      }
    }
  }
  return eval("(" + source.slice(source.indexOf("{", start), index + 1) + ")");
}

function collectPairs(english, amharic, pairs) {
  if (typeof english === "string") {
    if (typeof amharic === "string" && amharic && amharic !== english) pairs.push([english, amharic]);
    return;
  }
  if (Array.isArray(english)) {
    english.forEach((item, at) => collectPairs(item, Array.isArray(amharic) ? amharic[at] : undefined, pairs));
    return;
  }
  if (english && typeof english === "object") {
    for (const key of Object.keys(english)) collectPairs(english[key], amharic ? amharic[key] : undefined, pairs);
  }
}

const EXTRA = [
  ["Full time", "ሙሉ ጊዜ"],
  ["Part time", "የትርፍ ጊዜ"],
  ["Contract", "በኮንትራት"],
  ["Internship", "የልምምድ ጊዜ"],
];

async function main() {
  const copy = extractCopy();
  const pairs = [...EXTRA];
  collectPairs(copy.en, copy.am, pairs);

  const existing = await prisma.translation.findMany({ select: { en: true } });
  const seen = new Set(existing.map((row) => String(row.en || "").trim().toLowerCase()));

  let created = 0;
  for (const [en, am] of pairs) {
    const normalised = en.trim().toLowerCase();
    if (seen.has(normalised)) continue;
    const key = `careers.${slug(en)}-${crypto.createHash("sha1").update(en).digest("hex").slice(0, 6)}`;
    await prisma.translation.create({ data: { key, en, am } });
    seen.add(normalised);
    created += 1;
  }
  console.log(`Added ${created} Careers copy row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
