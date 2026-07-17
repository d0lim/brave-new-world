#!/usr/bin/env node
/**
 * CI-aware build selector.
 * - Vercel → next build
 * - Cloudflare Workers Builds (WORKERS_CI=1) → OpenNext (.open-next/)
 * - Local / other → next build
 */
const { spawnSync } = require("child_process");

const isVercel = process.env.VERCEL === "1";
const isWorkersCi = process.env.WORKERS_CI === "1";

const cmd = !isVercel && isWorkersCi
  ? ["opennextjs-cloudflare", "build"]
  : ["next", "build"];

console.log(
  `[ci-build] ${isWorkersCi ? "Workers CI" : isVercel ? "Vercel" : "local"} → ${cmd.join(" ")}`,
);

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
