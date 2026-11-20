import type { LayerType } from "./evalscripts.ts";
import type { Observation } from "./observations.ts";
import { isUsableDay } from "./observations.ts";

export const reportMapWidth = 480;
export const reportMapHeight = 216;
export const reportBufferPixels = 75;
export const reportMapLayers = ["TRUE_COLOR", "NDVI", "NDWI", "MOISTURE_INDEX"] as const satisfies readonly LayerType[];
export const reportRasterDebounceMs = 160;

type ReportPoint = { coordinates: readonly [number, number]; radiusMeters: 500 | 1000 };

export function reportMapUrl(area: ReportPoint, day: Observation | null, layer: LayerType = "TRUE_COLOR", format: "webp" | "png" = "webp") {
  if (!day || !isUsableDay(day)) return null;
  const [lat, lng] = area.coordinates;
  const metresPerDegree = Math.PI * 6_371_008.8 / 180;
  const step = area.radiusMeters / reportBufferPixels;
  const latitudeSpan = (reportMapHeight / 2) * step / metresPerDegree;
  const longitudeSpan = (reportMapWidth / 2) * step / metresPerDegree / Math.cos(lat * Math.PI / 180);
  if (Math.abs(lat) + latitudeSpan > 84 || Math.abs(lng) + longitudeSpan > 180) return null;
  const query = new URLSearchParams({
    minLng: (lng - longitudeSpan).toFixed(7), minLat: (lat - latitudeSpan).toFixed(7),
    maxLng: (lng + longitudeSpan).toFixed(7), maxLat: (lat + latitudeSpan).toFixed(7),
    width: "720", height: "324", layer, from: day.from, to: day.to,
  });
  if (format === "webp") query.set("format", format);
  return `/api/copernicus/layer?${query}`;
}

export function reportComparisonDay(observations: readonly Observation[], current: Observation | null, referenceDate: string) {
  if (!current || !isUsableDay(current) || !referenceDate || current.from.slice(0, 10) === referenceDate) return null;
  return observations.find(day => day.from.slice(0, 10) === referenceDate && isUsableDay(day)) ?? null;
}
