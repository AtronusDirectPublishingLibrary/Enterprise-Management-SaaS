import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const BASE_CODES = ["en", "am"];
const RESERVED_HEADERS = ["key", "identifier", "id"];

const walkInOrder = (rows: { code: string; name: string; nativeName?: string | null; sortOrder: number }[]) =>
  rows.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

/** Code/name lookup so CSV headers may be a code (`om`) or a language name (`Afan Oromo`). */
function resolveLanguage(header: string, languages: { code: string; name: string; nativeName: string | null }[]) {
  const needle = header.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    languages.find((lang) => lang.code.toLowerCase() === needle) ||
    languages.find((lang) => lang.name.toLowerCase() === needle) ||
    languages.find((lang) => (lang.nativeName || "").toLowerCase() === needle) ||
    null
  );
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12) || "lang";

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function loadLanguages() {
  return walkInOrder(
    await prisma.language.findMany({
      select: { code: true, name: true, nativeName: true, isEnabled: true, sortOrder: true },
    })
  );
}

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const languages = await loadLanguages();
    const counts = await prisma.translationValue.groupBy({ by: ["lang"], _count: { _all: true } });
    const perLanguage = new Map(counts.map((row) => [row.lang, row._count._all]));
    res.json(
      languages.map((language) => ({
        ...language,
        translatedKeys: BASE_CODES.includes(language.code)
          ? undefined
          : perLanguage.get(language.code) || 0,
      }))
    );
  } catch (e) { next(e); }
});

/** Public list for the language toggle: only enabled languages. */
router.get("/enabled", async (_req, res, next) => {
  try {
    const languages = await prisma.language.findMany({
      where: { isEnabled: true },
      select: { code: true, name: true, nativeName: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    res.json(languages);
  } catch (e) { next(e); }
});

router.post("/", requireAuth, requireAccess("languages"), async (req, res, next) => {
  try {
    const payload = z
      .object({
        code: z.string().trim().min(2).max(12).regex(/^[a-zA-Z-]+$/, "Use a short language code such as om or ti"),
        name: z.string().trim().min(2).max(80),
        nativeName: z.string().trim().max(80).optional(),
        isEnabled: z.boolean().optional(),
      })
      .parse(req.body);
    const code = payload.code.toLowerCase();
    if (BASE_CODES.includes(code)) {
      return res.status(409).json({ message: `${code.toUpperCase()} is a built-in language.` });
    }
    const existing = await prisma.language.findUnique({ where: { code } });
    if (existing) return res.status(409).json({ message: `Language ${code} already exists.` });

    const max = await prisma.language.aggregate({ _max: { sortOrder: true } });
    const language = await prisma.language.create({
      data: {
        code,
        name: payload.name,
        nativeName: payload.nativeName || null,
        isEnabled: payload.isEnabled ?? true,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
    res.status(201).json(language);
  } catch (e) { next(e); }
});

router.put("/:code", requireAuth, requireAccess("languages"), async (req, res, next) => {
  try {
    const payload = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        nativeName: z.string().trim().max(80).optional().nullable(),
        isEnabled: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const language = await prisma.language.update({
      where: { code: req.params.code },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.nativeName !== undefined ? { nativeName: payload.nativeName || null } : {}),
        ...(payload.isEnabled !== undefined ? { isEnabled: payload.isEnabled } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
      },
    });
    res.json(language);
  } catch (e) { next(e); }
});

router.delete("/:code", requireAuth, requireAccess("languages"), async (req, res, next) => {
  try {
    if (BASE_CODES.includes(req.params.code)) {
      return res.status(400).json({ message: "English and Amharic cannot be removed." });
    }
    await prisma.language.delete({ where: { code: req.params.code } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

async function buildCsv(includeValues: boolean) {
  const languages = await loadLanguages();
  const [translations, values] = await Promise.all([
    prisma.translation.findMany({ orderBy: { key: "asc" } }),
    includeValues ? prisma.translationValue.findMany() : Promise.resolve([]),
  ]);
  const extras = languages.filter((language) => !BASE_CODES.includes(language.code));
  const header = ["key", "en", "am", ...extras.map((language) => language.code)];
  const lookup = new Map(values.map((row) => [`${row.translationId}:${row.lang}`, row.text]));

  const lines = [header.join(",")];
  for (const row of translations) {
    const cells = [row.key, row.en, row.am];
    for (const language of extras) cells.push(lookup.get(`${row.id}:${language.code}`) || "");
    lines.push(cells.map(csvEscape).join(","));
  }
  return { csv: `${lines.join("\r\n")}\r\n`, languages };
}

router.get("/template.csv", requireAuth, requireAccess("languages"), async (_req, res, next) => {
  try {
    const languages = await loadLanguages();
    const extras = languages.filter((language) => !BASE_CODES.includes(language.code));
    const header = ["key", "en", "am", ...extras.map((language) => language.code)];
    const sample = [
      "welcomeMsg",
      "Welcome",
      "እንኳን ደህና መጡ",
      ...extras.map((language) => ""),
    ];
    const csv = [header.join(","), sample.map(csvEscape).join(","), ""].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=language_template.csv");
    res.send(csv);
  } catch (e) { next(e); }
});

router.get("/export.csv", requireAuth, requireAccess("languages"), async (_req, res, next) => {
  try {
    const { csv } = await buildCsv(true);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=translations_export.csv");
    res.send(csv);
  } catch (e) { next(e); }
});

/**
 * Import a translation workbook. The header row carries the current languages
 * (`key,en,am,...`) plus any extra column; unknown columns become new languages
 * immediately, and columns with content are enabled in the public toggle.
 */
router.post("/import", requireAuth, requireAccess("languages"), upload.single("file"), async (req: any, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a CSV file to upload." });

    let records: Record<string, string>[] = [];
    try {
      records = parse(req.file.buffer, {
        columns: (header: string[]) => header.map((column) => String(column || "").trim()),
        bom: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      });
    } catch (error: any) {
      return res.status(400).json({ message: `Could not read the CSV: ${error.message}` });
    }
    if (!records.length) return res.status(400).json({ message: "The CSV has no data rows." });

    const headers = Object.keys(records[0]);
    const keyColumn = headers.find((header) => RESERVED_HEADERS.includes(header.toLowerCase()));
    if (!keyColumn) {
      return res.status(400).json({ message: "The CSV needs a `key` column holding the translation identifier." });
    }

    const languages = await prisma.language.findMany();
    const createdLanguages: string[] = [];
    const enabledLanguages: string[] = [];
    const columnLanguages = new Map<string, string>(); // header -> language code

    for (const header of headers) {
      const lowered = header.toLowerCase();
      if (header === keyColumn || RESERVED_HEADERS.includes(lowered)) continue;
      if (lowered === "en" || lowered === "am") {
        columnLanguages.set(header, lowered);
        continue;
      }
      const known = resolveLanguage(header, languages);
      if (known) {
        columnLanguages.set(header, known.code);
        continue;
      }

      // A brand-new language column: create the language so the toggle appears.
      let code = slug(header);
      let suffix = 2;
      while (languages.some((language) => language.code === code)) code = `${slug(header)}-${suffix++}`;
      const max = await prisma.language.aggregate({ _max: { sortOrder: true } });
      const created = await prisma.language.create({
        data: {
          code,
          name: header,
          nativeName: header,
          isEnabled: true,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
        },
      });
      languages.push(created);
      createdLanguages.push(header);
      columnLanguages.set(header, code);
    }
    if (!columnLanguages.size) {
      return res.status(400).json({ message: "No language columns found. Keep key, en and am, then add one column per language." });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const record of records) {
      const key = String(record[keyColumn] || "").trim();
      if (!key) { skipped++; continue; }

      const english = String(record["en"] ?? record["EN"] ?? "").trim();
      const amharic = String(record["am"] ?? record["AM"] ?? "").trim();

      const existing = await prisma.translation.findUnique({ where: { key } });
      const row = existing
        ? await prisma.translation.update({
            where: { id: existing.id },
            data: {
              ...(english ? { en: english } : {}),
              ...(amharic ? { am: amharic } : {}),
            },
          })
        : await prisma.translation.create({
            data: {
              key,
              en: english || key,
              am: amharic || english || key,
            },
          });
      if (existing) updated++; else created++;
      if (!english && !existing) warnings.push(`${key} has no English text`);

      for (const [header, code] of columnLanguages.entries()) {
        if (BASE_CODES.includes(code)) continue;
        const text = String(record[header] ?? "").trim();
        if (!text) continue;
        await prisma.translationValue.upsert({
          where: { translationId_lang: { translationId: row.id, lang: code } },
          create: { translationId: row.id, lang: code, text },
          update: { text },
        });
        const language = languages.find((entry) => entry.code === code);
        if (language && !language.isEnabled) {
          await prisma.language.update({ where: { code }, data: { isEnabled: true } });
          language.isEnabled = true;
          enabledLanguages.push(code);
        }
      }
    }

    res.json({
      success: true,
      rows: records.length,
      translationsCreated: created,
      translationsUpdated: updated,
      skipped,
      createdLanguages,
      enabledLanguages: [...new Set(enabledLanguages)],
      warnings: warnings.slice(0, 10),
      languages: await loadLanguages(),
    });
  } catch (e) { next(e); }
});

export default router;
