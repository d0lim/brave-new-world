/**
 * Next.js(Node)에서 로컬/원격 D1에 붙을 때 사용.
 * - 로컬: wrangler getPlatformProxy → env.DB
 * - 원격 HTTP: CLOUDFLARE_* 환경변수 + drizzle-orm/sqlite-proxy 대신
 *   우선 getPlatformProxy(remote) / Workers 바인딩을 권장
 *
 * API 라우트 예:
 *   const db = await getDb();
 *   await db.select().from(firmsFires).limit(50);
 */
import { getPlatformProxy } from "wrangler";
import { createDb, type AppDb } from "@/db/client";

let cached: { db: AppDb; dispose: () => void } | null = null;

export async function getDb(options?: { persist?: boolean }): Promise<AppDb> {
  if (cached?.db) return cached.db;

  const proxy = await getPlatformProxy({
    configPath: "wrangler.toml",
    persist: options?.persist ?? true,
  });

  const d1 = (proxy.env as { DB?: D1Database }).DB;
  if (!d1) {
    await proxy.dispose();
    throw new Error(
      "D1 binding DB not found. Check wrangler.toml [[d1_databases]] binding = \"DB\".",
    );
  }

  const db = createDb(d1);
  cached = {
    db,
    dispose: () => {
      void proxy.dispose();
      cached = null;
    },
  };
  return db;
}

export async function disposeDb() {
  if (cached) {
    cached.dispose();
    cached = null;
  }
}
