import { z } from "zod";
import { createHash } from "node:crypto";
import { getCached, setCached } from "@/lib/apiCache";
import {
  getAnthropicModel,
  getServerAnthropicApiKey,
  isLlmDailyLampEnabled,
} from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";

export type AirRaidBriefInput = {
  kind: "tzeva" | "neptun" | "newfeeds";
  lang: "ko" | "en";
  region: string;
  title?: string;
  lat: number;
  lng: number;
  since?: string;
  activeCount?: number;
};

export type AirRaidBriefResult = {
  title: string;
  paragraphs: string[];
  llmEnhanced: boolean;
  model?: string;
};

const outputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  paragraphs: z.array(z.string().trim().min(1).max(900)).min(2).max(4),
});

const CACHE_TTL_MS = 30 * 60 * 1000;

function kindLabel(kind: AirRaidBriefInput["kind"], lang: "ko" | "en"): string {
  if (lang === "en") {
    if (kind === "tzeva") return "Tzeva Adom (Israel Home Front Command)";
    if (kind === "neptun") return "NEPTUN Ukraine air-raid alert";
    return "Iran / NewFeeds attack report";
  }
  if (kind === "tzeva") return "이스라엘 홈프론트 커맨드 체바 아돔(Tzeva Adom) 경보";
  if (kind === "neptun") return "우크라이나 NEPTUN 공습경보";
  return "이란·NewFeeds 공격 보고";
}

export function buildAirRaidDraft(input: AirRaidBriefInput): AirRaidBriefResult {
  const ko = input.lang === "ko";
  const source = kindLabel(input.kind, input.lang);
  const when = input.since?.trim() || (ko ? "방금 전" : "moments ago");
  const count =
    typeof input.activeCount === "number" && input.activeCount > 1
      ? ko
        ? ` 현재 활성 경보 ${input.activeCount}건이 집계되고 있습니다.`
        : ` ${input.activeCount} active alerts are currently counted.`
      : "";

  const title = ko
    ? `공습경보 · ${input.region}`
    : `Air-raid alert · ${input.region}`;

  const paragraphs = ko
    ? [
        `${when}, ${source}가 ${input.region} 일대에 공습경보를 발령한 것으로 수신되었습니다.${count}`,
        `경보 좌표는 대략 위도 ${input.lat.toFixed(2)}, 경도 ${input.lng.toFixed(2)} 부근입니다. 누가 공격했는지는 이 경보 피드만으로는 확정할 수 없으며, 발사체·드론·항공기 여부도 현장에서 추가 확인이 필요합니다.`,
        `왜 지금 이 시각에 울렸는지는 공개 피드에 원인 설명이 포함되지 않습니다. 주민 대피·엄폐 지침이 우선이며, 추가 전언은 미확인으로 취급해야 합니다.`,
      ]
    : [
        `${when}, ${source} issued an air-raid alert for the ${input.region} area.${count}`,
        `Approximate coordinates are lat ${input.lat.toFixed(2)}, lng ${input.lng.toFixed(2)}. The feed alone does not confirm who attacked, or whether the threat is a missile, drone, or aircraft.`,
        `No causal explanation is attached to this alert packet. Shelter guidance takes priority; unverified field claims should stay marked unverified.`,
      ];

  if (input.title?.trim() && input.title.trim() !== input.region) {
    paragraphs[0] = ko
      ? `${paragraphs[0]} 경보 표기: 「${input.title.trim()}」.`
      : `${paragraphs[0]} Alert title: "${input.title.trim()}".`;
  }

  return { title, paragraphs, llmEnhanced: false };
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
 * 공습경보 순간 브리핑 — 왜/누가/상황 줄글.
 * 실패 시 템플릿 원고 그대로.
 */
export async function rewriteAirRaidBrief(
  input: AirRaidBriefInput,
): Promise<AirRaidBriefResult> {
  const draft = buildAirRaidDraft(input);
  if (!isLlmDailyLampEnabled()) return draft;

  const apiKey = getServerAnthropicApiKey();
  if (!apiKey) return draft;

  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 20);
  const cacheKey = `claude-air-raid:${input.kind}:${input.lang}:${digest}`;
  const cached = getCached<AirRaidBriefResult>(cacheKey);
  if (cached) return cached;

  const korean = input.lang === "ko";
  const system = korean
    ? [
        "당신은 국가 상황실의 공습경보 속보 브리핑관이다.",
        "입력 원고의 사실·고유명사·좌표만 사용하고 새 공격 주체·무기·전황을 단정하지 마라.",
        "확인되지 않은 내용은 '미확인'으로 명시하라.",
        "누가·언제·어디서·무엇을·왜(확인 범위)·어떻게(경보 성격)를 짧은 줄글로 이어서 서술하라.",
        "감상적 비유 없이 건조한 공식 문체. JSON만 출력.",
      ].join("\n")
    : [
        "You are the duty officer briefing an air-raid alert flash.",
        "Use only facts in the draft. Do not invent attackers, weapons, or outcomes.",
        "Mark unknowns as unverified. Cover who/when/where/what/why(within evidence)/how in short prose.",
        "Official tone only. Return JSON only.",
      ].join("\n");

  const result = await callClaudeMessages({
    apiKey,
    model: getAnthropicModel(),
    maxTokens: 900,
    system,
    user: JSON.stringify({
      task: korean
        ? "제목 1개와 문단 2~4개 JSON {title, paragraphs}"
        : "One title and 2-4 paragraphs; JSON {title, paragraphs}",
      draft: { title: draft.title, paragraphs: draft.paragraphs },
      kind: input.kind,
    }),
  });

  if (!result.ok) return draft;

  try {
    const parsed = outputSchema.parse(extractJson(result.text));
    const enhanced: AirRaidBriefResult = {
      ...parsed,
      llmEnhanced: true,
      model: result.model,
    };
    setCached(cacheKey, enhanced, CACHE_TTL_MS);
    return enhanced;
  } catch {
    return draft;
  }
}
