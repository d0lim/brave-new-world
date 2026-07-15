import briData from "@/data/bri-trade-connectivity.json";
import type { TransportPath } from "@/data/geoTypes";
import { greatCircleArc } from "@/lib/axisNetworkPaths";

type BriCountryLink = {
  id: string;
  destCode: string;
  nameEn: string;
  nameKo: string;
  impactPct: number;
  lat: number;
  lng: number;
  olat: number;
  olng: number;
};

type BriCityLink = {
  id: string;
  originCity: string;
  destCity: string;
  destCountry: string;
  impactPct: number;
  olat: number;
  olng: number;
  dlat: number;
  dlng: number;
};

const BRI_BASE_COLOR = "rgba(230, 180, 34";

function impactAlpha(pct: number): number {
  return Math.min(0.92, Math.max(0.38, 0.32 + pct / 45));
}

function impactStroke(pct: number): number {
  return Math.min(2.4, Math.max(0.85, 0.7 + pct / 18));
}

function impactPeakAlt(pct: number): number {
  return Math.min(0.22, Math.max(0.08, 0.06 + pct / 220));
}

function linkToPath(
  id: string,
  nameKo: string,
  nameEn: string,
  impactPct: number,
  olat: number,
  olng: number,
  dlat: number,
  dlng: number,
  lang: "ko" | "en",
): TransportPath {
  const label =
    lang === "en"
      ? `BRI · ${nameEn} (−${impactPct.toFixed(1)}% ship time)`
      : `일대일로 · ${nameKo} (운송시간 −${impactPct.toFixed(1)}%)`;
  const peakAlt = impactPeakAlt(impactPct);
  const points = greatCircleArc(olat, olng, dlat, dlng, 28, peakAlt);
  return {
    id,
    kind: "bri-trade",
    name: label,
    scalerank: 1,
    lengthKm: null,
    accentColor: `${BRI_BASE_COLOR}, ${impactAlpha(impactPct).toFixed(3)})`,
    bbox: {
      minLat: Math.min(olat, dlat),
      minLng: Math.min(olng, dlng),
      maxLat: Math.max(olat, dlat),
      maxLng: Math.max(olng, dlng),
    },
    points,
  };
}

export function briTradePathsToTransport(lang: "ko" | "en" = "ko"): TransportPath[] {
  const country = (briData.countryLinks as BriCountryLink[]).map((row) =>
    linkToPath(
      row.id,
      row.nameKo,
      row.nameEn,
      row.impactPct,
      row.olat,
      row.olng,
      row.lat,
      row.lng,
      lang,
    ),
  );

  const city = (briData.cityLinks as BriCityLink[]).map((row) => {
    const nameKo = `${row.originCity}→${row.destCity}`;
    const nameEn = `${row.originCity}→${row.destCity}`;
    return linkToPath(
      row.id,
      nameKo,
      nameEn,
      row.impactPct,
      row.olat,
      row.olng,
      row.dlat,
      row.dlng,
      lang,
    );
  });

  return [...country, ...city];
}

export function briTradeStrokeWidth(path: TransportPath): number {
  const match = path.name?.match(/−([\d.]+)%/);
  const pct = match ? parseFloat(match[1]) : 4;
  return impactStroke(pct);
}
