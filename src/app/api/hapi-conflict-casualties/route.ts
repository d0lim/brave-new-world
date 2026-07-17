import { NextResponse } from "next/server";
import {
  aggregateActiveFronts,
  HAPI_ACTIVE_WAR_LOCATION_CODES,
  HAPI_CASUALTY_CAVEAT,
  HAPI_CASUALTY_SEED,
  HAPI_CONFLICT_EVENTS_URL,
  hapiLookbackWindow,
  resolveHapiAppIdentifier,
  type HapiConflictCasualtiesPayload,
  type HapiConflictEventRow,
} from "@/lib/hapiConflictCasualties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 10_000;

async function fetchLocationRows(
  locationCode: string,
  start: string,
  end: string,
  appId: string,
): Promise<HapiConflictEventRow[]> {
  const rows: HapiConflictEventRow[] = [];
  let offset = 0;
  for (let page = 0; page < 4; page += 1) {
    const url = new URL(HAPI_CONFLICT_EVENTS_URL);
    url.searchParams.set("location_code", locationCode);
    url.searchParams.set("event_type", "political_violence");
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("output_format", "json");
    url.searchParams.set("app_identifier", appId);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "ConflictView/1.0 (casualty fronts; mailto:kangps7675@gmail.com)",
      },
      signal: AbortSignal.timeout(90_000),
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`HAPI ${locationCode} HTTP ${res.status}`);
    }
    const body = (await res.json()) as { data?: HapiConflictEventRow[] };
    const batch = body.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }
  return rows;
}

/**
 * HDX HAPI conflict-events → 열린 전선별 ACLED 사망 합.
 * 우크라·중동 교전국만. 대만·한반도 등 긴장 구간 제외.
 */
export async function GET() {
  const appId = resolveHapiAppIdentifier();
  const { start, end } = hapiLookbackWindow();

  try {
    const batches = await Promise.all(
      HAPI_ACTIVE_WAR_LOCATION_CODES.map((code) =>
        fetchLocationRows(code, start, end, appId).catch((err) => {
          console.warn("[hapi-conflict-casualties]", code, err);
          return [] as HapiConflictEventRow[];
        }),
      ),
    );
    const rows = batches.flat();
    const fronts = aggregateActiveFronts(rows);

    const payload: HapiConflictCasualtiesPayload = {
      fronts,
      fetchedAt: new Date().toISOString(),
      windowStart: start,
      windowEnd: end,
      source: "HDX HAPI · ACLED conflict-events (political_violence)",
      cite: ["HDX HAPI", "ACLED", "OCHA HDX"],
      caveat: HAPI_CASUALTY_CAVEAT,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[hapi-conflict-casualties]", err);
    return NextResponse.json(
      {
        ...HAPI_CASUALTY_SEED,
        fetchedAt: new Date().toISOString(),
        windowStart: start,
        windowEnd: end,
        caveat: `${HAPI_CASUALTY_CAVEAT} · live fetch failed`,
      } satisfies HapiConflictCasualtiesPayload,
      { status: 200, headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  }
}
