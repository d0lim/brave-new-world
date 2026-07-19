import type { LayerPrefs } from "@/lib/layerPrefs";

/**
 * 레이어 동시 ON 캡 — 패키지 hard cap과 맞춤 (렌더 폭증 방지).
 * Ultra-Lite는 더 낮은 상한.
 */
export const ACTIVE_LAYER_CAP_DEFAULT = 16;

/** ultra-lite — 무거운 폴링 레이어를 줄이는 소프트 상한 */
export const ACTIVE_LAYER_CAP_ULTRA = 12;

/**
 * 캡 집계에서 제외:
 * - showNeptunPreviousTrails: NEPTUN 종속 옵션 (별도 슬롯 안 씀)
 */
const CAP_EXEMPT_KEYS = new Set<keyof LayerPrefs>([
  "labelLanguage",
  "showNeptunPreviousTrails",
]);

/** 캡 초과 시 잘라낼 때 우선 유지 (앞쪽일수록 유지) */
export const LAYER_CAP_KEEP_PRIORITY: Array<keyof LayerPrefs> = [
  "showUkraineControl",
  "showNeptun",
  "showWarZones",
  "showDiplomaticTension",
  "showEastAsiaAdiz",
  "showIslandChains",
  "showAxisNetwork",
  "showGdeltWar",
  "showGdeltOceanCompetition",
  "showFirmsFires",
  "showMilitaryActivity",
  "showAirTraffic",
  "showAis",
  "showDisguisedVessels",
  "showTzevaAdom",
  "showNewfeedsIranAttacks",
  "showChinaTaiwanIncidents",
  "showChinaJapanIncidents",
  "showChinaPhilippinesIncidents",
  "showUsChinaIncidents",
  "showNorthKoreaMissileTests",
  "showTelegramOsint",
  "showConflictZones",
  "showShippingLanes",
  "showLogisticsRisk",
  "showCriticalNodes",
  "showSubmarineCables",
  "showOilPipelines",
  "showGasPipelines",
  "showResources",
  "showGemOilGasExtraction",
  "showGemCoalMines",
  "showLngTerminals",
  "showCityLabels",
];

export function isLayerCapCountedKey(key: keyof LayerPrefs): boolean {
  if (CAP_EXEMPT_KEYS.has(key)) return false;
  return typeof key === "string" && key.startsWith("show");
}

export function countActiveLayers(prefs: LayerPrefs): number {
  let n = 0;
  for (const key of Object.keys(prefs) as Array<keyof LayerPrefs>) {
    if (!isLayerCapCountedKey(key)) continue;
    if (prefs[key] === true) n += 1;
  }
  return n;
}

export function activeLayerCap(ultraLite: boolean): number {
  return ultraLite ? ACTIVE_LAYER_CAP_ULTRA : ACTIVE_LAYER_CAP_DEFAULT;
}

/** 끄기(false)는 항상 OK. ON은 모드별 상한 적용. */
export function canEnableLayer(
  prefs: LayerPrefs,
  key: keyof LayerPrefs,
  ultraLite: boolean,
): boolean {
  if (!isLayerCapCountedKey(key)) return true;
  if (prefs[key] === true) return true;
  return countActiveLayers(prefs) < activeLayerCap(ultraLite);
}

/**
 * prefs가 캡을 넘으면 우선순위 밖·뒤쪽 ON을 끈다.
 */
export function clampPrefsToActiveCap(
  prefs: LayerPrefs,
  ultraLite: boolean,
): LayerPrefs {
  const cap = activeLayerCap(ultraLite);
  if (countActiveLayers(prefs) <= cap) return prefs;

  const next = { ...prefs };
  const onKeys = (Object.keys(next) as Array<keyof LayerPrefs>).filter(
    (key) => isLayerCapCountedKey(key) && next[key] === true,
  );

  const priorityIndex = new Map(
    LAYER_CAP_KEEP_PRIORITY.map((key, index) => [key, index] as const),
  );
  onKeys.sort((a, b) => {
    const pa = priorityIndex.get(a) ?? 10_000;
    const pb = priorityIndex.get(b) ?? 10_000;
    if (pa !== pb) return pa - pb;
    return String(a).localeCompare(String(b));
  });

  for (let i = cap; i < onKeys.length; i += 1) {
    const key = onKeys[i];
    (next as Record<string, boolean | string>)[key as string] = false;
  }
  return next;
}
