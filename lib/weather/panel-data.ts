import { DAY, inclusiveEnd, isValidHistoryWindow, type ObservationWindow } from "../copernicus/request.ts";
import type { WeatherDay } from "./history-service.ts";

export const lowRainThreshold = 1;

export function weatherRequestKey(coordinates: readonly [number, number], period: ObservationWindow) {
  const [lat, lng] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 84 || Math.abs(lng) > 180
    || !isValidHistoryWindow(period)) return null;
  const coordinate = (value: number) => {
    const plain = String(value);
    return /^-?\d+(?:\.\d{1,15})?$/.test(plain) ? plain : value.toFixed(15).replace(/\.?0+$/, "");
  };
  return "/api/weather/history?" + new URLSearchParams({
    lat: coordinate(lat), lng: coordinate(lng),
    from: new Date(period.from).toISOString().slice(0, 10), to: inclusiveEnd(period),
  }).toString();
}

export function summarizeWeather(days: readonly WeatherDay[]) {
  let precipitation = 0, rainDays = 0, temperature = 0, meanDays = 0;
  let min = Infinity, max = -Infinity, minDays = 0, maxDays = 0;
  let run = 0, longest = 0, previous = NaN;
  for (const day of days) {
    const time = Date.parse(day.date);
    if (time - previous !== DAY) run = 0;
    previous = time;
    const { precipitationMm, temperatureMeanC, temperatureMinC, temperatureMaxC } = day;
    if (precipitationMm !== null) {
      precipitation += precipitationMm;
      rainDays++;
    }
    run = precipitationMm !== null && precipitationMm < lowRainThreshold ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (temperatureMeanC !== null) { temperature += temperatureMeanC; meanDays++; }
    if (temperatureMinC !== null) { min = Math.min(min, temperatureMinC); minDays++; }
    if (temperatureMaxC !== null) { max = Math.max(max, temperatureMaxC); maxDays++; }
  }
  return {
    precipitation: rainDays ? precipitation : null,
    mean: meanDays ? temperature / meanDays : null,
    min: minDays ? min : null,
    max: maxDays ? max : null,
    longest: rainDays ? longest : null,
    rainDays, meanDays, minDays, maxDays,
  };
}

export const temperatureKeys = ["temperatureMinC", "temperatureMaxC", "temperatureMeanC"] as const;
export type TemperatureKey = (typeof temperatureKeys)[number];
type ChartKey = TemperatureKey | "precipitationMm";

export function chartRuns(days: readonly WeatherDay[], key: TemperatureKey) {
  const runs: { index: number; value: number }[][] = [];
  let previousDay = NaN, run: (typeof runs)[number] | undefined;
  for (const [index, day] of days.entries()) {
    const time = Date.parse(day.date);
    if (time - previousDay !== DAY) run = undefined;
    previousDay = time;
    const value = day[key];
    if (value === null) { run = undefined; continue; }
    if (!run) { run = []; runs.push(run); }
    run.push({ index, value });
  }
  return runs;
}

export function chartScale(days: readonly WeatherDay[], keys: readonly ChartKey[], fromZero = false) {
  const values = days.flatMap((day) => keys.map((key) => day[key])).filter((v): v is number => v !== null);
  if (!values.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const low = fromZero ? 0 : max - min < 1 ? min - 1 : min;
  const high = fromZero ? Math.max(1, max) : max - min < 1 ? max + 1 : max;
  const rawStep = (high - low) / 4;
  const base = 10 ** Math.floor(Math.log10(rawStep));
  const step = base * ([1, 2, 2.5, 5, 10].find((n) => n >= rawStep / base) ?? 10);
  const bottom = Math.floor(low / step) * step;
  const top = Math.ceil(high / step) * step;
  return { bottom, top, ticks: Array.from({ length: Math.round((top - bottom) / step) + 1 }, (_, i) => top - i * step) };
}
