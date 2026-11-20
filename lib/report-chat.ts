import { isUsableDay, type AreaStats, type Observation } from "./copernicus/observations.ts";
import type { ChatReference } from "./parcel-chat-contract.ts";
import { synthesizeReport } from "./report-synthesis-rules.ts";
import type { SoilPreviewReading } from "./soil-preview.ts";
import type { WeatherHistory } from "./weather/history-service.ts";

export type ReportChatReference = Extract<ChatReference, { mode: "observation" }>["observation"];
export type ReportChatSnapshot = {
  reference: ReportChatReference;
  satellite?: AreaStats;
  soil?: SoilPreviewReading;
  weather: { day: string; primary?: WeatherHistory; supplemental?: WeatherHistory } | null;
};

function scope(reference: ReportChatReference) {
  const { geometry: { coordinates, radiusMeters }, period, day } = reference;
  return [coordinates, radiusMeters, period.from, period.to, day] as const;
}

// The same exact identifiers drive both visible reply state and the report snapshot.
export function reportChatKey(reference: ReportChatReference, weatherKey: string | null, weatherAttempt: number, pending: boolean) {
  return JSON.stringify([...scope(reference), weatherKey, weatherAttempt, pending]);
}

function previousComparable(day: Observation, days: Observation[]) {
  const previous = days.filter(other => Date.parse(other.from) < Date.parse(day.from) && isUsableDay(other))
    .sort((a, b) => Date.parse(b.from) - Date.parse(a.from));
  return previous.find(other => day.ndvi !== null && other.ndvi !== null)
    ?? previous.find(other => (day.ndwi !== null && other.ndwi !== null) || (day.ndmi !== null && other.ndmi !== null));
}

export function synthesizeCurrentReport(reference: ReportChatReference, snapshot: ReportChatSnapshot, locale: "pl" | "en") {
  const { coordinates, radiusMeters } = reference.geometry;
  const { satellite, soil, weather } = JSON.stringify(scope(reference)) === JSON.stringify(scope(snapshot.reference))
    ? snapshot : { weather: null };
  const current = satellite?.days.find(day => day.from.slice(0, 10) === reference.day && isUsableDay(day));
  const previous = current && satellite ? previousComparable(current, satellite.days) : undefined;
  const synthesis = synthesizeReport({
    report: { coordinates, radiusMeters, period: reference.period },
    selectedDay: reference.day,
    referenceDay: previous?.from.slice(0, 10),
    satellite: satellite && { coordinates, radiusMeters, stats: satellite },
    weather: weather?.day === reference.day ? weather : undefined,
    soil: soil && { coordinates, reading: soil },
  }, locale);
  const latest = !reference.day && synthesis.evidence.sentinel.status === "no-usable-selection" ? satellite?.latestObserved : null;
  return {
    ...synthesis,
    current: synthesis.evidence.sentinel.selected ? current : undefined,
    latestCandidate: latest && !isUsableDay(latest) ? latest : null,
  };
}
