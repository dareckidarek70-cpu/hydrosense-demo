"use client";

import type { MouseEvent, PointerEvent } from "react";
import type { WeatherDay } from "@/lib/weather/history-service";
import { chartRuns, chartScale, temperatureKeys } from "@/lib/weather/panel-data";
import { useLocale } from "./locale";

const width = 640;
const height = 144;
const padding = 8;
const labels = ["weatherMin", "weatherMax", "weatherAvg"] as const;
const lines = ["min", "max", "mean"] as const;

function WeatherChart({ days, kind, selected, onSelect }: {
  days: WeatherDay[]; kind: "rain" | "temperature"; selected: number; onSelect: (index: number) => void;
}) {
  const { t, num, date } = useLocale();
  const rain = kind === "rain";
  const title = t(rain ? "weatherRainChart" : "weatherAirChart");
  const unit = rain ? "mm" : "°C";
  const scale = chartScale(days, rain ? ["precipitationMm"] : temperatureKeys, rain);
  if (!scale) return (
    <figure className="weather-chart">
      <figcaption><h3>{title}</h3><span className="pill">{unit}</span></figcaption>
      <p className="body-copy">{t("weatherChartEmpty")}</p>
    </figure>
  );

  const step = width / days.length;
  const x = (i: number) => (i + 0.5) * step;
  const y = (value: number) => padding + (scale.top - value) / (scale.top - scale.bottom) * (height - 2 * padding);
  const coords = (v: number) => v.toFixed(2);
  const barWidth = Math.max(1.1, Math.min(26, step * .74));
  const baseline = height - padding;
  const select = (event: MouseEvent<SVGSVGElement> | PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left) * days.length / rect.width);
    const clamped = Math.max(0, Math.min(days.length - 1, index));
    if (clamped !== selected) onSelect(clamped);
  };
  const rainBars = rain ? days.map((day, i) => {
    if (!day.precipitationMm) return "";
    const left = coords(x(i) - barWidth / 2);
    return `M${left},${baseline}V${coords(y(day.precipitationMm))}h${coords(barWidth)}V${baseline}Z`;
  }).join("") : "";
  const rainZeroes = rain ? days.map((day, i) => day.precipitationMm === 0
    ? `M${coords(x(i) - barWidth / 2)},${baseline}h${coords(barWidth)}` : "").join("") : "";
  const gaps = days.map((day, i) => (rain ? day.precipitationMm === null : temperatureKeys.every((key) => day[key] === null))
    ? `M${coords(x(i) - step / 2)},${baseline + 4}h${coords(step)}` : "").join("");
  const dateIndices = [...new Set([0, ...(days.length >= 14 ? [Math.floor(days.length / 2)] : []), days.length - 1])];

  return (
    <figure className="weather-chart">
      <figcaption><h3>{title}</h3><span className="pill">{unit}</span></figcaption>
      <div className="weather-plot">
        <div className="weather-y-axis" aria-hidden="true">
          {scale.ticks.map((tick) => (
            <span key={tick} style={{ top: `${y(tick) / height * 100}%` }}>{num(tick, Number.isInteger(tick) ? 0 : 1)}</span>
          ))}
        </div>
        <svg className="weather-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
          role="img" aria-label={title} onPointerMove={(event) => { if (event.pointerType === "mouse") select(event); }} onClick={select}>
          {scale.ticks.map((tick) => (
            <line key={tick} className="weather-grid-line" x1="0" x2={width} y1={y(tick)} y2={y(tick)} />
          ))}
          {rain ? (
            <>
              <path d={rainBars} className="weather-bars" />
              <path d={rainZeroes} className="weather-zeroes" />
            </>
          ) : temperatureKeys.map((key, i) => (
            <path key={key} className={`weather-line weather-series-${lines[i]}`} d={chartRuns(days, key).map((run) =>
              run.map(({ index, value }, p) => `${p === 0 ? "M" : "L"}${coords(x(index))},${coords(y(value))}`).join("")
              + (run.length === 1 ? "l0.1,0" : "")).join("")} />
          ))}
          <path d={gaps} className="weather-gap-mark" />
          <line className="weather-crosshair" x1={x(selected)} x2={x(selected)} y1="2" y2={height} />
        </svg>
        <div className="weather-x-axis" aria-hidden="true">
          {dateIndices.map((i) => <span key={i}>{date(days[i].date)}</span>)}
        </div>
      </div>
      {!rain ? <ul className="weather-chart-key" aria-label={title}>
        {lines.map((line, i) => <li key={line}><span className={`weather-sample weather-series-${line}`} aria-hidden="true" />{t(labels[i])}</li>)}
      </ul> : null}
    </figure>
  );
}

export function WeatherCharts({ days, selected, onSelect }: {
  days: WeatherDay[]; selected: number; onSelect: (index: number) => void;
}) {
  return (
    <div className="weather-charts">
      <WeatherChart days={days} kind="rain" selected={selected} onSelect={onSelect} />
      <WeatherChart days={days} kind="temperature" selected={selected} onSelect={onSelect} />
    </div>
  );
}
