import { isUsableDay, type Observation } from "./observations.ts";
import { palettes } from "./palettes.ts";

export const indexKeys = ["ndvi", "ndwi", "ndmi"] as const;
export type IndexKey = typeof indexKeys[number];
export type HistoryIndex = Exclude<IndexKey, "ndwi">;

export const indices = {
  ndvi: {
    label: "NDVI", layer: "NDVI", title: "Vegetation greenness",
    formula: "(B08 - B04) / (B08 + B04)",
    bands: ["Negative contrast", "Weak positive contrast", "Intermediate greenness", "Stronger greenness", "Strong positive contrast"],
    limitation: "Greenness can come from crops, woodland or other plants. NDVI alone cannot identify land use, plant health, yield or crop suitability.",
  },
  ndwi: {
    label: "NDWI", layer: "NDWI", title: "Surface-water contrast",
    formula: "(B03 - B08) / (B03 + B08)",
    bands: ["NIR stronger", "Weak negative contrast", "Weak positive contrast", "Green stronger"],
    limitation: "Positive values can highlight open water, but roofs and other surfaces can also respond. This index cannot measure water depth or groundwater.",
  },
  ndmi: {
    label: "NDMI", layer: "MOISTURE_INDEX", title: "Canopy moisture signal",
    formula: "(B8A - B11) / (B8A + B11)",
    bands: ["SWIR stronger", "Weak negative contrast", "Weak positive contrast", "Positive contrast", "NIR stronger"],
    limitation: "Where vegetation dominates, changes can be consistent with differences in canopy water content. Soil background and vegetation cover affect the signal. It does not measure soil moisture.",
  },
} as const satisfies Record<IndexKey, { layer: keyof typeof palettes } & Record<string, unknown>>;

export function interpretIndex(key: IndexKey, value: number | null) {
  if (value === null) return null;
  const definition = indices[key];
  const bins = palettes[definition.layer];
  const index = bins.findIndex(({ below }, i) => value < below || i === bins.length - 1);
  return definition.bands[index];
}

export function observedValue(day: Observation, key: IndexKey) {
  return isUsableDay(day) ? day[key] : null;
}

export function signedDifference(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return (rounded > 0 ? "+" : "") + rounded.toFixed(2);
}

export function compareDays(first: Observation | null, second: Observation | null, key: IndexKey) {
  const a = first && observedValue(first, key);
  const b = second && observedValue(second, key);
  return a === null || b === null ? null : b - a;
}

export function latestSharedDay(first: Observation[], second: Observation[]) {
  const other = new Map(second.filter(isUsableDay).map((day) => [day.from.slice(0, 10), day]));
  for (const left of first.filter(isUsableDay).sort((a, b) => Date.parse(b.from) - Date.parse(a.from))) {
    const right = other.get(left.from.slice(0, 10));
    if (right && indexKeys.some((key) => left[key] !== null && right[key] !== null)) {
      return { left, right };
    }
  }
  return null;
}

export function describeHistory(days: Observation[], key: HistoryIndex) {
  const samples = days.flatMap((day) => {
    const value = observedValue(day, key);
    return value === null ? [] : [{ date: day.from.slice(0, 10), value }];
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (samples.length < 6) return null;
  const median = (group: typeof samples) => group.map(({ value }) => value).sort((a, b) => a - b)[1];
  return {
    early: median(samples.slice(0, 3)),
    late: median(samples.slice(-3)),
    first: samples[0].date,
    last: samples[samples.length - 1].date,
  };
}
