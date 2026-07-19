import { NextResponse } from "next/server";
import { apiStubResponse } from "@/lib/apiStub";
import { fetchAdsbMilitary } from "@/lib/adsbWarmFetch";
import { BELLINGCAT_ADSB_ATTRIBUTION, getAdsbApiKey } from "@/lib/adsbClient";
import { readAdsbFromD1, readAdsbFromIngestWorker } from "@/lib/d1MaritimeAir";
import { adsbMilQuerySchema, parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADSB_CDN = publicCacheHeaders(CDN_CACHE.adsb);

/** 지정학 — 군용기만 (D1 클라우드 로그 우선) */
export async function GET(request: Request) {
  const apiKey = getAdsbApiKey();
  if (!apiKey) {
    const stub = apiStubResponse("adsb-mil", request);
    if (stub) return stub;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, adsbMilQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, aircraft: [] },
      { status: 400 },
    );
  }
  const max = parsed.data.max;
  const preferLive = Boolean(parsed.data.live);

  if (!preferLive) {
    const fromD1 = await readAdsbFromD1({ mode: "mil", max });
    if (fromD1 && fromD1.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromD1.receivedAt,
          count: fromD1.count,
          aircraft: fromD1.aircraft,
          attribution: `ADS-B (via Cloudflare D1 cron warm) · ${BELLINGCAT_ADSB_ATTRIBUTION}`,
          source: "d1",
          provider: "d1",
          mode: "military",
          cached: true,
        },
        { headers: ADSB_CDN },
      );
    }
    const fromWorker = await readAdsbFromIngestWorker({ mode: "mil", max });
    if (fromWorker && fromWorker.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromWorker.receivedAt,
          count: fromWorker.count,
          aircraft: fromWorker.aircraft,
          attribution: `ADS-B mil (via Cloudflare cron worker) · ${BELLINGCAT_ADSB_ATTRIBUTION}`,
          source: "ingest-worker",
          provider: "ingest-worker",
          mode: "military",
          cached: true,
        },
        { headers: ADSB_CDN },
      );
    }
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        count: 0,
        aircraft: [],
        waiting: true,
        source: "d1",
        provider: "d1",
        mode: "military",
        attribution: `ADS-B mil — D1 empty; wait for cron warm or ?live=1 · ${BELLINGCAT_ADSB_ATTRIBUTION}`,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const mil = await fetchAdsbMilitary(max);
  if (mil.error && mil.aircraft.length === 0) {
    return NextResponse.json(
      {
        aircraft: [],
        error: mil.error,
        provider: mil.provider,
        mode: "military",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  const liveAttr =
    mil.provider === "adsbx"
      ? "ADSBexchange"
      : mil.provider === "adsb.fi"
        ? "adsb.fi"
        : String(mil.provider ?? "ADS-B");

  return NextResponse.json(
    {
      receivedAt: new Date().toISOString(),
      count: mil.aircraft.length,
      aircraft: mil.aircraft,
      attribution: `${liveAttr} · ${BELLINGCAT_ADSB_ATTRIBUTION}`,
      provider: mil.provider,
      mode: "military",
    },
    { headers: ADSB_CDN },
  );
}
