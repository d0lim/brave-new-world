"use client";

import { useCallback, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

const LETTER_KO = {
  title: "멋진 신세계에\n오신 것을 환영합니다",
  paragraphs: [
    "존경하는 탐험가께.",
    "문을 열면—\n먼저 소리가 옵니다.\n\n멀리서 포탄이 작렬하고\n공습 사이렌이 허파를 쥐어짭니다.\n지도 위 한 칸에서는\n밤이 붉게 타오릅니다.\n\n그런데—\n같은 순간,\n같은 지구본의 반대편에서는\n누군가 조용히 숫자를 읽어 올립니다.\n\n유가.\n환율.\n제재.\n항로.\n케이블.\n\n누군가는\n돈을 벌고 있습니다.",
    "Aldous Huxley가 그린\n《Brave New World》는\n‘멋진’이라는 말이\n얼마나 섬뜩할 수 있는지를\n보여 주었습니다.\n\n우리는 그 아이러니를 빌려\n이 관측대에 이름을 붙였습니다.\n\n멋진 신세계.\n\n완성된 낙원이 아니라—\n전쟁과 이익이\n한 화면을 나눠 쓰는,\n너무도 현실적인 신세계.",
    "세상은 하나의 이야기로\n정리되기를 원합니다.\n\n그러나 지정학은\n여러 줄기가 한꺼번에 흐르는 강입니다.\n\n한쪽에서는 총성이,\n다른 쪽에서는 회담이,\n바다 위에서는 선박이 항로를 틀고,\n해저에서는 보이지 않는 케이블이\n대륙을 잇습니다.\n\n이 지구본은 그 서사시의 결을\n지도의 언어로 펼쳐 놓았습니다.",
    "이곳에서 당신은\n두 갈래의 문 앞에 서게 됩니다.",
    "지정학의 창—\n전선과 분쟁,\n군사와 외교의 긴장.\n\n접촉선의 윤곽,\n공중의 궤적,\n속보의 불꽃,\n사이렌이 남긴 잔향을\n따라가는 길입니다.",
    "지경학의 창—\n에너지와 물류,\n시장과 제재,\n호르무즈와 수에즈,\n파이프라인과 해저 케이블.\n\n자본이 숨을 고르는 교차로를\n읽는 길입니다.",
    "어느 문을 열든,\n부디 성급히 눈을 감지 마십시오.\n\n소름과 설렘은\n같은 자리에서 태어납니다.\n긴장 너머에 감동이 있고,\n감동 너머에 질문이 남습니다.\n\n지도는 답을 주기보다,\n올바른 질문을 떠올리게 하는\n도구입니다.",
    "이제 편지를 접으십시오.\n\n그리고—\n어느 창으로\n이 멋진 신세계에 들어설지,\n스스로 선택해 주십시오.",
  ],
  signOff: `${BRAND_NAME.ko}\n지구본 관측대에서`,
  backMark: BRAND_NAME.ko,
  backSub: "Brave New World",
};

const LETTER_EN = {
  title: "Welcome to\nBrave New World",
  paragraphs: [
    "Dear explorer,",
    "Open the door—\nand sound arrives first.\n\nFar away, shells rupture the night;\nair-raid sirens claw at the lungs.\nOne square of the map\nburns red.\n\nAnd yet—\nin the same heartbeat,\non the far side of the same globe—\nsomeone quietly reads the numbers up.\n\nOil.\nExchange.\nSanctions.\nSea lanes.\nCables.\n\nSomeone\nis making money.",
    "Aldous Huxley’s Brave New World\ntaught us how unsettling\nthe word “brave” can be.\n\nWe borrowed that irony\nfor this observatory.\n\nBrave New World.\n\nNot a finished paradise—\nbut a world too real,\nwhere war and profit\nshare one screen.",
    "The world longs to be told\nas a single story.\n\nGeopolitics is a river\nof many currents at once:\ngunfire here, talks there;\nships altering course at sea;\nunseen cables binding continents below.\n\nThis globe unfolds that epic grain\nin the language of maps.",
    "Here you stand\nbefore two doors.",
    "The window of geopolitics—\nfront lines and disputes,\nthe tension of arms and diplomacy.\n\nThe outline of a contact line,\ntrails in the sky,\nsparks of breaking news,\nthe after-echo of sirens.",
    "The window of geoeconomics—\nenergy and logistics,\nmarkets and sanctions,\nHormuz and Suez,\npipelines and submarine cables.\n\nThe crossings\nwhere capital catches its breath.",
    "Whichever door you open,\ndo not close your eyes too soon.\n\nGoosebumps and thrill\nare born in the same place.\nBeyond tension, feeling;\nbeyond feeling, a question.\n\nA map does not so much give answers\nas invite the right ones.",
    "Now fold the letter.\n\nAnd choose—for yourself—\nwhich window will lead you\ninto this Brave New World.",
  ],
  signOff: `${BRAND_NAME.en}\nFrom the Globe Observatory`,
  backMark: BRAND_NAME.en,
  backSub: "멋진 신세계",
};

/** 접기(뒷면) + 상승 모션 총 길이 (CSS와 맞춤) */
const FOLD_EXIT_MS = 1100;

function LetterCorner({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const rot =
    corner === "tl" ? 0 : corner === "tr" ? 90 : corner === "br" ? 180 : 270;
  const pos =
    corner === "tl"
      ? "left-2 top-2 sm:left-3 sm:top-3"
      : corner === "tr"
        ? "right-2 top-2 sm:right-3 sm:top-3"
        : corner === "br"
          ? "bottom-2 right-2 sm:bottom-3 sm:right-3"
          : "bottom-2 left-2 sm:bottom-3 sm:left-3";

  return (
    <svg
      className={`welcome-letter-corner pointer-events-none absolute h-10 w-10 text-[#6b4a22]/70 sm:h-12 sm:w-12 ${pos}`}
      style={{ transform: `rotate(${rot}deg)` }}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 48 V18 C8 10 14 6 22 6 H48"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M12 48 V22 C12 14 18 10 26 10 H48"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M22 6 C18 14 14 18 6 22"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="22" cy="6" r="1.6" fill="currentColor" />
      <circle cx="8" cy="48" r="1.4" fill="currentColor" />
      <path
        d="M28 14 C32 10 38 10 42 14 M30 18 C34 15 38 15 42 18"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}

type WelcomeParchmentLetterProps = {
  lang: LabelLanguage;
  onContinue: () => void;
};

export function WelcomeParchmentLetter({ lang, onContinue }: WelcomeParchmentLetterProps) {
  const letter = lang === "en" ? LETTER_EN : LETTER_KO;
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const handStack =
    'var(--font-letter-hand), "Gowun Batang", "Nanum Myeongjo", "Batang", serif';
  const scriptStack =
    'var(--font-letter-script), "Cormorant Garamond", "Garamond", "Times New Roman", serif';
  const bodyFont = lang === "en" ? scriptStack : handStack;
  const titleFont = handStack;

  const handleContinue = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("folding");
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setPhase("done");
      onContinue();
    }, reduced ? 80 : FOLD_EXIT_MS);
  }, [onContinue, phase]);

  const exiting = phase === "folding" || phase === "done";

  return (
    <div
      className={`welcome-letter-scrim fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 ${
        exiting ? "welcome-letter-scrim--exit" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-letter-title"
      aria-busy={phase === "folding"}
    >
      <div className="welcome-letter-stage">
        <div
          className={`welcome-letter-card ${exiting ? "welcome-letter-card--fold-exit" : ""}`}
          style={{ fontFamily: bodyFont }}
        >
          {/* 앞면 */}
          <div className="welcome-parchment welcome-letter-face welcome-letter-face--front relative flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" aria-hidden />
            <LetterCorner corner="tl" />
            <LetterCorner corner="tr" />
            <LetterCorner corner="bl" />
            <LetterCorner corner="br" />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-8 py-9 sm:px-14 sm:py-11">
              <h1
                id="welcome-letter-title"
                className="welcome-letter-title shrink-0 whitespace-pre-line text-center text-[1.7rem] leading-[1.55] tracking-[0.06em] text-[#3d2a18] sm:text-[2.15rem] sm:leading-[1.5] sm:tracking-[0.08em]"
                style={{ fontFamily: titleFont, fontWeight: 400 }}
              >
                {letter.title}
              </h1>
              <div className="welcome-letter-divider mx-auto mt-4 shrink-0" aria-hidden />
              <div
                className="welcome-letter-body mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain text-[1.06rem] leading-[1.95] tracking-[0.03em] text-[#3f2e1c] sm:text-[1.12rem] sm:leading-[2] sm:tracking-[0.035em]"
                style={{ fontFamily: bodyFont, fontWeight: 400 }}
              >
                {letter.paragraphs.map((p, i) => (
                  <p key={i} className="welcome-letter-verse whitespace-pre-line text-pretty">
                    {p}
                  </p>
                ))}
                <p
                  className="whitespace-pre-line pb-2 pt-2 text-right text-[1.02rem] leading-relaxed tracking-[0.04em] text-[#5a4428]"
                  style={{
                    fontFamily: lang === "en" ? scriptStack : handStack,
                    fontStyle: lang === "en" ? "italic" : "normal",
                    fontWeight: 400,
                  }}
                >
                  {letter.signOff}
                </p>
              </div>
            </div>
            <div className="relative shrink-0 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-6 py-4 text-center">
              <button
                type="button"
                onClick={handleContinue}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.06em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: titleFont, fontWeight: 400 }}
              >
                {t("welcomeLetterCta", lang)}
              </button>
            </div>
          </div>

          {/* 뒷면 — 접히면 보이는 면 */}
          <div
            className="welcome-parchment welcome-letter-face welcome-letter-face--back"
            aria-hidden
          >
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" />
            <LetterCorner corner="tl" />
            <LetterCorner corner="tr" />
            <LetterCorner corner="bl" />
            <LetterCorner corner="br" />
            <div className="welcome-letter-back-inner">
              <div className="welcome-letter-wax" />
              <p className="welcome-letter-back-mark" style={{ fontFamily: titleFont }}>
                {letter.backMark}
              </p>
              <p className="welcome-letter-back-sub" style={{ fontFamily: scriptStack, fontStyle: "italic" }}>
                {letter.backSub}
              </p>
              <div className="welcome-letter-back-lines" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
