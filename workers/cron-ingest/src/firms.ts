import type { FirmsFireRow } from "./env";

const DEFAULT_SOURCE = "VIIRS_SNPP_NRT";

/** Conflict theaters — keep small for Worker CPU/time limits */
export const FIRMS_THEATERS: {
  id: string;
  west: number;
  south: number;
  east: number;
  north: number;
}[] = [
  { id: "ukraine", west: 22, south: 44, east: 41, north: 53 },
  { id: "middle-east", west: 32, south: 28, east: 50, north: 38 },
  { id: "taiwan", west: 116, south: 20, east: 125, north: 27 },
  { id: "korea", west: 123, south: 33, east: 132, north: 43 },
  { id: "red-sea", west: 32, south: 10, east: 48, north: 28 },
];

export function buildFirmsAreaUrl(options: {
  mapKey: string;
  west: number;
  south: number;
  east: number;
  north: number;
  dayRange?: number;
  source?: string;
}) {
  const {
    mapKey,
    west,
    south,
    east,
    north,
    dayRange = 1,
    source = DEFAULT_SOURCE,
  } = options;
  const bbox = `${west},${south},${east},${north}`;
  const days = Math.min(5, Math.max(1, dayRange));
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${days}`;
}

export function parseFirmsCsv(
  csv: string,
  theater: string,
  source: string,
  maxCount: number,
): FirmsFireRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");
  if (latIdx < 0 || lngIdx < 0) return [];

  const frpIdx = header.indexOf("frp");
  const brightIdx = header.indexOf("brightness");
  const confIdx = header.indexOf("confidence");
  const dateIdx = header.indexOf("acq_date");
  const timeIdx = header.indexOf("acq_time");
  const satIdx = header.indexOf("satellite");
  const dnIdx = header.indexOf("daynight");

  const fires: FirmsFireRow[] = [];
  for (let i = 1; i < lines.length && fires.length < maxCount; i += 1) {
    const cols = lines[i]!.split(",");
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const acqDate = dateIdx >= 0 ? cols[dateIdx]?.trim() || null : null;
    const acqTime = timeIdx >= 0 ? cols[timeIdx]?.trim() || null : null;
    const frpRaw = frpIdx >= 0 ? Number(cols[frpIdx]) : NaN;

    fires.push({
      id: `firms-${theater}-${acqDate || "na"}-${acqTime || i}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      frp: Number.isFinite(frpRaw) ? frpRaw : null,
      brightness: brightIdx >= 0 ? Number(cols[brightIdx]) || null : null,
      confidence: confIdx >= 0 ? cols[confIdx]?.trim() || null : null,
      acq_date: acqDate,
      acq_time: acqTime,
      satellite: satIdx >= 0 ? cols[satIdx]?.trim() || null : null,
      daynight: dnIdx >= 0 ? cols[dnIdx]?.trim() || null : null,
      source,
      theater,
    });
  }

  return fires;
}

function isFirmsErrorBody(csv: string) {
  const head = csv.trim().slice(0, 120).toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.includes("invalid") ||
    head.includes("error") ||
    head.includes("unauthorized") ||
    !head.includes("latitude")
  );
}

export async function fetchFirmsForTheaters(options: {
  mapKey: string;
  dayRange: number;
  maxPerTheater: number;
  source?: string;
}): Promise<{ fires: FirmsFireRow[]; errors: string[] }> {
  const source = options.source ?? DEFAULT_SOURCE;
  const fires: FirmsFireRow[] = [];
  const errors: string[] = [];

  for (const theater of FIRMS_THEATERS) {
    try {
      const url = buildFirmsAreaUrl({
        mapKey: options.mapKey,
        ...theater,
        dayRange: options.dayRange,
        source,
      });
      const response = await fetch(url, {
        headers: { Accept: "text/csv" },
      });
      const csv = await response.text();
      if (!response.ok) {
        errors.push(`${theater.id}: HTTP ${response.status}`);
        continue;
      }
      if (isFirmsErrorBody(csv)) {
        errors.push(`${theater.id}: unexpected body`);
        continue;
      }
      fires.push(
        ...parseFirmsCsv(csv, theater.id, source, options.maxPerTheater),
      );
    } catch (error) {
      errors.push(
        `${theater.id}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }

  return { fires, errors };
}
