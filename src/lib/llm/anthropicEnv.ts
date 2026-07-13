/**
 * 서버 Anthropic 설정 — 편집자/배치 digest 전용.
 * 유저 「분석」은 userAnthropicKey (BYOK) 경로. 서버 키를 유저 요청에 쓰지 않음.
 */

import { isApiStubMode } from "@/lib/apiStubMode";

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

/** 기본 모델 — 키 발급 후 ANTHROPIC_MODEL 로 덮어쓰기 */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";

export function getServerAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || null;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

/** 배치·편집 digest LLM 경로 (유저 BYOK와 무관) */
export function isLlmNewsDigestEnabled(): boolean {
  if (isApiStubMode()) return false;
  if (process.env.LLM_NEWS_DIGEST_ENABLED !== "true") return false;
  return Boolean(getServerAnthropicApiKey());
}

export type ClaudeServerStatus = {
  stubMode: boolean;
  /** 서버 ANTHROPIC_API_KEY 존재 여부 (값은 노출 안 함) */
  serverKeyConfigured: boolean;
  /** 편집 digest 배치 사용 가능 */
  digestLlmReady: boolean;
  model: string;
  /** 유저 분석은 BYOK — 서버 키 미사용 */
  userAnalyzeMode: "byok";
};

export function getClaudeServerStatus(): ClaudeServerStatus {
  const serverKeyConfigured = Boolean(getServerAnthropicApiKey());
  return {
    stubMode: isApiStubMode(),
    serverKeyConfigured,
    digestLlmReady: isLlmNewsDigestEnabled(),
    model: getAnthropicModel(),
    userAnalyzeMode: "byok",
  };
}
