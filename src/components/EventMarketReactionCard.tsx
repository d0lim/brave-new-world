"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  formatTickerChangePercent,
  tickerChangeTone,
  tickerDisplayName,
  verdictLabel,
  type MarketReactionItem,
  type MarketReactionVerdict,
} from "@/lib/stockTickers";
import type { TheaterMarketFilter } from "@/lib/theaterAssets";

type EventMarketReactionCardProps = {
  theater: TheaterMarketFilter;
  ageMinutes: number;
};

type ReactionPayload = {
  items?: MarketReactionItem[];
  verdict?: MarketReactionVerdict;
  peakSigma?: number | null;
  marketOpen?: boolean;
};

const TONE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
} as const;

/** 판정별 배지 색 — "영향 없음"도 당당히 보여주는 게 신뢰도에 유리 */
const VERDICT_CLASS: Record<MarketReactionVerdict, string> = {
  impact: "border-rose-400/45 bg-rose-500/15 text-rose-200",
  mild: "border-amber-400/40 bg-amber-500/12 text-amber-200",
  none: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  pending: "border-slate-600/40 bg-slate-700/10 text-slate-400",
};

/**
 * "이 사건이 시장에 영향을 줬나" 판정 카드.
 *
 * 원시 변동률만 보여주면 유저는 -1.2%가 큰 건지 알 수 없다. 그래서 서버에서
 *  (1) 벤치마크(S&P500) 동일구간 변동을 빼 시장 전체 흐름을 제거하고
 *  (2) 종목별 평소 일간 변동폭(σ)으로 나눠 이례성을 환산한 뒤
 *  (3) 2σ↑ 반응 확인 / 1~2σ 약함 / 1σ↓ 영향 없음 / 장마감·데이터부족 판정보류
 * 로 결론을 낸다. 탭하면 근거(종목별 수치)를 펼친다.
 */
export function EventMarketReactionCard({ theater, ageMinutes }: EventMarketReactionCardProps) {
  const { lang } = useLocale();
  const ko = lang !== "en";
  const [payload, setPayload] = useState<ReactionPayload | null>(null);
  const [expanded, setExpanded] = useState(false);

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
        if (!cancelled) setPayload({ items: [], verdict: "pending" });
      });
    return () => {
      cancelled = true;
    };
  }, [theater, ageMinutes]);

  if (payload === null) {
    return (
      <div className="border-t border-white/8 bg-black/15 px-3 py-1.5">
        <span className="text-[10px] text-slate-600">…</span>
      </div>
    );
  }

  const items = (payload.items ?? []).filter((item) => item.changePercentSinceEvent !== null);
  const verdict: MarketReactionVerdict = payload.verdict ?? "pending";

  // 가격 데이터 자체가 없으면(스텁 모드 등) 카드를 숨겨 노이즈를 줄인다
  if (items.length === 0) return null;

  const peak = payload.peakSigma;
  const sigmaText =
    peak != null && Number.isFinite(peak) ? `${Math.abs(peak).toFixed(1)}σ` : null;

  return (
    <div className="border-t border-white/8 bg-black/15 px-3 py-1.5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {ko ? "시장 영향" : "Market impact"}
        </span>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${VERDICT_CLASS[verdict]}`}
        >
          {verdictLabel(verdict, ko)}
        </span>
        {sigmaText && verdict !== "pending" ? (
          <span className="shrink-0 font-mono text-[10px] text-slate-500">{sigmaText}</span>
        ) : null}
        <span className="ml-auto shrink-0 text-[10px] text-slate-600">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-1.5 space-y-1 border-t border-white/5 pt-1.5">
          {items.map((item) => {
            const tone = tickerChangeTone(item.changePercentSinceEvent);
            const excess = item.excessChangePercent;
            return (
              <div
                key={item.symbol}
                className="flex items-baseline justify-between gap-2 text-[10px]"
              >
                <span className="min-w-0 truncate text-slate-400" title={item.symbol}>
                  {tickerDisplayName(item.symbol, lang)}
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className={`font-mono font-semibold ${TONE_CLASS[tone]}`}>
                    {formatTickerChangePercent(item.changePercentSinceEvent)}
                  </span>
                  {excess != null ? (
                    <span className="font-mono text-slate-600">
                      {ko ? "지수대비 " : "vs idx "}
                      {formatTickerChangePercent(excess)}
                    </span>
                  ) : null}
                  {item.sigma != null && Number.isFinite(item.sigma) ? (
                    <span className="font-mono text-slate-600">
                      {Math.abs(item.sigma).toFixed(1)}σ
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
          <p className="pt-0.5 text-[9px] leading-snug text-slate-600">
            {ko
              ? "S&P500 동일구간 변동을 뺀 뒤, 종목별 평소 일간 변동폭(σ)으로 환산한 값입니다."
              : "Benchmark-adjusted move, scaled by each symbol’s typical daily volatility (σ)."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
