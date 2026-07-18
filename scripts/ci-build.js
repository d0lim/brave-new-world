#!/usr/bin/env node
/**
 * CI-aware build selector.
 * - Vercel → next build
 * - Cloudflare Workers Builds (WORKERS_CI=1) → OpenNext (.open-next/)
 * - Local / other → next build
 *
 * OpenNext itself runs `npm run build` for the Next.js step. Without a guard,
 * WORKERS_CI stays set and we recurse until the Workers Builds 20m timeout.
 */
const { spawnSync } = require("child_process");

const isVercel = process.env.VERCEL === "1";
const isWorkersCi = process.env.WORKERS_CI === "1";
/** Set by this script when launching OpenNext; nested builds must use next. */
const openNextNested = process.env.OPENNEXT_BUILDING === "1";

const useOpenNext = !isVercel && isWorkersCi && !openNextNested;
const cmd = useOpenNext
  ? ["opennextjs-cloudflare", "build"]
  : ["next", "build"];

const label = useOpenNext
  ? "Workers CI"
  : openNextNested
    ? "OpenNext→next"
    : isVercel
      ? "Vercel"
      : "local";

console.log(`[ci-build] ${label} → ${cmd.join(" ")}`);

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: "inherit",
  shell: true,
  env: useOpenNext
    ? { ...process.env, OPENNEXT_BUILDING: "1" }
    : process.env,
});

process.exit(result.status ?? 1);
