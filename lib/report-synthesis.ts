import { compareDays, indexKeys, observedValue, type IndexKey } from "./copernicus/interpretation.ts";
import { isUsableDay, type AreaStats, type Observation } from "./copernicus/observations.ts";
import type { SoilPreviewReading, SoilProperty } from "./soil-preview.ts";
import { precedingWeatherWindows, summarizePrecedingWeather } from "./weather/observation-context.ts";
import type { WeatherHistory } from "./weather/history-service.ts";
import { modelDetails, weatherSource } from "./weather/open-meteo.ts";

type Coordinates = readonly [latitude: number, longitude: number];
type Scope = {
  coordinates: Coordinates;
  radiusMeters: 500 | 1000;
  /** UTC interval: from inclusive, to exclusive. */
  period: AreaStats["window"];
};
export type SynthesisInput = {
  report: Scope;
  selectedDay: string | null;
  referenceDay?: string;
  satellite?: Pick<Scope, "coordinates" | "radiusMeters"> & { stats: AreaStats };
  weather?: { primary?: WeatherHistory | null; supplemental?: WeatherHistory | null };
  soil?: { coordinates: Coordinates; reading: SoilPreviewReading };
};

const samePoint = ([lat, lon]: Coordinates, [otherLat, otherLon]: Coordinates) => lat === otherLat && lon === otherLon;
const time = (date: string) => Date.parse(date);
const utcDay = (stamp: number) => new Date(stamp).toISOString().slice(0, 10);

function indexValues(read: (key: IndexKey) => number | null): Record<IndexKey, number | null> {
  return { ndvi: read("ndvi"), ndwi: read("ndwi"), ndmi: read("ndmi") };
}

function observationEvidence(day: Observation) {
  return {
    day: utcDay(time(day.from)), interval: { from: day.from, to: day.to },
    usable: isUsableDay(day), indices: indexValues(key => observedValue(day, key)),
    coverage: { clearFraction: day.clearCoverage, cloudFraction: day.cloudFraction, clearPixels: day.clearPixels },
  };
}

function satelliteEvidence({ report, selectedDay, referenceDay, satellite }: SynthesisInput) {
  const start = time(report.period.from), end = time(report.period.to);
  const stats = satellite && samePoint(report.coordinates, satellite.coordinates) && report.radiusMeters === satellite.radiusMeters
    && start < end && start === time(satellite.stats.window.from) && end === time(satellite.stats.window.to)
    ? satellite.stats : null;
  const days = (stats?.days ?? []).filter(day => time(day.from) >= start && time(day.from) < end);
  const history = days.map(observationEvidence);
  const findUsable = (date: string | undefined | null) => {
    const i = history.findIndex(point => point.day === date && point.usable);
    return i === -1 ? null : { raw: days[i], evidence: history[i] };
  };
  const selected = findUsable(selectedDay);
  const reference = selectedDay !== referenceDay ? findUsable(referenceDay) : null;
  const differences = selected && reference ? indexValues(key => compareDays(reference.raw, selected.raw, key)) : null;
  const status = !stats ? "unavailable" : !selected ? "no-usable-selection"
    : indexKeys.every(key => selected.evidence.indices[key] !== null) ? "available" : "partial";
  return {
    source: "Copernicus Sentinel-2", kind: "satellite-observation", indexUnit: "dimensionless", timezone: "UTC",
    status, requestedDay: selectedDay, resolutionMeters: stats?.resolutionMeters ?? null,
    selected: selected?.evidence ?? null, history,
    comparison: reference && differences ? { reference: reference.evidence, differences } : null,
  } as const;
}

function weatherEvidence({ report, weather }: SynthesisInput, day: string | null) {
  const base = { source: weatherSource, timezone: "UTC", observationDay: day } as const;
  const windows = day && precedingWeatherWindows(day);
  if (!windows) return { ...base, status: "no-anchor", metrics: null } as const;
  const atPoint = (history?: WeatherHistory | null) => history?.timezone === "UTC"
    && samePoint(report.coordinates, [history.point.latitude, history.point.longitude]) ? history : null;
  const primary = atPoint(weather?.primary), supplemental = atPoint(weather?.supplemental);
  const summary = summarizePrecedingWeather(windows, primary?.days, supplemental?.days, primary?.failedSeries);
  const rain = modelDetails("precipitation"), air = modelDetails("temperature");
  const entries = Object.values(summary);
  const status = entries.every(metric => metric.available === 0) ? "no-data"
    : entries.some(metric => metric.missing > 0) ? "partial" : "available";
  return {
    ...base, status, metrics: {
      rainSeven: { ...summary.rainSeven, ...rain, aggregation: "sum-of-available-daily-totals" },
      rainThirty: { ...summary.rainThirty, ...rain, aggregation: "sum-of-available-daily-totals" },
      temperatureSeven: { ...summary.temperatureSeven, ...air, aggregation: "mean-of-available-daily-means" },
    },
  } as const;
}

const soilUnits = {
  phh2o: "pH", sand: "% mass", silt: "% mass", clay: "% mass", soc: "g/kg", bdod: "kg/dm3",
} as const satisfies Record<SoilProperty, string>;

function soilEvidence({ report, soil }: SynthesisInput) {
  const base = { source: "ISRIC SoilGrids", kind: "modelled-point-cell", units: soilUnits, license: "CC BY 4.0" } as const;
  const reading = soil && samePoint(report.coordinates, soil.coordinates) ? soil.reading : null;
  if (reading && "medians" in reading) {
    return {
      ...base, status: reading.status, cell: {
        depthCm: reading.depthCm, resolutionMeters: reading.resolutionMeters, medians: reading.medians,
        phPredictionInterval: reading.phPredictionInterval && {
          bounds: reading.phPredictionInterval, coverage: 0.90, quantiles: [0.05, 0.95], unit: "pH",
        },
      },
    } as const;
  }
  return { ...base, status: reading?.status ?? "not-provided", cell: null } as const;
}

export function collectSynthesisEvidence(input: SynthesisInput) {
  const sentinel = satelliteEvidence(input);
  return { report: input.report, sentinel, weather: weatherEvidence(input, sentinel.selected?.day ?? null), soil: soilEvidence(input) };
}

export type SynthesisEvidence = ReturnType<typeof collectSynthesisEvidence>;
