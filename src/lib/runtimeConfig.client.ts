import {
  DEFAULT_RUNTIME_CONFIG,
  type RuntimeConfig,
} from "@/lib/runtimeConfig.types";

let clientConfig: RuntimeConfig = DEFAULT_RUNTIME_CONFIG;

/** 서버 컴포넌트(page)에서 받은 설정을 클라이언트 번들에 주입 */
export function initRuntimeConfig(config: RuntimeConfig): void {
  clientConfig = config;
}

export function getRuntimeConfig(): RuntimeConfig {
  return clientConfig;
}

export function isClientApiStubMode(): boolean {
  return clientConfig.apiStubMode;
}

export function isClientNeptunEnabled(): boolean {
  return clientConfig.neptunEnabled;
}

export function getClientSyncPollMs(): number {
  return clientConfig.syncPollMs;
}
