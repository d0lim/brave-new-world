import type { FeatureCollection, LineString, Point, Polygon } from "geojson";

type Accessor<T, R> = (item: T) => R;

function asFn<T, R>(value: unknown, fallback: Accessor<T, R>): Accessor<T, R> {
  return typeof value === "function" ? (value as Accessor<T, R>) : fallback;
}

/**
 * 두 함수 다 2^zoom 항이라 상한이 없었음 — 화면을 세게 줌인하면(이동 중이 아니라
 * "실제로 도달한" 높은 zoom 값 자체로도) 값이 수백 px까지 커져서 점·선이 화면을
 * 뒤덮는 문제가 있었다. 의도된 "확대하면 좀 더 굵게" 느낌은 유지하되 화면을
 * 뒤덮는 사고는 나지 않도록 안전 상한을 둔다.
 */
const MAX_ANGULAR_POINT_RADIUS_PX = 48;
const MAX_ANGULAR_LINE_WIDTH_PX = 26;

/**
 * 해저 케이블·송유관·가스관 — 일반 path와 반대:
 * 줌아웃(멀리) → 굵게, 줌인(가까이) → ~0.1px로 가늘어짐.
 */
export function cableInverseLineWidth(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 2;
  // zoom 1.2 → 멀리(굵음), zoom 9 → 가까이(0.1)
  const t = Math.max(0, Math.min(1, (z - 1.2) / 7.8));
  const farPx = 2.6;
  const nearPx = 0.1;
  return farPx + (nearPx - farPx) * t;
}

function angularToPixelRadius(angular: number, zoom: number): number {
  return Math.min(MAX_ANGULAR_POINT_RADIUS_PX, Math.max(2, angular * Math.pow(2, zoom - 0.5) * 14));
}

function angularToLineWidth(angular: number, zoom: number): number {
  return Math.min(MAX_ANGULAR_LINE_WIDTH_PX, Math.max(0.35, angular * Math.pow(2, zoom - 2) * 5.5));
}

function resolvePathLineWidth(stroke: number, zoom: number, kind?: string): number {
  // 해저 케이블·송유관·가스관: 줌아웃 시 굵고 줌인 시 가늘어짐
  if (kind === "submarine-cable" || kind === "oil-pipeline" || kind === "gas-pipeline") {
    return cableInverseLineWidth(zoom);
  }
  return angularToLineWidth(stroke, zoom);
}

export function buildPointsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    color: Accessor<T, string>;
    radius: Accessor<T, number>;
    /** 정적 포인트 kind — GEM 시설은 symbol 아이콘용 */
    kind?: Accessor<T, string | undefined>;
    icon?: Accessor<T, string | undefined>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => {
      const kind = accessors.kind?.(item);
      const icon = accessors.icon?.(item);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [accessors.lng(item), accessors.lat(item)],
        },
        properties: {
          index,
          color: accessors.color(item),
          radius: angularToPixelRadius(accessors.radius(item), zoom),
          ...(kind ? { kind } : {}),
          ...(icon ? { icon } : {}),
        },
      };
    }),
  };
}

export function buildPathsGeoJson<T>(
  items: T[],
  accessors: {
    points: Accessor<T, { lat: number; lng: number; alt?: number }[]>;
    color: Accessor<T, string>;
    stroke: Accessor<T, number>;
    dashLength: Accessor<T, number>;
    dashGap: Accessor<T, number>;
    /** path.kind — 해저 케이블 역줌 굵기 등에 사용 */
    kind?: Accessor<T, string | undefined>;
  },
  zoom: number,
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      const pts = accessors.points(item);
      if (!pts || pts.length < 2) return [];
      const kind = accessors.kind?.(item);
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: pts.map((p) => [p.lng, p.lat]),
          },
          properties: {
            index,
            color: accessors.color(item),
            width: resolvePathLineWidth(accessors.stroke(item), zoom, kind),
            dashLength: accessors.dashLength(item),
            dashGap: accessors.dashGap(item),
          },
        },
      ];
    }),
  };
}

export function buildPolygonsGeoJson<T extends { geometry: unknown }>(
  items: T[],
  accessors: {
    geometry: Accessor<T, GeoJSON.Geometry>;
    fillColor: Accessor<T, string>;
    strokeColor: Accessor<T, string>;
    fillOpacity?: Accessor<T, number>;
  },
): FeatureCollection<Polygon | GeoJSON.MultiPolygon> {
  const fillOpacity = accessors.fillOpacity ?? (() => 0.72);
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      const geometry = accessors.geometry(item);
      if (!geometry) return [];
      const type = (geometry as { type?: string }).type;
      if (type !== "Polygon" && type !== "MultiPolygon") return [];
      return [
        {
          type: "Feature" as const,
          geometry: geometry as Polygon | GeoJSON.MultiPolygon,
          properties: {
            index,
            fill: accessors.fillColor(item),
            stroke: accessors.strokeColor(item),
            fillOpacity: fillOpacity(item),
          },
        },
      ];
    }),
  };
}

export function buildRingsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    color: Accessor<T, string>;
    maxRadius: Accessor<T, number>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        color: accessors.color(item),
        radius: angularToPixelRadius(accessors.maxRadius(item) * 0.35, zoom),
      },
    })),
  };
}

/** NASA FIRMS — 불꽃·연기 symbol 레이어용 GeoJSON */
export function buildFirmsFiresGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    /** combat | exercise | none */
    cause: Accessor<T, string>;
    frp: Accessor<T, number | null | undefined>;
    /** 각도 반경 (기존 pointRadius와 동일 스케일) */
    angularRadius: Accessor<T, number>;
    iconId: Accessor<T, string>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => {
      const corePx = angularToPixelRadius(accessors.angularRadius(item), zoom);
      const frp = accessors.frp(item) ?? 0;
      const intensity = frp >= 50 ? 1.2 : frp >= 20 ? 1.08 : 1;
      /** 네온 점 크기 — 작되 FRP에 따라만 살짝 커짐 */
      const iconSize = Math.min(0.72, Math.max(0.22, (corePx / 22) * intensity));
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [accessors.lng(item), accessors.lat(item)],
        },
        properties: {
          index,
          cause: accessors.cause(item),
          phase: index % 3,
          icon: accessors.iconId(item),
          iconSize,
          iconOpacity: Math.min(0.82, 0.58 + intensity * 0.1),
        },
      };
    }),
  };
}

export function buildLabelsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    text: Accessor<T, string>;
    size: Accessor<T, number>;
    color: Accessor<T, string>;
    dotRadius: Accessor<T, number>;
  },
  zoom: number,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        label: accessors.text(item),
        size: Math.max(9, accessors.size(item) * Math.pow(2, (zoom - 2) * 0.12)),
        color: accessors.color(item),
        dotRadius: Math.max(1.5, accessors.dotRadius(item) * Math.pow(2, (zoom - 2) * 0.1)),
      },
    })),
  };
}

export function buildHeatmapGeoJson(
  layers: { points: { lat: number; lng: number; weight: number }[]; tier: string }[],
): FeatureCollection<Point>[] {
  return layers.map((layer) => ({
    type: "FeatureCollection",
    features: layer.points.map((point, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
      properties: {
        index,
        weight: point.weight,
        tier: layer.tier,
      },
    })),
  }));
}

export { asFn };

export type GlobeLayerProps = Record<string, unknown>;

export function extractLayerAccessors<T>(props: GlobeLayerProps, prefix: string) {
  return {
    lat: asFn<T, number>(props[`${prefix}Lat`], () => 0),
    lng: asFn<T, number>(props[`${prefix}Lng`], () => 0),
    color: asFn<T, string>(props[`${prefix}Color`], () => "rgba(148,163,184,0.8)"),
    radius: asFn<T, number>(props[`${prefix}Radius`], () => 0.15),
    text: asFn<T, string>(props[`${prefix}Text`], () => ""),
    size: asFn<T, number>(props[`${prefix}Size`], () => 0.5),
    dotRadius: asFn<T, number>(props[`${prefix}DotRadius`], () => 0.08),
    points: asFn<T, { lat: number; lng: number; alt?: number }[]>(props[`${prefix}Points`], () => []),
    stroke: asFn<T, number>(props[`${prefix}Stroke`], () => 0.5),
    dashLength: asFn<T, number>(props[`${prefix}DashLength`], () => 0),
    dashGap: asFn<T, number>(props[`${prefix}DashGap`], () => 0),
    maxRadius: asFn<T, number>(props[`${prefix}MaxRadius`], () => 1),
    geometry: asFn<T, GeoJSON.Geometry>(props[`${prefix}GeoJsonGeometry`], () => ({
      type: "Polygon",
      coordinates: [],
    })),
    fillColor: asFn<T, string>(props[`${prefix}CapColor`], () => "rgba(0,0,0,0)"),
    strokeColor: asFn<T, string>(props[`${prefix}StrokeColor`], () => "rgba(0,0,0,0)"),
  };
}
