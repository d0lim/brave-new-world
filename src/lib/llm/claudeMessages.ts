/**
 * Anthropic Messages API 얇은 클라이언트.
 * 키는 호출자가 주입 — 서버 키 또는 유저 BYOK (요청 헤더로만 전달, 저장 금지).
 */

import {
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION,
  getAnthropicModel,
} from "@/lib/llm/anthropicEnv";

export type ClaudeTextResult = {
  ok: true;
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ClaudeErrorResult = {
  ok: false;
  status: number;
  error: string;
  /** 잔액·쿼터 소진 추정 */
  insufficientFunds?: boolean;
  rateLimited?: boolean;
};

export type ClaudeResult = ClaudeTextResult | ClaudeErrorResult;

type MessagesResponse = {
  content?: Array<{ type?: string; text?: string }>;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string; type?: string };
};

export async function callClaudeMessages(options: {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<ClaudeResult> {
  const model = options.model || getAnthropicModel();
  const maxTokens = options.maxTokens ?? 1024;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: options.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": options.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Anthropic 네트워크 오류",
    };
  }

  let body: MessagesResponse = {};
  try {
    body = (await res.json()) as MessagesResponse;
  } catch {
    body = {};
  }

  if (!res.ok) {
    const msg =
      body.error?.message ||
      (typeof body.error === "string" ? body.error : null) ||
      `Anthropic HTTP ${res.status}`;
    const lower = msg.toLowerCase();
    return {
      ok: false,
      status: res.status,
      error: msg,
      rateLimited: res.status === 429,
      insufficientFunds:
        res.status === 402 ||
        /insufficient|credit|billing|balance|funds/i.test(lower),
    };
  }

  const text = (body.content || [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!)
    .join("\n")
    .trim();

  if (!text) {
    return { ok: false, status: res.status, error: "빈 응답" };
  }

  return {
    ok: true,
    text,
    model: body.model || model,
    inputTokens: body.usage?.input_tokens,
    outputTokens: body.usage?.output_tokens,
  };
}
