/**
 * Local-only D1 via wrangler getPlatformProxy.
 * Kept in a separate module so production OpenNext bundles can DCE the
 * `import("./wranglerProxy")` when NODE_ENV === "production".
 */
import type { D1Database } from "@cloudflare/workers-types";

export async function tryWranglerProxyD1(persist: boolean): Promise<{
  d1: D1Database;
  dispose: () => void;
} | null> {
  try {
    const wrangler = (await import(/* webpackIgnore: true */ "wrangler")) as {
      getPlatformProxy: (opts: {
        configPath?: string;
        persist?: boolean;
      }) => Promise<{
        env: { DB?: D1Database };
        dispose: () => Promise<void>;
      }>;
    };
    const proxy = await wrangler.getPlatformProxy({
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
