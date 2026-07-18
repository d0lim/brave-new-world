/**
 * 네온 리플 — 상시 시드가 아니라 최신(속보) 사건이 있을 때만 활성화.
 */

import {
  CHINA_THEATER_INCIDENTS,
  type ChinaTheaterDyad,
  type ChinaTheaterIncident,
} from "@/data/chinaTheaterIncidentsSeed";
import {
  FRESH_EVENT_HOURS,
  isFreshEvent,
  type ScoredEvent,
} from "@/data/eventTiers";
import {
  KOREA_MISSILE_INCIDENTS,
  type KoreaMissileIncident,
} from "@/data/koreaMissileIncidentsSeed";
import { isInCombatTheater } from "@/lib/theaterCombat";

const CHINA_SEED_MATCH_DEG = 3.2;
const KOREA_SEED_MATCH_DEG = 2.8;

const MISSILE_EVENT_RE =
  /missile|ballistic|rocket|icbm|irbm|mrbm|slbm|hypersonic|launch\s*test|weapons?\s*test|화성|미사일|로켓|발사체|발사\s*실험|탄도|극초음속|방사포|핵실험/i;

function intensityFromEvent(event: ScoredEvent): number {
  if (event.importanceGrade === "S") return 1;
  if (event.importanceGrade === "A") return 0.9;
  if (isFreshEvent(event)) return 0.8;
  return 0.55;
}

function nearestSeed<T extends { lat: number; lng: number }>(
  lat: number,
  lng: number,
  seeds: T[],
  maxDeg: number,
): T | null {
  let best: { seed: T; d: number } | null = null;
  for (const seed of seeds) {
    const d = Math.hypot(lat - seed.lat, lng - seed.lng);
    if (d > maxDeg) continue;
    if (!best || d < best.d) best = { seed, d };
  }
  return best?.seed ?? null;
}

function isActionableTier(event: ScoredEvent): boolean {
  return (
    event.eventTier === "war" ||
    event.eventTier === "diplomatic" ||
    event.eventTier === "protest"
  );
}

/** 중국 대치 네온: 최신 GDELT가 시드 앵커 근처에 있을 때만 */
export function activateChinaTheaterIncidents(
  enabledDyads: ReadonlySet<ChinaTheaterDyad>,
  events: ScoredEvent[],
  now = Date.now(),
): ChinaTheaterIncident[] {
  if (enabledDyads.size === 0) return [];
  const seeds = CHINA_THEATER_INCIDENTS.filter((s) => enabledDyads.has(s.dyad));
  if (seeds.length === 0) return [];

  const out: ChinaTheaterIncident[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const seed = nearestSeed(event.lat, event.lng, seeds, CHINA_SEED_MATCH_DEG);
    if (!seed) continue;
    const id = `live-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    out.push({
      ...seed,
      id,
      lat: event.lat,
      lng: event.lng,
      titleKo: title || seed.titleKo,
      titleEn: title || seed.titleEn,
      bodyKo: seed.bodyKo,
      bodyEn: seed.bodyEn,
      intensity: Math.max(seed.intensity * 0.65, intensityFromEvent(event)),
    });
  }
  return out;
}

/** 북한 미사일 네온: 최신·미사일 관련 사건이 발생지 근처/한반도에 있을 때만 */
export function activateKoreaMissileIncidents(
  events: ScoredEvent[],
  now = Date.now(),
): KoreaMissileIncident[] {
  const out: KoreaMissileIncident[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!isFreshEvent(event, now) || !isActionableTier(event)) continue;
    const text = `${event.title ?? ""} ${event.category ?? ""} ${event.country ?? ""}`;
    const inKorea = isInCombatTheater("korea", event.lat, event.lng);
    const missileLike = MISSILE_EVENT_RE.test(text);
    if (!missileLike && !inKorea) continue;
    if (missileLike && !inKorea) {
      const nearSite = nearestSeed(
        event.lat,
        event.lng,
        KOREA_MISSILE_INCIDENTS,
        KOREA_SEED_MATCH_DEG,
      );
      if (!nearSite) continue;
    } else if (inKorea && !missileLike) {
      // 한반도 안이어도 미사일·발사 키워드가 없으면 스킵 (상시 긴장점 방지)
      continue;
    }

    const seed =
      nearestSeed(event.lat, event.lng, KOREA_MISSILE_INCIDENTS, KOREA_SEED_MATCH_DEG) ??
      KOREA_MISSILE_INCIDENTS[0];
    if (!seed) continue;

    const id = `live-nk-${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = event.title?.trim();
    out.push({
      ...seed,
      id,
      lat: event.lat,
      lng: event.lng,
      titleKo: title || seed.titleKo,
      titleEn: title || seed.titleEn,
      intensity: Math.max(seed.intensity * 0.65, intensityFromEvent(event)),
    });
  }
  return out;
}

/** NewFeeds 공격 점 — published/fetched 시각이 신선할 때만 */
export function isFreshNewfeedsAttack(
  attack: { publishedAt?: string | null },
  now = Date.now(),
): boolean {
  if (!attack.publishedAt) return false;
  const t = Date.parse(attack.publishedAt);
  if (!Number.isFinite(t)) return false;
  return now - t <= FRESH_EVENT_HOURS * 60 * 60 * 1000;
}
