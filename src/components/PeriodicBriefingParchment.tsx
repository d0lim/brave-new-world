"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LampWhyMattersButton } from "@/components/LampWhyMattersButton";
import { ParchmentLetter, PARCHMENT_FOLD_EXIT_MS } from "@/components/ParchmentLetter";
import {
  emitBreakingDispatchSound,
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";
import { BRAND_NAME } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";

type PeriodicBriefingParchmentProps = {
  briefing: PeriodicBriefing;
  lang: LabelLanguage;
  onDismiss: () => void;
};

/**
 * 매일 전장/시장 등불 — 첫입장 온보딩 이후, 지정학·지경학 각각 하루 1회.
 * 사진 뉴스(featuredNews)가 있으면 대형 양피지, 없으면 기존 텍스트 편지.
 */
export function PeriodicBriefingParchment({
  briefing,
  lang,
  onDismiss,
}: PeriodicBriefingParchmentProps) {
  const isPhotoLamp =
    (briefing.featuredNews && briefing.featuredNews.length > 0) ||
    (briefing.macroTable && briefing.macroTable.length > 0);

  if (!isPhotoLamp) {
    return (
      <ParchmentLetter
        lang={lang}
        title={briefing.title}
        paragraphs={briefing.paragraphs}
        ctaLabel={lang === "en" ? "Until tomorrow" : "내일 다시"}
        onContinue={onDismiss}
        playBreakingDispatch
        titleId="periodic-briefing-title"
      />
    );
  }

  return <PhotoNewsLampParchment briefing={briefing} lang={lang} onDismiss={onDismiss} />;
}

function PhotoNewsLampParchment({
  briefing,
  lang,
  onDismiss,
}: PeriodicBriefingParchmentProps) {
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const [expandedNews, setExpandedNews] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const parchmentStack =
    'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", sans-serif';
  const exiting = phase === "folding" || phase === "done";
  const news = briefing.featuredNews ?? [];
  const macroRows = briefing.macroTable ?? [];
  const isEconomy = macroRows.length > 0;
  const mobilePreview = 4;
  const visibleNews =
    !isEconomy && isNarrow && !expandedNews ? news.slice(0, mobilePreview) : news;
  const canExpandNews = !isEconomy && isNarrow && news.length > mobilePreview && !expandedNews;
  const titleLines = briefing.title.split("\n");
  const kicker = titleLines[0] ?? briefing.title;
  const subtitle =
    titleLines.slice(1).join(" ") ||
    (lang === "en"
      ? isEconomy
        ? "Macro desk"
        : "Today's theater desk"
      : isEconomy
        ? "거시 데스크"
        : "오늘의 전장 데스크");

  const theaterRows = useMemo(() => {
    if (isEconomy) return [];
    const counts = new Map<string, number>();
    for (const item of news) {
      const label = (item.focusLabel ?? "").split("·")[0]?.trim() || item.focusLabel || "—";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([theater, count]) => ({ theater, count }));
  }, [isEconomy, news]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    emitParchmentUnfoldSound();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) emitBreakingDispatchSound();
  }, []);

  const handleContinue = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("folding");
    emitParchmentFoldSound();
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setPhase("done");
      onDismiss();
    }, reduced ? 80 : PARCHMENT_FOLD_EXIT_MS);
  }, [onDismiss, phase]);

  return (
    <div
      className={`welcome-letter-scrim fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 ${
        exiting ? "welcome-letter-scrim--exit" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="periodic-briefing-title"
      aria-busy={phase === "folding"}
    >
      <div className="welcome-letter-stage welcome-letter-stage--economy-lamp w-full">
        <div
          className={`welcome-letter-card parchment-letter welcome-letter-card--economy-lamp ${
            exiting ? "welcome-letter-card--fold-exit" : "welcome-letter-card--unfold-enter"
          }`}
          style={{ fontFamily: parchmentStack }}
        >
          <div className="welcome-parchment welcome-letter-face welcome-letter-face--front relative flex h-[min(94vh,920px)] w-full flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <aside className="flex w-full shrink-0 flex-col border-b border-[#8b6914]/25 bg-[#efe2c0]/55 md:w-[min(32%,22rem)] md:border-b-0 md:border-r md:border-[#8b6914]/25">
                <div className="px-5 pb-3 pt-6 sm:px-6 sm:pt-8">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#7a5a2e]/75">
                    {lang === "en" ? BRAND_NAME.en : BRAND_NAME.ko}
                  </p>
                  <h1
                    id="periodic-briefing-title"
                    className="mt-2 whitespace-pre-line text-[1.35rem] leading-snug tracking-[0.04em] text-[#3d2a18] sm:text-[1.55rem]"
                    style={{ fontFamily: parchmentStack, fontWeight: 400 }}
                  >
                    {kicker}
                  </h1>
                  <p className="mt-1.5 text-sm leading-snug text-[#5a4428]/85">{subtitle}</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
                  {isEconomy ? (
                    <>
                      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b4a22]/7">
                        {lang === "en" ? "Macro snapshot" : "거시 스냅샷"}
                      </p>
                      {macroRows.length > 0 ? (
                        <table className="w-full border-collapse text-left text-[12px] text-[#3f2e1c] sm:text-[13px]">
                          <thead>
                            <tr className="border-b border-[#8b6914]/30 text-[10px] uppercase tracking-[0.14em] text-[#6b4a22]/65">
                              <th className="py-2 pr-2 font-medium">
                                {lang === "en" ? "Country" : "국가"}
                              </th>
                              <th className="py-2 pr-2 font-medium">
                                {lang === "en" ? "Metric" : "지표"}
                              </th>
                              <th className="py-2 text-right font-medium">
                                {lang === "en" ? "Value" : "수치"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {macroRows.map((row, i) => (
                              <tr
                                key={`${row.country}-${row.indicator}-${i}`}
                                className="border-b border-[#8b6914]/12"
                              >
                                <td className="py-2.5 pr-2 align-top font-medium">{row.country}</td>
                                <td className="py-2.5 pr-2 align-top text-[#5a4428]/9">
                                  {row.indicator}
                                </td>
                                <td className="py-2.5 text-right align-top tabular-nums tracking-tight">
                                  {row.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="px-1 text-[12px] leading-relaxed text-[#5a4428]/7">
                          {lang === "en"
                            ? "Macro table unavailable — news desk below."
                            : "거시 표 데이터를 불러오지 못했습니다. 아래 뉴스 데스크를 보세요."}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b4a22]/7">
                        {lang === "en" ? "Theaters in frame" : "담긴 전장"}
                      </p>
                      {theaterRows.length > 0 ? (
                        <ul className="space-y-1.5 px-1">
                          {theaterRows.map((row) => (
                            <li
                              key={row.theater}
                              className="flex items-baseline justify-between gap-2 border-b border-[#8b6914]/12 py-2 text-[13px] text-[#3f2e1c]"
                            >
                              <span className="font-medium">{row.theater}</span>
                              <span className="tabular-nums text-[#6b4a22]/75">{row.count}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-1 text-[12px] leading-relaxed text-[#5a4428]/7">
                          {lang === "en"
                            ? "Photo desk below — multi-theater selection."
                            : "아래 사진 데스크에서 전장별 고신뢰 뉴스를 보세요."}
                        </p>
                      )}
                      <p className="mt-4 px-1 text-[11px] leading-relaxed text-[#5a4428]/65">
                        {lang === "en"
                          ? "Summaries stay short. Open → for the full article."
                          : "등불은 요약본입니다. 원문은 → 로 이동합니다."}
                      </p>
                    </>
                  )}
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-[#8b6914]/20 px-5 py-3 sm:px-7">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#6b4a22]/7">
                    {isEconomy
                      ? lang === "en"
                        ? "US · China · Europe · Russia · Korea/Japan — today's hottest (freshness · multi-wire)"
                        : "미·중·유럽·러·한일 · 당일 핫 (신선도·다매체 중복)"
                      : lang === "en"
                        ? "Middle East · Ukraine · Taiwan · Korea — war · diplomacy · high trust · photo"
                        : "중동 · 러우 · 대만 · 한반도 — 전쟁·외교 · 고신뢰 · 사진"}
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                  {visibleNews.length > 0 ? (
                    <>
                      {visibleNews.map((item) => (
                        <article
                          key={item.id}
                          className="overflow-hidden rounded-sm border border-[#8b6914]/25 bg-[#f7ecd4]/55 shadow-[0_8px_28px_rgba(61,42,24,0.12)]"
                        >
                          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#d4c4a0] sm:aspect-[2/1]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(event) => {
                                (event.currentTarget as HTMLImageElement).style.visibility =
                                  "hidden";
                              }}
                            />
                            {item.isDiplomacy ? (
                              <span className="absolute left-3 top-3 rounded-sm border border-[#8b6914]/35 bg-[#efe0b8]/92 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5a3d1c]">
                                {lang === "en" ? "Diplomacy" : "외교"}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-stretch gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#6b4a22]/65">
                                <span>{item.source}</span>
                                <span aria-hidden>·</span>
                                <span>T{item.trustTier}</span>
                                {item.focusLabel ? (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="normal-case tracking-[0.04em] text-[#5a3d1c]/9">
                                      {item.focusLabel}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <h2 className="mt-2 text-[1.2rem] leading-snug tracking-[0.02em] text-[#3d2a18] sm:text-[1.45rem] sm:leading-snug">
                                {item.title}
                              </h2>
                              {item.matterHook ? (
                                <p className="mt-2 text-[12px] leading-snug text-[#6b4a22]/85 sm:text-[13px]">
                                  {item.matterHook}
                                </p>
                              ) : null}
                              <p className="mt-3 text-[0.98rem] leading-[1.75] text-[#5a4428]/92 sm:text-[1.08rem] sm:leading-[1.8]">
                                {item.summary}
                              </p>
                              {!isEconomy ? (
                                <LampWhyMattersButton
                                  lang={lang}
                                  title={item.title}
                                  source={item.source}
                                  link={item.link}
                                  focusLabel={item.focusLabel}
                                  excerpt={item.summary}
                                />
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center rounded-full border border-[#8b6914]/4 bg-[#efe0b8] px-3 py-3 text-[#3d2a18] transition hover:bg-[#f7ecd0] sm:px-4"
                                aria-label={
                                  lang === "en" ? `Open: ${item.title}` : `보러가기: ${item.title}`
                                }
                                title={lang === "en" ? "Open article" : "보러가기"}
                              >
                                <span className="text-xl leading-none sm:text-2xl" aria-hidden>
                                  →
                                </span>
                              </a>
                            </div>
                          </div>
                        </article>
                      ))}
                      {canExpandNews ? (
                        <div className="pb-2 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedNews(true)}
                            className="rounded-sm border border-[#8b6914]/4 bg-[#efe0b8] px-4 py-2 text-[13px] text-[#3d2a18] hover:bg-[#f7ecd0]"
                          >
                            {lang === "en"
                              ? `Show ${news.length - mobilePreview} more`
                              : `${news.length - mobilePreview}건 더 보기`}
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="py-10 text-center text-sm text-[#5a4428]/7">
                      {lang === "en"
                        ? "No illustrated wires available right now."
                        : "사진이 있는 와이어를 아직 찾지 못했습니다."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="relative shrink-0 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-6 py-4 text-center">
              <button
                type="button"
                onClick={handleContinue}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.06em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: parchmentStack, fontWeight: 400 }}
              >
                {lang === "en" ? "Until tomorrow" : "내일 다시"}
              </button>
            </div>
          </div>

          <div className="welcome-parchment welcome-letter-face welcome-letter-face--back" aria-hidden>
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" />
            <div className="welcome-letter-back-inner">
              <div className="welcome-letter-wax" />
              <p className="welcome-letter-back-mark" style={{ fontFamily: parchmentStack }}>
                {lang === "en" ? BRAND_NAME.en : BRAND_NAME.ko}
              </p>
              <p className="welcome-letter-back-sub" style={{ fontFamily: parchmentStack }}>
                {lang === "en" ? "멋진 신세계" : "Brave New World"}
              </p>
              <div className="welcome-letter-back-lines" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
