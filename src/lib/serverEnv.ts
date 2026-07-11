import type { DataProfile, RuntimeConfig } from "@/lib/runtimeConfig.types";

export type { DataProfile, RuntimeConfig } from "@/lib/runtimeConfig.types";

export function getServerDataProfile(): DataProfile {
  const env = process.env.DATA_PROFILE;
  if (env === "full") return "full";
  if (env === "lite") return "lite";
  return "lite";
}

export function isApiStubMode(): boolean {
  return process.env.API_STUB_MODE !== "false";
}

export function isNeptunEnabled(): boolean {
  return process.env.NEPTUN_ENABLED === "true";
}

export function isTzevaAdomEnabled(): boolean {
  return process.env.TZEVA_ADOM_ENABLED === "true";
}

export function isTelegramOsintEnabled(): boolean {
  return process.env.TELEGRAM_OSINT_ENABLED === "true";
}

export function getSyncPollMs(): number {
  const parsed = Number(process.env.SYNC_POLL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    dataProfile: getServerDataProfile(),
    apiStubMode: isApiStubMode(),
    neptunEnabled: isNeptunEnabled(),
    tzevaAdomEnabled: isTzevaAdomEnabled(),
    telegramOsintEnabled: isTelegramOsintEnabled(),
    syncPollMs: getSyncPollMs(),
  };
}
