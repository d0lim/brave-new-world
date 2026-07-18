/**
 * 수상전투함 다각도 실루엣 (구축·호위·초계·순양 통합).
 * 화면 상대 침로(heading − mapBearing)에 따라 8방위 모습 전환.
 * 각 프레임은 이미 진행 방향이 화면에 맞게 그려짐 → Marker rotation=0, viewport 정렬.
 */

export type SurfaceCombatantAspect =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export const SURFACE_COMBATANT_ASPECTS: readonly SurfaceCombatantAspect[] = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
] as const;

/** 정사각 캔버스 — 회전·방위 전환 시 중심 안정 */
export const SURFACE_COMBATANT_VIEWBOX = { width: 64, height: 64 } as const;

export const SURFACE_COMBATANT_REFERENCE = {
  imagePath: "/assets/reference/rok-ddg-surface-combatant-aerial.png",
  description: "Aegis destroyer — 8-aspect map marker (bow/side/stern/quarter)",
  sourceNote: "ROKS Sejong / Arleigh Burke user-provided aerial photos (2026)",
};

export type SurfaceCombatantIconSize = {
  width: number;
  height: number;
};

export const SURFACE_COMBATANT_MARKER_SIZE: SurfaceCombatantIconSize = {
  width: 48,
  height: 48,
};

export type SurfaceAspectDrawing = {
  /** 헐·본체 */
  hull: string;
  /** 디테일(함교·포·마스트 등) */
  details: readonly string[];
  /** 노란 진행축(선택) */
  axis?: string;
};

/**
 * 화면 상대 침로(도) → 8방위.
 * 0° = 화면 위쪽으로 항진(선수↑).
 */
export function surfaceCombatantAspectFromRelativeHeading(
  relativeHeadingDeg: number,
): SurfaceCombatantAspect {
  const h = ((relativeHeadingDeg % 360) + 360) % 360;
  const idx = Math.round(h / 45) % 8;
  return SURFACE_COMBATANT_ASPECTS[idx]!;
}

/** heading·bearing → 화면 상대 침로 */
export function surfaceCombatantRelativeHeading(
  headingDeg: number | null | undefined,
  mapBearingDeg: number | null | undefined,
): number {
  const heading = headingDeg != null && Number.isFinite(headingDeg) ? headingDeg : 0;
  const bearing = mapBearingDeg != null && Number.isFinite(mapBearingDeg) ? mapBearingDeg : 0;
  return ((heading - bearing) % 360 + 360) % 360;
}

/** N: 俯視 선수↑ */
const TOP_N: SurfaceAspectDrawing = {
  hull:
    "M 32,4 L 38,12 L 40,22 L 40.5,34 L 39.5,46 L 36,56 L 32,58 L 28,56 L 24.5,46 L 23.5,34 L 24,22 L 26,12 Z",
  details: [
    "M 29,14 L 35,14 L 35.5,18 L 33,20 L 31,20 L 28.5,18 Z",
    "M 27,22 L 37,22 L 37,27 L 27,27 Z",
    "M 26,29 L 38,29 L 37.5,40 L 26.5,40 Z",
    "M 31.2,28 L 32.8,28 L 32.5,16 L 31.5,16 Z",
    "M 27,42 L 37,42 L 36.5,54 L 27.5,54 Z",
  ],
  axis: "M 32,6 L 32,56",
};

/** S: 俯視 선수↓ (함미가 화면 위) */
const TOP_S: SurfaceAspectDrawing = {
  hull:
    "M 32,60 L 38,52 L 40,42 L 40.5,30 L 39.5,18 L 36,8 L 32,6 L 28,8 L 24.5,18 L 23.5,30 L 24,42 L 26,52 Z",
  details: [
    "M 27.5,10 L 36.5,10 L 36,22 L 28,22 Z",
    "M 26.5,24 L 37.5,24 L 37,36 L 27,36 Z",
    "M 31.2,36 L 32.8,36 L 32.5,48 L 31.5,48 Z",
    "M 28.5,44 L 35.5,44 L 35,50 L 33,52 L 31,52 L 29,50 Z",
  ],
  axis: "M 32,8 L 32,58",
};

/** E: 옆모습 선수→ */
const SIDE_E: SurfaceAspectDrawing = {
  hull:
    "M 6,40 L 10,36 L 22,34 L 38,33 L 52,34 L 58,36 L 60,40 L 58,44 L 50,46 L 28,47 L 14,46 L 8,44 Z",
  details: [
    "M 14,34 L 18,28 L 22,28 L 24,34",
    "M 24,33 L 28,22 L 36,20 L 42,22 L 44,33",
    "M 33,20 L 34.5,20 L 34.2,10 L 33.3,10 Z",
    "M 36,22 L 40,22 L 40.5,28 L 36.2,28 Z",
    "M 44,33 L 54,34 L 54,40 L 44,40",
  ],
  axis: "M 8,40 L 58,40",
};

/** W: 옆모습 선수← */
const SIDE_W: SurfaceAspectDrawing = {
  hull:
    "M 58,40 L 54,36 L 42,34 L 26,33 L 12,34 L 6,36 L 4,40 L 6,44 L 14,46 L 36,47 L 50,46 L 56,44 Z",
  details: [
    "M 50,34 L 46,28 L 42,28 L 40,34",
    "M 40,33 L 36,22 L 28,20 L 22,22 L 20,33",
    "M 30.7,20 L 29.2,20 L 29.5,10 L 30.4,10 Z",
    "M 28,22 L 24,22 L 23.5,28 L 27.8,28 Z",
    "M 20,33 L 10,34 L 10,40 L 20,40",
  ],
  axis: "M 56,40 L 6,40",
};

/** NE: 대각 3/4 선수 우상 */
const QUARTER_NE: SurfaceAspectDrawing = {
  hull:
    "M 40,8 L 50,18 L 52,30 L 48,44 L 40,54 L 28,56 L 18,50 L 14,38 L 16,24 L 24,12 Z",
  details: [
    "M 34,16 L 42,18 L 42,24 L 36,26 L 32,22 Z",
    "M 28,24 L 44,28 L 42,40 L 26,36 Z",
    "M 34,26 L 36,26 L 37,14 L 35,14 Z",
    "M 24,40 L 40,44 L 38,52 L 24,48 Z",
  ],
};

/** NW: 대각 3/4 선수 좌상 */
const QUARTER_NW: SurfaceAspectDrawing = {
  hull:
    "M 24,8 L 14,18 L 12,30 L 16,44 L 24,54 L 36,56 L 46,50 L 50,38 L 48,24 L 40,12 Z",
  details: [
    "M 30,16 L 22,18 L 22,24 L 28,26 L 32,22 Z",
    "M 36,24 L 20,28 L 22,40 L 38,36 Z",
    "M 30,26 L 28,26 L 27,14 L 29,14 Z",
    "M 40,40 L 24,44 L 26,52 L 40,48 Z",
  ],
};

/** SE: 대각 3/4 선수 우하 */
const QUARTER_SE: SurfaceAspectDrawing = {
  hull:
    "M 40,56 L 50,46 L 52,34 L 48,20 L 40,10 L 28,8 L 18,14 L 14,26 L 16,40 L 24,52 Z",
  details: [
    "M 24,16 L 40,12 L 42,20 L 28,24 Z",
    "M 26,24 L 42,28 L 40,40 L 24,36 Z",
    "M 34,38 L 36,38 L 37,50 L 35,50 Z",
    "M 34,44 L 42,46 L 40,52 L 34,50 Z",
  ],
};

/** SW: 대각 3/4 선수 좌하 */
const QUARTER_SW: SurfaceAspectDrawing = {
  hull:
    "M 24,56 L 14,46 L 12,34 L 16,20 L 24,10 L 36,8 L 46,14 L 50,26 L 48,40 L 40,52 Z",
  details: [
    "M 40,16 L 24,12 L 22,20 L 36,24 Z",
    "M 38,24 L 22,28 L 24,40 L 40,36 Z",
    "M 30,38 L 28,38 L 27,50 L 29,50 Z",
    "M 30,44 L 22,46 L 24,52 L 30,50 Z",
  ],
};

/**
 * 앞모습(대략) — 선수 정면. 상대침로 ≈ 180°(화면 아래로 항진)일 때
 * 실제로는 TOP_S가 더 읽기 쉬워 S는 TOP_S 사용. front는 예비.
 */
const FRONT_S: SurfaceAspectDrawing = {
  hull:
    "M 20,48 L 24,20 L 28,14 L 32,12 L 36,14 L 40,20 L 44,48 L 40,54 L 32,56 L 24,54 Z",
  details: [
    "M 28,22 L 36,22 L 37,32 L 27,32 Z",
    "M 30,18 L 34,18 L 34,12 L 30,12 Z",
    "M 26,34 L 38,34 L 36,48 L 28,48 Z",
  ],
};

export const SURFACE_COMBATANT_ASPECT_DRAWINGS: Record<
  SurfaceCombatantAspect,
  SurfaceAspectDrawing
> = {
  n: TOP_N,
  ne: QUARTER_NE,
  e: SIDE_E,
  se: QUARTER_SE,
  s: TOP_S,
  sw: QUARTER_SW,
  w: SIDE_W,
  nw: QUARTER_NW,
};

/** 정면 강조가 필요할 때 S 대체용 */
export const SURFACE_COMBATANT_FRONT_DRAWING = FRONT_S;
