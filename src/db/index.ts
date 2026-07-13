/**
 * Next.js(Node)에서 로컬/원격 D1에 붙을 때 사용.
 * - Cloudflare(OpenNext): getCloudflareContext → env.DB
 * - 로컬: wrangler getPlatformProxy → env.DB
 *
 * wrangler는 webpack에 넣으면 blake3/esbuild가 깨지므로
 * 반드시 동적 import + webpackIgnore 로만 로드한다.
 *
 * API 라우트 예:
 *   const db = await getDb();
 *   await db.select().from(firmsFires).limit(50);
 */
import { createDb, type AppDb } from "@/db/client";

let cached: { db: AppDb; dispose: () => void } | null = null;

type D1Like = import("@cloudflare/workers-types").D1Database;

async function tryOpenNextD1(): Promise<D1Like | null> {
  try {
    const specifier = "@opennextjs/cloudflare";
    const mod = (await import(/* webpackIgnore: true */ specifier)) as {
      getCloudflareContext?: () => Promise<{ env?: { DB?: D1Like } }>;
    };
    const ctx = await mod.getCloudflareContext?.();
    return ctx?.env?.DB ?? null;
  } catch {
    return null;
  }
}

async function tryWranglerProxyD1(persist: boolean): Promise<{
  d1: D1Like;
  dispose: () => void;
} | null> {
  try {
    const wrangler = (await import(/* webpackIgnore: true */ "wrangler")) as {
      getPlatformProxy: (opts: {
        configPath?: string;
        persist?: boolean;
      }) => Promise<{
        env: { DB?: D1Like };
        dispose: () => Promise<void>;
      }>;
    };
    const proxy = await wrangler.getPlatformProxy({
      // Cron ingest Worker 설정(D1 바인딩). OpenNext 앱은 wrangler.jsonc.
      configPath: "wrangler.ingest.toml",
      persist,
    });
    const d1 = proxy.env.DB;
    if (!d1) {
      await proxy.dispose();
      return null;
    }
    return {
      d1,
      dispose: () => {
        void proxy.dispose();
      },
    };
  } catch {
    return null;
  }
}

export async function getDb(options?: { persist?: boolean }): Promise<AppDb> {
  if (cached?.db) return cached.db;

  const openNextD1 = await tryOpenNextD1();
  if (openNextD1) {
    const db = createDb(openNextD1);
    cached = {
      db,
      dispose: () => {
        cached = null;
      },
    };
    return db;
  }

  const proxy = await tryWranglerProxyD1(options?.persist ?? true);
  if (proxy) {
    const db = createDb(proxy.d1);
    cached = {
      db,
      dispose: () => {
        proxy.dispose();
        cached = null;
      },
    };
    return db;
  }

  throw new Error(
    'D1 binding DB not found. Check wrangler.ingest.toml [[d1_databases]] binding = "DB", or deploy with OpenNext Cloudflare.',
  );
}

export async function disposeDb() {
  if (cached) {
    cached.dispose();
    cached = null;
  }
}
