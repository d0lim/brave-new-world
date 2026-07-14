import type { FeatureCollection, Polygon } from "geojson";
import type { GeoJsonGeometry, TransportPath } from "@/data/geoTypes";
import { geometryToAccentOutlineAndHatch } from "@/lib/disputeHatch";

export type EastAsiaAdizId = "kadiz" | "jadiz" | "taidiz" | "dprk-adiz" | "cadiz";

export type EastAsiaAdizStyle = {
  id: EastAsiaAdizId;
  outline: string;
  hatch: string;
  pattern: "slash" | "backslash" | "horizontal" | "cross";
};

/** 최종 5국 네온 팔레트 (투명도 반영) */
export const EAST_ASIA_ADIZ_STYLES: Record<EastAsiaAdizId, EastAsiaAdizStyle> = {
  kadiz: {
    id: "kadiz",
    outline: "rgba(0, 240, 255, 0.92)",
    hatch: "rgba(0, 240, 255, 0.5)",
    pattern: "slash",
  },
  jadiz: {
    id: "jadiz",
    outline: "rgba(170, 170, 170, 0.85)",
    hatch: "rgba(170, 170, 170, 0.4)",
    pattern: "backslash",
  },
  taidiz: {
    id: "taidiz",
    outline: "rgba(255, 153, 0, 0.92)",
    hatch: "rgba(255, 153, 0, 0.5)",
    pattern: "cross",
  },
  "dprk-adiz": {
    id: "dprk-adiz",
    outline: "rgba(189, 0, 255, 0.95)",
    hatch: "rgba(189, 0, 255, 0.6)",
    pattern: "slash",
  },
  cadiz: {
    id: "cadiz",
    outline: "rgba(255, 0, 85, 0.88)",
    hatch: "rgba(255, 0, 85, 0.4)",
    pattern: "backslash",
  },
};

/** 동아시아 ADIZ가 보이기 시작하는 최대 고도 (이하면 표시) — LOD continent 이하 */
export const EAST_ASIA_ADIZ_MAX_ALTITUDE = 1.72;

export function isEastAsiaAdizVisibleAtAltitude(altitude: number): boolean {
  return altitude <= EAST_ASIA_ADIZ_MAX_ALTITUDE;
}

function asAdizId(raw: unknown): EastAsiaAdizId | null {
  const id = String(raw ?? "");
  if (id in EAST_ASIA_ADIZ_STYLES) return id as EastAsiaAdizId;
  return null;
}

export function eastAsiaAdizToPaths(fc: FeatureCollection | null | undefined): TransportPath[] {
  if (!fc?.features?.length) return [];
  const out: TransportPath[] = [];
  for (const feature of fc.features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const id = asAdizId(props.id ?? feature.id);
    if (!id) continue;
    const geometry = feature.geometry as Polygon | null;
    if (!geometry || geometry.type !== "Polygon") continue;
    const style = EAST_ASIA_ADIZ_STYLES[id];
    const name = String(props.nameKo ?? props.name ?? id);
    out.push(
      ...geometryToAccentOutlineAndHatch(id, name, geometry as GeoJsonGeometry, {
        outlineKind: "dispute-zone",
        hatchKind: "dispute-hatch",
        outlineColor: style.outline,
        hatchColor: style.hatch,
        pattern: style.pattern,
        preferDetailSegments: true,
      }),
    );
  }
  return out;
}
