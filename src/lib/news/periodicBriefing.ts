import { FRICTION_EPISODES } from "@/data/frictionEpisodes";
import { allEconInsightBriefs } from "@/data/econInsightBriefs";
import type { BriefingPeriodStats } from "@/lib/briefingPeriodStats";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 매일 등불 브리핑 — 지정학·지경학 각각 하루 1회.
 *
 * - 첫 방문: 입장 인트로(경고→편지→도메인)가 끝난 뒤에 점화
 * - 재방문: 로컬 자정 기준 그날 아직 안 봤으면 모드별 양피지
 * - seen 키 = `daily-YYYY-MM-DD-{conflict|economy}`
 * - 본문 = (지경학) SOTW market-lamp → D1 집계 → 큐레이션 폴백
 * - 서술 뼈대 = 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)을 논리 순서로 따르는 정부 정례 브리핑 어조
 */

export type BriefingTier = "monthly" | "weekly" | "daily";

export type PeriodicBriefing = {
  tier: BriefingTier;
  /** 등불 seen 키 — 캘린더 일 + 뷰어 모드 */
  key: string;
  title: string;
  paragraphs: string[];
};

const STORAGE_PREFIX = "cv-periodic-brief-seen-";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 브라우저 로컬 캘린더 날짜 키 — 등불 seen / 자정 감지의 기준 */
export function localCalendarDayKey(now: Date = new Date()): string {
  return `daily-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);

  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: d.getUTCFullYear(), week };
}

function isMonthEndWindow(date: Date): boolean {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() >= lastDay - 2 || date.getDate() === 1;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** 카피/집계 티어 — 월말 > 주말 > 평일 (동시에 하나만) */
export function resolvePeriodTier(now: Date = new Date()): { tier: BriefingTier; key: string } {
  if (isMonthEndWindow(now)) {
    const ref =
      now.getDate() === 1 ? new Date(now.getFullYear(), now.getMonth() - 1, 15) : now;
    return {
      tier: "monthly",
      key: `monthly-${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}`,
    };
  }
  if (isWeekend(now)) {
    const { year, week } = isoWeek(now);
    return { tier: "weekly", key: `weekly-${year}-W${pad2(week)}` };
  }
  return {
    tier: "daily",
    key: localCalendarDayKey(now),
  };
}

/** 등불 주기 = 로컬 캘린더 하루. 티어는 카피용. */
export function resolveLampPeriod(now: Date = new Date()): {
  dayKey: string;
  tier: BriefingTier;
  statsKey: string;
} {
  const { tier, key: statsKey } = resolvePeriodTier(now);
  return { dayKey: localCalendarDayKey(now), tier, statsKey };
}

/** 모드별 일일 등불 seen 키 — 지정학·지경학 각각 하루 1회 */
export function lampSeenKey(dayKey: string, mode: ViewerMode): string {
  return `${dayKey}-${mode}`;
}

export function hasSeenPeriod(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return true;
  }
}

export function markPeriodSeen(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

function hashKeyToIndex(key: string, mod: number): number {
  if (mod <= 0) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

const LAMP_TITLE = {
  ko: {
    daily: "오늘의 전장 등불",
    weekly: "이번 주 전장 등불",
    monthly: "이번 달 전장 등불",
  },
  en: {
    daily: "Today's frontline lamp",
    weekly: "This week's frontline lamp",
    monthly: "This month's frontline lamp",
  },
} as const;

const LAMP_TITLE_ECON = {
  ko: {
    daily: "오늘의 시장 등불",
    weekly: "이번 주 시장 등불",
    monthly: "이번 달 시장 등불",
  },
  en: {
    daily: "Today's market lamp",
    weekly: "This week's market lamp",
    monthly: "This month's market lamp",
  },
} as const;

/**
 * 등불 서술 — 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)을 논리 순서로 따르되
 * 라벨 나열이 아니라 정부 정례 브리핑처럼 단정한 공식 문장으로 이어 쓴다.
 */
function looksMostlyKorean(text: string): boolean {
  const ko = (text.match(/[\uac00-\ud7a3]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return ko >= 6 && ko >= latin * 0.5;
}

function pickKoreanLines(lines: string[], limit = 2): string[] {
  return lines.filter(looksMostlyKorean).slice(0, limit);
}

function partyLabel(parties: string[]): string {
  if (parties.length === 0) return "관련 세력";
  return parties.join("·");
}

function buildGeoFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  if (FRICTION_EPISODES.length === 0) return null;
  const ko = lang !== "en";
  const episode = FRICTION_EPISODES[hashKeyToIndex(dayKey, FRICTION_EPISODES.length)];
  const kicker = ko ? LAMP_TITLE.ko[tier] : LAMP_TITLE.en[tier];
  const yearText = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;
  const who = partyLabel(episode.parties);

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${episode.title}`,
    paragraphs: ko
      ? [
          // 언제 · 어디서 · 누가
          `보고드립니다. ${yearText}, ${episode.locationName}에서 ${who}이(가) 충돌했습니다. 금일 정례 보고는 라이브 집계가 비어 있어 이 사례를 기준 자료로 다룹니다.`,
          // 무엇을 · 왜
          episode.briefing,
          // 어떻게
          "이상은 확인된 과거 기록에 근거한 정리이며, 오늘의 긴장을 판단하는 참고 자료입니다. 상세 내용은 지도 허브 「반서방국 충돌사」에서 확인하실 수 있습니다. 다음 보고는 자정 기준으로 갱신됩니다.",
        ]
      : [
          `Briefing. In ${yearText}, at ${episode.locationName}, ${who} collided. With live aggregates empty, today's report uses this case as reference material.`,
          episode.briefing,
          "The above is drawn from verified historical record and serves as reference for reading today's tension. Full detail is available in the Frictions hub. The next report updates at local midnight.",
        ],
  };
}

function buildEconFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  const briefs = allEconInsightBriefs();
  if (briefs.length === 0) return null;
  const ko = lang !== "en";
  const brief = briefs[hashKeyToIndex(dayKey, briefs.length)];
  const kicker = ko ? LAMP_TITLE_ECON.ko[tier] : LAMP_TITLE_ECON.en[tier];

  if (ko) {
    const koLines = pickKoreanLines(brief.paragraphs, 2);
    const whatWhy =
      koLines.length > 0
        ? koLines
        : [
            `${brief.titleKo}은(는) 물자와 가격이 지나가는 병목 지점입니다.`,
            "긴장이 번지면 에너지·물류·물가 경로로 파급됩니다. 금일 보고가 이 지점을 다루는 배경입니다.",
          ];
    return {
      tier,
      key: dayKey,
      title: `${kicker}\n${brief.titleKo}`,
      paragraphs: [
        // 언제 · 어디서 · 무엇을
        `보고드립니다. 금일 시장 정례 보고 대상은 ${brief.titleKo}입니다. 라이브 집계가 비어 있어 축적된 분석 자료를 기준으로 정리합니다.`,
        // 무엇을 · 왜
        ...whatWhy.slice(0, 2),
        // 어떻게
        "이상은 확인된 자료에 근거한 정리이며, 수치는 시리즈별 기준 시점이 다를 수 있습니다. 다음 보고는 자정 기준으로 갱신됩니다.",
      ],
    };
  }

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${brief.titleEn}`,
    paragraphs: [
      `Briefing. Today's market report covers ${brief.titleEn}. With live aggregates empty, this draws on standing analysis.`,
      brief.impactLine,
      ...brief.paragraphs.slice(0, 2),
      "This organizes verified material only; series may differ in reference date. The next report updates at local midnight.",
    ],
  };
}

/** 통계·샘플로 본문 구성. 데이터 없으면 null → 호출부가 폴백. */
export function buildBriefingFromStats(
  stats: BriefingPeriodStats | null | undefined,
  tier: BriefingTier,
  dayKey: string,
  lang: LabelLanguage,
  viewerMode: ViewerMode,
): PeriodicBriefing | null {
  if (!stats) return null;
  const total =
    stats.gdeltCount + stats.firmsCount + stats.telegramCount + stats.newsItemCount;
  if (total <= 0 && !(stats.detail?.gdeltSamples?.length || stats.detail?.telegramSamples?.length)) {
    return null;
  }

  const ko = lang !== "en";
  const econ = viewerMode === "economy";
  const kicker = econ
    ? ko
      ? LAMP_TITLE_ECON.ko[tier]
      : LAMP_TITLE_ECON.en[tier]
    : ko
      ? LAMP_TITLE.ko[tier]
      : LAMP_TITLE.en[tier];

  const hotTag = stats.topGdeltTag || null;
  const hotRegion = stats.topTelegramRegion || null;
  const hot = [hotTag, hotRegion].filter(Boolean).join(ko ? "·" : " / ") || null;

  const gdeltSamples = stats.detail?.gdeltSamples?.slice(0, 3) ?? [];
  const placeNames = (() => {
    const koPlaces = gdeltSamples
      .map((s) => s.name)
      .filter((n) => looksMostlyKorean(n) || /[가-힣]/.test(n));
    if (koPlaces.length > 0) return koPlaces.slice(0, 3).join(" · ");
    return gdeltSamples
      .map((s) => s.name)
      .slice(0, 2)
      .join(" · ");
  })();

  const tgSamples = stats.detail?.telegramSamples?.slice(0, 3) ?? [];
  const koTg = tgSamples.filter((s) => looksMostlyKorean(s.text));
  const tgRegions = [...new Set(tgSamples.map((s) => s.region).filter(Boolean))].slice(0, 2);

  const titleLine = hot
    ? ko
      ? `${hot} 상황 정례 보고`
      : `${hot} — situation report`
    : ko
      ? econ
        ? "시장 관측 정례 보고"
        : "전선 관측 정례 보고"
      : econ
        ? "Market situation report"
        : "Frontline situation report";

  const paragraphs: string[] = [];

  if (ko) {
    // 언제 · 어디서
    const whenWhere = hot
      ? `보고드립니다. 기준 시점은 금일 관측 창이며, 주요 관측 지역은 ${hot}${placeNames ? ` 일대입니다. 인접 지점으로 ${placeNames}이(가) 함께 포착되었습니다` : "입니다"}.`
      : placeNames
        ? `보고드립니다. 기준 시점은 금일 관측 창이며, 주요 관측 지역은 ${placeNames} 일대입니다.`
        : "보고드립니다. 기준 시점은 금일 관측 창이며, 특정 지역에 국한되지 않고 지도 전역에서 신호가 포착되었습니다.";
    paragraphs.push(whenWhere);

    // 누가 · 무엇을
    const actors: string[] = [];
    if (stats.gdeltCount > 0) {
      actors.push(`긴장 관측 ${stats.gdeltCount.toLocaleString()}건`);
    }
    if (stats.firmsCount > 0) {
      actors.push(`열원 탐지 ${stats.firmsCount.toLocaleString()}건`);
    }
    if (stats.telegramCount > 0) {
      actors.push(`현장 채널 보고 ${stats.telegramCount.toLocaleString()}건`);
    } else if (stats.newsItemCount > 0) {
      actors.push(`뉴스 보도 ${stats.newsItemCount.toLocaleString()}건`);
    }
    if (actors.length > 0) {
      paragraphs.push(
        `집계 항목은 ${actors.join(", ")}입니다. 동일 관측 창에서 수집된 신호를 종합한 수치입니다.${
          econ ? " 시장 거래 마감 시간대에도 관측은 계속되었습니다." : ""
        }`,
      );
    }

    // 왜
    if (koTg.length > 0) {
      const s = koTg[0]!;
      paragraphs.push(
        `주목 배경은 다음과 같습니다. ${s.region} 방면에서 「${s.text.slice(0, 120)}${s.text.length > 120 ? "…" : ""}」라는 현장 전언이 접수되어 긴장 수위가 상승했습니다. 미확인 전언으로, 교차 확인이 필요합니다.`,
      );
    } else if (tgRegions.length > 0) {
      paragraphs.push(
        `주목 배경은 ${tgRegions.join("·")} 일대 채널이 해당 지점을 지목한 데 있습니다. 원문에 외국어가 다수 섞여 위치 정보만 확인했습니다.`,
      );
    } else if (hot || placeNames) {
      paragraphs.push(
        `주목 배경은 ${hot || placeNames}이(가) 금일 관측 창에서 가장 먼저·가장 강하게 반응한 점입니다.`,
      );
    }

    // 어떻게
    paragraphs.push(
      econ
        ? "종합하면, 본 보고는 누가·언제·어디서·무엇을·왜·어떻게 순서로 확인된 사실만 정리한 것입니다. 수치는 시리즈별 기준 시점이 달라 단정적 해석은 유보합니다. 다음 보고는 자정 기준으로 갱신됩니다."
        : "종합하면, 본 보고는 확인된 관측 사실을 육하원칙 순서로 정리한 것이며 추정·전망은 포함하지 않았습니다. 다음 보고는 자정 기준으로 갱신됩니다.",
    );
  } else {
    paragraphs.push(
      hot
        ? `Briefing. As of this observation window, the primary area of interest is ${hot}${placeNames ? `, with adjacent activity near ${placeNames}` : ""}.`
        : placeNames
          ? `Briefing. As of this observation window, the primary area of interest is ${placeNames}.`
          : "Briefing. As of this observation window, signals were recorded across the map with no single dominant area.",
    );
    const actors: string[] = [];
    if (stats.gdeltCount > 0) actors.push(`${stats.gdeltCount.toLocaleString()} tension observations`);
    if (stats.firmsCount > 0) actors.push(`${stats.firmsCount.toLocaleString()} heat detections`);
    if (stats.telegramCount > 0) actors.push(`${stats.telegramCount.toLocaleString()} field-channel reports`);
    if (actors.length > 0) {
      paragraphs.push(`Recorded items: ${actors.join("; ")}, aggregated from the same observation window.`);
    }
    if (tgSamples[0]) {
      const s = tgSamples[0];
      paragraphs.push(
        `Context: a field report from ${s.region} — “${s.text.slice(0, 120)}${s.text.length > 120 ? "…" : ""}” — raised the tension level. Unverified; pending corroboration.`,
      );
    } else if (hot || placeNames) {
      paragraphs.push(`Context: ${hot || placeNames} responded first and most strongly in this window.`);
    }
    paragraphs.push(
      "In summary, this report organizes verified observations in 5W1H order and excludes projection. The next report updates at local midnight.",
    );
  }

  if (paragraphs.length < 2) return null;

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${titleLine}`,
    paragraphs,
  };
}

/**
 * 폴백만 — 라이브 집계 없을 때.
 * 호출부에서 key를 lampSeenKey(dayKey, mode)로 덮어쓴다.
 */
export function buildPeriodicBriefing(
  viewerMode: ViewerMode,
  lang: LabelLanguage,
  now: Date = new Date(),
): PeriodicBriefing | null {
  const { dayKey, tier } = resolveLampPeriod(now);
  if (viewerMode === "economy") {
    return buildEconFallback(tier, dayKey, lang) ?? buildGeoFallback(tier, dayKey, lang);
  }
  return buildGeoFallback(tier, dayKey, lang);
}

/** @deprecated 본문이 이미 집계 기반이면 no-op에 가깝게 유지 */
export function mergeBriefingStats(
  briefing: PeriodicBriefing,
  stats: BriefingPeriodStats | null | undefined,
  lang: LabelLanguage,
): PeriodicBriefing {
  if (!stats) return briefing;
  const fromStats = buildBriefingFromStats(
    stats,
    briefing.tier,
    briefing.key,
    lang,
    "conflict",
  );
  return fromStats ?? briefing;
}
