"use client";

import { useCallback, useEffect, useState } from "react";
import { trackEvent } from "@/lib/trackClient";

/**
 * PWA 부트스트랩 + 홈 화면 추가 유도 (모바일 전용)
 *
 * 역할 2가지:
 *  1) 서비스워커 등록 — 설치 가능 조건 + 향후 웹 푸시 수신 준비
 *  2) "홈 화면에 추가" 안내 배너
 *
 * ★ 노출 정책 (첫인상을 해치지 않는 게 최우선)
 *  - 첫 방문에는 절대 안 띄운다. 2번째 이상 방문부터.
 *  - 진입 후 최소 dwell 시간이 지난 뒤에만 (온보딩 오버레이들과 겹치지 않도록).
 *  - 이미 홈 화면에서 실행 중(standalone)이면 안 띄운다.
 *  - 닫으면 일정 기간 다시 안 띄운다.
 */

const VISIT_KEY = "cv-visit-count";
const DISMISS_KEY = "cv-pwa-prompt-dismissed-at";
/** 닫은 뒤 다시 물어보기까지 */
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
/** 진입 직후엔 온보딩(입장 게이트·모드선택·코치마크)이 도는 중 — 충분히 지난 뒤 */
const SHOW_DELAY_MS = 75_000;
/** 이 방문 횟수 이상부터 노출 */
const MIN_VISITS = 2;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** 방문 횟수 증가 후 현재 값 반환 */
function bumpVisitCount(): number {
  try {
    const prev = Number(localStorage.getItem(VISIT_KEY) || "0");
    const next = (Number.isFinite(prev) ? prev : 0) + 1;
    localStorage.setItem(VISIT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosMode, setIosMode] = useState(false);
  /** 진입 직후 온보딩과 겹치지 않도록 최소 dwell 경과 여부 */
  const [delayPassed, setDelayPassed] = useState(false);

  // 1) 서비스워커 등록 — 노출 정책과 무관하게 항상
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 등록 실패는 조용히 무시 — 앱 동작에는 영향 없음 */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // 2) 설치 배너 노출 판단
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || recentlyDismissed()) return;

    const visits = bumpVisitCount();
    if (visits < MIN_VISITS) return;

    const onBeforeInstall = (event: Event) => {
      // 브라우저 기본 미니바 대신 우리 배너로
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS 사파리는 beforeinstallprompt 자체가 없어 수동 안내가 유일한 방법
    const ios = isIos();
    setIosMode(ios);

    const timer = window.setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  /**
   * dwell 시간이 지났고, (iOS 수동안내 대상이거나 설치 이벤트를 잡았을 때) 노출.
   * beforeinstallprompt가 타이머보다 늦게 오는 경우도 커버된다.
   */
  useEffect(() => {
    if (!delayPassed) return;
    if (!iosMode && !installEvent) return;
    setVisible(true);
  }, [delayPassed, iosMode, installEvent]);

  // 설치 완료되면 배너 제거
  useEffect(() => {
    const onInstalled = () => {
      setVisible(false);
      trackEvent("pwa_installed");
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* 저장 실패 무시 */
    }
    setVisible(false);
    trackEvent("pwa_prompt_dismiss");
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    trackEvent("pwa_prompt_accept");
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      /* 사용자가 취소 */
    }
    setInstallEvent(null);
    setVisible(false);
  }, [installEvent]);

  useEffect(() => {
    if (visible) trackEvent("pwa_prompt_shown", { ios: iosMode });
  }, [visible, iosMode]);

  if (!visible) return null;

  return (
    <div
      className="cv-compact-only pointer-events-auto fixed inset-x-0 bottom-0 z-[92] px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      role="dialog"
      aria-modal="false"
      aria-label="홈 화면에 추가"
    >
      <div className="mx-auto flex w-[min(96vw,440px)] items-start gap-3 rounded-2xl border border-sky-300/25 bg-[#0a1428]/97 p-3.5 shadow-2xl backdrop-blur-xl">
        <span aria-hidden className="mt-0.5 shrink-0 text-[20px]">
          🛰️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-sky-50">홈 화면에 추가</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-300/80">
            {iosMode
              ? "하단 공유 버튼 → “홈 화면에 추가”를 누르면 앱처럼 바로 열 수 있습니다."
              : "앱처럼 바로 열고, 상황 변화 알림도 받을 수 있습니다."}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            {!iosMode ? (
              <button
                type="button"
                onClick={install}
                className="tap-target min-h-[36px] rounded-lg border border-sky-300/35 bg-sky-500/15 px-3 text-[12px] font-medium text-sky-50 transition hover:border-sky-200/50 hover:bg-sky-500/25"
              >
                추가하기
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="tap-target min-h-[36px] rounded-lg px-2.5 text-[12px] text-slate-400 transition hover:text-slate-200"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="tap-target -mr-1 -mt-1 flex min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-lg text-[13px] text-slate-500 transition hover:text-slate-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
