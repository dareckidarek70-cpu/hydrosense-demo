import { z } from "zod";
import { MAX_HISTORY_DAYS } from "../copernicus/request.ts";
import type { DateRange, WeatherPoint } from "./history-request.ts";
import { retryAfterSeconds } from "./retry-after.ts";

const archive = "https://archive-api.open-meteo.com/v1/archive";
export const maxProviderBytes = 64 * 1024;

const providers = {
  temperature: {
    model: "ERA5-Land", id: "era5_land", gridDegrees: 0.1, approximateGridKm: 11,
    variables: ["temperature_2m_min", "temperature_2m_max", "temperature_2m_mean"], unit: "°C",
    dataset: "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land",
  },
  precipitation: {
    model: "ERA5", id: "era5", gridDegrees: 0.25, approximateGridKm: 25,
    variables: ["precipitation_sum"], unit: "mm",
    dataset: "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels",
  },
} as const;

export type WeatherSeries = keyof typeof providers;
type Variable = (typeof providers)[WeatherSeries]["variables"][number];

export const weatherSource = {
  kind: "meteorological-reanalysis",
  provider: "Open-Meteo Historical Weather API",
  providerUrl: "https://open-meteo.com/en/docs/historical-weather-api",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  termsUrl: "https://open-meteo.com/en/terms",
  attribution: "Weather data by Open-Meteo. Contains modified Copernicus Climate Change Service information.",
  disclaimer: "Neither the European Commission nor ECMWF is responsible for any use of the Copernicus information or data.",
  modification: "Provider daily aggregates aligned to the requested UTC date range; missing values remain null.",
  cellSelection: "nearest",
  elevationDownscaling: false,
  temperatureHeightMeters: 2,
} as const;

export function modelDetails(series: WeatherSeries) {
  const { model, gridDegrees, approximateGridKm, dataset, unit } = providers[series];
  return { model, gridDegrees, approximateGridKm, dataset, unit };
}

export type WeatherErrorCode = "weather_overloaded" | "weather_provider_limited" | "weather_provider_unavailable"
  | "weather_provider_timeout" | "weather_invalid_provider_response";

export class WeatherHistoryError extends Error {
  readonly code: WeatherErrorCode;
  readonly status: number;
  readonly retryAfter?: number;

  constructor(code: WeatherErrorCode, status: number, retryAfter?: number) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const invalidResponse = () => new WeatherHistoryError("weather_invalid_provider_response", 502);
const archiveResponse = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.enum(["GMT", "UTC", "Etc/GMT", "Etc/UTC"]),
  utc_offset_seconds: z.literal(0),
  daily_units: z.record(z.string(), z.string()),
  daily: z.object({ time: z.array(z.iso.date()).max(MAX_HISTORY_DAYS) }).catchall(z.unknown()),
});

export type ArchiveSeries = {
  gridPoint: WeatherPoint;
  values: Map<string, Partial<Record<Variable, number | null>>>;
};

export function parseArchiveSeries(raw: unknown, series: WeatherSeries, range: DateRange): ArchiveSeries {
  const parsed = archiveResponse.safeParse(raw);
  if (!parsed.success || parsed.data.daily_units.time !== "iso8601") throw invalidResponse();
  const { daily, daily_units, latitude, longitude } = parsed.data;
  const { variables, unit } = providers[series];
  const values = new Map<string, Partial<Record<Variable, number | null>>>();
  const columns = variables.map((variable) => {
    if (daily[variable] === undefined) return { variable, data: null };
    const schema = variable === "precipitation_sum" ? z.number().nonnegative() : z.number();
    const column = z.array(schema.nullable()).length(daily.time.length).safeParse(daily[variable]);
    if (!column.success || daily_units[variable] !== unit) throw invalidResponse();
    return { variable, data: column.data };
  });

  for (const [index, day] of daily.time.entries()) {
    if (day < range.from || day > range.to || values.has(day)) throw invalidResponse();
    values.set(day, Object.fromEntries(columns.map(({ variable, data }) => [variable, data?.[index] ?? null])));
  }
  return { gridPoint: { latitude, longitude }, values };
}

async function readArchiveResponse(response: Response): Promise<unknown> {
  const body = response.body;
  if (!body) throw invalidResponse();
  if (Number(response.headers.get("Content-Length")) > maxProviderBytes) {
    void body.cancel().catch(() => {});
    throw invalidResponse();
  }
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let read = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return JSON.parse(read + decoder.decode());
    size += value.byteLength;
    if (size > maxProviderBytes) {
      void reader.cancel().catch(() => {});
      throw invalidResponse();
    }
    read += decoder.decode(value, { stream: true });
  }
}

export async function fetchArchiveSeries(
  point: WeatherPoint, range: DateRange, series: WeatherSeries, fetcher: typeof fetch, signal: AbortSignal, now = Date.now,
): Promise<ArchiveSeries> {
  const source = providers[series];
  const url = new URL(archive);
  url.search = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    start_date: range.from,
    end_date: range.to,
    models: source.id,
    daily: source.variables.join(","),
    timezone: "GMT",
    timeformat: "iso8601",
    temperature_unit: "celsius",
    precipitation_unit: "mm",
    cell_selection: weatherSource.cellSelection,
    elevation: "nan",
  }).toString();
  let response: Response;
  try {
    response = await fetcher(url, { signal, cache: "no-store", redirect: "error" });
  } catch {
    if (signal.aborted) throw new WeatherHistoryError("weather_provider_timeout", 504);
    throw new WeatherHistoryError("weather_provider_unavailable", 502);
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    const retryAfter = response.headers.get("Retry-After");
    if (response.status === 429 || (response.status === 503 && retryAfter)) {
      throw new WeatherHistoryError("weather_provider_limited", 503, retryAfterSeconds(retryAfter, now()));
    }
    if (response.status === 504) throw new WeatherHistoryError("weather_provider_timeout", 504);
    throw new WeatherHistoryError("weather_provider_unavailable", 502);
  }
  try {
    return parseArchiveSeries(await readArchiveResponse(response), series, range);
  } catch {
    if (signal.aborted) throw new WeatherHistoryError("weather_provider_timeout", 504);
    throw invalidResponse();
  }
}
