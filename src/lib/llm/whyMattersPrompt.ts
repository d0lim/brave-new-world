/** 등불 「왜 중요?」 — 외교학 교수 톤 해설 (BYOK 심층 / 서버·템플릿 간단) */

export type WhyMattersArticleInput = {
  title: string;
  source?: string | null;
  link?: string | null;
  focusLabel?: string | null;
  excerpt?: string | null;
  lang?: "ko" | "en";
};

export function buildWhyMattersSystem(lang: "ko" | "en"): string {
  if (lang === "en") {
    return [
      "You are a senior professor of international relations briefing non-specialist map users.",
      "Explain why THIS event matters now: what changed vs the prior status quo, timing variables,",
      "alliance/rivalry realignment, and plausible second-order effects of cooperation or rupture.",
      "Weigh many interacting factors (domestic politics, sanctions, energy, military balance, elections,",
      "great-power rivalry, regional intermediaries) — but do not invent unstated facts.",
      "Mark inference as analytical judgment; mark unknowns clearly.",
      "No trading advice. No Telegram-as-fact. No breathless prophecy.",
      "Write 4–6 short paragraphs (or labeled sections). Dense but readable. English only.",
    ].join(" ");
  }
  return [
    "당신은 외교학·국제정치학 교수다. 지정학 지도를 보는 비전공 이용자에게 브리핑한다.",
    "핵심: 왜 지금 이 사건인가. 기존 질서·관계에서 무엇이 바뀌는지, 시기적 변수,",
    "협력·균열이 앞으로 끼칠 파급(동맹·제재·에너지·전장·국내정치)을 연결해 설명하라.",
    "수만 가지 변수 중 이 헤드라인에 실제로 걸리는 요인만 골라 ‘캐치’해서 서술하라.",
    "기사에 없는 사실을 단정하지 말고, 해석은 ‘분석적 판단’, 모르는 것은 명시하라.",
    "매매 권유·선정 예언·미검증 SNS 사실화 금지.",
    "문단 4~6개(또는 소제목). 밀도 있게, 그러나 읽기 쉽게. 한국어만.",
  ].join(" ");
}

/** 키 없는 유저용 — 짧은 서버 해설 */
export function buildWhyMattersQuickSystem(lang: "ko" | "en"): string {
  if (lang === "en") {
    return [
      "You are an IR professor giving a 90-second briefing for map users without specialist background.",
      "Exactly 2 short paragraphs: (1) what may have changed and why now; (2) likely map-level effects + one caveat.",
      "Do not invent facts. Mark judgment vs unknown. No trading advice. English only.",
    ].join(" ");
  }
  return [
    "외교학 교수가 비전공 지도 이용자에게 90초 브리핑한다.",
    "문단 정확히 2개: (1) 무엇이 바뀐 것으로 보이며 왜 지금인지 (2) 지도·전장에 끼칠 영향 + 주의 한 줄.",
    "사실 단정·환각 금지. 해석은 판단으로 표시. 매매 권유 금지. 한국어만.",
  ].join(" ");
}

export function buildWhyMattersUserMessage(
  input: WhyMattersArticleInput,
  mode: "deep" | "quick" = "deep",
): string {
  const lang = input.lang === "en" ? "en" : "ko";
  const lines = [
    lang === "en"
      ? mode === "quick"
        ? "Quick IR brief for map users:"
        : "Brief this diplomacy / geopolitics item like a seminar for map users:"
      : mode === "quick"
        ? "등불 「왜 중요?」 간단 브리핑:"
        : "등불 뉴스 「왜 중요?」 세미나 브리핑 요청:",
    `Title: ${input.title}`,
  ];
  if (input.source) lines.push(`Source: ${input.source}`);
  if (input.link) lines.push(`Link: ${input.link}`);
  if (input.focusLabel) lines.push(`Focus: ${input.focusLabel}`);
  if (input.excerpt) {
    lines.push(`Excerpt: ${input.excerpt.slice(0, mode === "quick" ? 480 : 900)}`);
  }
  if (mode === "quick") {
    lines.push(
      lang === "en"
        ? "Reply with exactly two short paragraphs. No bullet list."
        : "문단 두 개만. 불릿 목록 금지.",
    );
  } else {
    lines.push(
      lang === "en"
        ? [
            "Cover at least:",
            "1) What appears to have changed (status quo → this move).",
            "2) Why this timing (structural + proximate variables).",
            "3) Likely effects of deeper cooperation / rupture on the map.",
            "4) Caveats / what we cannot know from the headline alone.",
          ].join("\n")
        : [
            "반드시 다룰 것:",
            "1) 무엇이 바뀐 것으로 보이는가 (기존 관계·질서 → 이번 움직임).",
            "2) 왜 이 시기인가 (구조적·촉발 변수).",
            "3) 협력 심화 또는 균열이 앞으로 지도·전장·시장에 끼칠 영향.",
            "4) 헤드라인만으로는 알 수 없는 한계·주의.",
          ].join("\n"),
    );
  }
  return lines.join("\n");
}

/** 서버 키·스텁도 없을 때 — 항상 읽히는 템플릿 */
export function templateWhyMattersText(input: WhyMattersArticleInput): string {
  const lang = input.lang === "en" ? "en" : "ko";
  const focus = input.focusLabel?.trim() || (lang === "en" ? "this theater" : "이 전장");
  const shortTitle = input.title.slice(0, 80);
  if (lang === "en") {
    return [
      `「${shortTitle}」 may signal a shift around ${focus}: who meets whom, and on what terms, often matters more than the ceremony itself.`,
      `Why now usually tracks overlapping pressures — rivalry, sanctions, energy, elections, or a nearby battlefield. Treat cooperation claims as provisional until confirmed by high-trust sources. Add your Anthropic key for a full seminar-length brief.`,
    ].join("\n\n");
  }
  return [
    `「${shortTitle}」는 ${focus} 축에서 ‘누가·어떤 조건으로’ 만나는지가 의식보다 중요한 신호일 수 있습니다.`,
    `왜 지금인지는 대개 경쟁·제재·에너지·선거·인접 전장이 겹칠 때입니다. 협력 주장은 고신뢰 매체가 교차 확인할 때까지 잠정으로 두세요. 본인 Anthropic 키를 넣으면 세미나 분량으로 풀어 드립니다.`,
  ].join("\n\n");
}

export function stubWhyMattersText(input: WhyMattersArticleInput): string {
  return templateWhyMattersText(input);
}
