import { loadViinaRenderData } from "@/lib/viinaServerData";
import { VIINA_POLICY } from "@/lib/licensing/viinaPolicy";
import { loadUkraineHatchCache } from "@/lib/ukraineHatchServerData";
import type { UkraineControlZone } from "@/data/geoTypes";

/**
 * 지구본 렌더 전용 — private/viina-render 캐시를 같은 앱 클라이언트에만 전달.
 * ?light=1 — hatch 캐시가 있으면 zone geometry를 축소해 페이로드를 줄인다.
 * @see docs/copyright-checklist.md
 */
function stripZoneGeometry(zones: UkraineControlZone[]): UkraineControlZone[] {
  return zones.map((zone) => ({
    ...zone,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [zone.center.lng - 0.01, zone.center.lat - 0.01],
          [zone.center.lng + 0.01, zone.center.lat - 0.01],
          [zone.center.lng + 0.01, zone.center.lat + 0.01],
          [zone.center.lng - 0.01, zone.center.lat + 0.01],
          [zone.center.lng - 0.01, zone.center.lat - 0.01],
        ],
      ],
    },
  }));
}

export async function GET(request: Request) {
  if (!VIINA_POLICY.renderingOnly) {
    return Response.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const data = loadViinaRenderData();
  if (!data?.features?.length) {
    return Response.json(
      {
        error: "viina-render-cache-missing",
        hint: "Run: npm run viina:build",
      },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const light = searchParams.get("light") === "1";
  const hatchReady =
    Boolean(loadUkraineHatchCache("overview")?.paths?.length) ||
    Boolean(loadUkraineHatchCache("detail")?.paths?.length);

  if (light && hatchReady) {
    return Response.json(
      {
        ...data,
        features: stripZoneGeometry(data.features),
        overviewFeatures: data.overviewFeatures?.length
          ? stripZoneGeometry(data.overviewFeatures)
          : [],
        light: true,
        hatchReady: true,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=3600",
          "X-Viina-Policy": "rendering-only",
          "X-Viina-Light": "1",
        },
      },
    );
  }

  return Response.json(data, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "X-Viina-Policy": "rendering-only",
    },
  });
}
