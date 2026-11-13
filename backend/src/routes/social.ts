import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import {
  SOCIAL_CHANNELS,
  buildCaption,
  channelConfiguration,
  enqueueNews,
  getSocialSettings,
  retrySocialPost,
  runSocialQueue,
  saveSocialSettings,
} from "../lib/socialPublisher";

const router = Router();
router.use(requireAuth, requireAccess("news"));

router.get("/settings", async (_req, res, next) => {
  try {
    const [settings, queue] = await Promise.all([
      getSocialSettings(),
      prisma.socialPost.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({
      settings,
      channels: SOCIAL_CHANNELS,
      configured: channelConfiguration(),
      queue: Object.fromEntries(queue.map((row) => [row.status, row._count._all])),
    });
  } catch (e) {
    next(e);
  }
});

router.put("/settings", async (req: any, res, next) => {
  try {
    const body = z
      .object({
        enabled: z.boolean().optional(),
        autoPost: z.boolean().optional(),
        includeImage: z.boolean().optional(),
        hashtags: z.string().max(200).optional(),
        channels: z
          .object({
            facebook: z.boolean().optional(),
            linkedin: z.boolean().optional(),
            x: z.boolean().optional(),
            telegram: z.boolean().optional(),
            webhook: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(req.body || {});
    const settings = await saveSocialSettings(body);
    await logAudit("SOCIAL", "SOCIAL_SETTINGS_UPDATED", req.user?.username || "system", {
      enabled: settings.enabled,
      autoPost: settings.autoPost,
      channels: settings.channels,
    });
    res.json({ settings, configured: channelConfiguration() });
  } catch (e) {
    next(e);
  }
});

router.get("/queue", async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const rows = await prisma.socialPost.findMany({
      include: {
        news: { select: { id: true, title: true, imageUrl: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.set("Cache-Control", "no-store");
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post("/run", async (req: any, res, next) => {
  try {
    const summary = await runSocialQueue(50);
    await logAudit("SOCIAL", "SOCIAL_QUEUE_RUN", req.user?.username || "system", summary);
    res.json(summary);
  } catch (e) {
    next(e);
  }
});

router.post("/queue/:id/retry", async (req: any, res, next) => {
  try {
    const row = await retrySocialPost(req.params.id);
    await logAudit("SOCIAL", "SOCIAL_POST_RETRIED", req.user?.username || "system", {
      postId: row.id,
      channel: row.channel,
    });
    res.json(row);
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Social post not found." });
    next(e);
  }
});

/** Queue one existing article for manual distribution. */
router.post("/news/:id", async (req: any, res, next) => {
  try {
    const news = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!news) return res.status(404).json({ message: "News article not found." });
    const settings = await getSocialSettings();
    const caption = buildCaption(news, settings);
    const requested = Array.isArray(req.body?.channels)
      ? req.body.channels.filter((channel: string) => SOCIAL_CHANNELS.some((item) => item.key === channel))
      : (Object.keys(settings.channels) as (keyof typeof settings.channels)[]).filter(
          (channel) => settings.channels[channel]
        );
    if (!requested.length) {
      return res.status(400).json({ message: "Choose at least one social channel first." });
    }
    await prisma.socialPost.createMany({
      data: requested.map((channel: string) => ({
        newsId: news.id,
        channel,
        caption,
        status: "QUEUED",
      })),
      skipDuplicates: true,
    });
    await logAudit("SOCIAL", "NEWS_QUEUED_FOR_SOCIAL", req.user?.username || "system", {
      newsId: news.id,
      channels: requested,
    });
    res.status(201).json({ queued: requested });
  } catch (e) {
    next(e);
  }
});

/** Manually enqueue the current article using the saved auto-share settings. */
router.post("/news/:id/auto", async (req: any, res, next) => {
  try {
    const news = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!news) return res.status(404).json({ message: "News article not found." });
    const settings = await getSocialSettings();
    const channels = await enqueueNews(news, { ...settings, enabled: true, autoPost: true });
    res.json({ queued: channels });
  } catch (e) {
    next(e);
  }
});

export default router;
