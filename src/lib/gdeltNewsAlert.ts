import type { EventTier } from "@/data/geoTypes";
import {
  gdeltImportanceShortLabel,
  isMarkedGdeltImportance,
  type GdeltImportanceGrade,
} from "@/lib/gdeltImportance";

export const GDELT_NEWS_ALERT_LABEL = "뉴스 알림";
export const GDELT_NEWS_ALERT_LABEL_EN = "News alert";

export function gdeltNewsAlertLabel(lang: "ko" | "en" = "ko"): string {
  return lang === "en" ? GDELT_NEWS_ALERT_LABEL_EN : GDELT_NEWS_ALERT_LABEL;
}

const TIER_BADGE_BORDER: Record<EventTier, string> = {
  war: "rgba(239, 68, 68, 0.6)",
  diplomatic: "rgba(251, 146, 60, 0.6)",
  alliance: "rgba(20, 184, 166, 0.55)",
  protest: "rgba(148, 163, 184, 0.5)",
};

const IMPORTANCE_BADGE: Record<
  Extract<GdeltImportanceGrade, "S" | "A">,
  { border: string; bg: string; color: string }
> = {
  S: {
    border: "rgba(250, 204, 21, 0.85)",
    bg: "rgba(120, 53, 15, 0.92)",
    color: "rgba(254, 243, 199, 0.98)",
  },
  A: {
    border: "rgba(251, 146, 60, 0.8)",
    bg: "rgba(124, 45, 18, 0.9)",
    color: "rgba(255, 237, 213, 0.96)",
  },
};

/** 지도 마커 하단 「뉴스」 뱃지 — S/A는 등급 강조 */
export function createNewsAlertBadgeElement(
  tier: EventTier,
  importanceGrade?: GdeltImportanceGrade,
): HTMLElement {
  const badge = document.createElement("span");
  const marked =
    importanceGrade && isMarkedGdeltImportance(importanceGrade) ? importanceGrade : null;
  badge.textContent = marked ? gdeltImportanceShortLabel(marked) : "뉴스";
  badge.setAttribute("aria-hidden", "true");
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.marginTop = "-1px";
  badge.style.padding = marked ? "1px 6px" : "1px 5px";
  badge.style.borderRadius = "9999px";
  if (marked === "S" || marked === "A") {
    const style = IMPORTANCE_BADGE[marked];
    badge.style.border = `1px solid ${style.border}`;
    badge.style.background = style.bg;
    badge.style.color = style.color;
    badge.style.fontWeight = "700";
    badge.style.boxShadow =
      marked === "S"
        ? "0 0 8px rgba(250, 204, 21, 0.55)"
        : "0 1px 3px rgba(2, 8, 20, 0.45)";
  } else {
    badge.style.border = `1px solid ${TIER_BADGE_BORDER[tier]}`;
    badge.style.background = "rgba(8, 18, 36, 0.9)";
    badge.style.color = "rgba(255, 237, 213, 0.96)";
    badge.style.fontWeight = "600";
    badge.style.boxShadow = "0 1px 3px rgba(2, 8, 20, 0.45)";
  }
  badge.style.fontSize = "8px";
  badge.style.lineHeight = "1.25";
  badge.style.letterSpacing = "-0.02em";
  badge.style.whiteSpace = "nowrap";
  badge.style.pointerEvents = "none";
  return badge;
}

/** 위치 핀 + 뉴스 뱃지를 하나의 마커 루트로 묶음 */
export function wrapNewsAlertMarker(
  pinEl: HTMLElement,
  tier: EventTier,
  importanceGrade?: GdeltImportanceGrade,
): { root: HTMLElement; pin: HTMLElement } {
  const root = document.createElement("div");
  root.className = "gdelt-news-alert-marker";
  if (importanceGrade && isMarkedGdeltImportance(importanceGrade)) {
    root.dataset.importance = importanceGrade;
  }
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.transform = "translate(-50%, -100%)";
  root.style.pointerEvents = "none";

  pinEl.style.transform = "none";
  pinEl.style.pointerEvents = "auto";

  root.appendChild(pinEl);
  root.appendChild(createNewsAlertBadgeElement(tier, importanceGrade));
  return { root, pin: pinEl };
}
