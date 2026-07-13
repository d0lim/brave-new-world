"use client";

import { useEffect, useState } from "react";

/** 좁은 화면 또는 터치 태블릿급 */
const COMPACT_QUERY =
  "(max-width: 768px), ((pointer: coarse) and (max-width: 1024px))";

function readCompactMatch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(COMPACT_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * 모바일·터치 간이 뷰 게이트.
 * SSR은 false → hydrate 후 matchMedia.
 */
export function useCompactUi(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return compact;
}

export function isCompactUiMatch(): boolean {
  return readCompactMatch();
}
