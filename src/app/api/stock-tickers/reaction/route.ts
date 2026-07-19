import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  fetchDailyVolatilityPercent,
  fetchPriceNearTimestamp,
  fetchStockTickers,
  isUsMarketLikelyOpen,
} from "@/lib/stockTickersFetch";
import { theaterAssetSymbols, type TheaterMarketFilter } from "@/lib/theaterAssets";
import {
  verdictFromSigma,
  type MarketReactionItem,
  type MarketReactionVerdict,
} from "@/lib/stockTickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 전장당 심볼이 6~7개라 전부 조회하면 Yahoo 호출이 늘어남 — 핵심 상위 N개만 */
const MAX_SYMBOLS = 3;
/** 앵커 가격은 시간이 지나도 바뀌지 않는 과거 값이라 넉넉하게 캐시 */
const ANCHOR_TTL_MS = 6 * 60 * 60 * 1000;
const LIVE_TTL_MS = 10 * 60 * 1000;
/** 평소 변동폭(σ)은 하루 단위로 거의 안 변함 — 아주 길게 캐시 */
const VOLATILITY_TTL_MS = 24 * 60 * 60 * 1000;
/** 15분 버킷으로 반올림 — 같은 사건을 여러 유저·여러 번 열어도 캐시가 재사용됨 */
const BUCKET_MS = 15 * 60 * 1000;
/** 시장 전체 흐름 제거용 벤치마크 (S&P500) */
const BENCHMARK_SYMBOL = "^GSPC";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const theater = (searchParams.get("theater") || "all") as TheaterMarketFilter;
  const ageMinutesRaw = Number(searchParams.get("ageMinutes"));
  const ageMinutes = Number.isFinite(ageMinutesRaw) ? Math.max(0, ageMinutesRaw) : 0;

  if (isApiStubMode()) {
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      stub: true,
      items: [] as MarketReactionItem[],
      verdict: "pending" as MarketReactionVerdict,
      marketOpen: false,
    });
  }

  try {
    const symbols = theaterAssetSymbols(theater).slice(0, MAX_SYMBOLS);
    const atMs = Date.now() - ageMinutes * 60_000;
    const bucketMs = Math.round(atMs / BUCKET_MS) * BUCKET_MS;
    const marketOpen = isUsMarketLikelyOpen();

    const anchorPrice = (symbol: string) =>
      cachedFetchJson(`stock-price-at-${symbol}-${bucketMs}`, ANCHOR_TTL_MS, () =>
        fetchPriceNearTimestamp(symbol, bucketMs),
      );

    const [{ data: liveTickers }, priceAtEntries, volEntries, benchAnchor, benchNow] =
      await Promise.all([
        cachedFetchJson("stock-tickers-v4", LIVE_TTL_MS, fetchStockTickers),
        Promise.all(
          symbols.map(async (symbol) => {
            const { data } = await anchorPrice(symbol);
            return [symbol, data] as const;
          }),
        ),
        Promise.all(
          symbols.map(async (symbol) => {
            const { data } = await cachedFetchJson(
              `stock-vol-${symbol}`,
              VOLATILITY_TTL_MS,
              () => fetchDailyVolatilityPercent(symbol),
            );
            return [symbol, data] as const;
          }),
        ),
        anchorPrice(BENCHMARK_SYMBOL),
        cachedFetchJson(`stock-price-now-${BENCHMARK_SYMBOL}`, LIVE_TTL_MS, () =>
          fetchPriceNearTimestamp(BENCHMARK_SYMBOL, Date.now()),
        ),
      ]);

    const liveBySymbol = new Map(liveTickers.map((t) => [t.symbol, t.price]));
    const priceAtBySymbol = new Map(priceAtEntries);
    const volBySymbol = new Map(volEntries);

    /** 벤치마크가 같은 구간에 얼마나 움직였나 — 매크로 장세에서의 가짜 양성 제거 */
    const benchAt = benchAnchor.data;
    const benchLatest = benchNow.data;
    const benchmarkChangePercent =
      benchAt != null && benchLatest != null && benchAt !== 0
        ? ((benchLatest - benchAt) / benchAt) * 100
        : null;

    const items: MarketReactionItem[] = symbols.map((symbol) => {
      const priceAt = priceAtBySymbol.get(symbol) ?? null;
      const priceNow = liveBySymbol.get(symbol) ?? null;
      const changePercentSinceEvent =
        priceAt != null && priceNow != null && priceAt !== 0
          ? ((priceNow - priceAt) / priceAt) * 100
          : null;

      const excessChangePercent =
        changePercentSinceEvent != null && benchmarkChangePercent != null
          ? changePercentSinceEvent - benchmarkChangePercent
          : changePercentSinceEvent;

      const vol = volBySymbol.get(symbol) ?? null;
      const sigma =
        excessChangePercent != null && vol != null && vol > 0
          ? excessChangePercent / vol
          : null;

      return {
        symbol,
        priceAt,
        priceNow,
        changePercentSinceEvent,
        excessChangePercent,
        sigma,
      };
    });

    // 전장 전체 판정 = 가장 크게 움직인 종목 기준
    const sigmas = items
      .map((item) => item.sigma)
      .filter((s): s is number => s != null && Number.isFinite(s));
    const peakSigma =
      sigmas.length > 0
        ? sigmas.reduce((max, s) => (Math.abs(s) > Math.abs(max) ? s : max), sigmas[0])
        : null;
    const verdict = verdictFromSigma(peakSigma, marketOpen);

    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      items,
      verdict,
      peakSigma,
      benchmarkChangePercent,
      marketOpen,
    });
  } catch (error) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        items: [] as MarketReactionItem[],
        verdict: "pending" as MarketReactionVerdict,
        marketOpen: false,
        error: error instanceof Error ? error.message : "market-reaction failed",
      },
      { status: 502 },
    );
  }
}
