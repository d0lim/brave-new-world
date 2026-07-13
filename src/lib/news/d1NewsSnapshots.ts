import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { newsStreamItems, newsStreamSnapshots } from "@/db/schema";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

/** D1 스냅샷을 신선하다고 볼 최대 나이 (기본 10분 — Cron 주기와 맞춤) */
export const NEWS_D1_TTL_MS = 10 * 60_000;

export type D1NewsSnapshot = {
  payload: NewsStreamPayload;
  cacheKey: string;
  source: "d1";
  ageMs: number;
};

function isFresh(fetchedAt: string, maxAgeMs: number): boolean {
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}

function parsePayload(raw: string): NewsStreamPayload | null {
  try {
    const parsed = JSON.parse(raw) as NewsStreamPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.verified) || !Array.isArray(parsed.stateMedia)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Cron/API가 쌓아 둔 뉴스 스냅샷을 D1에서 읽는다. */
export async function readNewsStreamFromD1(
  cacheKey: string,
  maxAgeMs = NEWS_D1_TTL_MS,
): Promise<D1NewsSnapshot | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(newsStreamSnapshots)
      .where(eq(newsStreamSnapshots.cacheKey, cacheKey))
      .limit(1);
    const row = rows[0];
    if (!row?.payloadJson) return null;
    if (!isFresh(row.fetchedAt, maxAgeMs)) return null;
    const payload = parsePayload(row.payloadJson);
    if (!payload) return null;
    return {
      source: "d1",
      cacheKey,
      payload,
      ageMs: Math.max(0, Date.now() - Date.parse(row.fetchedAt)),
    };
  } catch {
    return null;
  }
}

type ItemRole = "verified" | "stateMedia" | "hero";

function flattenItems(
  cacheKey: string,
  payload: NewsStreamPayload,
  ingestedAt: string,
): Array<typeof newsStreamItems.$inferInsert> {
  const rows: Array<typeof newsStreamItems.$inferInsert> = [];

  const push = (item: NewsStreamItem, role: ItemRole) => {
    rows.push({
      id: `${cacheKey}:${item.id}:${role}`,
      cacheKey,
      itemId: item.id,
      trustTier: item.trustTier,
      theater: item.theater,
      title: item.title,
      link: item.link,
      source: item.source,
      publisher: item.publisher ?? null,
      pubDate: item.pubDate,
      feedTopic: item.feedTopic ?? null,
      econGenre: item.econGenre ?? null,
      category: item.category ?? null,
      imageUrl: item.imageUrl ?? null,
      summary: item.summary ?? null,
      role,
      ingestedAt,
    });
  };

  if (payload.hero) push(payload.hero, "hero");
  for (const item of payload.verified) push(item, "verified");
  for (const item of payload.stateMedia) push(item, "stateMedia");
  return rows;
}

/** RSS 빌드 결과를 D1에 write-through (스냅샷 + 티어 아이템). */
export async function writeNewsStreamToD1(options: {
  cacheKey: string;
  packages?: string | null;
  lang: string;
  payload: NewsStreamPayload;
}): Promise<boolean> {
  try {
    const db = await getDb();
    const ingestedAt = new Date().toISOString();
    const { cacheKey, packages, lang, payload } = options;

    await db
      .insert(newsStreamSnapshots)
      .values({
        cacheKey,
        packages: packages ?? null,
        lang,
        payloadJson: JSON.stringify(payload),
        itemCount: payload.stats?.total ?? payload.verified.length + payload.stateMedia.length,
        tier1Count: payload.stats?.tier1 ?? 0,
        tier2Count: payload.stats?.tier2 ?? 0,
        tier3Count: payload.stats?.tier3 ?? 0,
        fetchedAt: payload.fetchedAt || ingestedAt,
        ingestedAt,
      })
      .onConflictDoUpdate({
        target: newsStreamSnapshots.cacheKey,
        set: {
          packages: packages ?? null,
          lang,
          payloadJson: JSON.stringify(payload),
          itemCount: payload.stats?.total ?? payload.verified.length + payload.stateMedia.length,
          tier1Count: payload.stats?.tier1 ?? 0,
          tier2Count: payload.stats?.tier2 ?? 0,
          tier3Count: payload.stats?.tier3 ?? 0,
          fetchedAt: payload.fetchedAt || ingestedAt,
          ingestedAt,
        },
      });

    await db.delete(newsStreamItems).where(eq(newsStreamItems.cacheKey, cacheKey));

    const items = flattenItems(cacheKey, payload, ingestedAt);
    const chunk = 40;
    for (let i = 0; i < items.length; i += chunk) {
      await db.insert(newsStreamItems).values(items.slice(i, i + chunk));
    }
    return true;
  } catch {
    return false;
  }
}

/** 오래된 뉴스 스냅샷·아이템 정리 */
export async function pruneNewsStreamFromD1(retentionHours = 48): Promise<{
  snapshotsDeleted: number;
  itemsDeleted: number;
}> {
  try {
    const db = await getDb();
    const cutoff = new Date(Date.now() - retentionHours * 3600_000).toISOString();
    const snap = await db
      .delete(newsStreamSnapshots)
      .where(lt(newsStreamSnapshots.ingestedAt, cutoff));
    const items = await db
      .delete(newsStreamItems)
      .where(lt(newsStreamItems.ingestedAt, cutoff));
    return {
      snapshotsDeleted: Number((snap as { rowsAffected?: number }).rowsAffected ?? 0),
      itemsDeleted: Number((items as { rowsAffected?: number }).rowsAffected ?? 0),
    };
  } catch {
    return { snapshotsDeleted: 0, itemsDeleted: 0 };
  }
}

/** 티어별 최신 아이템만 빠르게 읽을 때 */
export async function readNewsItemsByTierFromD1(
  trustTier: 1 | 2 | 3,
  limit = 40,
): Promise<NewsStreamItem[]> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(newsStreamItems)
      .where(and(eq(newsStreamItems.trustTier, trustTier), eq(newsStreamItems.role, "verified")))
      .orderBy(desc(newsStreamItems.ingestedAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.itemId,
      title: row.title,
      link: row.link,
      source: row.source || "",
      publisher: row.publisher ?? undefined,
      pubDate: row.pubDate || new Date().toISOString(),
      theater: (row.theater || "global") as NewsStreamItem["theater"],
      trustTier: (row.trustTier === 1 || row.trustTier === 2 || row.trustTier === 3
        ? row.trustTier
        : 2) as 1 | 2 | 3,
      feedTopic: (row.feedTopic as NewsStreamItem["feedTopic"]) || undefined,
      econGenre: (row.econGenre as NewsStreamItem["econGenre"]) || undefined,
      category: row.category ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      summary: row.summary ?? undefined,
    }));
  } catch {
    return [];
  }
}

/** D1에 뉴스 스냅샷이 하나라도 있는지 */
export async function d1HasNewsSnapshots(): Promise<boolean> {
  try {
    const db = await getDb();
    const row = await db
      .select({ n: sql<number>`count(*)` })
      .from(newsStreamSnapshots)
      .limit(1);
    return Number(row[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}
