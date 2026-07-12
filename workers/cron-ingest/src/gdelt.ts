import type { GdeltPointRow } from "./env";

/**
 * GDELT 2.0 Geo API (GeoJSON) — Worker-friendly (no ZIP/adm-zip).
 * @see https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/
 */
const GEO_API = "https://api.gdeltproject.org/api/v2/geo/geo";

/** Focused conflict queries — keep few for Cron time budget */
export const GDELT_QUERIES: { tag: string; query: string }[] = [
  { tag: "ukraine", query: "(ukraine OR donetsk OR kharkiv OR zaporizhzhia)" },
  { tag: "middle-east", query: "(gaza OR lebanon OR hezbollah OR houthi OR \"red sea\")" },
  { tag: "taiwan", query: "(taiwan OR \"taiwan strait\" OR pla)" },
  { tag: "korea", query: "(\"north korea\" OR pyongyang OR dprk)" },
];

type GeoJsonFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: number[] };
  properties?: {
    name?: string;
    count?: number;
    url?: string;
    shareimage?: string;
  };
};

type GeoJsonFc = {
  type?: string;
  features?: GeoJsonFeature[];
};

function stableId(tag: string, lat: number, lng: number, name: string | null, url: string | null) {
  const key = `${tag}|${lat.toFixed(3)}|${lng.toFixed(3)}|${name || ""}|${url || ""}`;
  // FNV-1a 32-bit — short, deterministic, no crypto dependency
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `gdelt-${tag}-${(hash >>> 0).toString(16)}`;
}

export function parseGdeltGeoJson(payload: GeoJsonFc, queryTag: string): GdeltPointRow[] {
  const features = Array.isArray(payload.features) ? payload.features : [];
  const out: GdeltPointRow[] = [];

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const name = feature.properties?.name?.trim() || null;
    const url = feature.properties?.url?.trim() || null;
    const countRaw = feature.properties?.count;
    const mention =
      typeof countRaw === "number" && Number.isFinite(countRaw) ? countRaw : null;

    out.push({
      id: stableId(queryTag, lat, lng, name, url),
      lat,
      lng,
      name,
      url,
      mention_count: mention,
      share_image: feature.properties?.shareimage?.trim() || null,
      query_tag: queryTag,
    });
  }

  return out;
}

export async function fetchGdeltPoints(options: {
  maxPoints: number;
  timespan?: string;
}): Promise<{ points: GdeltPointRow[]; errors: string[] }> {
  const timespan = options.timespan ?? "60min";
  const perQuery = Math.max(
    40,
    Math.floor(options.maxPoints / Math.max(1, GDELT_QUERIES.length)),
  );
  const points: GdeltPointRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const { tag, query } of GDELT_QUERIES) {
    try {
      const url = new URL(GEO_API);
      url.searchParams.set("query", query);
      url.searchParams.set("mode", "PointData");
      url.searchParams.set("format", "GeoJSON");
      url.searchParams.set("timespan", timespan);
      url.searchParams.set("maxpoints", String(perQuery));

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json,application/geo+json,*/*" },
      });
      const text = await response.text();
      if (!response.ok) {
        errors.push(`${tag}: HTTP ${response.status}`);
        continue;
      }
      if (!text.trim().startsWith("{")) {
        errors.push(`${tag}: non-JSON body`);
        continue;
      }
      const json = JSON.parse(text) as GeoJsonFc;
      for (const point of parseGdeltGeoJson(json, tag)) {
        if (seen.has(point.id)) continue;
        seen.add(point.id);
        points.push(point);
      }
    } catch (error) {
      errors.push(
        `${tag}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }

  return { points, errors };
}
