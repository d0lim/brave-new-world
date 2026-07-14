import { AXIS_NODES } from "@/data/axisNetwork";
import type { AxisHubId } from "@/data/axisNetwork";
import { greatCircleArc } from "@/lib/axisNetworkPaths";
import type { TransportPath } from "@/data/geoTypes";

export type AxisArmsPair = {
  supplier: string;
  recipient: string;
  tiv: number;
  count: number;
  topCategory: string;
  color: string;
  years: number[];
};

export type AxisArmsDeal = {
  supplier: string;
  recipient: string;
  designation: string;
  description: string;
  category: string;
  year: number | null;
  tiv: number;
};

export type AxisArmsPayload = {
  source: string;
  citation: string;
  yearRange: [number, number];
  pairs: AxisArmsPair[];
  deals: AxisArmsDeal[];
};

export function filterArmsForHub(payload: AxisArmsPayload | null, hub: AxisHubId) {
  if (!payload) return { pairs: [] as AxisArmsPair[], deals: [] as AxisArmsDeal[] };
  const pairs = payload.pairs.filter((p) => p.supplier === hub || p.recipient === hub);
  const deals = payload.deals.filter((d) => d.supplier === hub || d.recipient === hub);
  return { pairs, deals };
}

export function armsPairsToPaths(pairs: AxisArmsPair[]): TransportPath[] {
  const out: TransportPath[] = [];
  for (const p of pairs) {
    const na = AXIS_NODES[p.supplier];
    const nb = AXIS_NODES[p.recipient];
    if (!na || !nb) continue;
    const peakAlt = Math.min(0.18, 0.06 + Math.log10(Math.max(1, p.tiv)) * 0.04);
    out.push({
      id: `arms-${p.supplier}-${p.recipient}`,
      kind: "axis-link",
      name: `${na.nameKo} → ${nb.nameKo} · ${p.topCategory} (TIV ${p.tiv})`,
      scalerank: 1,
      lengthKm: null,
      accentColor: p.color,
      bbox: {
        minLat: Math.min(na.lat, nb.lat),
        minLng: Math.min(na.lng, nb.lng),
        maxLat: Math.max(na.lat, nb.lat),
        maxLng: Math.max(na.lng, nb.lng),
      },
      points: greatCircleArc(na.lat, na.lng, nb.lat, nb.lng, 28, peakAlt),
    });
  }
  return out;
}
