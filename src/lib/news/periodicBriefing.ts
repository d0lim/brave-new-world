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

function looksMostlyKorean(text: string): boolean {
  const ko = (text.match(/[\uac00-\ud7a3]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return ko >= 6 && ko >= latin * 0.5;
}

function pickKoreanLines(lines: string[], limit = 2): string[] {
  return lines.filter(looksMostlyKorean).slice(0, limit);
}

function buildGeoFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  if (FRICTION_EPISODES.length === 0) return null;
  const ko = lang !== "en";
  const episode = FRICTION_EPISODES[hashKeyToIndex(dayKey, FRICTION_EPISODES.length)];
  const kicker = ko ? LAMP_TITLE.ko[tier] : LAMP_TITLE.en[tier];
  const yearText = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${episode.title}`,
    paragraphs: ko
      ? [
          `오늘 등불을 ${episode.locationName} 쪽에 잠시 세워 봅니다. ${yearText}의 그 자리에서 시작된 이야기는 아직도 지도 위에 남아 있습니다.`,
          episode.briefing,
          "라이브 집계가 비어 있어도, 과거 충돌의 결은 오늘의 긴장을 읽는 렌즈가 됩니다. 지도 허브 「반서방국 충돌사」에서 이어서 읽어 보세요. 이 등불은 자정에 다시 켜집니다.",
        ]
      : [
          `Tonight we rest the lamp on ${episode.locationName} (${yearText}).`,
          episode.briefing,
          "Live aggregates are empty — a curated episode stands in. Continue in Frictions. This lamp relights at local midnight.",
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
    const body =
      koLines.length > 0
        ? koLines
        : [
            `${brief.titleKo}은(는) 물자와 가격이 지나가는 병목입니다. 긴장이 번지면 에너지·물류·물가 경로로 파급됩니다.`,
          ];
    return {
      tier,
      key: dayKey,
      title: `${kicker}\n${brief.titleKo}`,
      paragraphs: [
        `오늘 시장 등불은 ${brief.titleKo}을(를) 골라 들었습니다. 숫자 표가 아니라, 한 줄기의 흐름으로 읽어 봅니다.`,
        ...body,
        "수치는 시리즈마다 시점이 다를 수 있습니다. 이 등불은 매일 자정에 다시 켜집니다.",
      ],
    };
  }

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${brief.titleEn}`,
    paragraphs: [brief.impactLine, ...brief.paragraphs.slice(0, 3)],
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

  const hot =
    stats.topGdeltTag || stats.topTelegramRegion
      ? [stats.topGdeltTag, stats.topTelegramRegion].filter(Boolean).join(ko ? "과 " : " / ")
      : null;

  const titleLine = hot
    ? ko
      ? `${hot} 쪽에서 바람이 셉니다`
      : `Wind rising around ${hot}`
    : ko
      ? econ
        ? "시장이 잠든 사이, 지도는 깨어 있습니다"
        : "오늘 밤, 전선이 속삭이는 소리"
      : econ
        ? "While markets sleep, the map stays awake"
        : "Tonight the front whispers";

  const paragraphs: string[] = [];

  if (ko) {
    const sceneBits: string[] = [];
    if (stats.gdeltCount > 0) {
      sceneBits.push(`긴장 신호가 ${stats.gdeltCount.toLocaleString()}곳에서 깜빡였고`);
    }
    if (stats.firmsCount > 0) {
      sceneBits.push(`열원 ${stats.firmsCount.toLocaleString()}점이 밤하늘을 찍어 두었으며`);
    }
    if (stats.telegramCount > 0) {
      sceneBits.push(`현장 채널 ${stats.telegramCount.toLocaleString()}건이 짧은 전언을 남겼습니다`);
    } else if (stats.newsItemCount > 0) {
      sceneBits.push(`뉴스 흐름 ${stats.newsItemCount.toLocaleString()}건이 같은 창을 스쳐 갔습니다`);
    }
    if (sceneBits.length > 0) {
      const joined = sceneBits.join(" ");
      paragraphs.push(
        hot
          ? `등불을 켜자 ${hot} 방향이 먼저 밝아집니다. ${joined}`
          : `등불을 켜자 지도가 천천히 숨을 고릅니다. ${joined}`,
      );
    }

    const gdeltSamples = stats.detail?.gdeltSamples?.slice(0, 3) ?? [];
    const koPlaces = gdeltSamples
      .map((s) => s.name)
      .filter((n) => looksMostlyKorean(n) || /[가-힣]/.test(n));
    const placeNames =
      koPlaces.length > 0
        ? koPlaces.slice(0, 3).join(" · ")
        : gdeltSamples
            .map((s) => s.name)
            .slice(0, 2)
            .join(" · ");
    if (placeNames) {
      paragraphs.push(
        `시선을 낮추면 ${placeNames} 일대가 오늘 이야기의 무대입니다. 이름만으로도 전선의 결이 느껴집니다.`,
      );
    }

    const tgSamples = stats.detail?.telegramSamples?.slice(0, 3) ?? [];
    const koTg = tgSamples.filter((s) => looksMostlyKorean(s.text));
    if (koTg.length > 0) {
      const s = koTg[0]!;
      paragraphs.push(
        `${s.region} 쪽에서 이런 말이 흘러나왔습니다. 「${s.text.slice(0, 140)}${s.text.length > 140 ? "…" : ""}」`,
      );
    } else if (tgSamples.length > 0) {
      const regions = [...new Set(tgSamples.map((s) => s.region).filter(Boolean))].slice(0, 2);
      paragraphs.push(
        regions.length > 0
          ? `현장 채널은 ${regions.join("·")} 일대를 가리킵니다. 원문은 외국어 섞임이 많아, 위치와 온도만 남기고 읽습니다.`
          : "현장 채널의 원문은 외국어 섞임이 많아, 위치와 온도만 남기고 읽습니다.",
      );
    }

    if (paragraphs.length === 0) return null;

    paragraphs.push(
      econ
        ? "숫자의 나열이 아니라, 오늘 시장이 숨을 고르는 한 장면으로 받아 주세요. 이 등불은 자정에 다시 켜집니다."
        : "정보 목록이 아니라, 오늘 전장이 남긴 한 장면으로 받아 주세요. 이 등불은 자정에 다시 켜집니다.",
    );
  } else {
    const countParts: string[] = [];
    if (stats.gdeltCount > 0) countParts.push(`${stats.gdeltCount.toLocaleString()} GDELT sparks`);
    if (stats.firmsCount > 0) countParts.push(`${stats.firmsCount.toLocaleString()} FIRMS embers`);
    if (stats.telegramCount > 0) {
      countParts.push(`${stats.telegramCount.toLocaleString()} field notes`);
    }
    if (stats.newsItemCount > 0 && countParts.length < 2) {
      countParts.push(`${stats.newsItemCount.toLocaleString()} headlines`);
    }
    if (countParts.length > 0) {
      paragraphs.push(
        hot
          ? `The lamp finds ${hot} first. Across the window: ${countParts.join(", ")}.`
          : `The lamp warms the map. Across the window: ${countParts.join(", ")}.`,
      );
    }
    const gdeltSamples = stats.detail?.gdeltSamples?.slice(0, 3) ?? [];
    if (gdeltSamples.length > 0) {
      paragraphs.push(
        `Stage lights fall on ${gdeltSamples.map((s) => s.name).join(", ")}.`,
      );
    }
    const tgSamples = stats.detail?.telegramSamples?.slice(0, 2) ?? [];
    for (const s of tgSamples) {
      paragraphs.push(`[${s.region}] ${s.text.slice(0, 160)}${s.text.length > 160 ? "…" : ""}`);
    }
    if (paragraphs.length === 0) return null;
    paragraphs.push("Not a checklist — a scene. This lamp relights at local midnight.");
  }

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
