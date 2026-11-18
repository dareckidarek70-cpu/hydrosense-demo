import { getCopernicusAccessToken } from "./auth";
import { summarizeObservations, type AreaStats } from "./observations";
import { radiusAreaHectares, type AreaGeometry } from "./request";
import { STATS_EVALSCRIPT } from "./stats-evalscripts";

const CRS = "http://www.opengis.net/def/crs/EPSG/0/4326";
const METERS_PER_DEGREE = Math.PI * 6_371_008.8 / 180;
const RESOLUTION_METERS = 20;

export function getAnalysisArea(geometry: AreaGeometry) {
  let ring: [number, number][];
  let areaHectares: number;
  if (geometry.type === "PointBuffer") {
    const [lat, lng] = geometry.coordinates;
    const degrees = geometry.radiusMeters / METERS_PER_DEGREE;
    const longitudeScale = Math.cos(lat * Math.PI / 180);
    ring = Array.from({ length: 64 }, (_, i) => {
      const angle = i * 2 * Math.PI / 64;
      return [lng + degrees * Math.cos(angle) / longitudeScale, lat + degrees * Math.sin(angle)];
    });
    areaHectares = radiusAreaHectares(geometry.radiusMeters);
  } else {
    ring = [...geometry.coordinates];
    const [lng, lat] = ring[0];
    const twiceArea = ring.reduce((sum, [x, y], i) => {
      const [nextX, nextY] = ring[(i + 1) % ring.length];
      return sum + (x - lng) * (nextY - lat) - (nextX - lng) * (y - lat);
    }, 0);
    areaHectares = Math.abs(twiceArea / 2) * METERS_PER_DEGREE ** 2
      * Math.cos(lat * Math.PI / 180) / 10_000;
  }

  const lngs = ring.map(([lng]) => lng);
  const lats = ring.map(([, lat]) => lat);
  const bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  const [west, south, east, north] = bbox;
  const lngMeters = METERS_PER_DEGREE * Math.cos((south + north) * Math.PI / 360);
  if (west < -180 || east > 180 || south < -85 || north > 85
    || (east - west) * lngMeters > 5000 || (north - south) * METERS_PER_DEGREE > 5000
    || areaHectares < 1 || areaHectares > 1000) return null;

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return {
    bounds: { bbox, properties: { crs: CRS }, geometry: { type: "Polygon", coordinates: [ring] } },
    areaHectares,
    resx: RESOLUTION_METERS / lngMeters,
    resy: RESOLUTION_METERS / METERS_PER_DEGREE,
  };
}

export async function fetchAreaStats(area: NonNullable<ReturnType<typeof getAnalysisArea>>, window: {
  from: string;
  to: string;
}): Promise<AreaStats> {
  const token = await getCopernicusAccessToken();
  const response = await fetch("https://sh.dataspace.copernicus.eu/statistics/v1", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
    body: JSON.stringify({
      input: {
        bounds: area.bounds,
        data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "mostRecent" } }],
      },
      aggregation: {
        timeRange: window,
        aggregationInterval: { of: "P1D", lastIntervalBehavior: "SHORTEN" },
        resx: area.resx,
        resy: area.resy,
        evalscript: STATS_EVALSCRIPT,
      },
    }),
  });

  if (!response.ok) throw new Error(`Copernicus Statistical API HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.data)) throw new Error("Invalid Statistical API response");
  return {
    ...summarizeObservations(body.data, area.areaHectares * 10_000 / RESOLUTION_METERS ** 2),
    window,
    areaHectares: area.areaHectares,
    resolutionMeters: RESOLUTION_METERS,
  };
}
