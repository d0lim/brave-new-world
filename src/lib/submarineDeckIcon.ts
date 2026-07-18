import {
  SUBMARINE_ASPECT_DRAWINGS,
  SUBMARINE_MARKER_SIZE,
  SUBMARINE_VIEWBOX,
  type SubmarineIconSize,
} from "@/data/submarineSilhouette";
import type { SurfaceCombatantAspect } from "@/data/surfaceCombatantSilhouette";

const DEFAULT_FILL = "#7c3aed";

/**
 * 잠수함 8방위 실루엣 SVG (시가형 헐·세일·함미타).
 */
export function submarineIconSvg(
  fillColor: string = DEFAULT_FILL,
  size: SubmarineIconSize = SUBMARINE_MARKER_SIZE,
  aspect: SurfaceCombatantAspect = "n",
): string {
  const { width, height } = size;
  const vb = `${SUBMARINE_VIEWBOX.width} ${SUBMARINE_VIEWBOX.height}`;
  const glowId = `ssn-glow-${aspect}-${width}`;
  const drawing = SUBMARINE_ASPECT_DRAWINGS[aspect];

  const details = drawing.details
    .map(
      (d) =>
        `<path d="${d}" fill="rgba(15,23,42,0.55)" stroke="rgba(196,181,253,0.55)" stroke-width="0.65" stroke-linejoin="round"/>`,
    )
    .join("");

  const axis = drawing.axis
    ? `<path d="${drawing.axis}" stroke="rgba(167,139,250,0.5)" stroke-width="0.65" stroke-linecap="round"/>`
    : "";

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="${glowId}" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.25" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="${drawing.hull}"
        fill="${fillColor}"
        stroke="rgba(221,214,254,0.9)"
        stroke-width="1.1"
        stroke-linejoin="round"
        filter="url(#${glowId})"
      />
      ${axis}
      ${details}
    </svg>
  `.trim();
}

export function submarineGlowShadow(fillColor: string = DEFAULT_FILL): string {
  return `0 0 10px ${fillColor}cc, 0 0 18px ${fillColor}66, 0 2px 6px rgba(0,0,0,0.55)`;
}
