import { NextRequest, NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { getAnthropicModel } from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";
import {
  buildWhyMattersSystem,
  buildWhyMattersUserMessage,
  stubWhyMattersText,
  type WhyMattersArticleInput,
} from "@/lib/llm/whyMattersPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_KEY_HEADER = "x-anthropic-api-key";

/** 프로세스 메모리 IP 레이트 리밋 */
const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MINUTE = 4;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now >= row.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (row.count >= MAX_PER_MINUTE) return false;
  row.count += 1;
  return true;
}

function extractUserKey(request: NextRequest, body: Record<string, unknown>): string | null {
  const fromHeader = request.headers.get(USER_KEY_HEADER)?.trim();
  if (fromHeader) return fromHeader;
  const fromBody = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  return fromBody || null;
}

/**
 * POST /api/claude/why-matters
 *
 * 등불 「왜 중요?」 — 유저 BYOK만. 서버 ANTHROPIC_API_KEY 미사용.
 */
export async function POST(request: NextRequest) {
  if (!allowRequest(clientIp(request))) {
    return NextResponse.json(
      {
        error:
          "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (IP당 분당 4회)",
        rateLimited: true,
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body 필요" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title 필요" }, { status: 400 });
  }

  const lang = body.lang === "en" ? "en" : "ko";
  const input: WhyMattersArticleInput = {
    title,
    source: typeof body.source === "string" ? body.source : null,
    link: typeof body.link === "string" ? body.link : null,
    focusLabel: typeof body.focusLabel === "string" ? body.focusLabel : null,
    excerpt: typeof body.excerpt === "string" ? body.excerpt : null,
    lang,
  };

  if (isApiStubMode()) {
    return NextResponse.json({
      ok: true,
      stub: true,
      text: stubWhyMattersText(input),
      model: "stub",
      billing: "none",
    });
  }

  const userKey = extractUserKey(request, body);
  if (!userKey) {
    return NextResponse.json(
      {
        error:
          lang === "en"
            ? "Your Anthropic API key is required. Add it in the analyze panel. Server keys are not used for this button."
            : "본인 Anthropic API 키가 필요합니다. 분석 패널에 키를 입력하세요. (서버 키는 「왜 중요?」에 쓰지 않습니다)",
        needUserKey: true,
      },
      { status: 401 },
    );
  }

  if (!userKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic API 키 형식이 아닙니다 (sk-ant-…)." },
      { status: 400 },
    );
  }

  const result = await callClaudeMessages({
    apiKey: userKey,
    system: buildWhyMattersSystem(lang),
    user: buildWhyMattersUserMessage(input),
    model: getAnthropicModel(),
    maxTokens: 1400,
  });

  if (!result.ok) {
    const userMessage = result.insufficientFunds
      ? lang === "en"
        ? "Claude credits are exhausted. Top up your Anthropic account or try later."
        : "Claude 크레딧이 소진되었습니다. Anthropic 콘솔에서 충전 후 다시 시도하세요."
      : result.rateLimited
        ? lang === "en"
          ? "Claude is busy right now. Please try again shortly."
          : "Claude가 지금 너무 바쁩니다. 잠시 후 다시 시도해 주세요."
        : result.error;

    return NextResponse.json(
      {
        error: userMessage,
        rateLimited: result.rateLimited,
        insufficientFunds: result.insufficientFunds,
      },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    stub: false,
    text: result.text,
    model: result.model,
    billing: "user-byok",
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
  });
}
