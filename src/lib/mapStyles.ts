import type { MapStyleMode } from "@/lib/layerPrefs";
import {
  CYBER_WAR_ROOM_THEME,
  cyberCoastlineColor,
} from "@/lib/cyberWarRoomTheme";
import { getMapLibreStyleUrl } from "@/lib/mapLibreBasemap";

/** 레거시 JPG 폴백 — MapLibre 로드 실패 시 수동 복구용 */
export const TEXTURE_CDN_FALLBACK: Record<MapStyleMode, string> = {
  night: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  satellite: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  topo: "https://unpkg.com/three-globe/example/img/earth-water.png",
};

export type GlobeTextureConfig = {
  /** true면 MapLibre 벡터 글로브 + 투명 three-globe 오버레이 */
  vectorBase: boolean;
  mapStyleUrl: string;
  globeImageUrl: string | null;
  bumpImageUrl: string | null;
  backgroundColor: string;
  oceanColor: string;
  landFillColor: string;
  coastlineColor: string;
  borderColor: string;
  conflictZoneFill: string;
  borderStrokeWidth: number;
  countryColors: Record<string, string>;
};

export function getGlobeTextures(mode: MapStyleMode): GlobeTextureConfig {
  const { globe, polygon } = CYBER_WAR_ROOM_THEME;

  return {
    vectorBase: true,
    mapStyleUrl: getMapLibreStyleUrl(mode),
    globeImageUrl: null,
    bumpImageUrl: null,
    backgroundColor: globe.backgroundColor,
    oceanColor: globe.oceanColor,
    landFillColor: polygon.defaultFill,
    coastlineColor: cyberCoastlineColor(),
    borderColor: polygon.strokeColor,
    conflictZoneFill: polygon.conflictZoneFill,
    borderStrokeWidth: polygon.strokeWidth,
    countryColors: {},
  };
}
