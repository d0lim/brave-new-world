import { NextResponse } from "next/server";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  isViewportPointLayer,
  queryViewportMilitaryBaseAreas,
  queryViewportPoints,
} from "@/lib/serverViewportPoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIERS = new Set<GlobeLodTier>([
  "global",
  "continent",
  "regional",
  "near",
  "village",
]);

/**
 * 공항·항구·기지 등 정적 포인트를 서버에서 뷰포트 필터 후 일부만 반환.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layer = searchParams.get("layer") || "airports";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  const tierRaw = (searchParams.get("tier") || "regional") as GlobeLodTier;
  const tier = TIERS.has(tierRaw) ? tierRaw : "regional";
  const radiusDeg = Math.min(90, Math.max(0, Number(searchParams.get("radius") || 16)));
  const max = searchParams.get("max") ? Number(searchParams.get("max")) : undefined;

  try {
    if (layer === "military-base-areas") {
      const result = queryViewportMilitaryBaseAreas({
        lat,
        lng,
        radiusDeg,
        tier,
        max: Number.isFinite(max) ? max : undefined,
      });
      return NextResponse.json(
        {
          layer,
          tier,
          areaCount: result.returned,
          totalAreaCount: result.total,
          areas: result.areas,
          source: "server-viewport",
        },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    if (!isViewportPointLayer(layer)) {
      return NextResponse.json({ error: "invalid-layer", points: [] }, { status: 400 });
    }

    const result = queryViewportPoints(layer, {
      lat,
      lng,
      radiusDeg,
      tier,
      max: Number.isFinite(max) ? max : undefined,
    });

    return NextResponse.json(
      {
        layer,
        tier,
        pointCount: result.returned,
        totalPointCount: result.total,
        points: result.points,
        source: "server-viewport",
      },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "viewport-points-failed",
        points: [],
      },
      { status: 502 },
    );
  }
}
