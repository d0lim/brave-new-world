/** 설명창·툴팁이 브라우저 뷰포트 밖으로 나가지 않게 위치를 보정합니다. */

export const VIEWPORT_EDGE_PAD = 10;

export type ViewportBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getViewportSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1280, height: 720 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * 주어진 박스의 좌상단을 뷰포트 안으로 클램프.
 * width/height가 뷰포트보다 크면 padding 쪽에 붙입니다.
 */
export function clampBoxToViewport(
  left: number,
  top: number,
  width: number,
  height: number,
  padding = VIEWPORT_EDGE_PAD,
  viewport = getViewportSize(),
): { left: number; top: number } {
  const maxLeft = Math.max(padding, viewport.width - width - padding);
  const maxTop = Math.max(padding, viewport.height - height - padding);
  return {
    left: Math.min(Math.max(padding, left), maxLeft),
    top: Math.min(Math.max(padding, top), maxTop),
  };
}

/**
 * preferredPlacement 기준으로 앵커 옆/위/아래에 두고,
 * 공간이 부족하면 반대쪽으로 뒤집은 뒤 최종 clamp.
 */
export function placeNearAnchor(options: {
  anchor: DOMRect;
  width: number;
  height: number;
  preferred: "above" | "below";
  gap?: number;
  padding?: number;
}): { left: number; top: number; placement: "above" | "below" } {
  const gap = options.gap ?? 10;
  const padding = options.padding ?? VIEWPORT_EDGE_PAD;
  const viewport = getViewportSize();
  const cx = options.anchor.left + options.anchor.width / 2;
  let preferred = options.preferred;

  const spaceBelow = viewport.height - options.anchor.bottom - padding;
  const spaceAbove = options.anchor.top - padding;
  if (preferred === "below" && spaceBelow < options.height + gap && spaceAbove > spaceBelow) {
    preferred = "above";
  } else if (preferred === "above" && spaceAbove < options.height + gap && spaceBelow > spaceAbove) {
    preferred = "below";
  }

  const rawLeft = cx - options.width / 2;
  const rawTop =
    preferred === "below"
      ? options.anchor.bottom + gap
      : options.anchor.top - gap - options.height;

  const clamped = clampBoxToViewport(
    rawLeft,
    rawTop,
    options.width,
    options.height,
    padding,
    viewport,
  );
  return { ...clamped, placement: preferred };
}
