import { DAY } from "../copernicus/request.ts";
import {
  archiveDelayDays, dayString, parseWeatherHistoryQuery, rangeLength, type WeatherHistoryRequest,
} from "./history-request.ts";
import { fetchArchiveSeries, modelDetails, weatherSource, WeatherHistoryError, type ArchiveSeries } from "./open-meteo.ts";

const ttl = 15 * 60_000;
const cacheCapacity = 24;
const concurrentLimit = 2;
const minuteLimit = 4;
const dailyWeightLimit = 1600;

type SeriesPair = { temperature: ArchiveSeries; precipitation: ArchiveSeries };
type HistoryOptions = {
  fetcher?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  enabled?: () => boolean;
};

function weatherResult(query: WeatherHistoryRequest, series: SeriesPair | null) {
  const start = Date.parse(query.requested.from);
  const days = Array.from({ length: query.requested.days }, (_, i) => {
    const date = dayString(start + i * DAY);
    const air = series?.temperature.values.get(date);
    const precipitationMm = series?.precipitation.values.get(date)?.precipitation_sum ?? null;
    const temperatureMinC = air?.temperature_2m_min ?? null;
    const temperatureMaxC = air?.temperature_2m_max ?? null;
    const mean = air?.temperature_2m_mean ?? null;
    // The archive can publish a mean while the day's temperature extremes are still missing.
    const temperatureMeanC = temperatureMinC !== null && temperatureMaxC !== null
      && mean !== null && mean >= temperatureMinC && mean <= temperatureMaxC ? mean : null;
    const values = [precipitationMm, temperatureMinC, temperatureMaxC, temperatureMeanC];
    const count = values.filter((v) => v !== null).length;
    return {
      date, precipitationMm, temperatureMinC, temperatureMaxC, temperatureMeanC,
      status: date > query.archiveCutoff ? "not-queried-recent"
        : count === 4 ? "complete" : count === 0 ? "missing" : "partial",
    };
  });
  const usable = days.filter(({ status }) => status === "complete" || status === "partial");
  const completeDays = days.filter(({ status }) => status === "complete").length;
  return {
    source: weatherSource,
    timezone: "UTC",
    point: query.point,
    requested: query.requested,
    queried: query.queried,
    archive: { typicalDelayDays: archiveDelayDays, queryCutoff: query.archiveCutoff },
    series: {
      temperature: {
        ...modelDetails("temperature"), gridPoint: series?.temperature.gridPoint ?? null,
        aggregation: "Provider daily aggregates of hourly air temperature at 2 m. Mean is shown only if both extremes exist and it lies between them; it is not calculated from the extremes.",
      },
      precipitation: {
        ...modelDetails("precipitation"), gridPoint: series?.precipitation.gridPoint ?? null,
        aggregation: "Provider daily total precipitation, including snowfall as water equivalent.",
      },
    },
    availability: {
      status: usable.length === 0 ? "no-data" : completeDays === days.length ? "complete" : "partial",
      firstDay: usable[0]?.date ?? null,
      lastDay: usable.at(-1)?.date ?? null,
      daysWithData: usable.length,
      completeDays,
    },
    days,
  };
}

export type WeatherHistory = ReturnType<typeof weatherResult>;
export type WeatherDay = WeatherHistory["days"][number];

export function createWeatherHistoryHandler({
  fetcher = (...args) => fetch(...args), now = () => new Date(), timeoutMs = 8000,
  enabled = () => process.env.VERCEL_ENV !== "production",
}: HistoryOptions = {}) {
  // Keep the weather cache and quota separate from imagery, reports and chat.
  const pending = new Map<string, Promise<SeriesPair>>();
  const cache = new Map<string, { expires: number; value: SeriesPair }>();
  let minute = { until: 0, used: 0 };
  let daily = { until: 0, used: 0 };
  let providerBlockedUntil = 0;
  const secondsLeft = (until: number, at: number) => Math.max(1, Math.ceil((until - at) / 1000));

  async function getSeries(query: WeatherHistoryRequest, at: number) {
    if (!query.queried) return null;
    const range = query.queried;
    const key = JSON.stringify([query.point.latitude, query.point.longitude, range]);
    const saved = cache.get(key);
    if (saved && saved.expires > at) return saved.value;
    if (saved) cache.delete(key);
    const active = pending.get(key);
    if (active) return active;

    if (at < providerBlockedUntil) {
      throw new WeatherHistoryError("weather_provider_limited", 503, secondsLeft(providerBlockedUntil, at));
    }
    if (at >= minute.until) minute = { until: at + 60_000, used: 0 };
    if (at >= daily.until) daily = { until: Date.parse(dayString(at)) + DAY, used: 0 };
    const weight = 2 * Math.ceil(rangeLength(range) / 14);
    if (pending.size >= concurrentLimit || minute.used >= minuteLimit || daily.used + weight > dailyWeightLimit) {
      const retry = daily.used + weight > dailyWeightLimit ? secondsLeft(daily.until, at)
        : minute.used >= minuteLimit ? secondsLeft(minute.until, at) : 3;
      throw new WeatherHistoryError("weather_overloaded", 429, retry);
    }
    minute.used++;
    daily.used += weight;

    const signal = AbortSignal.timeout(timeoutMs);
    const promise = Promise.allSettled([
      fetchArchiveSeries(query.point, range, "temperature", fetcher, signal),
      fetchArchiveSeries(query.point, range, "precipitation", fetcher, signal),
    ]).then(([temperature, precipitation]): SeriesPair => {
      if (temperature.status === "fulfilled" && precipitation.status === "fulfilled") {
        return { temperature: temperature.value, precipitation: precipitation.value };
      }
      const failures = [temperature, precipitation].flatMap((item) =>
        item.status === "rejected" ? [item.reason as unknown] : []);
      const limited = failures.find((error): error is WeatherHistoryError =>
        error instanceof WeatherHistoryError && error.code === "weather_provider_limited");
      if (limited) throw limited;
      throw failures[0];
    });
    pending.set(key, promise);
    try {
      const value = await promise;
      if (cache.size >= cacheCapacity) {
        const first = cache.keys().next().value;
        if (first !== undefined) cache.delete(first);
      }
      cache.set(key, { value, expires: now().getTime() + ttl });
      return value;
    } catch (error) {
      if (error instanceof WeatherHistoryError && error.code === "weather_provider_limited") {
        providerBlockedUntil = Math.max(providerBlockedUntil, now().getTime() + (error.retryAfter ?? 60) * 1000);
      }
      throw error;
    } finally {
      pending.delete(key);
    }
  }

  const headers = { "Cache-Control": "no-store" };
  return async function GET(request: Request) {
    if (!enabled()) return Response.json({ error: "weather_preview_only" }, { status: 404, headers });
    const current = now();
    const query = parseWeatherHistoryQuery(new URL(request.url), current);
    if (!query) return Response.json({ error: "weather_invalid_query" }, { status: 400, headers });
    try {
      return Response.json(weatherResult(query, await getSeries(query, current.getTime())), { headers });
    } catch (error) {
      const failure = error instanceof WeatherHistoryError
        ? error : new WeatherHistoryError("weather_provider_unavailable", 502);
      const responseHeaders = failure.retryAfter ? { ...headers, "Retry-After": String(failure.retryAfter) } : headers;
      return Response.json({ error: failure.code }, { status: failure.status, headers: responseHeaders });
    }
  };
}
