import type { AisVessel } from "@/data/geoTypes";
import {
  aisShipTypeLabel,
  classifyAisVessel,
} from "@/lib/aisVesselClass";

const MT_BASE = "https://services.marinetraffic.com/api";

function parseNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildVessel(
  partial: Omit<AisVessel, "shipType" | "shipTypeLabel" | "category"> & {
    shipType?: number | null;
  },
): AisVessel {
  const shipType = partial.shipType ?? null;
  const shipName = partial.shipName;
  const category = classifyAisVessel({ shipType, shipName });
  return {
    ...partial,
    shipType,
    shipTypeLabel: aisShipTypeLabel(shipType),
    category,
  };
}

export function getMarineTrafficApiKey(): string | null {
  const key = (
    process.env.MARINETRAFFIC_API_KEY ||
    process.env.MarineTraffic_API_KEY ||
    ""
  ).trim();
  return key || null;
}

/** MarineTraffic exportvessels — 민간(화물·탱커·여객) shiptype 6/7/8 */
export async function fetchMarineTrafficCommercial(
  apiKey: string,
  max: number,
): Promise<AisVessel[]> {
  const shiptypes = [6, 7, 8];
  const out: AisVessel[] = [];

  for (const shiptype of shiptypes) {
    if (out.length >= max) break;
    const url = new URL(`${MT_BASE}/exportvessels/${encodeURIComponent(apiKey)}`);
    url.searchParams.set("v", "8");
    url.searchParams.set("timespan", "10");
    url.searchParams.set("shiptype", String(shiptype));
    url.searchParams.set("protocol", "jsono");

    try {
      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as unknown;
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as { DATA?: unknown[] })?.DATA)
          ? (data as { DATA: unknown[] }).DATA
          : [];

      for (const row of rows) {
        if (out.length >= max) break;
        const r = row as Record<string, unknown>;
        const lat = parseNumber(r.LAT ?? r.lat);
        const lng = parseNumber(r.LON ?? r.lng ?? r.LONGTITUDE);
        const mmsi = r.MMSI != null ? String(r.MMSI) : null;
        if (lat === null || lng === null || !mmsi) continue;
        const shipType = parseNumber(r.SHIPTYPE ?? r.TYPE ?? shiptype * 10) ?? shiptype * 10;
        out.push(
          buildVessel({
            id: mmsi,
            mmsi,
            shipName:
              typeof r.SHIPNAME === "string"
                ? r.SHIPNAME
                : typeof r.NAME === "string"
                  ? r.NAME
                  : null,
            lat,
            lng,
            speedOverGround: parseNumber(r.SPEED ?? r.SOG),
            courseOverGround: parseNumber(r.COURSE ?? r.COG),
            trueHeading: parseNumber(r.HEADING),
            timestamp: typeof r.TIMESTAMP === "string" ? r.TIMESTAMP : null,
            shipType,
          }),
        );
      }
    } catch {
      // MT 키/쿼터 실패
    }
  }

  return out;
}
