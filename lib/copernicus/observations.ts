type Band = { mean?: number; sampleCount?: number; noDataCount?: number };
type Entry = {
  interval?: { from?: string; to?: string };
  outputs?: Record<string, { bands?: Record<string, { stats?: Band }> }>;
};

export const MIN_CLEAR_COVERAGE = 0.5;
export const MIN_INDEX_PIXELS = 20;

function readBand(entry: Entry, output: string, band = "B0") {
  const stats = entry.outputs?.[output]?.bands?.[band]?.stats;
  const valid = Math.max(0, (stats?.sampleCount ?? 0) - (stats?.noDataCount ?? 0));
  const mean = stats?.mean;
  return { value: valid > 0 && typeof mean === "number" && Number.isFinite(mean) ? mean : null, valid };
}

export function summarizeObservations(entries: Entry[], expectedPixels: number) {
  const days = entries.flatMap((entry) => {
    const from = entry.interval?.from;
    const to = entry.interval?.to;
    if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) return [];
    const cloud = readBand(entry, "quality", "cloud");
    if (cloud.value === null) return [];

    const water = readBand(entry, "surface", "water");
    const indicator = (key: string) => {
      const { value, valid } = readBand(entry, key);
      return valid >= MIN_INDEX_PIXELS && value !== null && Math.abs(value) <= 1 ? value : null;
    };
    return [{
      from,
      to,
      cloudFraction: cloud.value,
      clearCoverage: Math.min(1, water.valid / expectedPixels),
      waterFraction: water.valid >= MIN_INDEX_PIXELS ? water.value : null,
      vegetationFraction: water.valid >= MIN_INDEX_PIXELS ? readBand(entry, "surface", "vegetation").value : null,
      clearPixels: water.valid,
      ndvi: indicator("ndvi"),
      ndwi: indicator("ndwi"),
      ndmi: indicator("ndmi"),
    }];
  }).sort((a, b) => Date.parse(b.from) - Date.parse(a.from));

  const uniqueDays = [...new Map(days.map((day) => [day.from.slice(0, 10), day])).values()];
  const observation = uniqueDays.find(isUsableDay) ?? null;
  return { observation, latestObserved: uniqueDays[0] ?? null, observedDays: uniqueDays.length, days: uniqueDays };
}

export type Observation = {
  from: string; to: string; cloudFraction: number; clearCoverage: number;
  waterFraction: number | null; vegetationFraction: number | null; clearPixels: number;
  ndvi: number | null; ndwi: number | null; ndmi: number | null;
};

export function isUsableDay(day: Observation) {
  return day.clearCoverage >= MIN_CLEAR_COVERAGE && day.clearPixels >= MIN_INDEX_PIXELS
    && (day.ndvi !== null || day.ndwi !== null || day.ndmi !== null);
}
export type AreaStats = ReturnType<typeof summarizeObservations> & {
  window: { from: string; to: string };
  areaHectares: number;
  resolutionMeters: number;
};
