/**
 * HDX HAPI · ACLED conflict-events → 실제 교전 전선별 사망(fatalities) 집계.
 * event_type=political_violence 만 사용 (civilian_targeting과 비상호배타).
 * 부상은 HAPI에 없음.
 *
 * 원데이터 경로:
 *   ACLED (Armed Conflict Location & Event Data Project)
 *     → OCHA HDX 데이터셋
 *     → HDX HAPI `/coordination-context/conflict-events`
 * 표기 시 ACLED를 반드시 명시 (https://acleddata.com/attributionpolicy).
 */

import type { CombatTheaterId } from "@/lib/theaterCombat";

/** HDX HAPI 엔드포인트 — 집계된 conflict-events */
export const HAPI_CONFLICT_EVENTS_URL =
  "https://hapi.humdata.org/api/v2/coordination-context/conflict-events";

/** HDX HAPI 문서 */
export const HAPI_DOCS_URL = "https://hapi.humdata.org/docs";

/** HDX 데이터셋(메타) — Conflict Events */
export const HAPI_HDX_DATASET_URL =
  "https://data.humdata.org/dataset/hdx-hapi-conflict-event";

/** 원천 데이터 제공자 (ACLED 표기 필수) */
export const ACLED_HOME_URL = "https://acleddata.com";
export const ACLED_ATTRIBUTION_POLICY_URL = "https://acleddata.com/attributionpolicy";

export const HAPI_ATTRIBUTION_SHORT = "HDX HAPI · ACLED";
export const HAPI_ATTRIBUTION =
  "HDX HAPI · Armed Conflict Location & Event Data Project (ACLED) · OCHA HDX";
export const HAPI_SOURCE_LINE =
  "Source: ACLED via HDX HAPI (OCHA). www.acleddata.com";

/** 사용자 제공 앱 식별자 (MyConflictMap:kangps7675@gmail.com) — env로 덮어쓰기 가능 */
export const HAPI_APP_IDENTIFIER_DEFAULT =
  "TXlDb25maWN0TWFwOmthbmdwczc2NzVAZ21haWwuY29t";

export type HapiConflictEventRow = {
  location_code: string;
  location_name: string;
  admin1_code?: string | null;
  admin1_name?: string | null;
  admin2_code?: string | null;
  admin2_name?: string | null;
  admin_level?: number | null;
  event_type: string;
  events: number;
  fatalities: number;
  reference_period_start: string;
  reference_period_end: string;
};

export type HapiActiveFront = {
  id: string;
  theaterId: CombatTheaterId;
  locationCode: string;
  locationName: string;
  admin1Name: string;
  lat: number;
  lng: number;
  killed: number;
  events: number;
  periodStart: string;
  periodEnd: string;
  territorySpanDeg: number;
};

export type HapiConflictCasualtiesPayload = {
  fronts: HapiActiveFront[];
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  source: string;
  cite: string[];
  caveat: string;
};

/** 우크라 — 현재 열린 전선 주(州). 후방·비전선은 제외 */
export const UKRAINE_ACTIVE_FRONT_ADMIN1 = new Set([
  "Donetska",
  "Luhanska",
  "Kharkivska",
  "Zaporizka",
  "Khersonska",
  "Sumska",
  "Dnipropetrovska",
]);

/** 중동 — 최근 교전이 열린 행정구역 (HAPI admin1 이름) */
export const MIDDLE_EAST_ACTIVE_FRONT_ADMIN1 = new Set([
  "Gaza Strip",
  "Al Nabatieh",
  "South",
  "Baalbek-El Hermel",
  "Baalbek-Hermel",
]);

type AdminCentroid = { lat: number; lng: number; spanDeg?: number };

const UKRAINE_ADMIN1_CENTROIDS: Record<string, AdminCentroid> = {
  Donetska: { lat: 48.02, lng: 37.8, spanDeg: 4.5 },
  Luhanska: { lat: 48.92, lng: 39.15, spanDeg: 4.2 },
  Kharkivska: { lat: 49.99, lng: 36.23, spanDeg: 4.8 },
  Zaporizka: { lat: 47.84, lng: 35.14, spanDeg: 4.5 },
  Khersonska: { lat: 46.64, lng: 32.62, spanDeg: 4.5 },
  Sumska: { lat: 50.91, lng: 34.8, spanDeg: 4.2 },
  Dnipropetrovska: { lat: 48.46, lng: 35.04, spanDeg: 4.8 },
};

const ME_ADMIN1_CENTROIDS: Record<string, AdminCentroid> = {
  "Gaza Strip": { lat: 31.4, lng: 34.35, spanDeg: 1.2 },
  "West Bank": { lat: 31.95, lng: 35.25, spanDeg: 1.8 },
  "Al Nabatieh": { lat: 33.38, lng: 35.48, spanDeg: 1.4 },
  South: { lat: 33.27, lng: 35.2, spanDeg: 1.5 },
  "Baalbek-El Hermel": { lat: 34.2, lng: 36.25, spanDeg: 1.6 },
  "Baalbek-Hermel": { lat: 34.2, lng: 36.25, spanDeg: 1.6 },
  Bekaa: { lat: 33.85, lng: 35.95, spanDeg: 1.5 },
  Israel: { lat: 31.5, lng: 34.85, spanDeg: 2.2 },
};

const LOCATION_THEATER: Record<string, CombatTheaterId> = {
  UKR: "russia-ukraine",
  PSE: "middle-east",
  ISR: "middle-east",
  LBN: "middle-east",
  SYR: "middle-east",
  YEM: "middle-east",
  IRQ: "middle-east",
  IRN: "middle-east",
};

/** HAPI 조회 대상 — 실제 교전 국가만 (긴장 구간 제외) */
export const HAPI_ACTIVE_WAR_LOCATION_CODES = ["UKR", "PSE", "ISR", "LBN"] as const;

export function resolveHapiAppIdentifier(): string {
  return (
    process.env.HAPI_APP_IDENTIFIER?.trim() ||
    process.env.HDX_HAPI_APP_IDENTIFIER?.trim() ||
    HAPI_APP_IDENTIFIER_DEFAULT
  );
}

export function hapiLookbackWindow(now = new Date()): { start: string; end: string } {
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setUTCMonth(startDate.getUTCMonth() - 4);
  const start = startDate.toISOString().slice(0, 10);
  return { start, end };
}

function normalizeAdmin1(name: string | null | undefined, locationName: string): string {
  const raw = (name || "").trim();
  if (raw) return raw;
  return locationName.trim() || "Unknown";
}

function isActiveFrontAdmin1(locationCode: string, admin1Name: string, fatalities: number): boolean {
  if (locationCode === "UKR") {
    return UKRAINE_ACTIVE_FRONT_ADMIN1.has(admin1Name) && fatalities > 0;
  }
  if (locationCode === "PSE" || locationCode === "LBN" || locationCode === "ISR") {
    if (MIDDLE_EAST_ACTIVE_FRONT_ADMIN1.has(admin1Name)) return fatalities > 0;
    // 허용 목록 밖: 고강도만 (후방 잡음 제거)
    return fatalities >= 80;
  }
  return fatalities >= 100;
}

function centroidFor(
  locationCode: string,
  admin1Name: string,
): AdminCentroid | null {
  if (locationCode === "UKR") return UKRAINE_ADMIN1_CENTROIDS[admin1Name] ?? null;
  return ME_ADMIN1_CENTROIDS[admin1Name] ?? null;
}

/**
 * political_violence 행을 admin1로 합산 → 열린 전선만 반환.
 */
export function aggregateActiveFronts(
  rows: HapiConflictEventRow[],
  opts?: { minFatalities?: number },
): HapiActiveFront[] {
  const minFat = opts?.minFatalities ?? 1;
  type Acc = {
    locationCode: string;
    locationName: string;
    admin1Name: string;
    killed: number;
    events: number;
    periodStart: string;
    periodEnd: string;
  };
  const map = new Map<string, Acc>();

  for (const row of rows) {
    if (row.event_type !== "political_violence") continue;
    const locationCode = String(row.location_code || "").toUpperCase();
    if (!LOCATION_THEATER[locationCode]) continue;
    const admin1Name = normalizeAdmin1(row.admin1_name, row.location_name);
    const key = `${locationCode}::${admin1Name}`;
    const fat = Number(row.fatalities) || 0;
    const ev = Number(row.events) || 0;
    const start = (row.reference_period_start || "").slice(0, 10);
    const end = (row.reference_period_end || "").slice(0, 10);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        locationCode,
        locationName: row.location_name || locationCode,
        admin1Name,
        killed: fat,
        events: ev,
        periodStart: start,
        periodEnd: end,
      });
      continue;
    }
    prev.killed += fat;
    prev.events += ev;
    if (start && (!prev.periodStart || start < prev.periodStart)) prev.periodStart = start;
    if (end && (!prev.periodEnd || end > prev.periodEnd)) prev.periodEnd = end;
  }

  const fronts: HapiActiveFront[] = [];
  for (const acc of map.values()) {
    if (acc.killed < minFat) continue;
    if (!isActiveFrontAdmin1(acc.locationCode, acc.admin1Name, acc.killed)) continue;
    const center = centroidFor(acc.locationCode, acc.admin1Name);
    if (!center) continue;
    const theaterId = LOCATION_THEATER[acc.locationCode];
    if (!theaterId) continue;
    fronts.push({
      id: `hapi-${acc.locationCode}-${acc.admin1Name}`.replace(/\s+/g, "-").toLowerCase(),
      theaterId,
      locationCode: acc.locationCode,
      locationName: acc.locationName,
      admin1Name: acc.admin1Name,
      lat: center.lat,
      lng: center.lng,
      killed: acc.killed,
      events: acc.events,
      periodStart: acc.periodStart,
      periodEnd: acc.periodEnd,
      territorySpanDeg: center.spanDeg ?? 3.5,
    });
  }

  return fronts.sort((a, b) => b.killed - a.killed);
}

export const HAPI_CASUALTY_CAVEAT =
  "HDX HAPI · ACLED political_violence fatalities (monthly admin aggregates). All parties · not Mediazona named RU KIA. No wounded field. Cite ACLED: www.acleddata.com";

export const HAPI_CASUALTY_SEED: HapiConflictCasualtiesPayload = {
  fronts: [],
  fetchedAt: "",
  windowStart: "",
  windowEnd: "",
  source: HAPI_ATTRIBUTION,
  cite: [
    "Armed Conflict Location & Event Data Project (ACLED)",
    ACLED_HOME_URL,
    "HDX HAPI · OCHA",
    HAPI_CONFLICT_EVENTS_URL,
    HAPI_HDX_DATASET_URL,
  ],
  caveat: HAPI_CASUALTY_CAVEAT,
};
