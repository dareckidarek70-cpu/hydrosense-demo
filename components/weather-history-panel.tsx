"use client";

import { ArrowDownUp, ChevronLeft, ChevronRight, CloudRain, LoaderCircle, Thermometer, TriangleAlert, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { inclusiveEnd, type ObservationWindow } from "@/lib/copernicus/request";
import type { WeatherDay, WeatherHistory } from "@/lib/weather/history-service";
import { createWeatherPanelClient, type WeatherPanelResult } from "@/lib/weather/panel-client";
import { lowRainThreshold, summarizeWeather, weatherRequestKey } from "@/lib/weather/panel-data";
import { useLocale } from "./locale";
import { ObservationPeriod } from "./observation-period";
import { WeatherCharts } from "./weather-charts";

const loadWeather = createWeatherPanelClient();

function WeatherMetrics({ days }: { days: WeatherDay[] }) {
  const { t, num } = useLocale();
  const summary = summarizeWeather(days);
  const total = days.length;
  const coverage = (count: number) => t("weatherCoverage", { count, total });
  const metric = (value: number | null, unit: string, digits = 1) =>
    value === null ? t("unavailable") : `${num(value, digits)} ${unit}`;
  return (
    <dl className="weather-metrics">
      <div className="weather-metric">
        <dt><CloudRain size={17} aria-hidden="true" />{t("weatherRainTotal")}</dt>
        <dd><strong>{metric(summary.precipitation, "mm", 2)}</strong><small>{coverage(summary.rainDays)}</small></dd>
      </div>
      <div className="weather-metric">
        <dt><Thermometer size={17} aria-hidden="true" />{t("weatherMean")}</dt>
        <dd><strong>{metric(summary.mean, "°C")}</strong><small>{coverage(summary.meanDays)}</small></dd>
      </div>
      <div className="weather-metric">
        <dt><ArrowDownUp size={17} aria-hidden="true" />{t("weatherExtremes")}</dt>
        <dd>
          <div className="weather-extremes">
            <span><small>{t("weatherMin")}</small><strong>{metric(summary.min, "°C")}</strong></span>
            <span><small>{t("weatherMax")}</small><strong>{metric(summary.max, "°C")}</strong></span>
          </div>
          <small>{t("weatherExtremeCoverage", { min: summary.minDays, max: summary.maxDays, total })}</small>
        </dd>
      </div>
      <div className="weather-metric">
        <dt><Waves size={17} aria-hidden="true" />{t("weatherLongest")}</dt>
        <dd>
          <strong>{summary.longest === null ? t("unavailable") : num(summary.longest)}</strong>
          <small>{coverage(summary.rainDays)} · {t("weatherThreshold", { mm: lowRainThreshold })}</small>
        </dd>
      </div>
    </dl>
  );
}

function WeatherDayInspector({ days, selected, onSelect }: {
  days: WeatherDay[]; selected: number; onSelect: (index: number) => void;
}) {
  const { t, num, date } = useLocale();
  const day = days[selected];
  const readings = [
    ["weatherRainChart", day.precipitationMm, "mm"],
    ["weatherMin", day.temperatureMinC, "°C"],
    ["weatherMax", day.temperatureMaxC, "°C"],
    ["weatherAvg", day.temperatureMeanC, "°C"],
  ] as const;
  const unavailable = day.status === "not-queried-recent" ? "weatherDayRecent"
    : day.status === "partial" ? "weatherDayPartial" : day.status === "missing" ? "unavailable" : null;
  return (
    <div className="weather-inspector">
      <div>
        <h3>{t("weatherInspect")}</h3>
        <p className="body-copy">{t("weatherChartGap")}</p>
      </div>
      <div className="weather-day-controls">
        <button className="button-secondary" aria-label={t("weatherDayPrevious")} title={t("weatherDayPrevious")}
          type="button" disabled={selected === 0} onClick={() => onSelect(selected - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <label>
          <span>{t("weatherInspectDate")}</span>
          <select value={selected} onChange={(event) => onSelect(Number(event.target.value))}>
            {days.map((entry, i) => <option key={entry.date} value={i}>{date(entry.date)}</option>)}
          </select>
        </label>
        <button className="button-secondary" aria-label={t("weatherDayNext")} title={t("weatherDayNext")}
          type="button" disabled={selected === days.length - 1} onClick={() => onSelect(selected + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <dl className="weather-day-values">
        {readings.map(([label, value, unit]) => (
          <div key={label}><dt>{t(label)}</dt><dd>{value === null ? t("unavailable") : `${num(value, unit === "mm" ? 2 : 1)} ${unit}`}</dd></div>
        ))}
      </dl>
      {unavailable ? <p className="weather-day-status">{t(unavailable)}</p> : null}
    </div>
  );
}

function LoadedWeather({ data }: { data: WeatherHistory }) {
  const { t, date } = useLocale();
  const [chosen, setChosen] = useState<number>();
  const { availability, days } = data;
  const selected = chosen ?? Math.max(0, days.findIndex((day) => day.date === availability.lastDay));
  return (
    <>
      {availability.firstDay && availability.lastDay ? (
        <div className="weather-coverage">
          <p>{t("weatherAvailable", { from: date(availability.firstDay), to: date(availability.lastDay) })}</p>
          {availability.status === "partial" ? <p className="weather-partial">
            <TriangleAlert size={16} aria-hidden="true" />{t("weatherPartial", { complete: availability.completeDays, total: data.requested.days })}
          </p> : null}
        </div>
      ) : <p className="status-note" role="status">{t(data.queried ? "weatherNoData" : "weatherOnlyRecent")}</p>}
      <p className="weather-delay">{t("weatherDelay", { days: data.archive.typicalDelayDays, cutoff: date(data.archive.queryCutoff) })}</p>
      {availability.daysWithData > 0 ? (
        <>
          <WeatherMetrics days={days} />
          <WeatherCharts days={days} selected={selected} onSelect={setChosen} />
          <WeatherDayInspector days={days} selected={selected} onSelect={setChosen} />
        </>
      ) : null}
    </>
  );
}

function WeatherRetry({ retryAt, onRetry }: { retryAt?: number; onRetry: () => void }) {
  const { t } = useLocale();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!retryAt) return;
    const tick = setTimeout(() => setReady(true), Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(tick);
  }, [retryAt]);
  return <button type="button" className="button-secondary" disabled={!!retryAt && !ready} onClick={onRetry}>{t("weatherRetry")}</button>;
}

export function WeatherHistoryPanel({ coordinates, reportPeriod }: {
  coordinates: readonly [number, number]; reportPeriod: ObservationWindow;
}) {
  const { t, date } = useLocale();
  const [override, setOverride] = useState<ObservationWindow | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; attempt: number; value: WeatherPanelResult }>();
  const period = override ?? reportPeriod;
  const key = weatherRequestKey(coordinates, period);
  const result = outcome?.key === key && outcome.attempt === attempt ? outcome.value : undefined;

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const value = await loadWeather(key, controller.signal);
      if (value && !controller.signal.aborted) setOutcome({ key, attempt, value });
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, attempt]);

  const state = !key ? "invalid" : !result ? "loading" : "error" in result ? "error" : result.data.availability.status;
  return (
    <section className="observation-section weather-panel print-hidden" aria-labelledby="weather-title" data-weather-status={state}>
      <div className="weather-heading">
        <div>
          <p className="eyebrow">{t("weatherArchive")}</p>
          <h2 id="weather-title">{t("weatherTitle")}</h2>
          <p className="body-copy">{t("weatherIntro")}</p>
        </div>
        <span className="pill">{t(override ? "weatherIndependent" : "weatherSync")}</span>
      </div>
      <div className="weather-period">
        <ObservationPeriod period={reportPeriod} label="weatherPeriod" currentLabel="weatherSync"
          onApply={(next, followsReport) => setOverride(followsReport ? null : next)} />
        {key ? <p>{t("dateRange", { from: date(period.from), to: date(inclusiveEnd(period)) })}</p> : null}
      </div>
      {!key ? <p className="status-note status-note--error" role="alert">{t("weatherInvalid")}</p> : !result ? (
        <p className="status-note" role="status"><LoaderCircle className="loading-icon" size={17} aria-hidden="true" />{t("weatherLoading")}</p>
      ) : "error" in result ? (
        <div className="weather-error">
          <p className="status-note status-note--error" role="alert"><TriangleAlert size={17} aria-hidden="true" />{t(result.error)}</p>
          {result.error !== "weatherAccess" && result.error !== "weatherInvalid" ? (
            <WeatherRetry key={result.retryAt ?? 0} retryAt={result.retryAt} onRetry={() => setAttempt((n) => n + 1)} />
          ) : null}
        </div>
      ) : <LoadedWeather key={key} data={result.data} />}
      <footer className="weather-sources">
        <h3>{t("weatherSources")}</h3>
        <p>{t("weatherModelTemp")} · {t("weatherModelRain")}</p>
        <p>{t("weatherMethod")}</p>
        <p><a href="https://open-meteo.com/en/docs/historical-weather-api">Open-Meteo</a>{" · "}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{" · "}{t("weatherAttribution")}
        </p>
        <p>{t("weatherDisclaimer")}</p>
      </footer>
    </section>
  );
}
