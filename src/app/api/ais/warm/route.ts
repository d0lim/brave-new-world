import { NextResponse } from "next/server";
import { writeAisToD1 } from "@/lib/d1MaritimeAir";
import {
  fetchMarineTrafficCommercial,
  getMarineTrafficApiKey,
} from "@/lib/marineTrafficFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret =
    process.env.INGEST_CRON_SECRET?.trim() || process.env.NEWS_WARM_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

/**
 * Cron 워밍: MarineTraffic 민간 AIS → D1.
 * POST /api/ais/warm
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mtKey = getMarineTrafficApiKey();
  if (!mtKey) {
    return NextResponse.json({
      ok: false,
      written: 0,
      error: "MARINETRAFFIC_API_KEY missing",
    });
  }

  const max = Math.min(
    800,
    Math.max(50, Number(new URL(request.url).searchParams.get("max") || 400)),
  );

  try {
    const vessels = await fetchMarineTrafficCommercial(mtKey, max);
    const written = await writeAisToD1(vessels, "marinetraffic");
    return NextResponse.json({
      ok: written > 0,
      written,
      fetched: vessels.length,
      provider: "marinetraffic",
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        written: 0,
        error: error instanceof Error ? error.message : "ais warm failed",
      },
      { status: 502 },
    );
  }
}
