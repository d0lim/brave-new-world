/**
 * 로컬 예측 캐시 — 오늘 픽 + 연속 적중 스트릭 + 애널리스트 누적.
 * 서버 정산과 별도로 UX용 (기기 로컬).
 */

import {
  nextUtcRankDate,
  prevUtcRankDate,
  utcRankDate,
} from "@/lib/dailyRanks";
import {
  analystTierFromStats,
  analystTierLabel,
  type AnalystTierId,
} from "@/lib/wti";

export { nextUtcRankDate, prevUtcRankDate, utcRankDate };

export const DAILY_PREDICT_PREFS_KEY = "geowatch-predict-prefs-v1";

export type DailyPredictPrefs = {
  /** YYYY-MM-DD → pick entity id (내일 타깃 날짜 키) */
  picks: Record<string, string>;
  /** 연속 적중 일수 */
  streak: number;
  /** 마지막으로 스트릭을 갱신한 타깃 날짜 */
  lastSettledTarget: string | null;
  /** 마지막 적중 여부 (UI 힌트) */
  lastHit: boolean | null;
  /** 누적 적중 (애널리스트 등급) */
  hits: number;
  /** 누적 시도 (정산된 날만) */
  attempts: number;
};

const DEFAULT_PREFS: DailyPredictPrefs = {
  picks: {},
  streak: 0,
  lastSettledTarget: null,
  lastHit: null,
  hits: 0,
  attempts: 0,
};

export function readDailyPredictPrefs(): DailyPredictPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS, picks: {} };
  try {
    const raw = window.localStorage.getItem(DAILY_PREDICT_PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS, picks: {} };
    const parsed = JSON.parse(raw) as Partial<DailyPredictPrefs>;
    return {
      picks:
        parsed.picks && typeof parsed.picks === "object" ? { ...parsed.picks } : {},
      streak: Number.isFinite(parsed.streak) ? Math.max(0, Number(parsed.streak)) : 0,
      lastSettledTarget:
        typeof parsed.lastSettledTarget === "string" ? parsed.lastSettledTarget : null,
      lastHit: typeof parsed.lastHit === "boolean" ? parsed.lastHit : null,
      hits: Number.isFinite(parsed.hits) ? Math.max(0, Number(parsed.hits)) : 0,
      attempts: Number.isFinite(parsed.attempts)
        ? Math.max(0, Number(parsed.attempts))
        : 0,
    };
  } catch {
    return { ...DEFAULT_PREFS, picks: {} };
  }
}

export function writeDailyPredictPrefs(prefs: DailyPredictPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DAILY_PREDICT_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota
  }
}

export function cacheLocalPick(targetDate: string, pickEntityId: string): void {
  const prefs = readDailyPredictPrefs();
  prefs.picks[targetDate] = pickEntityId;
  writeDailyPredictPrefs(prefs);
}

/**
 * 어제 타깃이 정산됐을 때 로컬 스트릭·애널리스트 누적 갱신.
 * winnerEntityId 와 로컬 pick 비교.
 */
export function applyLocalSettle(options: {
  targetDate: string;
  winnerEntityId: string | null;
}): DailyPredictPrefs {
  const prefs = readDailyPredictPrefs();
  if (prefs.lastSettledTarget === options.targetDate) return prefs;
  const pick = prefs.picks[options.targetDate];
  if (!pick || !options.winnerEntityId) {
    prefs.lastSettledTarget = options.targetDate;
    prefs.lastHit = null;
    writeDailyPredictPrefs(prefs);
    return prefs;
  }
  const hit = pick === options.winnerEntityId;
  prefs.lastHit = hit;
  prefs.streak = hit ? prefs.streak + 1 : 0;
  prefs.attempts += 1;
  if (hit) prefs.hits += 1;
  prefs.lastSettledTarget = options.targetDate;
  writeDailyPredictPrefs(prefs);
  return prefs;
}

export function todayTargetDate(): string {
  return nextUtcRankDate();
}

export function localAnalystTier(prefs?: DailyPredictPrefs): AnalystTierId {
  const p = prefs ?? readDailyPredictPrefs();
  return analystTierFromStats({
    hits: p.hits,
    attempts: p.attempts,
    streak: p.streak,
  });
}

export function localAnalystTierLabel(
  lang: "ko" | "en",
  prefs?: DailyPredictPrefs,
): string {
  return analystTierLabel(localAnalystTier(prefs), lang === "ko");
}
