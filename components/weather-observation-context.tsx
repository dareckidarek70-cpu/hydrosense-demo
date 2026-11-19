"use client";

import { CloudRain, LoaderCircle, Thermometer } from "lucide-react";
import type { WeatherPanelResult } from "@/lib/weather/panel-client";
import { weatherRequestKey } from "@/lib/weather/panel-data";
import {
  asWeatherWindow, planPrecedingWeather, precedingWeatherWindows, summarizePrecedingWeather,
} from "@/lib/weather/observation-context";
import { useLocale } from "./locale";
import { useWeatherResult } from "./use-weather-result";

export function WeatherObservationContext({ observationDay, coordinates, reportStart, primary, primaryPending, attempt }: {
  observationDay: string | null;
  coordinates: readonly [number, number];
  reportStart: string;
  primary?: WeatherPanelResult;
  primaryPending: boolean;
  attempt: number;
}) {
  const { t, num, date } = useLocale();
  const windows = observationDay ? precedingWeatherWindows(observationDay) : null;
  const history = primary && "data" in primary ? primary.data : undefined;
  const failure = primary && "error" in primary ? primary.error : null;
  const request = windows && !primaryPending && !failure
    ? planPrecedingWeather(windows.thirty, history?.requested ?? null, reportStart) : null;
  const key = request ? weatherRequestKey(coordinates, asWeatherWindow(request)) : null;
  const supplemental = useWeatherResult(key, attempt);

  if (!windows || !observationDay) return null;
  const isLoading = primaryPending || (!!key && !supplemental);
  const error = failure ?? (supplemental && "error" in supplemental ? supplemental.error : null);
  const supplement = supplemental && "data" in supplemental ? supplemental.data : undefined;
  const summary = summarizePrecedingWeather(windows, history?.days, supplement?.days, history?.failedSeries);
  const metrics = [
    { title: "weatherContextRain7", data: summary.rainSeven, unit: "mm", digits: 2, Icon: CloudRain },
    { title: "weatherContextRain30", data: summary.rainThirty, unit: "mm", digits: 2, Icon: CloudRain },
    { title: "weatherContextTemperature", data: summary.temperatureSeven, unit: "°C", digits: 1, Icon: Thermometer },
  ] as const;
  const hasData = metrics.some(({ data }) => data.value !== null);
  const state = isLoading ? "loading" : !hasData ? "unavailable"
    : metrics.some(({ data }) => data.missing) ? "partial" : "complete";
  const hasFailedSeries = state !== "complete" && (history?.failedSeries || supplement?.failedSeries);
  const notice = error === "weatherAccess" ? "weatherContextAccess"
    : error || hasFailedSeries ? "weatherContextFailure" : !hasData ? "weatherContextEmpty" : null;

  return (
    <section className="weather-context" aria-labelledby="weather-context-title" data-weather-context-status={state}>
      <div className="weather-context-heading">
        <h3 id="weather-context-title">{t("weatherContextTitle")}</h3>
        <p>{t("weatherContextAnchor", { date: date(observationDay) })}</p>
      </div>
      {isLoading ? (
        <p className="status-note" role="status"><LoaderCircle size={17} className="loading-icon" aria-hidden="true" />{t("weatherContextLoading")}</p>
      ) : (
        <>
          {notice ? <p className="status-note" role="status">{t(notice)}</p> : null}
          <dl className="weather-context-metrics">
            {metrics.map(({ title, data, unit, digits, Icon }) => (
              <div className="weather-metric" key={title}>
                <dt><Icon size={16} aria-hidden="true" />{t(title)}</dt>
                <dd>
                  <strong>{data.value === null ? t("unavailable") : `${num(data.value, digits)} ${unit}`}</strong>
                  <small>{t("dateRange", { from: date(data.range.from), to: date(data.range.to) })}</small>
                  <small>{t("weatherContextDays", { count: data.available, total: data.total, missing: data.missing })}</small>
                </dd>
              </div>
            ))}
          </dl>
          {summary.rainSeven.value !== null ? <p className="weather-context-reading">
            {t(summary.rainSeven.missing ? "weatherContextPartialReading" : "weatherContextReading", {
              rain: num(summary.rainSeven.value, 2), count: summary.rainSeven.available,
            })}
          </p> : null}
        </>
      )}
      <p className="weather-context-method">{t("weatherContextMethod")}</p>
    </section>
  );
}
