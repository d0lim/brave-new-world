/**
 * 일일 전장 긴장도 + 초크포인트 공급망 스트레스 랭킹.
 * D1 라이브 스냅샷(GDELT / FIRMS / AIS)으로 UTC 날짜별 TOP 스냅샷을 upsert.
 */

export type DailyRankKind = "theater" | "chokepoint" | "world";

export type DailyRankRow = {
  rank_date: string;
  kind: DailyRankKind;
  entity_id: string;
  label_ko: string;
  label_en: string;
  score: number;
  rank: number;
  prev_rank: number | null;
  delta_rank: number | null;
  delta_score: number | null;
  detail_json: string | null;
  updated_at: string;
};

type ScoredEntity = {
  entityId: string;
  labelKo: string;
  labelEn: string;
  score: number;
  detail: Record<string, unknown>;
};

const THEATERS: Array<{
  id: string;
  labelKo: string;
  labelEn: string;
  gdeltTags: string[];
  firmsIds: string[];
}> = [
  {
    id: "ukraine",
    labelKo: "우크라이나 전선",
    labelEn: "Ukraine front",
    gdeltTags: ["ukraine-tension"],
    firmsIds: ["ukraine", "black-sea"],
  },
  {
    id: "middle-east",
    labelKo: "중동·이란",
    labelEn: "Middle East / Iran",
    gdeltTags: ["middle-east-tension"],
    firmsIds: ["middle-east", "red-sea"],
  },
  {
    id: "taiwan",
    labelKo: "대만 해협",
    labelEn: "Taiwan Strait",
    gdeltTags: ["taiwan-tension"],
    firmsIds: ["taiwan", "south-china-sea"],
  },
  {
    id: "korea",
    labelKo: "한반도",
    labelEn: "Korean Peninsula",
    gdeltTags: ["korea-tension"],
    firmsIds: ["korea"],
  },
  {
    id: "pacific",
    labelKo: "태평양 지정학",
    labelEn: "Pacific geopolitics",
    gdeltTags: ["pacific-tension"],
    firmsIds: ["south-china-sea"],
  },
  {
    id: "atlantic",
    labelKo: "대서양 지정학",
    labelEn: "Atlantic geopolitics",
    gdeltTags: ["atlantic-tension"],
    firmsIds: [],
  },
  {
    id: "arctic",
    labelKo: "북극 지정학",
    labelEn: "Arctic geopolitics",
    gdeltTags: ["arctic-tension"],
    firmsIds: [],
  },
];

/** Worker에 임베드 — Next logisticsRiskPoints와 동기 유지 */
const CHOKEPOINTS: Array<{
  id: string;
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: number;
}> = [
  { id: "choke-hormuz", labelKo: "호르무즈 해협", labelEn: "Strait of Hormuz", lat: 26.58, lng: 56.25, radiusDeg: 1.2, tier: 1 },
  { id: "choke-suez", labelKo: "수에즈 운하", labelEn: "Suez Canal", lat: 31.25, lng: 32.34, radiusDeg: 1.0, tier: 1 },
  { id: "choke-bab-el-mandeb", labelKo: "바브엘만데브", labelEn: "Bab-el-Mandeb", lat: 12.61, lng: 43.35, radiusDeg: 1.1, tier: 1 },
  { id: "choke-malacca", labelKo: "말라카 해협", labelEn: "Strait of Malacca", lat: 2.52, lng: 101.34, radiusDeg: 1.4, tier: 1 },
  { id: "choke-taiwan", labelKo: "대만 해협", labelEn: "Taiwan Strait", lat: 24.32, lng: 120.85, radiusDeg: 1.8, tier: 1 },
  { id: "choke-panama", labelKo: "파나마 운하", labelEn: "Panama Canal", lat: 9.12, lng: -79.91, radiusDeg: 0.9, tier: 1 },
  { id: "choke-bosporus", labelKo: "보스포루스", labelEn: "Bosporus", lat: 41.12, lng: 29.05, radiusDeg: 0.8, tier: 2 },
  { id: "choke-gibraltar", labelKo: "지브롤터", labelEn: "Gibraltar", lat: 35.98, lng: -5.6, radiusDeg: 0.9, tier: 2 },
  { id: "choke-good-hope", labelKo: "희망봉 우회", labelEn: "Cape of Good Hope", lat: -34.35, lng: 18.48, radiusDeg: 1.6, tier: 2 },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function utcRankDate(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function prevUtcRankDate(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() - 1);
  return utcRankDate(d);
}

export function nextUtcRankDate(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return utcRankDate(d);
}

/** 예측 허용 전장 entity id */
export const THEATER_ENTITY_IDS = THEATERS.map((t) => t.id);

async function gdeltMentionByTag(db: D1Database): Promise<Map<string, { mentions: number; points: number }>> {
  const map = new Map<string, { mentions: number; points: number }>();
  try {
    const { results } = await db
      .prepare(
        `SELECT query_tag AS tag,
                COUNT(*) AS points,
                COALESCE(SUM(COALESCE(mention_count, 1)), 0) AS mentions
         FROM gdelt_points
         WHERE query_tag IS NOT NULL AND query_tag != ''
         GROUP BY query_tag`,
      )
      .all<{ tag: string; points: number; mentions: number }>();
    for (const row of results ?? []) {
      map.set(String(row.tag), {
        points: Number(row.points) || 0,
        mentions: Number(row.mentions) || 0,
      });
    }
  } catch {
    // table may be empty
  }
  return map;
}

async function firmsCountByTheater(db: D1Database): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { results } = await db
      .prepare(
        `SELECT theater AS id, COUNT(*) AS c
         FROM firms_fires
         WHERE theater IS NOT NULL AND theater != ''
         GROUP BY theater`,
      )
      .all<{ id: string; c: number }>();
    for (const row of results ?? []) {
      map.set(String(row.id), Number(row.c) || 0);
    }
  } catch {
    // ignore
  }
  return map;
}

async function countNear(
  db: D1Database,
  table: "gdelt_points" | "ais_vessels",
  lat: number,
  lng: number,
  radiusDeg: number,
): Promise<number> {
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS c FROM ${table}
         WHERE lat BETWEEN ?1 AND ?2 AND lng BETWEEN ?3 AND ?4`,
      )
      .bind(lat - radiusDeg, lat + radiusDeg, lng - radiusDeg, lng + radiusDeg)
      .first<{ c: number }>();
    return Number(row?.c) || 0;
  } catch {
    return 0;
  }
}

/** log1p 압축 — 스파이크 완화 (초크포인트·콜드스타트용) */
function log1p(n: number): number {
  return Math.log1p(Math.max(0, n));
}

const EMA_TODAY = 0.55;
const EMA_PREV = 0.45;
/** 전일 대비 하루 최대 변동 비율 */
const MAX_DAY_DELTA_RATIO = 0.4;
/** 전장별 베이스라인 창 — 최근 N일 대비 이탈(z-score) */
const BASELINE_DAYS = 7;
/** 세계 긴장도 = 평균·최고치 혼합 (HOI World Tension / GPR 스타일 간판 숫자) */
const WORLD_AVG_WEIGHT = 0.55;
const WORLD_MAX_WEIGHT = 0.45;
const WORLD_ENTITY_ID = "global";

type TheaterSignals = {
  mentions: number;
  points: number;
  fireCount: number;
  telegramCount: number;
};

const SIGNAL_WEIGHTS: Record<keyof TheaterSignals, number> = {
  mentions: 0.22,
  points: 0.28,
  fireCount: 0.25,
  telegramCount: 0.25,
};

/**
 * raw → EMA(prev) → 일일 cap.
 * detail에 rawScore / smoothScore / components 보존.
 */
function stabilizeScore(
  rawScore: number,
  prevScore: number | null,
  components: Record<string, unknown>,
): { score: number; detail: Record<string, unknown> } {
  const raw = Math.max(0, rawScore);
  let smooth =
    prevScore != null && Number.isFinite(prevScore)
      ? EMA_TODAY * raw + EMA_PREV * prevScore
      : raw;
  if (prevScore != null && Number.isFinite(prevScore)) {
    const maxDelta = Math.max(prevScore, 12) * MAX_DAY_DELTA_RATIO;
    const delta = smooth - prevScore;
    if (delta > maxDelta) smooth = prevScore + maxDelta;
    else if (delta < -maxDelta) smooth = prevScore - maxDelta;
  }
  const score = Math.round(smooth * 100) / 100;
  return {
    score,
    detail: {
      rawScore: Math.round(raw * 100) / 100,
      smoothScore: score,
      prevScore: prevScore == null ? null : Math.round(prevScore * 100) / 100,
      components,
    },
  };
}

function extractTheaterSignals(detail: Record<string, unknown> | null): TheaterSignals {
  const src =
    detail?.components && typeof detail.components === "object"
      ? (detail.components as Record<string, unknown>)
      : detail;
  return {
    mentions: Number(src?.mentions) || 0,
    points: Number(src?.points) || 0,
    fireCount: Number(src?.fireCount) || 0,
    telegramCount: Number(src?.telegramCount) || 0,
  };
}

/** 평소 대비 이탈 — 표본이 적으면 soft ratio / log 콜드스타트 */
function zScore(today: number, history: number[]): number {
  const samples = history.filter((n) => Number.isFinite(n));
  if (samples.length === 0) {
    return log1p(today) / 3;
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (samples.length === 1) {
    const base = Math.max(mean, 1);
    return (today - mean) / (base * 0.5);
  }
  const variance =
    samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1);
  const std = Math.sqrt(variance);
  return (today - mean) / Math.max(std, 1);
}

/** z=0 → 50 (평시), +2σ ≈ 78, −2σ ≈ 22 */
function weightedZToScore(weightedZ: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + weightedZ * 14)) * 100) / 100;
}

function shiftUtcDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return utcRankDate(dt);
}

async function telegramCountByRegion(db: D1Database): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { results } = await db
      .prepare(
        `SELECT region AS id, COUNT(*) AS c
         FROM telegram_alerts
         WHERE region IS NOT NULL AND region != ''
         GROUP BY region`,
      )
      .all<{ id: string; c: number }>();
    for (const row of results ?? []) {
      map.set(String(row.id), Number(row.c) || 0);
    }
  } catch {
    // ignore
  }
  return map;
}

function telegramForTheater(theaterId: string, byRegion: Map<string, number>): number {
  if (theaterId === "ukraine") return byRegion.get("ukraine") ?? 0;
  if (theaterId === "middle-east") return byRegion.get("middle-east") ?? 0;
  return 0;
}

async function loadTheaterSignalHistory(
  db: D1Database,
  beforeDate: string,
  days: number,
): Promise<Map<string, TheaterSignals[]>> {
  const map = new Map<string, TheaterSignals[]>();
  const startDate = shiftUtcDate(beforeDate, -days);
  try {
    const { results } = await db
      .prepare(
        `SELECT entity_id, detail_json FROM daily_entity_ranks
         WHERE kind = 'theater'
           AND entity_id != ?1
           AND rank_date >= ?2
           AND rank_date < ?3`,
      )
      .bind(WORLD_ENTITY_ID, startDate, beforeDate)
      .all<{ entity_id: string; detail_json: string | null }>();
    for (const row of results ?? []) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = row.detail_json ? (JSON.parse(row.detail_json) as Record<string, unknown>) : null;
      } catch {
        parsed = null;
      }
      const signals = extractTheaterSignals(parsed);
      const list = map.get(row.entity_id) ?? [];
      list.push(signals);
      map.set(row.entity_id, list);
    }
  } catch {
    // first run / missing table
  }
  return map;
}

/**
 * 전장 긴장도 — 절대 카운트가 아니라 최근 7일 베이스라인 대비 z-score 가중합.
 * 우크라 일상 포격은 평범, 대만해협 평소 3배 활동이 진짜 신호.
 */
async function scoreTheaters(db: D1Database, rankDate: string): Promise<ScoredEntity[]> {
  const gdelt = await gdeltMentionByTag(db);
  const firms = await firmsCountByTheater(db);
  const telegram = await telegramCountByRegion(db);
  const history = await loadTheaterSignalHistory(db, rankDate, BASELINE_DAYS);

  return THEATERS.map((theater) => {
    let mentions = 0;
    let points = 0;
    for (const tag of theater.gdeltTags) {
      const hit = gdelt.get(tag);
      if (!hit) continue;
      mentions += hit.mentions;
      points += hit.points;
    }
    let fireCount = 0;
    for (const id of theater.firmsIds) {
      fireCount += firms.get(id) ?? 0;
    }
    const telegramCount = telegramForTheater(theater.id, telegram);
    const today: TheaterSignals = { mentions, points, fireCount, telegramCount };
    const past = history.get(theater.id) ?? [];

    const zMentions = zScore(
      today.mentions,
      past.map((p) => p.mentions),
    );
    const zPoints = zScore(
      today.points,
      past.map((p) => p.points),
    );
    const zFire = zScore(
      today.fireCount,
      past.map((p) => p.fireCount),
    );
    const zTelegram = zScore(
      today.telegramCount,
      past.map((p) => p.telegramCount),
    );

    const weightedZ =
      zMentions * SIGNAL_WEIGHTS.mentions +
      zPoints * SIGNAL_WEIGHTS.points +
      zFire * SIGNAL_WEIGHTS.fireCount +
      zTelegram * SIGNAL_WEIGHTS.telegramCount;

    const rawScore = weightedZToScore(weightedZ);
    return {
      entityId: theater.id,
      labelKo: theater.labelKo,
      labelEn: theater.labelEn,
      score: rawScore,
      detail: {
        methodology: "baseline-zscore-7d",
        baselineDays: BASELINE_DAYS,
        baselineSamples: past.length,
        mentions,
        points,
        fireCount,
        telegramCount,
        tags: theater.gdeltTags,
        zScores: {
          mentions: Math.round(zMentions * 100) / 100,
          points: Math.round(zPoints * 100) / 100,
          fireCount: Math.round(zFire * 100) / 100,
          telegramCount: Math.round(zTelegram * 100) / 100,
          weighted: Math.round(weightedZ * 100) / 100,
        },
      },
    };
  });
}

function computeWorldTension(theaterScores: number[]): number {
  if (theaterScores.length === 0) return 50;
  const avg = theaterScores.reduce((a, b) => a + b, 0) / theaterScores.length;
  const max = Math.max(...theaterScores);
  return Math.round((WORLD_AVG_WEIGHT * avg + WORLD_MAX_WEIGHT * max) * 100) / 100;
}

async function scoreChokepoints(db: D1Database): Promise<ScoredEntity[]> {
  const out: ScoredEntity[] = [];
  for (const choke of CHOKEPOINTS) {
    const gdeltNear = await countNear(db, "gdelt_points", choke.lat, choke.lng, choke.radiusDeg);
    const aisNear = await countNear(db, "ais_vessels", choke.lat, choke.lng, choke.radiusDeg);
    const tierBoost = choke.tier === 1 ? 2.5 : 1.2;
    const rawScore = log1p(gdeltNear) * 5 + log1p(aisNear) * 3 + tierBoost;
    out.push({
      entityId: choke.id,
      labelKo: choke.labelKo,
      labelEn: choke.labelEn,
      score: rawScore,
      detail: { gdeltNear, aisNear, radiusDeg: choke.radiusDeg, tier: choke.tier },
    });
  }
  return out;
}

async function loadPrevRanks(
  db: D1Database,
  rankDate: string,
  kind: DailyRankKind,
): Promise<Map<string, { rank: number; score: number }>> {
  const map = new Map<string, { rank: number; score: number }>();
  try {
    const { results } = await db
      .prepare(
        `SELECT entity_id, rank, score FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind = ?2`,
      )
      .bind(rankDate, kind)
      .all<{ entity_id: string; rank: number; score: number }>();
    for (const row of results ?? []) {
      map.set(String(row.entity_id), {
        rank: Number(row.rank) || 0,
        score: Number(row.score) || 0,
      });
    }
  } catch {
    // first run / missing table
  }
  return map;
}

async function upsertKind(
  db: D1Database,
  kind: DailyRankKind,
  scored: ScoredEntity[],
  rankDate: string,
  prevDate: string,
  updatedAt: string,
  options: { absoluteDisplay?: boolean } = {},
): Promise<{ count: number; ranked: ScoredEntity[] }> {
  const prev = await loadPrevRanks(db, prevDate, kind);

  // EMA + 일일 cap 적용 후 재정렬
  const stabilized = scored.map((item) => {
    const prevHit = prev.get(item.entityId);
    const components =
      item.detail && typeof item.detail === "object"
        ? (item.detail as Record<string, unknown>)
        : {};
    const { score, detail } = stabilizeScore(
      item.score,
      prevHit?.score ?? null,
      components,
    );
    return { ...item, score, detail };
  });

  const ranked = stabilized
    .slice()
    .sort((a, b) => b.score - a.score || a.entityId.localeCompare(b.entityId));

  // 당일 상대 0–100 표시용 (max 대비) — z-score 전장은 이미 0–100이라 절대값 사용
  const maxScore = Math.max(...ranked.map((r) => r.score), 1);

  const stmts: D1PreparedStatement[] = [];
  ranked.forEach((item, index) => {
    const rank = index + 1;
    const prevHit = prev.get(item.entityId);
    const prevRank = prevHit?.rank ?? null;
    const deltaRank = prevRank != null ? prevRank - rank : null; // positive = climbed
    const deltaScore = prevHit != null ? item.score - prevHit.score : null;
    const displayScore = options.absoluteDisplay
      ? Math.round(item.score * 10) / 10
      : Math.round((item.score / maxScore) * 1000) / 10;
    const detail = {
      ...item.detail,
      displayScore,
      displayMax: options.absoluteDisplay ? 100 : maxScore,
    };
    stmts.push(
      db
        .prepare(
          `INSERT INTO daily_entity_ranks (
             rank_date, kind, entity_id, label_ko, label_en, score, rank,
             prev_rank, delta_rank, delta_score, detail_json, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
           ON CONFLICT(rank_date, kind, entity_id) DO UPDATE SET
             label_ko = excluded.label_ko,
             label_en = excluded.label_en,
             score = excluded.score,
             rank = excluded.rank,
             prev_rank = excluded.prev_rank,
             delta_rank = excluded.delta_rank,
             delta_score = excluded.delta_score,
             detail_json = excluded.detail_json,
             updated_at = excluded.updated_at`,
        )
        .bind(
          rankDate,
          kind,
          item.entityId,
          item.labelKo,
          item.labelEn,
          item.score,
          rank,
          prevRank,
          deltaRank,
          deltaScore,
          JSON.stringify(detail),
          updatedAt,
        ),
    );
  });

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
  return { count: ranked.length, ranked };
}

async function upsertWorldTension(
  db: D1Database,
  theaterScores: number[],
  rankDate: string,
  prevDate: string,
  updatedAt: string,
): Promise<{ score: number; deltaScore: number | null }> {
  const raw = computeWorldTension(theaterScores);
  const prev = await loadPrevRanks(db, prevDate, "world");
  const prevHit = prev.get(WORLD_ENTITY_ID);
  const { score, detail } = stabilizeScore(raw, prevHit?.score ?? null, {
    methodology: "theater-avg-max-blend",
    avgWeight: WORLD_AVG_WEIGHT,
    maxWeight: WORLD_MAX_WEIGHT,
    theaterCount: theaterScores.length,
    theaterScores: theaterScores.map((s) => Math.round(s * 10) / 10),
  });
  const deltaScore = prevHit != null ? score - prevHit.score : null;
  await db
    .prepare(
      `INSERT INTO daily_entity_ranks (
         rank_date, kind, entity_id, label_ko, label_en, score, rank,
         prev_rank, delta_rank, delta_score, detail_json, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
       ON CONFLICT(rank_date, kind, entity_id) DO UPDATE SET
         label_ko = excluded.label_ko,
         label_en = excluded.label_en,
         score = excluded.score,
         rank = excluded.rank,
         prev_rank = excluded.prev_rank,
         delta_rank = excluded.delta_rank,
         delta_score = excluded.delta_score,
         detail_json = excluded.detail_json,
         updated_at = excluded.updated_at`,
    )
    .bind(
      rankDate,
      "world",
      WORLD_ENTITY_ID,
      "세계 긴장도 지수 (WTI)",
      "World Tension Index (WTI)",
      score,
      1,
      prevHit?.rank ?? null,
      null,
      deltaScore,
      JSON.stringify({
        ...detail,
        displayScore: Math.round(score * 10) / 10,
        displayMax: 100,
        ticker: "WTI",
        blurbKo: "전장별 평소 대비 이탈(z-score) 가중합 · 평균+최고치 혼합 — 서비스 단일 기축",
        blurbEn: "Baseline z-score blend of theater signals · avg+max mix — product spine index",
        analogy: "VIX / GPR / HOI4 World Tension — headline currency of this product",
      }),
      updatedAt,
    );
  return { score, deltaScore };
}

export async function upsertDailyRanks(db: D1Database): Promise<{
  rankDate: string;
  theaterCount: number;
  chokepointCount: number;
  worldTension: number;
}> {
  const now = new Date();
  const rankDate = utcRankDate(now);
  const prevDate = prevUtcRankDate(now);
  const updatedAt = now.toISOString();

  const theaterResult = await upsertKind(
    db,
    "theater",
    await scoreTheaters(db, rankDate),
    rankDate,
    prevDate,
    updatedAt,
    { absoluteDisplay: true },
  );
  const chokepointResult = await upsertKind(
    db,
    "chokepoint",
    await scoreChokepoints(db),
    rankDate,
    prevDate,
    updatedAt,
  );

  const world = await upsertWorldTension(
    db,
    theaterResult.ranked.map((t) => t.score),
    rankDate,
    prevDate,
    updatedAt,
  );

  // 전일(어제) 타깃 예측 정산 — 어제 TOP1 / 긴장도 방향
  try {
    const { settlePredictions } = await import("./dailyPredictions");
    await settlePredictions(db, prevDate);
    await settlePredictions(db, rankDate);
  } catch (error) {
    console.warn(
      "[ingest] prediction settle skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  // 내일 UP/DOWN 문제 출제 (오늘 점수 = baseline)
  try {
    const { upsertTomorrowPrompt } = await import("./dailyPrompts");
    await upsertTomorrowPrompt(db, { rankDate });
  } catch (error) {
    console.warn(
      "[ingest] daily prompt skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    rankDate,
    theaterCount: theaterResult.count,
    chokepointCount: chokepointResult.count,
    worldTension: world.score,
  };
}

export async function readDailyRanks(
  db: D1Database,
  options: { date?: string; kind?: DailyRankKind; limit?: number } = {},
): Promise<DailyRankRow[]> {
  const rankDate = options.date || utcRankDate();
  const limit = Math.min(20, Math.max(1, options.limit ?? 5));
  try {
    if (options.kind) {
      const { results } = await db
        .prepare(
          `SELECT * FROM daily_entity_ranks
           WHERE rank_date = ?1 AND kind = ?2
           ORDER BY rank ASC
           LIMIT ?3`,
        )
        .bind(rankDate, options.kind, limit)
        .all<DailyRankRow>();
      return results ?? [];
    }
    const { results } = await db
      .prepare(
        `SELECT * FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind IN ('theater', 'chokepoint')
         ORDER BY kind ASC, rank ASC`,
      )
      .bind(rankDate)
      .all<DailyRankRow>();
    return results ?? [];
  } catch {
    return [];
  }
}

export async function readWorldTension(
  db: D1Database,
  date?: string,
): Promise<{
  score: number;
  deltaScore: number | null;
  prevScore: number | null;
  detail: Record<string, unknown> | null;
} | null> {
  const rankDate = date || utcRankDate();
  try {
    const row = await db
      .prepare(
        `SELECT score, delta_score, detail_json FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind = 'world' AND entity_id = ?2
         LIMIT 1`,
      )
      .bind(rankDate, WORLD_ENTITY_ID)
      .first<{ score: number; delta_score: number | null; detail_json: string | null }>();
    if (!row) return null;
    let detail: Record<string, unknown> | null = null;
    try {
      detail = row.detail_json ? (JSON.parse(row.detail_json) as Record<string, unknown>) : null;
    } catch {
      detail = null;
    }
    const prevScore =
      detail && typeof detail.prevScore === "number" ? detail.prevScore : null;
    return {
      score: Number(row.score) || 0,
      deltaScore: row.delta_score == null ? null : Number(row.delta_score),
      prevScore,
      detail,
    };
  } catch {
    return null;
  }
}
