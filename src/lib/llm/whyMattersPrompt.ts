/** 등불 「왜 중요?」 — 외교학 교수 톤 해설 (유저 BYOK) */

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

export function buildWhyMattersUserMessage(input: WhyMattersArticleInput): string {
  const lang = input.lang === "en" ? "en" : "ko";
  const lines = [
    lang === "en"
      ? "Brief this diplomacy / geopolitics item like a seminar for map users:"
      : "등불 뉴스 「왜 중요?」 세미나 브리핑 요청:",
    `Title: ${input.title}`,
  ];
  if (input.source) lines.push(`Source: ${input.source}`);
  if (input.link) lines.push(`Link: ${input.link}`);
  if (input.focusLabel) lines.push(`Focus: ${input.focusLabel}`);
  if (input.excerpt) lines.push(`Excerpt: ${input.excerpt.slice(0, 900)}`);
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
  return lines.join("\n");
}

export function stubWhyMattersText(input: WhyMattersArticleInput): string {
  const lang = input.lang === "en" ? "en" : "ko";
  if (lang === "en") {
    return [
      `Status quo shift (stub): 「${input.title.slice(0, 72)}」 signals a possible realignment near ${input.focusLabel || "the theater"}.`,
      "Timing: stub mode cannot weigh live variables — paste your Anthropic key for a full IR seminar brief.",
      "Effects: treat cooperation/rupture claims as provisional until whitelist sources confirm.",
      "Caveat: demo text only · not verified intelligence.",
    ].join("\n\n");
  }
  return [
    `변화(스텁): 「${input.title.slice(0, 72)}」는 ${input.focusLabel || "관련 전장"} 부근의 관계 재편 신호일 수 있습니다.`,
    "시기: 스텁 모드에서는 실시간 변수를 분석하지 않습니다. 본인 Anthropic 키를 넣으면 외교학 세미나 톤으로 해설합니다.",
    "영향: 협력·균열 주장은 화이트리스트 매체 확인 전까지 잠정으로 두세요.",
    "주의: 데모 문구 · 사실 단정 금지.",
  ].join("\n\n");
}
