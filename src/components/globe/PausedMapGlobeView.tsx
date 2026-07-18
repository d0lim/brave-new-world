"use client";

import { forwardRef, memo } from "react";
import { MapGlobeView } from "@/components/MapGlobeView";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";

type PausedMapGlobeProps = React.ComponentProps<typeof MapGlobeView> & {
  interactionPaused: boolean;
};

/** 레이어 패널 열림 동안 지도 GeoJSON 재빌드 차단 — 메인 스레드 UI 멈춤 방지 */
export const PausedMapGlobeView = memo(
  forwardRef<MapGlobeMethods, PausedMapGlobeProps>(function PausedMapGlobeView(
    { interactionPaused, ...mapProps },
    ref,
  ) {
    void interactionPaused;
    return <MapGlobeView ref={ref} {...mapProps} />;
  }),
  (prev, next) => {
    if (next.interactionPaused && prev.interactionPaused) {
      return true;
    }
    return false;
  },
);
