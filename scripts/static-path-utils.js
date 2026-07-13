// 정적 path/점 빌드 공통 유틸
const { IS_LITE } = require("./build-profile");

function simplifyLine(coords, maxPoints, roundCoord, precision = 2) {
  if (!Array.isArray(coords) || coords.length <= maxPoints) {
    return coords.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
  }
  const step = Math.ceil(coords.length / maxPoints);
  const sampled = coords.filter((_, index) => index % step === 0);
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
}

/**
 * 얇은 버퍼 폴리곤(해저케이블 코리도) → 중심선 근사.
 * 장축 끝점을 잡아 링의 양 변을 평균한다.
 */
function polygonRingToCenterline(ring, maxWorkingPoints = 800) {
  if (!Array.isArray(ring) || ring.length < 4) return [];
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  let pts = closed ? ring.slice(0, -1) : ring.slice();
  if (pts.length < 3) return [];

  if (pts.length > maxWorkingPoints) {
    const step = Math.ceil(pts.length / maxWorkingPoints);
    const sampled = pts.filter((_, index) => index % step === 0);
    if (sampled[sampled.length - 1] !== pts[pts.length - 1]) sampled.push(pts[pts.length - 1]);
    pts = sampled;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const horizontal = maxX - minX >= maxY - minY;
  let a = 0;
  let b = 0;
  for (let i = 1; i < pts.length; i++) {
    if (horizontal) {
      if (pts[i][0] < pts[a][0]) a = i;
      if (pts[i][0] > pts[b][0]) b = i;
    } else {
      if (pts[i][1] < pts[a][1]) a = i;
      if (pts[i][1] > pts[b][1]) b = i;
    }
  }
  if (a === b) return pts;

  const walk = (from, to, dir) => {
    const out = [];
    let i = from;
    for (let guard = 0; guard <= pts.length; guard++) {
      out.push(pts[i]);
      if (i === to) break;
      i = (i + dir + pts.length) % pts.length;
    }
    return out;
  };

  const path1 = walk(a, b, 1);
  const path2 = walk(a, b, -1);
  if (path1.length < 2 || path2.length < 2) return pts;

  const n = Math.max(path1.length, path2.length);
  const sample = (path, t) => {
    const idx = t * (path.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(path.length - 1, i0 + 1);
    const f = idx - i0;
    return [path[i0][0] * (1 - f) + path[i1][0] * f, path[i0][1] * (1 - f) + path[i1][1] * f];
  };

  const center = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const p1 = sample(path1, t);
    const p2 = sample(path2, t);
    center.push([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]);
  }
  return center;
}

function lineGeometryToPoints(geometry, maxPoints, roundCoord, precision = 2) {
  if (!geometry) return [];
  const toPoints = (line) =>
    line.map(([lng, lat]) => ({ lat: roundCoord(lat, precision), lng: roundCoord(lng, precision) }));

  if (geometry.type === "LineString") {
    return [toPoints(simplifyLine(geometry.coordinates, maxPoints, roundCoord, precision))];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) =>
      toPoints(simplifyLine(line, maxPoints, roundCoord, precision)),
    );
  }
  if (geometry.type === "Polygon") {
    const center = polygonRingToCenterline(geometry.coordinates?.[0] || []);
    if (center.length < 2) return [];
    return [toPoints(simplifyLine(center, maxPoints, roundCoord, precision))];
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || [])
      .map((poly) => {
        const center = polygonRingToCenterline(poly?.[0] || []);
        if (center.length < 2) return null;
        return toPoints(simplifyLine(center, maxPoints, roundCoord, precision));
      })
      .filter(Boolean);
  }
  if (geometry.type === "GeometryCollection") {
    const segments = [];
    for (const part of geometry.geometries || []) {
      segments.push(...lineGeometryToPoints(part, maxPoints, roundCoord, precision));
    }
    return segments;
  }
  return [];
}

function pointsBbox(points, roundCoord) {
  const bbox = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  for (const point of points) {
    bbox.minLat = Math.min(bbox.minLat, point.lat);
    bbox.minLng = Math.min(bbox.minLng, point.lng);
    bbox.maxLat = Math.max(bbox.maxLat, point.lat);
    bbox.maxLng = Math.max(bbox.maxLng, point.lng);
  }
  return {
    minLat: roundCoord(bbox.minLat),
    minLng: roundCoord(bbox.minLng),
    maxLat: roundCoord(bbox.maxLat),
    maxLng: roundCoord(bbox.maxLng),
  };
}

function capArray(items, liteMax, fullMax) {
  const limit = IS_LITE ? liteMax : fullMax;
  return items.length <= limit ? items : items.slice(0, limit);
}

module.exports = {
  simplifyLine,
  polygonRingToCenterline,
  lineGeometryToPoints,
  pointsBbox,
  capArray,
};
