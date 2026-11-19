import { DAY } from "../copernicus/request.ts";
import type { WeatherHistory } from "./history-service.ts";

const endpointErrors = {
  weather_invalid_query: "weatherInvalid",
  weather_overloaded: "weatherRate",
  weather_provider_limited: "weatherProviderRate",
  weather_provider_unavailable: "weatherProvider",
  weather_provider_timeout: "weatherTimeout",
  weather_invalid_provider_response: "weatherProvider",
  weather_preview_only: "weatherAccess",
} as const;

type PanelError = (typeof endpointErrors)[keyof typeof endpointErrors] | "weatherNetwork";
type Failure = { error: PanelError; retryAt?: number };
export type WeatherPanelResult = { data: WeatherHistory } | Failure;

function errorFrom(status: number, body: unknown): PanelError {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string"
      && Object.hasOwn(endpointErrors, body.error)) return endpointErrors[body.error as keyof typeof endpointErrors];
  if (status === 400) return "weatherInvalid";
  if (status === 401 || status === 403 || status === 404) return "weatherAccess";
  if (status === 429) return "weatherRate";
  return status === 504 ? "weatherTimeout" : "weatherProvider";
}

function matchingHistory(data: Partial<WeatherHistory> | null, key: string): data is WeatherHistory {
  const params = new URLSearchParams(key.split("?")[1]);
  const from = params.get("from"), to = params.get("to");
  const start = Date.parse(from ?? "");
  return !!data && !!data.requested && data.timezone === "UTC" && data.requested.from === from && data.requested.to === to
    && data.point?.latitude === Number(params.get("lat")) && data.point?.longitude === Number(params.get("lng"))
    && Number.isInteger(data.requested.days) && data.requested.days === (Date.parse(to ?? "") - start) / DAY + 1
    && data.requested.days >= 1 && data.requested.days <= 366
    && !!data.availability && !!data.archive && Array.isArray(data.days) && data.days.length === data.requested.days
    && data.days.every((day, i) => !!day && day.date === new Date(start + DAY * i).toISOString().slice(0, 10)
      && [day.precipitationMm, day.temperatureMinC, day.temperatureMaxC, day.temperatureMeanC]
        .every((value) => value === null || Number.isFinite(value)));
}

export function createWeatherPanelClient({
  fetcher = (...args) => fetch(...args), now = Date.now, timeoutMs = 12_000,
}: { fetcher?: typeof fetch; now?: () => number; timeoutMs?: number } = {}) {
  const cache = new Map<string, { data: WeatherHistory; expires: number }>();
  let cooldown: Failure | undefined;

  return async function load(key: string, signal: AbortSignal): Promise<WeatherPanelResult | null> {
    if (signal.aborted) return null;
    const saved = cache.get(key);
    if (saved && saved.expires > now()) return { data: saved.data };
    if (saved) cache.delete(key);
    if (cooldown?.retryAt && cooldown.retryAt > now()) return cooldown;
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; request.abort(); }, timeoutMs);
    try {
      const res = await fetcher(key, { signal: request.signal, cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (signal.aborted) return null;
      if (timedOut) return { error: "weatherTimeout" };
      if (!res.ok) {
        const error = errorFrom(res.status, json);
        if (error === "weatherRate" || error === "weatherProviderRate") {
          const header = res.headers.get("Retry-After");
          const seconds = header && /^\d+$/.test(header) ? Math.min(86_400, Math.max(1, Number(header))) : 60;
          cooldown = { error, retryAt: now() + seconds * 1000 };
          return cooldown;
        }
        return { error };
      }
      if (!matchingHistory(json, key)) return { error: "weatherProvider" };
      const first = cache.keys().next().value;
      if (cache.size >= 6 && first !== undefined) cache.delete(first);
      cache.set(key, { data: json, expires: now() + 5 * 60_000 });
      return { data: json };
    } catch {
      return signal.aborted ? null : { error: timedOut ? "weatherTimeout" : "weatherNetwork" };
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  };
}
