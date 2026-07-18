/**
 * NASA FIRMS — MapLibre symbol용 불꽃·연기 스프라이트.
 * 네온 점 크기 불 + 바로 주변만 옅은 연기 (과한 기둥·환한 심지 금지).
 */

export type FirmsFireIconCause = "combat" | "exercise" | "none";

/** v2 — 소형 네온 점 스타일 (구버전 캐시 회피) */
export const FIRMS_FIRE_ICON_IDS = {
  combat: "firms-fire-combat-v2",
  exercise: "firms-fire-exercise-v2",
  none: "firms-fire-wildfire-v2",
} as const;

export function firmsFireIconId(cause: string | undefined | null): string {
  if (cause === "combat") return FIRMS_FIRE_ICON_IDS.combat;
  if (cause === "exercise") return FIRMS_FIRE_ICON_IDS.exercise;
  return FIRMS_FIRE_ICON_IDS.none;
}

function wrap(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 32 40">${body}</svg>`;
}

/** 소형 불점 + 국소 연기 (앵커 = 하단) */
function fireScene(opts: {
  smoke: string;
  smokeSoft: string;
  flame: string;
  core: string;
  glow: string;
}): string {
  const { smoke, smokeSoft, flame, core, glow } = opts;
  return wrap(`
    <defs>
      <radialGradient id="gDot" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${core}" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="${flame}" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${flame}" stop-opacity="0.28"/>
        <stop offset="70%" stop-color="${glow}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gSmoke" cx="50%" cy="70%" r="55%">
        <stop offset="0%" stop-color="${smoke}" stop-opacity="0.32"/>
        <stop offset="55%" stop-color="${smokeSoft}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${smokeSoft}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- 국소 연기 — 불 주변·바로 위만, 옅게 여러 겹 -->
    <ellipse cx="16" cy="22" rx="9" ry="11" fill="url(#gSmoke)"/>
    <ellipse cx="12" cy="18" rx="5.5" ry="7" fill="${smoke}" opacity="0.16"/>
    <ellipse cx="20" cy="16" rx="6" ry="8" fill="${smokeSoft}" opacity="0.14"/>
    <ellipse cx="15" cy="12" rx="4.5" ry="5.5" fill="${smoke}" opacity="0.12"/>
    <ellipse cx="19" cy="10" rx="5" ry="6" fill="${smokeSoft}" opacity="0.1"/>
    <ellipse cx="16" cy="7" rx="3.8" ry="4.2" fill="${smoke}" opacity="0.08"/>

    <!-- 약한 할로 (네온보다 덜 환하게) -->
    <circle cx="16" cy="30" r="7.5" fill="url(#gHalo)"/>

    <!-- 작은 불점 -->
    <circle cx="16" cy="30" r="3.4" fill="url(#gDot)"/>
    <circle cx="16" cy="30" r="1.35" fill="${core}" opacity="0.55"/>
  `);
}

export const FIRMS_FIRE_SVGS: Record<FirmsFireIconCause, string> = {
  combat: fireScene({
    smoke: "#6b7280",
    smokeSoft: "#9ca3af",
    flame: "#e85a42",
    core: "#f0b090",
    glow: "#c43c28",
  }),
  exercise: fireScene({
    smoke: "#78716c",
    smokeSoft: "#a8a29e",
    flame: "#d4922a",
    core: "#e8c878",
    glow: "#b07820",
  }),
  none: fireScene({
    smoke: "#6b6560",
    smokeSoft: "#9a948c",
    flame: "#e07030",
    core: "#e8b878",
    glow: "#c05820",
  }),
};

function loadSvgImage(svg: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(width, height);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load FIRMS fire SVG"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

type MapLike = {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: HTMLImageElement | ImageBitmap | ImageData,
    options?: { pixelRatio?: number },
  ) => void;
};

/** MapLibre 스타일에 FIRMS 불꽃·연기 아이콘 등록 */
export async function ensureFirmsFireImages(map: MapLike): Promise<void> {
  const entries: Array<[FirmsFireIconCause, string]> = [
    ["combat", FIRMS_FIRE_ICON_IDS.combat],
    ["exercise", FIRMS_FIRE_ICON_IDS.exercise],
    ["none", FIRMS_FIRE_ICON_IDS.none],
  ];
  await Promise.all(
    entries.map(async ([cause, id]) => {
      if (map.hasImage(id)) return;
      const img = await loadSvgImage(FIRMS_FIRE_SVGS[cause], 64, 80);
      map.addImage(id, img, { pixelRatio: 2 });
    }),
  );
}
