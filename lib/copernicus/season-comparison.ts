import { observationDate } from "./history-view.ts";
import { indexKeys } from "./interpretation.ts";
import { isUsableDay, type AreaStats, type Observation } from "./observations.ts";
import { dateObservationWindow, DAY, type ObservationWindow } from "./request.ts";

export const MAX_SEASON_DAYS = 30;
export const MIN_SEASON_READINGS = 3;

export function seasonWindow(from: string, to: string) {
  const window = dateObservationWindow(from, to);
  return window && windowDays(window) <= MAX_SEASON_DAYS ? window : null;
}

export function windowDays(window: ObservationWindow) {
  return (Date.parse(window.to) - Date.parse(window.from)) / DAY;
}

export function windowRelationship(a: ObservationWindow, b: ObservationWindow) {
  const first = Date.parse(a.from), last = Date.parse(a.to);
  const start = Date.parse(b.from), end = Date.parse(b.to);
  return first === start && last === end ? "identical" : first < end && start < last ? "overlap" : "separate";
}

export function seasonSummary(report: AreaStats) {
  const usable = report.days.filter(isUsableDay);
  const total = windowDays(report.window);
  const metrics = indexKeys.map(index => {
    const values = usable.flatMap(day => day[index] === null ? [] : [day[index]]).sort((a, b) => a - b);
    const count = values.length;
    const middle = Math.floor(count / 2);
    const summary = count < MIN_SEASON_READINGS ? null : {
      median: count % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2,
      min: values[0], max: values[count - 1],
    };
    return { index, count, missing: usable.length - count, summary };
  });
  return { usable, total, rejected: report.days.length - usable.length, unobserved: Math.max(0, total - report.days.length), metrics };
}

export function pickSeasonDay(report: AreaStats | undefined, date: string) {
  return report?.days.find(day => observationDate(day) === date && isUsableDay(day)) ?? null;
}

export function seasonImageGap(a: Observation, b: Observation) {
  return Math.abs(Date.parse(observationDate(a)) - Date.parse(observationDate(b))) / DAY;
}
