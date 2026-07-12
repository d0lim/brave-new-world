import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { loadViinaRenderData } from "@/lib/viinaServerData";
import { VIINA_POLICY } from "@/lib/licensing/viinaPolicy";
import {
  filterHatchPathsByView,
  precomputeUkraineHatchPaths,
  type UkraineHatchLod,
} from "@/lib/ukraineHatchPrecompute";
import {
  loadUkraineHatchCache,
  saveUkraineHatchCache,
} from "@/lib/ukraineHatchServerData";
import {
  readUkraineHatchFromD1,
  writeUkraineHatchToD1,
} from "@/lib/ukraineHatchD1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseLod(raw: string | null): UkraineHatchLod {
  return raw === "overview" ? "overview" : "detail";
}

function splitZones(features: NonNullable<ReturnType<typeof loadViinaRenderData>>["features"]) {
  const ru = features.filter((z) => z.controlStatus === "RU");
  const ua = features.filter((z) => z.controlStatus === "UA");
  const contested = features.filter((z) => z.controlStatus === "CONTESTED");
  return { ru, ua, contested };
}

async function ensureHatchPayload(lod: UkraineHatchLod) {
  const fileCache = loadUkraineHatchCache(lod);
  if (fileCache?.paths?.length) {
    return { payload: fileCache, source: "file" as const };
  }

  try {
    const db = await getDb();
    const fromD1 = await readUkraineHatchFromD1(db, lod);
    if (fromD1?.paths?.length) {
      saveUkraineHatchCache(fromD1);
      return { payload: fromD1, source: "d1" as const };
    }
  } catch {
    // D1/proxy 미가용 — 파일·빌드 경로로 계속
  }

  const viina = loadViinaRenderData();
  if (!viina?.features?.length) {
    return null;
  }

  const zones =
    lod === "overview" && viina.overviewFeatures?.length
      ? viina.overviewFeatures
      : viina.features;
  const { ru, ua, contested } = splitZones(zones);
  const payload = precomputeUkraineHatchPaths(
    ru,
    ua,
    contested,
    lod,
    viina.controlDate || "",
  );
  saveUkraineHatchCache(payload);

  try {
    const db = await getDb();
    await writeUkraineHatchToD1(db, payload);
  } catch {
    // D1 동기화 실패해도 파일 캐시로 응답 가능
  }

  return { payload, source: "precompute" as const };
}

/**
 * 사전계산된 우크라 점령/주장 빗금·테두리.
 * 클라이언트는 geometry hatch 생성 없이 이 path만 그린다.
 */
export async function GET(request: Request) {
  if (!VIINA_POLICY.renderingOnly) {
    return NextResponse.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.min(20, Math.max(2, Number(searchParams.get("radius") || 8)));
  const max = Math.min(8000, Math.max(200, Number(searchParams.get("max") || 4000)));

  try {
    const ensured = await ensureHatchPayload(lod);
    if (!ensured) {
      return NextResponse.json(
        {
          error: "ukraine-hatch-cache-missing",
          hint: "Run: npm run viina:build && npm run ukraine:hatch:build",
        },
        { status: 404 },
      );
    }

    let paths = ensured.payload.paths;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      paths = filterHatchPathsByView(paths, { lat, lng }, radius, max);
    } else if (paths.length > max) {
      paths = paths.slice(0, max);
    }

    return NextResponse.json(
      {
        generatedAt: ensured.payload.generatedAt,
        controlDate: ensured.payload.controlDate,
        lodTier: lod,
        pathCount: paths.length,
        totalPathCount: ensured.payload.pathCount,
        source: ensured.source,
        paths,
        attribution: "VIINA (rendering-only produced work)",
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
          "X-Viina-Policy": "rendering-only",
          "X-Hatch-Source": ensured.source,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "ukraine-hatch-failed",
      },
      { status: 502 },
    );
  }
}

/** 강제 재빌드 (로컬/관리용) */
export async function POST(request: Request) {
  if (!VIINA_POLICY.renderingOnly) {
    return NextResponse.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const viina = loadViinaRenderData();
  if (!viina?.features?.length) {
    return NextResponse.json({ error: "viina-render-cache-missing" }, { status: 404 });
  }

  const zones =
    lod === "overview" && viina.overviewFeatures?.length
      ? viina.overviewFeatures
      : viina.features;
  const { ru, ua, contested } = splitZones(zones);
  const payload = precomputeUkraineHatchPaths(
    ru,
    ua,
    contested,
    lod,
    viina.controlDate || "",
  );
  const filePath = saveUkraineHatchCache(payload);

  let d1: { written: number; total: number } | null = null;
  try {
    const db = await getDb();
    d1 = await writeUkraineHatchToD1(db, payload);
  } catch (error) {
    d1 = null;
    console.warn(
      "[ukraine-hatch] D1 sync skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({
    ok: true,
    lodTier: lod,
    pathCount: payload.pathCount,
    filePath,
    d1,
  });
}
