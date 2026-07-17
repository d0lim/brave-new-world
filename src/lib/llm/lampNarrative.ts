import { createHash } from "node:crypto";
import { z } from "zod";
import { getCached, setCached } from "@/lib/apiCache";
import {
  getAnthropicModel,
  getServerAnthropicApiKey,
  isLlmDailyLampEnabled,
} from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";

export type LampNarrativeInput = {
  mode: "conflict" | "economy";
  lang: "ko" | "en";
  periodKey: string;
  title: string;
  paragraphs: string[];
};

export type LampNarrativeResult = {
  title: string;
  paragraphs: string[];
  llmEnhanced: boolean;
  model?: string;
};

const lampOutputSchema = z.object({
  title: z.string().trim().min(1).max(240),
  paragraphs: z.array(z.string().trim().min(1).max(1_200)).min(2).max(5),
});

const CACHE_TTL_MS = 26 * 60 * 60 * 1000;

function fallback(input: LampNarrativeInput): LampNarrativeResult {
  return {
    title: input.title,
    paragraphs: input.paragraphs,
    llmEnhanced: false,
  };
}

function extractJson(text: string): unknown {
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Claude JSON 응답을 찾지 못했습니다.");
  return JSON.parse(unfenced.slice(start, end + 1));
}

/**
 * 집계·거시 API가 만든 사실 원고를 Claude가 쉬운 이야기로만 다시 쓴다.
 * 실패·비활성·형식 오류 시 원고를 그대로 돌려주므로 등불 렌더링은 중단되지 않는다.
 */
export async function rewriteLampNarrative(
  input: LampNarrativeInput,
): Promise<LampNarrativeResult> {
  if (!isLlmDailyLampEnabled()) return fallback(input);

  const apiKey = getServerAnthropicApiKey();
  if (!apiKey || input.paragraphs.length < 2) return fallback(input);

  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 24);
  const cacheKey = `claude-lamp:${input.mode}:${input.lang}:${input.periodKey}:${digest}`;
  const cached = getCached<LampNarrativeResult>(cacheKey);
  if (cached) return cached;

  const korean = input.lang === "ko";
  const system = korean
    ? [
        "당신은 지정학·지경학 상황실의 한국어 브리핑 편집자다.",
        "입력 원고의 사실, 수치, 고유명사만 사용하고 새 사실·원인·전망을 만들지 마라.",
        "자료에 없는 인과관계는 단정하지 말고, 불확실한 현장 전언은 전언으로 표시하라.",
        "딱딱한 지표 나열을 누가·언제·어디서·무엇을·왜·어떻게가 자연스럽게 이어지는 짧은 이야기로 바꿔라.",
        "육하원칙 이름을 기계적으로 반복하지 말고 초보자도 한 번에 이해할 쉬운 한국어를 써라.",
        "불가피한 고유명사 외에는 한글을 사용하고, 생소한 영문 약어는 첫 등장에 한글 뜻을 덧붙여라.",
        "JSON 이외의 설명이나 마크다운을 출력하지 마라.",
      ].join("\n")
    : [
        "You edit a concise geopolitical or geoeconomic situation-room briefing.",
        "Use only facts, numbers, and names present in the draft. Do not invent causes, forecasts, or context.",
        "Turn the metric list into a natural 5W1H story for a general reader.",
        "Return JSON only, without markdown or commentary.",
      ].join("\n");

  const result = await callClaudeMessages({
    apiKey,
    model: getAnthropicModel(),
    maxTokens: 1_400,
    system,
    user: JSON.stringify({
      task: korean
        ? "제목 1개와 짧은 문단 2~5개로 풀이해서 JSON {title, paragraphs}로 반환"
        : "Rewrite as one title and 2-5 short paragraphs; return JSON {title, paragraphs}",
      mode: input.mode,
      periodKey: input.periodKey,
      draft: {
        title: input.title,
        paragraphs: input.paragraphs,
      },
    }),
  });

  if (!result.ok) return fallback(input);

  try {
    const parsed = lampOutputSchema.parse(extractJson(result.text));
    const enhanced: LampNarrativeResult = {
      ...parsed,
      llmEnhanced: true,
      model: result.model,
    };
    setCached(cacheKey, enhanced, CACHE_TTL_MS);
    return enhanced;
  } catch {
    return fallback(input);
  }
}
