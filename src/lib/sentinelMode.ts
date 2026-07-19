/**
 * 센티넬 모드 — 긴장도 랭킹 상위 전장/초크포인트를 순환 fly-to.
 * 서버 없이 /api/daily-ranks + 기존 flyTo만 재사용.
 */

import type { DailyRankEntry, DailyRanksPayload } from "@/lib/dailyRanks";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";

export type SentinelFlyTarget = {
  entityId: string;
  kind: "theater" | "chokepoint";
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
  altitude: number;
  rank: number;
};

/** rank entityId → 카메라 */
const ENTITY_FLY: Record<string, { lat: number; lng: number; altitude: number }> = {
  ukraine: { lat: 48.5, lng: 37.5, altitude: 1.35 },
  "middle-east": {
    lat: THEATER_FLY_TO["middle-east"].lat,
    lng: THEATER_FLY_TO["middle-east"].lng,
    altitude: 1.55,
  },
  taiwan: {
    lat: THEATER_FLY_TO["china-taiwan"].lat,
    lng: THEATER_FLY_TO["china-taiwan"].lng,
    altitude: 0.95,
  },
  korea: {
    lat: THEATER_FLY_TO.korea.lat,
    lng: THEATER_FLY_TO.korea.lng,
    altitude: 0.75,
  },
  pacific: {
    lat: THEATER_FLY_TO.global.lat,
    lng: 140,
    altitude: 1.85,
  },
  atlantic: {
    lat: THEATER_FLY_TO.atlantic.lat,
    lng: THEATER_FLY_TO.atlantic.lng,
    altitude: 1.9,
  },
  arctic: {
    lat: THEATER_FLY_TO.arctic.lat,
    lng: THEATER_FLY_TO.arctic.lng,
    altitude: 1.85,
  },
  "choke-hormuz": { lat: 26.58, lng: 56.25, altitude: 0.72 },
  "choke-suez": { lat: 31.25, lng: 32.34, altitude: 0.85 },
  "choke-bab-el-mandeb": { lat: 12.61, lng: 43.35, altitude: 0.8 },
  "choke-malacca": { lat: 2.52, lng: 101.34, altitude: 0.9 },
  "choke-taiwan": { lat: 24.32, lng: 120.85, altitude: 0.88 },
  "choke-panama": { lat: 9.12, lng: -79.91, altitude: 0.85 },
  "choke-bosporus": { lat: 41.12, lng: 29.05, altitude: 0.7 },
  "choke-gibraltar": { lat: 35.98, lng: -5.6, altitude: 0.8 },
  "choke-good-hope": { lat: -34.35, lng: 18.48, altitude: 1.2 },
};

export const SENTINEL_CYCLE_MS = 9_000;

function toTarget(entry: DailyRankEntry): SentinelFlyTarget | null {
  const fly = ENTITY_FLY[entry.entityId];
  if (!fly) return null;
  if (entry.kind !== "theater" && entry.kind !== "chokepoint") return null;
  return {
    entityId: entry.entityId,
    kind: entry.kind,
    labelKo: entry.labelKo,
    labelEn: entry.labelEn,
    lat: fly.lat,
    lng: fly.lng,
    altitude: fly.altitude,
    rank: entry.rank,
  };
}

/** 전장·초크 상위 합쳐 랭크 순 순환 리스트 */
export function buildSentinelTour(payload: DailyRanksPayload, limit = 8): SentinelFlyTarget[] {
  const merged = [...(payload.theater ?? []), ...(payload.chokepoint ?? [])]
    .slice()
    .sort((a, b) => a.rank - b.rank || b.score - a.score);
  const out: SentinelFlyTarget[] = [];
  const seen = new Set<string>();
  for (const entry of merged) {
    const key = `${entry.kind}:${entry.entityId}`;
    if (seen.has(key)) continue;
    const t = toTarget(entry);
    if (!t) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

export async function fetchSentinelTour(): Promise<SentinelFlyTarget[]> {
  try {
    const res = await fetch("/api/daily-ranks?limit=5", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as DailyRanksPayload;
    return buildSentinelTour(data);
  } catch {
    return [];
  }
}
