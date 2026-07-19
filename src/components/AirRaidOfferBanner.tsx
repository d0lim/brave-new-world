"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";

/** fly-to + 양피지 브리핑 제안 — 계정/브라우저당 최초 1회만 */
export const AIR_RAID_FLY_BRIEF_KEY = "geowatch-air-raid-fly-brief-v1";

export function readAirRaidFlyBriefDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AIR_RAID_FLY_BRIEF_KEY) === "1";
  } catch {
    return true;
  }
}

export function markAirRaidFlyBriefDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AIR_RAID_FLY_BRIEF_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferAirRaidFlyBrief(): boolean {
  return !readAirRaidFlyBriefDone();
}

export type AirRaidOffer = {
  key: string;
  kind: AirRaidSirenKind;
  target: AirRaidFocusTarget;
  title?: string;
  since?: string;
  activeCount: number;
  /** 로켓·미사일 / UAV 등 */
  threatLabel?: string;
  /** 어느 쪽에서 접근하는지 */
  approachFrom?: string;
  /** 주·구 등 상세 위치 */
  locationDetail?: string;
};

type AirRaidOfferBannerProps = {
  offer: AirRaidOffer;
  lang: LabelLanguage;
  onAccept: () => void;
  onDismiss: () => void;
};

const COPY = {
  ko: {
    headline: "공습경보",
    body: "해당 지역으로 이동해 브리핑을 들을까요? (최초 1회)",
    go: "이동하기",
    dismiss: "닫기",
  },
  en: {
    headline: "Air-raid alert",
    body: "Fly to the area for a briefing? (first time only)",
    go: "Go there",
    dismiss: "Dismiss",
  },
} as const;

function kindBadge(kind: AirRaidSirenKind, lang: LabelLanguage): string {
  if (lang === "en") {
    if (kind === "tzeva") return "Tzeva Adom";
    if (kind === "neptun") return "NEPTUN";
    return "Alert";
  }
  if (kind === "tzeva") return "체바 아돔";
  if (kind === "neptun") return "NEPTUN";
  return "경보";
}

/**
 * 신규 공습경보 — 자동 fly 대신 유저가 이동 여부를 선택 (최초 1회).
 */
export function AirRaidOfferBanner({
  offer,
  lang,
  onAccept,
  onDismiss,
}: AirRaidOfferBannerProps) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const region = offer.target.label || (lang === "en" ? "Alert zone" : "경보 구역");

  return (
    <div
      className="pointer-events-auto fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[10030] w-[min(92vw,26rem)] -translate-x-1/2"
      role="alertdialog"
      aria-labelledby="air-raid-offer-title"
      aria-describedby="air-raid-offer-body"
    >
      <div className="overflow-hidden rounded-lg border border-red-400/45 bg-[#1a0a0e]/92 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="border-b border-red-400/25 bg-red-950/50 px-4 py-2.5">
          <p
            id="air-raid-offer-title"
            className="text-[13px] font-semibold tracking-wide text-red-100"
          >
            {copy.headline}
            <span className="ml-2 text-[11px] font-medium text-red-200/75">
              {kindBadge(offer.kind, lang)}
            </span>
          </p>
          <p className="mt-0.5 truncate text-[15px] font-medium text-white">{region}</p>
        </div>
        <div className="px-4 py-3">
          <p id="air-raid-offer-body" className="text-[12px] leading-relaxed text-red-50/80">
            {copy.body}
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-white/15 bg-transparent px-3 py-1.5 text-[12px] text-red-100/75 transition hover:bg-white/5 hover:text-red-50"
            >
              {copy.dismiss}
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="rounded-md border border-red-300/50 bg-red-700/85 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-red-600"
            >
              {copy.go}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
