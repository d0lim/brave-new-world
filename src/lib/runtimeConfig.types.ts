export type DataProfile = "lite" | "full";

/** 서버에서만 읽고 클라이언트에는 props로 주입 — NEXT_PUBLIC 사용 금지 */
export type RuntimeConfig = {
  dataProfile: DataProfile;
  apiStubMode: boolean;
  neptunEnabled: boolean;
  tzevaAdomEnabled: boolean;
  telegramOsintEnabled: boolean;
  syncPollMs: number;
};

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  dataProfile: "lite",
  apiStubMode: true,
  neptunEnabled: false,
  tzevaAdomEnabled: false,
  telegramOsintEnabled: false,
  syncPollMs: 5 * 60 * 1000,
};
