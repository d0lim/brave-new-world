import { NextResponse } from "next/server";
import { apiStubResponse } from "@/lib/apiStub";
import {
  adsbAuthHeaders,
  civilianTrafficUrl,
  extractAircraftList,
  getAdsbApiKey,
  normalizeAdsbAircraft,
  readAdsbJsonBody,
  type TrackedAircraft,
} from "@/lib/adsbClient";
import { distNmToBbox } from "@/lib/adsbWarmFetch";
import { readAdsbFromD1 } from "@/lib/d1MaritimeAir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 지경학(민간 항공 운항) — D1 클라우드 로그 우선, miss 시 live.
 * GET /api/adsb-traffic?lat=&lng=&dist=&max=
 */
export async function GET(request: Request) {
  const apiKey = getAdsbApiKey();
  if (!apiKey) {
    const stub = apiStubResponse("adsb-traffic", request);
    if (stub) return stub;
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required", aircraft: [] }, { status: 400 });
  }

  const dist = Math.min(1500, Math.max(25, Number(searchParams.get("dist") || 250)));
  const max = Math.min(Number(searchParams.get("max") || 350), 800);
  const preferLive = searchParams.get("live") === "1";
  const bbox = distNmToBbox(lat, lng, dist);

  if (!preferLive) {
    const fromD1 = await readAdsbFromD1({
      mode: "civ",
      max,
      ...bbox,
    });
    if (fromD1 && fromD1.count > 0) {
      return NextResponse.json({
        receivedAt: fromD1.receivedAt,
        count: fromD1.count,
        aircraft: fromD1.aircraft,
        attribution: "ADS-B civilian hubs (via Cloudflare D1 cron warm)",
        source: "d1",
        provider: "d1",
        mode: "civilian",
        excluded: "military (dbFlags & 1)",
        cached: true,
        bbox,
      });
    }
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      count: 0,
      aircraft: [],
      waiting: true,
      source: "d1",
      provider: "d1",
      mode: "civilian",
      attribution: "ADS-B civ — D1 empty; wait for cron warm or ?live=1",
      bbox,
    });
  }

  const { url, source } = civilianTrafficUrl(lat, lng, dist);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: adsbAuthHeaders(source === "adsbx" ? apiKey : null),
    });
    if (!response.ok) {
      return NextResponse.json(
        {
          aircraft: [],
          error: `ADS-B traffic HTTP ${response.status} (${source})`,
          source: url,
        },
        { status: 502 },
      );
    }

    const payload = (await readAdsbJsonBody(response)) as {
      ac?: unknown[];
      aircraft?: unknown[];
    };
    const aircraft: TrackedAircraft[] = [];
    for (const raw of extractAircraftList(payload as never)) {
      const item = normalizeAdsbAircraft(raw, { excludeMilitary: true });
      if (!item) continue;
      aircraft.push(item);
      if (aircraft.length >= max) break;
    }

    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      count: aircraft.length,
      aircraft,
      attribution: source === "adsbx" ? "ADSBexchange" : "adsb.fi",
      source: url,
      provider: source,
      mode: "civilian",
      excluded: "military (dbFlags & 1)",
    });
  } catch (error) {
    return NextResponse.json(
      {
        aircraft: [],
        error: error instanceof Error ? error.message : "ADS-B traffic fetch failed",
        source: url,
      },
      { status: 502 },
    );
  }
}
