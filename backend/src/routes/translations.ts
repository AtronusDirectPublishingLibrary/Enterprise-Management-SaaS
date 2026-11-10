import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";

const router = Router();

const valueMap = z.record(z.string().max(12), z.string()).optional();

type TranslationRow = {
  id: string;
  key: string;
  en: string;
  am: string;
  updatedAt: Date;
  values?: { lang: string; text: string }[];
};

/** Flatten stored per-language rows into the `values` object the UI edits. */
function present(row: TranslationRow) {
  const values: Record<string, string> = {};
  for (const entry of row.values || []) values[entry.lang] = entry.text;
  const { values: _raw, ...rest } = row;
  return { ...rest, values };
}

// Public: Get all translations (used by the frontend)
router.get("/", async (_req, res, next) => {
  try {
    const translations = await prisma.translation.findMany({
      include: { values: { select: { lang: true, text: true } } },
      orderBy: { key: "asc" },
    });
    res.json(translations.map(present));
  } catch (e) { next(e); }
});

// Language Settings: update a translation, including dynamically added languages
// The Language Settings workspace is delegated to positions with the
// `languages` tab (IT Officer, HR Manager, Strategy), so writes must honour
// the same permission instead of administrator-only.
router.put("/:id", requireAuth, requireAccess("languages"), async (req, res, next) => {
  try {
    const payload = z
      .object({ en: z.string().optional(), am: z.string().optional(), values: valueMap })
      .parse(req.body);

    const updated = await prisma.translation.update({
      where: { id: req.params.id },
      data: {
        ...(payload.en !== undefined ? { en: payload.en } : {}),
        ...(payload.am !== undefined ? { am: payload.am } : {}),
      },
    });

    if (payload.values) {
      await Promise.all(
        Object.entries(payload.values)
          .filter(([lang]) => !["en", "am"].includes(lang))
          .map(([lang, text]) =>
            text.trim()
              ? prisma.translationValue.upsert({
                  where: { translationId_lang: { translationId: updated.id, lang } },
                  create: { translationId: updated.id, lang, text },
                  update: { text },
                })
              : prisma.translationValue.deleteMany({ where: { translationId: updated.id, lang } })
          )
      );
    }

    const withValues = await prisma.translation.findUnique({
      where: { id: updated.id },
      include: { values: { select: { lang: true, text: true } } },
    });
    res.json(withValues ? present(withValues) : updated);
  } catch (e) { next(e); }
});

// Language Settings: create a new translation
router.post("/", requireAuth, requireAccess("languages"), async (req, res, next) => {
  try {
    const payload = z
      .object({
        key: z.string().trim().min(1).max(120),
        en: z.string().min(1),
        am: z.string().min(1),
        values: valueMap,
      })
      .parse(req.body);

    const created = await prisma.translation.create({
      data: {
        key: payload.key,
        en: payload.en,
        am: payload.am,
        values: {
          create: Object.entries(payload.values || {})
            .filter(([lang, text]) => !["en", "am"].includes(lang) && text.trim())
            .map(([lang, text]) => ({ lang, text })),
        },
      },
      include: { values: { select: { lang: true, text: true } } },
    });
    res.json(present(created));
  } catch (e) { next(e); }
});

// Language Settings: delete a translation
router.delete("/:id", requireAuth, requireAccess("languages"), async (req, res, next) => {
  try {
    await prisma.translation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
