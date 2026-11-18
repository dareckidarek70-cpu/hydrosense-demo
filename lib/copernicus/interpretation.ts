import { isUsableDay, type Observation } from "./observations.ts";
import { palettes } from "./palettes.ts";
import type { Locale } from "../i18n/index.ts";

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

const polishIndices = {
  ndvi: {
    title: "Zieleń roślinności",
    bands: ["Kontrast ujemny", "Słaby kontrast dodatni", "Umiarkowana zieleń", "Wyraźna zieleń", "Silny kontrast dodatni"],
    limitation: "Sygnał może pochodzić z upraw, lasu lub innych roślin. Sam NDVI nie określa użytkowania terenu, zdrowia roślin, plonów ani przydatności do upraw.",
  },
  ndwi: {
    title: "Kontrast wód powierzchniowych",
    bands: ["Silniejszy sygnał NIR", "Słaby kontrast ujemny", "Słaby kontrast dodatni", "Silniejszy sygnał zielony"],
    limitation: "Dodatnie wartości mogą wskazywać otwartą wodę, ale podobny sygnał mogą dawać dachy i inne powierzchnie. NDWI nie mierzy głębokości wody ani poziomu wód gruntowych.",
  },
  ndmi: {
    title: "Sygnał uwodnienia roślin",
    bands: ["Silniejszy sygnał SWIR", "Słaby kontrast ujemny", "Słaby kontrast dodatni", "Kontrast dodatni", "Silniejszy sygnał NIR"],
    limitation: "Na obszarach z roślinnością zmiany mogą wiązać się z zawartością wody w roślinach. Wpływa na nie także gleba i pokrycie roślinne. NDMI nie mierzy wilgotności gleby.",
  },
} as const;

export function localIndex(key: IndexKey, locale: Locale) {
  return locale === "pl" ? polishIndices[key] : indices[key];
}

export function interpretIndex(key: IndexKey, value: number | null, locale: Locale = "en") {
  if (value === null) return null;
  const definition = indices[key];
  const bins = palettes[definition.layer];
  const index = bins.findIndex(({ below }, i) => value < below || i === bins.length - 1);
  return localIndex(key, locale).bands[index];
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
