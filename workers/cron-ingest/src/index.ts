import type { IngestEnv } from "./env";
import {
  getFirmsMapKey,
  pruneOldRows,
  readIntVar,
  recordIngestRun,
  upsertFirmsFires,
  upsertGdeltPoints,
} from "./db";
import { fetchFirmsForTheaters } from "./firms";
import { fetchGdeltPoints } from "./gdelt";

export type { IngestEnv };

type WarmResult = { ok: boolean; status: number; detail?: string };

type IngestResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  firmsCount: number;
  gdeltCount: number;
  newsWarm?: WarmResult;
  videoNewsWarm?: WarmResult;
  aisWarm?: WarmResult;
  adsbWarm?: WarmResult;
  tunnelsWarm?: WarmResult;
  disputeHatchWarm?: WarmResult;
  ukraineHatchWarm?: WarmResult;
  firmsErrors: string[];
  gdeltErrors: string[];
  pruned?: {
    firmsDeleted: number;
    gdeltDeleted: number;
    newsSnapshotsDeleted?: number;
    newsItemsDeleted?: number;
    aisDeleted?: number;
    adsbDeleted?: number;
    cutoff: string;
  };
  error: string | null;
};

async function warmEndpoint(
  url: string | undefined,
  env: IngestEnv,
  label: string,
): Promise<WarmResult | undefined> {
  const warmUrl = url?.trim();
  if (!warmUrl) return undefined;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const secret = env.INGEST_CRON_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(warmUrl, { method: "POST", headers });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      detail: text.slice(0, 400),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : `${label} warm failed`,
    };
  }
}

async function runIngest(env: IngestEnv): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const firmsErrors: string[] = [];
  const gdeltErrors: string[] = [];
  let firmsCount = 0;
  let gdeltCount = 0;
  let pruned: IngestResult["pruned"];
  let newsWarm: IngestResult["newsWarm"];
  let videoNewsWarm: IngestResult["videoNewsWarm"];
  let aisWarm: IngestResult["aisWarm"];
  let adsbWarm: IngestResult["adsbWarm"];
  let tunnelsWarm: IngestResult["tunnelsWarm"];
  let disputeHatchWarm: IngestResult["disputeHatchWarm"];
  let ukraineHatchWarm: IngestResult["ukraineHatchWarm"];

  try {
    const dayRange = Math.min(5, Math.max(1, readIntVar(env, "FIRMS_DAY_RANGE", 1)));
    const maxPerTheater = Math.min(
      800,
      Math.max(50, readIntVar(env, "FIRMS_MAX_PER_THEATER", 400)),
    );
    const gdeltMax = Math.min(400, Math.max(80, readIntVar(env, "GDELT_MAX_POINTS", 250)));
    const retentionHours = Math.min(
      168,
      Math.max(6, readIntVar(env, "RETENTION_HOURS", 48)),
    );

    const mapKey = getFirmsMapKey(env);
    if (mapKey) {
      const firms = await fetchFirmsForTheaters({
        mapKey,
        dayRange,
        maxPerTheater,
      });
      firmsErrors.push(...firms.errors);
      firmsCount = await upsertFirmsFires(env.DB, firms.fires);
    } else {
      firmsErrors.push("NASA_FIRMS_API_KEY (or FIRMS_MAP_KEY) missing — FIRMS skipped");
    }

    const gdelt = await fetchGdeltPoints({ maxPoints: gdeltMax, timespan: "60min" });
    gdeltErrors.push(...gdelt.errors);
    gdeltCount = await upsertGdeltPoints(env.DB, gdelt.points);

    pruned = await pruneOldRows(env.DB, retentionHours);
    newsWarm = await warmEndpoint(env.NEWS_WARM_URL, env, "news");
    videoNewsWarm = await warmEndpoint(env.VIDEO_NEWS_WARM_URL, env, "video-news");
    aisWarm = await warmEndpoint(env.AIS_WARM_URL, env, "ais");
    adsbWarm = await warmEndpoint(env.ADSB_WARM_URL, env, "adsb");
    tunnelsWarm = await warmEndpoint(env.TUNNELS_WARM_URL, env, "tunnels");
    disputeHatchWarm = await warmEndpoint(env.DISPUTE_HATCH_WARM_URL, env, "dispute-hatch");
    ukraineHatchWarm = await warmEndpoint(env.UKRAINE_HATCH_WARM_URL, env, "ukraine-hatch");

    const finishedAt = new Date().toISOString();
    const hardFail =
      Boolean(mapKey) && firmsCount === 0 && firmsErrors.length > 0 && gdeltCount === 0;

    const result: IngestResult = {
      ok: !hardFail,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      newsWarm,
      videoNewsWarm,
      aisWarm,
      adsbWarm,
      tunnelsWarm,
      disputeHatchWarm,
      ukraineHatchWarm,
      firmsErrors,
      gdeltErrors,
      pruned,
      error: hardFail ? firmsErrors.join("; ") || "ingest failed" : null,
    };

    await recordIngestRun(env.DB, {
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      ok: result.ok,
      error: result.error,
      detail: {
        firmsErrors,
        gdeltErrors,
        pruned,
        newsWarm,
        videoNewsWarm,
        aisWarm,
        adsbWarm,
        tunnelsWarm,
        disputeHatchWarm,
        ukraineHatchWarm,
      },
    });

    return result;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "ingest crashed";
    try {
      await recordIngestRun(env.DB, {
        startedAt,
        finishedAt,
        firmsCount,
        gdeltCount,
        ok: false,
        error: message,
        detail: { firmsErrors, gdeltErrors, newsWarm, aisWarm, adsbWarm, tunnelsWarm, disputeHatchWarm, ukraineHatchWarm },
      });
    } catch {
      // ignore secondary logging failure
    }
    return {
      ok: false,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      newsWarm,
      aisWarm,
      adsbWarm,
      tunnelsWarm,
      disputeHatchWarm,
      ukraineHatchWarm,
      firmsErrors,
      gdeltErrors,
      error: message,
    };
  }
}

function authorizeManual(request: Request, env: IngestEnv): boolean {
  const secret = env.INGEST_CRON_SECRET?.trim();
  if (!secret) return true; // open in local/dev when secret unset
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

const worker = {
  async scheduled(
    _controller: ScheduledController,
    env: IngestEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      runIngest(env).then((result) => {
        console.log(
          `[ingest] ok=${result.ok} firms=${result.firmsCount} gdelt=${result.gdeltCount}` +
            (result.newsWarm
              ? ` newsWarm=${result.newsWarm.ok ? "ok" : "fail"}`
              : ""),
          result.error ? `error=${result.error}` : "",
        );
      }),
    );
  },

  async fetch(request: Request, env: IngestEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        service: "conflict-view-ingest",
        cron: "*/10 * * * *",
        endpoints: {
          health: "GET /health",
          run: "POST /run (optional Bearer INGEST_CRON_SECRET)",
          latest: "GET /latest",
        },
      });
    }

    if (url.pathname === "/latest") {
      const firms = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM firms_fires`,
      ).first<{ c: number }>();
      const gdelt = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM gdelt_points`,
      ).first<{ c: number }>();
      let newsSnapshots = 0;
      let newsItems = 0;
      try {
        const snap = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM news_stream_snapshots`,
        ).first<{ c: number }>();
        const items = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM news_stream_items`,
        ).first<{ c: number }>();
        newsSnapshots = snap?.c ?? 0;
        newsItems = items?.c ?? 0;
      } catch {
        // migration not applied yet
      }
      const last = await env.DB.prepare(
        `SELECT started_at, finished_at, firms_count, gdelt_count, ok, error
         FROM ingest_runs ORDER BY id DESC LIMIT 1`,
      ).first();
      return Response.json({
        firmsRows: firms?.c ?? 0,
        gdeltRows: gdelt?.c ?? 0,
        newsSnapshots,
        newsItems,
        lastRun: last ?? null,
      });
    }

    if (url.pathname === "/run" && (request.method === "POST" || request.method === "GET")) {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const result = await runIngest(env);
      ctx.waitUntil(Promise.resolve());
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
};

export default worker;
