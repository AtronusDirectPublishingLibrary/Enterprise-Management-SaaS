import { prisma } from "./prisma";

export type SocialChannel = "facebook" | "linkedin" | "x" | "telegram" | "webhook";

export type SocialSettings = {
  enabled: boolean;
  autoPost: boolean;
  includeImage: boolean;
  hashtags: string;
  channels: Record<SocialChannel, boolean>;
};

export const SOCIAL_CHANNELS: { key: SocialChannel; label: string; hint: string }[] = [
  { key: "facebook", label: "Facebook Page", hint: "Graph API page feed or photo post" },
  { key: "linkedin", label: "LinkedIn", hint: "Organisation page UGC post" },
  { key: "x", label: "X / Twitter", hint: "Post to the configured X account" },
  { key: "telegram", label: "Telegram", hint: "Channel or group via bot" },
  { key: "webhook", label: "Automation webhook", hint: "Buffer, Make, Zapier or another endpoint" },
];

export const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  enabled: false,
  autoPost: false,
  includeImage: true,
  hashtags: "#EthioBiopharma #EBPE",
  channels: {
    facebook: false,
    linkedin: false,
    x: false,
    telegram: false,
    webhook: false,
  },
};

const SETTINGS_KEY = "social.distribution";

export async function getSocialSettings(): Promise<SocialSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row?.value) return DEFAULT_SOCIAL_SETTINGS;
  try {
    const parsed = JSON.parse(String(row.value)) as Partial<SocialSettings>;
    return {
      ...DEFAULT_SOCIAL_SETTINGS,
      ...parsed,
      channels: { ...DEFAULT_SOCIAL_SETTINGS.channels, ...(parsed.channels || {}) },
    };
  } catch {
    return DEFAULT_SOCIAL_SETTINGS;
  }
}

export async function saveSocialSettings(
  input: Partial<Omit<SocialSettings, "channels">> & { channels?: Partial<Record<SocialChannel, boolean>> }
): Promise<SocialSettings> {
  const current = await getSocialSettings();
  const next: SocialSettings = {
    enabled: input.enabled ?? current.enabled,
    autoPost: input.autoPost ?? current.autoPost,
    includeImage: input.includeImage ?? current.includeImage,
    hashtags: typeof input.hashtags === "string" ? input.hashtags.slice(0, 200) : current.hashtags,
    channels: { ...current.channels, ...(input.channels || {}) },
  };
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

export function channelConfiguration() {
  return {
    facebook: Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    linkedin: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN),
    x: Boolean(process.env.X_BEARER_TOKEN),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    webhook: Boolean(process.env.SOCIAL_WEBHOOK_URL),
  } as Record<SocialChannel, boolean>;
}

export function publicSiteUrl() {
  return (process.env.PUBLIC_SITE_URL || process.env.APP_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");
}

type NewsForSocial = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  socialCaption?: string | null;
};

function absoluteAsset(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${publicSiteUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function buildCaption(news: NewsForSocial, settings: SocialSettings) {
  const base = (news.socialCaption || news.content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = base.length > 230 ? `${base.slice(0, 227).trim()}…` : base;
  const link = `${publicSiteUrl()}/news`;
  return [news.title.trim(), excerpt, link, settings.hashtags.trim()].filter(Boolean).join("\n\n");
}

export async function enqueueNews(news: NewsForSocial, settings?: SocialSettings) {
  const resolved = settings || (await getSocialSettings());
  if (!resolved.enabled || !resolved.autoPost) return [];
  const caption = buildCaption(news, resolved);
  const channels = (Object.keys(resolved.channels) as SocialChannel[]).filter(
    (channel) => resolved.channels[channel]
  );
  if (!channels.length) return [];
  await prisma.socialPost.createMany({
    data: channels.map((channel) => ({
      newsId: news.id,
      channel,
      caption,
      status: "QUEUED",
    })),
    skipDuplicates: true,
  });
  return channels;
}

async function postToFacebook(news: NewsForSocial, caption: string, includeImage: boolean) {
  const pageId = process.env.FACEBOOK_PAGE_ID!;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
  const image = includeImage ? absoluteAsset(news.imageUrl) : null;
  const endpoint = image
    ? `https://graph.facebook.com/v21.0/${pageId}/photos`
    : `https://graph.facebook.com/v21.0/${pageId}/feed`;
  const body = image
    ? new URLSearchParams({ url: image, caption, access_token: token })
    : new URLSearchParams({ message: caption, link: `${publicSiteUrl()}/news`, access_token: token });
  const response = await fetch(endpoint, { method: "POST", body });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) throw new Error(payload?.error?.message || `Facebook returned ${response.status}`);
  return {
    externalId: payload.id || payload.post_id || null,
    externalUrl: payload.id ? `https://www.facebook.com/${payload.id}` : null,
  };
}

async function postToLinkedIn(news: NewsForSocial, caption: string) {
  const author = process.env.LINKEDIN_AUTHOR_URN!;
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: caption.slice(0, 2900) },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              originalUrl: `${publicSiteUrl()}/news`,
              title: { text: news.title.slice(0, 200) },
              description: { text: (news.content || "").replace(/<[^>]+>/g, " ").slice(0, 250) },
            },
          ],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) throw new Error(payload?.message || `LinkedIn returned ${response.status}`);
  return { externalId: response.headers.get("x-restli-id") || payload.id || null, externalUrl: null };
}

async function postToX(caption: string) {
  const text = caption.length > 280 ? `${caption.slice(0, 277)}…` : caption;
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) throw new Error(payload?.detail || payload?.title || `X returned ${response.status}`);
  return {
    externalId: payload?.data?.id || null,
    externalUrl: payload?.data?.id ? `https://x.com/i/web/status/${payload.data.id}` : null,
  };
}

async function postToTelegram(news: NewsForSocial, caption: string, includeImage: boolean) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;
  const image = includeImage ? absoluteAsset(news.imageUrl) : null;
  const endpoint = image
    ? `https://api.telegram.org/bot${token}/sendPhoto`
    : `https://api.telegram.org/bot${token}/sendMessage`;
  const body = image
    ? new URLSearchParams({ chat_id: chatId, photo: image, caption: caption.slice(0, 1024) })
    : new URLSearchParams({ chat_id: chatId, text: caption.slice(0, 4096), disable_web_page_preview: "false" });
  const response = await fetch(endpoint, { method: "POST", body });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.description || `Telegram returned ${response.status}`);
  }
  const messageId = payload?.result?.message_id;
  return { externalId: messageId ? String(messageId) : null, externalUrl: null };
}

async function postToWebhook(news: NewsForSocial, caption: string) {
  const response = await fetch(process.env.SOCIAL_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "news.published",
      newsId: news.id,
      title: news.title,
      content: news.content,
      caption,
      imageUrl: absoluteAsset(news.imageUrl),
      url: `${publicSiteUrl()}/news`,
    }),
  });
  if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
  return { externalId: null, externalUrl: null };
}

async function deliver(post: any, news: NewsForSocial, settings: SocialSettings) {
  const channel = post.channel as SocialChannel;
  if (!channelConfiguration()[channel]) {
    return { skip: `Add the ${channel} credentials to backend/.env to activate this channel.` };
  }
  const caption = post.caption || buildCaption(news, settings);
  if (channel === "facebook") return postToFacebook(news, caption, settings.includeImage);
  if (channel === "linkedin") return postToLinkedIn(news, caption);
  if (channel === "x") return postToX(caption);
  if (channel === "telegram") return postToTelegram(news, caption, settings.includeImage);
  if (channel === "webhook") return postToWebhook(news, caption);
  return { skip: "Unknown channel" };
}

/**
 * Deliver queued social posts. Failures are isolated per channel, and a
 * missing credential is recorded as SKIPPED rather than retried forever.
 * Facebook, LinkedIn, X and Telegram are called directly; the webhook is the
 * escape hatch for Buffer, Make, Zapier or a custom social media gateway.
 */
export async function runSocialQueue(limit = 20) {
  const settings = await getSocialSettings();
  if (!settings.enabled) return { evaluated: 0, sent: 0, failed: 0, skipped: 0 };
  const posts = await prisma.socialPost.findMany({
    where: { status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: 3 }, scheduledFor: { lte: new Date() } },
    include: { news: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const post of posts) {
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "SENDING", attempts: { increment: 1 } } });
    try {
      const result: any = await deliver(post, post.news, settings);
      if (result?.skip) {
        skipped += 1;
        await prisma.socialPost.update({
          where: { id: post.id },
          data: { status: "SKIPPED", error: result.skip },
        });
      } else {
        sent += 1;
        await prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: "SENT",
            externalId: result?.externalId || null,
            externalUrl: result?.externalUrl || null,
            sentAt: new Date(),
            error: null,
          },
        });
      }
    } catch (error: any) {
      failed += 1;
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: post.attempts + 1 >= 3 ? "FAILED" : "QUEUED",
          error: String(error?.message || error).slice(0, 1000),
          scheduledFor: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    }
  }
  return { evaluated: posts.length, sent, failed, skipped };
}

export async function retrySocialPost(id: string) {
  return prisma.socialPost.update({
    where: { id },
    data: { status: "QUEUED", attempts: 0, scheduledFor: new Date(), error: null },
  });
}
