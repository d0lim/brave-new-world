"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { theaterLabel } from "@/lib/uiStrings";
import { tickerDisplayName, type MarketReactionItem } from "@/lib/stockTickers";
import type { TheaterMarketFilter } from "@/lib/theaterAssets";
import { renderCounterfactualInvestCard } from "@/lib/counterfactualInvestCard";
import { shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { trackEvent } from "@/lib/trackClient";

type CounterfactualInvestCardProps = {
  theater: TheaterMarketFilter;
  ageMinutes: number;
  /** 히어로 스트립용 — 더 크게 */
  prominent?: boolean;
};

type ReactionPayload = {
  items?: MarketReactionItem[];
};

const STAKE_KRW = 1_000_000;
const STAKE_USD = 1_000;

function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function formatDollar(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** theaterLabel은 NewsTheater 전용 — "all"(전체) 케이스만 별도 처리 */
function safeTheaterLabel(theater: TheaterMarketFilter, lang: "ko" | "en"): string {
  if (theater === "all") return lang === "en" ? "this event" : "이 사건";
  return theaterLabel(theater, lang);
}

/**
 * "그때 샀으면 얼마 벌었을까" 반사실 카드.
 * EventMarketReactionCard와 같은 /api/stock-tickers/reaction 응답을 재사용 —
 * 판정(σ) 문구 대신 가정 투자금 환산 숫자로 보여준다. 새 API 없음.
 */
export function CounterfactualInvestCard({
  theater,
  ageMinutes,
  prominent = false,
}: CounterfactualInvestCardProps) {
  const { lang } = useLocale();
  const ko = lang !== "en";
  const [payload, setPayload] = useState<ReactionPayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      theater,
      ageMinutes: String(Math.round(ageMinutes)),
    });
    fetch(`/api/stock-tickers/reaction?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: ReactionPayload) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setPayload({ items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [theater, ageMinutes]);

  if (payload === null) return null;

  const items = (payload.items ?? []).filter((item) => item.changePercentSinceEvent !== null);
  if (items.length === 0) return null;

  // 카드는 숫자 하나가 세야 한다 — 절대값 기준 가장 크게 움직인 종목만 노출
  const top = items.reduce((best, item) =>
    Math.abs(item.changePercentSinceEvent ?? 0) > Math.abs(best.changePercentSinceEvent ?? 0)
      ? item
      : best,
  );
  const pct = top.changePercentSinceEvent ?? 0;
  const isGain = pct >= 0;
  const resultKrw = STAKE_KRW * (1 + pct / 100);
  const resultUsd = STAKE_USD * (1 + pct / 100);
  const symbolName = tickerDisplayName(top.symbol, lang);
  const eventLabel = safeTheaterLabel(theater, lang);

  async function handleShare() {
    if (busy) return;
    trackEvent("counterfactual_card_share_click", { theater, symbol: top.symbol }, { lang });
    setBusy(true);
    try {
      const blob = await renderCounterfactualInvestCard({
        lang: ko ? "ko" : "en",
        changePercent: pct,
        symbolLabel: symbolName,
        eventLabel,
        stakeKrw: STAKE_KRW,
        stakeUsd: STAKE_USD,
      });
      if (!blob) return;
      await shareOrDownloadImageBlob(
        blob,
        `what-if-${theater}.png`,
        ko ? "만약에 — 전쟁과 이익" : "What if — war & profit",
        ko
          ? `${eventLabel} 터진 날 ${symbolName}에 넣었다면 지금 ${formatWon(resultKrw)}`
          : `Had you bought ${symbolName} that day, it'd be ${formatDollar(resultUsd)} now`,
      );
      trackEvent("counterfactual_card_share_success", { theater, symbol: top.symbol }, { lang });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`border-t border-amber-400/20 bg-gradient-to-r from-black/35 via-amber-950/20 to-black/25 ${
        prominent ? "px-3.5 py-2.5" : "px-3 py-2"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 font-semibold uppercase tracking-wide text-amber-200/90 ${
            prominent ? "text-[10px]" : "text-[9px]"
          }`}
        >
          {ko ? "만약에" : "What if"}
        </span>
        <span className={`min-w-0 flex-1 truncate text-slate-400 ${prominent ? "text-[11px]" : "text-[10px]"}`}>
          {ko
            ? `${eventLabel} 터진 날 ${symbolName}에 넣었다면`
            : `Had you bought ${symbolName} the day ${eventLabel} broke —`}
        </span>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={busy}
          className="shrink-0 rounded border border-amber-400/30 bg-black/30 px-2 py-1 text-[9px] font-medium text-amber-200/80 transition hover:border-amber-300/50 hover:text-amber-100 disabled:opacity-40"
        >
          {ko ? "공유" : "Share"}
        </button>
      </div>
      <p
        className={`mt-1.5 font-mono font-bold ${isGain ? "text-emerald-300" : "text-rose-300"} ${
          prominent ? "text-xl" : "text-base"
        }`}
      >
        {ko ? `지금 ${formatWon(resultKrw)}` : `now ${formatDollar(resultUsd)}`}
        <span className="ml-2 text-[11px] font-semibold text-slate-400">
          ({isGain ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      </p>
      <p className="mt-1 text-[9px] leading-snug text-slate-600">
        {ko
          ? `${formatWon(STAKE_KRW)} 가정 · 실제 투자 조언 아님 · 수수료·세금 미반영`
          : "Hypothetical stake · not investment advice · excludes fees & taxes"}
      </p>
    </div>
  );
}
