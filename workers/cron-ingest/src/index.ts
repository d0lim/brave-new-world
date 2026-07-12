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

type IngestResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  firmsCount: number;
  gdeltCount: number;
  firmsErrors: string[];
  gdeltErrors: string[];
  pruned?: { firmsDeleted: number; gdeltDeleted: number; cutoff: string };
  error: string | null;
};

async function runIngest(env: IngestEnv): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const firmsErrors: string[] = [];
  const gdeltErrors: string[] = [];
  let firmsCount = 0;
  let gdeltCount = 0;
  let pruned: IngestResult["pruned"];

  try {
    const dayRange = Math.min(5, Math.max(1, readIntVar(env, "FIRMS_DAY_RANGE", 1)));
    const maxPerTheater = Math.min(
      800,
      Math.max(50, readIntVar(env, "FIRMS_MAX_PER_THEATER", 400)),
    );
    const gdeltMax = Math.min(800, Math.max(80, readIntVar(env, "GDELT_MAX_POINTS", 250)));
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

    const finishedAt = new Date().toISOString();
    const hardFail =
      Boolean(mapKey) && firmsCount === 0 && firmsErrors.length > 0 && gdeltCount === 0;

    const result: IngestResult = {
      ok: !hardFail,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
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
        detail: { firmsErrors, gdeltErrors },
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
          `[ingest] ok=${result.ok} firms=${result.firmsCount} gdelt=${result.gdeltCount}`,
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
      const last = await env.DB.prepare(
        `SELECT started_at, finished_at, firms_count, gdelt_count, ok, error
         FROM ingest_runs ORDER BY id DESC LIMIT 1`,
      ).first();
      return Response.json({
        firmsRows: firms?.c ?? 0,
        gdeltRows: gdelt?.c ?? 0,
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
