"use client";

import { useCallback, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

const LETTER_KO = {
  title: "멋진신세계에 오신 것을 환영합니다",
  paragraphs: [
    "존경하는 탐험가께.",
    "문을 열면, 먼저 소리가 옵니다.\n멀리서 포탄이 작렬하고, 공습 사이렌이 허파를 쥐어짭니다. 지도 위 한 칸에서는 밤이 붉게 타오릅니다. 그런데—같은 순간, 같은 지구본의 반대편에서는 누군가 조용히 숫자를 읽어 올립니다. 유가. 환율. 제재. 항로. 케이블. 누군가는 돈을 벌고 있습니다.",
    "Aldous Huxley가 그린 《Brave New World》는 ‘멋진’이라는 말이 얼마나 섬뜩할 수 있는지를 보여 주었습니다. 우리는 그 아이러니를 빌려, 이 관측대에 이름을 붙였습니다. 멋진신세계.\n완성된 낙원이 아니라—전쟁과 이익이 한 화면을 나눠 쓰는, 너무도 현실적인 신세계.",
    "세상은 하나의 이야기로 정리되기를 원합니다. 그러나 지정학은 여러 줄기가 한꺼번에 흐르는 강입니다. 한쪽에서는 총성이, 다른 쪽에서는 회담이, 바다 위에서는 선박이 항로를 틀고, 해저에서는 보이지 않는 케이블이 대륙을 잇습니다. 이 지구본은 그 서사시의 결을, 지도의 언어로 펼쳐 놓았습니다.",
    "이곳에서 당신은 두 갈래의 문 앞에 서게 됩니다.",
    "지정학의 창—전선과 분쟁, 군사와 외교의 긴장. 접촉선의 윤곽, 공중의 궤적, 속보의 불꽃, 사이렌이 남긴 잔향을 따라가는 길입니다.",
    "지경학의 창—에너지와 물류, 시장과 제재, 호르무즈와 수에즈, 파이프라인과 해저 케이블. 자본이 숨을 고르는 교차로를 읽는 길입니다.",
    "어느 문을 열든, 부디 성급히 눈을 감지 마십시오. 소름과 설렘은 같은 자리에서 태어납니다. 긴장 너머에 감동이 있고, 감동 너머에 질문이 남습니다. 지도는 답을 주기보다, 올바른 질문을 떠올리게 하는 도구입니다.",
    "이제 편지를 접으십시오.\n그리고—어느 창으로 이 멋진신세계에 들어설지, 스스로 선택해 주십시오.",
  ],
  signOff: `${BRAND_NAME.ko}\n지구본 관측대에서`,
  backMark: BRAND_NAME.ko,
  backSub: "Brave New World",
};

const LETTER_EN = {
  title: "Welcome to Brave New World",
  paragraphs: [
    "Dear explorer,",
    "Open the door, and sound arrives first.\nFar away, shells rupture the night; air-raid sirens claw at the lungs. One square of the map burns red. And yet—in the same heartbeat, on the far side of the same globe—someone quietly reads the numbers up. Oil. Exchange. Sanctions. Sea lanes. Cables. Someone is making money.",
    "Aldous Huxley’s Brave New World taught us how unsettling the word “brave” can be. We borrowed that irony for this observatory. Brave New World.\nNot a finished paradise—but a world too real, where war and profit share one screen.",
    "The world longs to be told as a single story. Geopolitics is a river of many currents at once: gunfire here, talks there; ships altering course at sea; unseen cables binding continents below. This globe unfolds that epic grain in the language of maps.",
    "Here you stand before two doors.",
    "The window of geopolitics—front lines and disputes, the tension of arms and diplomacy: the outline of a contact line, trails in the sky, sparks of breaking news, the after-echo of sirens.",
    "The window of geoeconomics—energy and logistics, markets and sanctions, Hormuz and Suez, pipelines and submarine cables: the crossings where capital catches its breath.",
    "Whichever door you open, do not close your eyes too soon. Goosebumps and thrill are born in the same place. Beyond tension, feeling; beyond feeling, a question. A map does not so much give answers as invite the right ones.",
    "Now fold the letter.\nAnd choose—for yourself—which window will lead you into this Brave New World.",
  ],
  signOff: `${BRAND_NAME.en}\nFrom the Globe Observatory`,
  backMark: BRAND_NAME.en,
  backSub: "멋진신세계",
};

/** 접기(뒷면) + 상승 모션 총 길이 (CSS와 맞춤) */
const FOLD_EXIT_MS = 1100;

type WelcomeParchmentLetterProps = {
  lang: LabelLanguage;
  onContinue: () => void;
};

export function WelcomeParchmentLetter({ lang, onContinue }: WelcomeParchmentLetterProps) {
  const letter = lang === "en" ? LETTER_EN : LETTER_KO;
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  /** 고문헌 필체 — 한글 고운바탕 + 영문 코모란트 */
  const classicalStack =
    'var(--font-letter-serif), "Gowun Batang", "Nanum Myeongjo", "Apple Myungjo", "Batang", serif';
  const scriptStack =
    'var(--font-letter-script), "Cormorant Garamond", "Garamond", "Times New Roman", serif';
  const bodyFont = lang === "en" ? scriptStack : classicalStack;
  const titleFont = classicalStack;

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
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-7 py-8 sm:px-12 sm:py-10">
              <h1
                id="welcome-letter-title"
                className="welcome-letter-title shrink-0 text-center text-[1.85rem] leading-[1.45] tracking-[0.04em] text-[#3d2a18] sm:text-[2.35rem] sm:leading-[1.4] sm:tracking-[0.06em]"
                style={{ fontFamily: titleFont, fontWeight: 700 }}
              >
                {letter.title}
              </h1>
              <div className="mx-auto mt-3 h-px w-24 shrink-0 bg-[#8b6914]/45" aria-hidden />
              <div
                className="welcome-letter-body mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain text-[1.08rem] leading-[2] tracking-[0.02em] text-[#3f2e1c] sm:text-[1.14rem] sm:leading-[2.05] sm:tracking-[0.025em]"
                style={{ fontFamily: bodyFont, fontWeight: 400 }}
              >
                {letter.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)} className="whitespace-pre-wrap">
                    {p}
                  </p>
                ))}
                <p
                  className="whitespace-pre-line pb-1 text-right text-[1.05rem] leading-relaxed tracking-[0.03em] text-[#5a4428]"
                  style={{
                    fontFamily: scriptStack,
                    fontStyle: "italic",
                    fontWeight: 500,
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
                className="rounded-full border border-[#8b6914]/50 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.04em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: titleFont, fontWeight: 700 }}
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
