import { observedValue, type IndexKey } from "./interpretation.ts";
import { isUsableDay, type AreaStats, type Observation } from "./observations.ts";
import { DAY } from "./request.ts";

export const observationDate = (day: Observation) => day.from.slice(0, 10);

export function historyView(data: AreaStats, index: IndexKey) {
  const start = Date.parse(data.window.from);
  const length = (Date.parse(data.window.to) - start) / DAY;
  const observations = new Map(data.days.map(day => [observationDate(day), day]));
  const counts = { reading: 0, unavailable: 0, rejected: 0, unobserved: 0 };
  const days = Array.from({ length }, (_, i) => {
    const date = new Date(start + i * DAY).toISOString().slice(0, 10);
    const observation = observations.get(date);
    const usable = !!observation && isUsableDay(observation);
    const value = observation ? observedValue(observation, index) : null;
    const status = !observation ? "unobserved" : !usable ? "rejected" : value === null ? "unavailable" : "reading";
    counts[status]++;
    return { date, observation, usable, value, status } as const;
  });
  return { days, counts };
}

export function historyX(index: number, length: number) {
  return length > 1 ? 100 * index / (length - 1) : 50;
}

export function historyDayAtPointer(days: ReturnType<typeof historyView>["days"], position: number, width: number) {
  if (days.length <= 1 || width <= 0) return 0;
  const x = Math.max(0, Math.min(100, 100 * position / width));
  const calendarIndex = Math.round(x * (days.length - 1) / 100);
  if (days[calendarIndex].observation) return calendarIndex;
  // Give sparse real points a modest hit area on dense, narrow timelines.
  let nearest = calendarIndex;
  let distance = 8;
  for (const [i, day] of days.entries()) {
    if (!day.observation) continue;
    const pixels = Math.abs(historyX(i, days.length) - x) * width / 100;
    if (pixels < distance) {
      nearest = i;
      distance = pixels;
    }
  }
  return nearest;
}
