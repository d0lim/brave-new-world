import type { MapStyleMode } from "@/lib/layerPrefs";
import { clampGlobeAltitude } from "@/lib/globeCamera";

/** 무료 MapLibre GL 스타일 — Conflict View 톤별 */
export const MAPLIBRE_STYLE_BY_MODE: Record<MapStyleMode, string> = {
  night: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  topo: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

export type MapLibreCamera = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

/** globe.gl altitude → MapLibre zoom (globe projection, 경험적 보정) */
export function globeViewToMapLibre(view: {
  lat: number;
  lng: number;
  altitude: number;
}): MapLibreCamera {
  const alt = clampGlobeAltitude(view.altitude);
  const zoom = Math.max(0.85, Math.min(13.8, 9.25 - Math.log2(alt + 0.06) * 2.35));

  return {
    longitude: view.lng,
    latitude: view.lat,
    zoom,
    pitch: 0,
    bearing: 0,
  };
}

export function getMapLibreStyleUrl(mode: MapStyleMode): string {
  return MAPLIBRE_STYLE_BY_MODE[mode] ?? MAPLIBRE_STYLE_BY_MODE.night;
}
