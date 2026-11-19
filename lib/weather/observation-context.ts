import { DAY } from "../copernicus/request.ts";
import { dayString, firstReportDay, rangeLength, type DateRange } from "./history-request.ts";
import type { WeatherDay } from "./history-service.ts";

const shiftDay = (day: string, offset: number) => dayString(Date.parse(day) + DAY * offset);

export function precedingWeatherWindows(observationDay: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observationDay)) return null;
  const stamp = Date.parse(observationDay);
  if (!Number.isFinite(stamp) || dayString(stamp) !== observationDay) return null;
  const to = shiftDay(observationDay, -1);
  return {
    seven: { from: shiftDay(observationDay, -7), to },
    thirty: { from: shiftDay(observationDay, -30), to },
  };
}

export function planPrecedingWeather(target: DateRange, panel: DateRange | null, reportStart: string): DateRange | null {
  const from = target.from < firstReportDay ? firstReportDay : target.from;
  const to = target.to;
  if (to < from) return null;
  if (!panel) return { from, to };
  if (panel.from <= from && panel.to >= to) return null;
  if (from > panel.to || to < shiftDay(panel.from, -1)) return { from, to };

  if (from < panel.from && to <= panel.to) {
    // A fixed prefix covers every selectable observation when the panel follows the report.
    const prefix = shiftDay(panel.from, -30);
    const start = panel.from === reportStart && prefix < from ? prefix : from;
    return { from: start < firstReportDay ? firstReportDay : start, to: shiftDay(panel.from, -1) };
  }
  if (from >= panel.from) return { from: shiftDay(panel.to, 1), to };
  // One lookup for two uncovered edges is cheaper than two separate model pairs.
  return { from, to };
}

export const asWeatherWindow = ({ from, to }: DateRange) => ({
  from: new Date(from).toISOString(), to: new Date(Date.parse(to) + DAY).toISOString(),
});

export function summarizePrecedingWeather(
  windows: NonNullable<ReturnType<typeof precedingWeatherWindows>>,
  primary: readonly WeatherDay[] = [],
  supplemental: readonly WeatherDay[] = [],
) {
  const days = new Map(supplemental.map((day) => [day.date, day]));
  for (const day of primary) days.set(day.date, day);

  const measure = (range: DateRange, field: "precipitationMm" | "temperatureMeanC") => {
    let sum = 0;
    let available = 0;
    for (const [date, day] of days) {
      const value = day[field];
      if (date < range.from || date > range.to || value === null) continue;
      sum += value;
      available++;
    }
    const total = rangeLength(range);
    return {
      range, total, available, missing: total - available,
      value: available === 0 ? null : field === "temperatureMeanC" ? sum / available : sum,
    };
  };
  return {
    rainSeven: measure(windows.seven, "precipitationMm"),
    rainThirty: measure(windows.thirty, "precipitationMm"),
    temperatureSeven: measure(windows.seven, "temperatureMeanC"),
  };
}
