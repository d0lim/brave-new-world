import fs from "fs";
import path from "path";
import type { MilitaryBaseArea, StaticPoint } from "@/data/geoTypes";
import { expandStaticPoints } from "@/lib/compactData";
import type { GlobeLodTier } from "@/lib/globeLod";
import { getServerDataProfile } from "@/lib/serverEnv";
import {
  MILITARY_BASE_AREA_MAX_BY_TIER,
  STATIC_POINT_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { filterStaticPointsForView } from "@/lib/staticGlobe";
import { isCenterInView } from "@/lib/viewportCull";

export type ViewportPointLayer =
  | "airports"
  | "ports"
  | "military-bases"
  | "resources"
  | "cable-landings"
  | "nuclear-sites"
  | "internet-exchanges"
  | "refugee-camps"
  | "ucdp-events"
  | "lng-terminals";

const FILE_BY_LAYER: Record<ViewportPointLayer, string> = {
  airports: "airports.json",
  ports: "ports.json",
  "military-bases": "military-bases.json",
  resources: "resources.json",
  "cable-landings": "cable-landings.json",
  "nuclear-sites": "nuclear-sites.json",
  "internet-exchanges": "internet-exchanges.json",
  "refugee-camps": "refugee-camps.json",
  "ucdp-events": "ucdp-events.json",
  "lng-terminals": "lng-terminals.json",
};

const pointCache = new Map<string, StaticPoint[]>();
let baseAreaCache: MilitaryBaseArea[] | null = null;

function readJsonFile<T>(fileName: string): T | null {
  const profile = getServerDataProfile();
  const primary = path.join(process.cwd(), "public", "data", profile, fileName);
  const fallback = path.join(process.cwd(), "public", "data", fileName);
  for (const filePath of [primary, fallback]) {
    if (!fs.existsSync(filePath)) continue;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    } catch {
      // next
    }
  }
  return null;
}

export function isViewportPointLayer(value: string): value is ViewportPointLayer {
  return value in FILE_BY_LAYER;
}

export function loadAllStaticPoints(layer: ViewportPointLayer): StaticPoint[] {
  const profile = getServerDataProfile();
  const key = `${profile}:${layer}`;
  const hit = pointCache.get(key);
  if (hit) return hit;
  const raw = readJsonFile<unknown[]>(FILE_BY_LAYER[layer]);
  if (!Array.isArray(raw) || raw.length === 0) {
    pointCache.set(key, []);
    return [];
  }
  const points = expandStaticPoints(raw as Parameters<typeof expandStaticPoints>[0]);
  pointCache.set(key, points);
  return points;
}

export function queryViewportPoints(
  layer: ViewportPointLayer,
  options: {
    lat: number;
    lng: number;
    radiusDeg: number;
    tier: GlobeLodTier;
    max?: number;
  },
) {
  const all = loadAllStaticPoints(layer);
  const view = { lat: options.lat, lng: options.lng, altitude: 1 };
  let filtered = filterStaticPointsForView(all, view, options.tier, options.radiusDeg);
  const cap = options.max ?? STATIC_POINT_MAX_BY_TIER[options.tier];
  if (cap > 0 && filtered.length > cap) filtered = filtered.slice(0, cap);
  return { points: filtered, total: all.length, returned: filtered.length };
}

export function loadAllMilitaryBaseAreas(): MilitaryBaseArea[] {
  if (baseAreaCache) return baseAreaCache;
  const raw = readJsonFile<MilitaryBaseArea[]>("military-base-areas.json");
  baseAreaCache = Array.isArray(raw)
    ? raw.filter((item) => item?.geometry && item.center && typeof item.name === "string")
    : [];
  return baseAreaCache;
}

export function queryViewportMilitaryBaseAreas(options: {
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: GlobeLodTier;
  max?: number;
}) {
  const all = loadAllMilitaryBaseAreas();
  const maxCount = options.max ?? MILITARY_BASE_AREA_MAX_BY_TIER[options.tier];
  if (maxCount <= 0) return { areas: [] as MilitaryBaseArea[], total: all.length, returned: 0 };

  const effectiveRadius =
    options.tier === "global"
      ? 0
      : options.tier === "continent"
        ? Math.max(options.radiusDeg, 55)
        : options.radiusDeg;
  const view = { lat: options.lat, lng: options.lng };
  const areas: MilitaryBaseArea[] = [];
  for (const area of all) {
    if (effectiveRadius > 0 && !isCenterInView(area.center, view, effectiveRadius)) continue;
    areas.push(area);
    if (areas.length >= maxCount) break;
  }
  return { areas, total: all.length, returned: areas.length };
}
