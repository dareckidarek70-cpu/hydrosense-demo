import { z } from "zod";
import { DAY, MAX_HISTORY_DAYS, inclusiveEnd, observationWindow } from "../copernicus/request.ts";

export const archiveDelayDays = 5;
const firstReportDay = "2017-01-01";
const decimal = z.string().regex(/^[+-]?(?:\d{1,3}(?:\.\d{1,15})?|\.\d{1,15})$/).transform(Number);
const querySchema = z.strictObject({
  lat: decimal.pipe(z.number().min(-84).max(84)),
  lng: decimal.pipe(z.number().min(-180).max(180)),
  days: z.enum(["30", "90", "365"]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export type DateRange = { from: string; to: string };
export type WeatherPoint = { latitude: number; longitude: number };

export const dayString = (time: number) => new Date(time).toISOString().slice(0, 10);

export function rangeLength({ from, to }: DateRange) {
  return (Date.parse(to) - Date.parse(from)) / DAY + 1;
}

export function parseWeatherHistoryQuery(url: URL, now = new Date()) {
  if (url.search.length > 1024) return null;
  const params = [...url.searchParams];
  const unique = Object.fromEntries(params);
  if (Object.keys(unique).length !== params.length) return null;
  const parsed = querySchema.safeParse(unique);
  if (!parsed.success) return null;
  const { lat, lng, days, from, to } = parsed.data;
  if (Boolean(from) !== Boolean(to) || (from && days)) return null;

  const preset = observationWindow(now, Number(days ?? "30"));
  const requested = from && to ? { from, to } : { from: preset.from.slice(0, 10), to: inclusiveEnd(preset) };
  if (requested.from < firstReportDay || requested.to >= dayString(now.getTime())) return null;
  const dayCount = rangeLength(requested);
  if (dayCount < 1 || dayCount > MAX_HISTORY_DAYS) return null;

  const utcToday = Date.parse(dayString(now.getTime()));
  const archiveCutoff = dayString(utcToday - archiveDelayDays * DAY);
  const queried = requested.from <= archiveCutoff
    ? { from: requested.from, to: requested.to < archiveCutoff ? requested.to : archiveCutoff }
    : null;
  return {
    point: { latitude: lat, longitude: lng },
    requested: { ...requested, days: dayCount },
    queried,
    archiveCutoff,
  };
}

export type WeatherHistoryRequest = NonNullable<ReturnType<typeof parseWeatherHistoryQuery>>;
