import { queryOptions } from "@tanstack/react-query";

/**
 * Free, open circuit-outline geometry from the community `f1-circuits` dataset
 * (LineString coordinates per track). We match a Jolpica race to a circuit by
 * nearest geographic distance to the race's lat/long, which is far more robust
 * than trying to reconcile two different id schemes.
 */
const GEOJSON_URL =
  "https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson";

export interface CircuitFeature {
  type: "Feature";
  properties: {
    id: string;
    Location: string;
    Name: string;
    length?: number;
    opened?: number;
    firstgp?: number;
  };
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

interface CircuitCollection {
  type: "FeatureCollection";
  features: CircuitFeature[];
}

async function fetchCircuits(): Promise<CircuitFeature[]> {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`Failed to load circuit geometry (${res.status})`);
  const json = (await res.json()) as CircuitCollection;
  return json.features.filter((f) => f.geometry?.type === "LineString");
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const circuitsQuery = () =>
  queryOptions({
    queryKey: ["f1-circuits"],
    queryFn: fetchCircuits,
    staleTime: WEEK,
    gcTime: WEEK,
    retry: false,
  });

function centroid(coords: [number, number][]): [number, number] {
  let lng = 0;
  let lat = 0;
  for (const [x, y] of coords) {
    lng += x;
    lat += y;
  }
  return [lng / coords.length, lat / coords.length];
}

/** Haversine distance in km between two [lng, lat] points. */
function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Pick the closest circuit outline to a race location; null if none within 50km. */
export function matchCircuit(
  features: CircuitFeature[],
  lat: number | undefined,
  long: number | undefined,
): CircuitFeature | null {
  if (lat == null || long == null || Number.isNaN(lat) || Number.isNaN(long))
    return null;
  const target: [number, number] = [long, lat];
  let best: CircuitFeature | null = null;
  let bestDist = Infinity;
  for (const f of features) {
    const d = distanceKm(target, centroid(f.geometry.coordinates));
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return bestDist <= 50 ? best : null;
}

export interface TrackPath {
  d: string;
  width: number;
  height: number;
  /** Projected SVG points, in drawing order. */
  points: { x: number; y: number }[];
  /** Cumulative real (haversine) distance up to each point. */
  cumLen: number[];
  totalLen: number;
}

/**
 * Project lon/lat coordinates into a normalized SVG path. Latitude is flipped
 * (screen y grows downward) and longitude is scaled by cos(lat) so the track
 * keeps its real aspect ratio rather than looking stretched.
 *
 * Also returns per-point projected coordinates and cumulative real distances so
 * a position along the lap can be located on the drawing by fraction of length.
 */
export function buildTrackPath(
  feature: CircuitFeature,
  size = 1000,
  padding = 40,
): TrackPath {
  const coords = feature.geometry.coordinates;
  const latRad = (centroid(coords)[1] * Math.PI) / 180;
  const cos = Math.cos(latRad) || 1;

  const pts = coords.map(([lng, lat]) => [lng * cos, lat] as [number, number]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = (size - padding * 2) / Math.max(spanX, spanY);

  const width = spanX * scale + padding * 2;
  const height = spanY * scale + padding * 2;

  const points = pts.map(([x, y]) => ({
    x: padding + (x - minX) * scale,
    // Flip Y so north is up.
    y: padding + (maxY - y) * scale,
  }));

  const d = points
    .map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  // Cumulative real distance along the original lon/lat polyline.
  const cumLen: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumLen[i] = cumLen[i - 1] + distanceKm(coords[i - 1], coords[i]);
  }
  const totalLen = cumLen[cumLen.length - 1] || 1;

  return { d, width, height, points, cumLen, totalLen };
}

/**
 * Locate the projected SVG point at a fraction (0–1) of the track's total
 * length, so a telemetry distance can be shown as a position on the outline.
 */
export function pointAtFraction(
  path: TrackPath,
  fraction: number,
): { x: number; y: number } | null {
  const { points, cumLen, totalLen } = path;
  if (points.length === 0 || totalLen <= 0) return null;
  const target = Math.min(1, Math.max(0, fraction)) * totalLen;
  let i = 0;
  while (i < cumLen.length - 1 && cumLen[i + 1] < target) i++;
  const a = points[i];
  const b = points[i + 1] ?? a;
  const segLen = cumLen[i + 1] != null ? cumLen[i + 1] - cumLen[i] : 0;
  const t = segLen > 0 ? (target - cumLen[i]) / segLen : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
