"use client";

import { useState } from "react";
import { isUsableDay, type AreaStats, type Observation } from "@/lib/copernicus/observations";
import { compareDays, describeHistory, indexKeys, indices, observedValue, signedDifference, type HistoryIndex } from "@/lib/copernicus/interpretation";
import { DAY, inclusiveEnd } from "@/lib/copernicus/request";
import { percent } from "./area-observation";

const historyIndices = ["ndvi", "ndmi"] as const;
const dateKey = (day: Observation) => day.from.slice(0, 10);
const indexValue = (value: number | null | undefined) => value == null ? "—" : value.toFixed(2);

function HistoryChart({ data, index }: { data: AreaStats; index: HistoryIndex }) {
  const start = Date.parse(data.window.from);
  const end = Date.parse(data.window.to) - DAY;
  const x = (time: number) => 38 + (end === start ? 0.5 : (time - start) / (end - start)) * 407;
  const y = (value: number) => 12 + 42 * (1 - value);
  const ticks = end - start >= 14 * DAY
    ? [start, start + Math.floor((end - start) / DAY / 2) * DAY, end]
    : [...new Set([start, end])];
  const summary = describeHistory(data.days, index);
  const readings = data.days.map((day) => ({ day, value: observedValue(day, index) }));

  return (
    <figure className="history-chart">
      <h3>{indices[index].label} history</h3>
      <svg className="history-plot" viewBox="0 0 467 132" role="img"
        aria-label={`${indices[index].label} by UTC date. Observed values are shown as points, and rejected days as crosses.`}>
        {[1, 0, -1].map((tick) => (
          <g key={tick}>
            <line x1="38" y1={y(tick)} x2="445" y2={y(tick)} stroke="#a6b6ae" strokeWidth="0.6" />
            <text x="29" y={y(tick) + 3} textAnchor="end">{tick}</text>
          </g>
        ))}
        {ticks.map((tick, i) => (
          <text key={tick} x={x(tick)} y="130"
            textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
            {new Date(tick).toISOString().slice(0, 10)}
          </text>
        ))}
        <text x="29" y="112" textAnchor="end">N/A</text>
        {readings.map(({ day, value }) => {
          const px = x(Date.parse(day.from));
          const label = `${dateKey(day)}: ${indexValue(value)}; cloud ${percent(day.cloudFraction)}, clear area ${percent(day.clearCoverage)}`;
          return value === null ? (
            <text key={day.from} x={px} y="112" textAnchor="middle" fill="#5e6a65"><title>{label}</title>×</text>
          ) : (
            <circle key={day.from} cx={px} cy={y(value)} r="2.7" fill={index === "ndvi" ? "#28613e" : "#1e6078"}>
              <title>{label}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption>
        {summary
          ? `Median, first three usable days: ${summary.early.toFixed(2)}. Last three: ${summary.late.toFixed(2)} (${signedDifference(summary.late - summary.early)}).`
          : "Fewer than six usable observations. A period change is not estimated."}
      </figcaption>
    </figure>
  );
}

export function ObservationHistory({ data, current, onSelect }: {
  data: AreaStats;
  current: Observation | null;
  onSelect: (day: string) => void;
}) {
  const [reference, setReference] = useState("");
  const usable = data.days.filter(isUsableDay);
  const baseline = usable.find((day) => dateKey(day) === reference) ?? null;
  const dayCount = (Date.parse(data.window.to) - Date.parse(data.window.from)) / DAY;
  const unobserved = Math.max(0, dayCount - data.observedDays);

  return (
    <div className="observation-history">
      <h2>Observation history</h2>
      <p>{data.window.from.slice(0, 10)} to {inclusiveEnd(data.window)} UTC · {usable.length} usable, {data.observedDays - usable.length} rejected and {unobserved} days without an observation.</p>
      {data.observedDays > 0 ? (
        <>
          <div className="history-charts">
            {historyIndices.map((index) => <HistoryChart key={index} data={data} index={index} />)}
          </div>
          <p>Points show daily means. Crosses mark unavailable values and blank dates are unsampled. Differences may reflect seasonality or surface change.</p>
        </>
      ) : null}
      {usable.length > 0 ? (
        <div className="observation-period print-hidden">
          <label>
            <span>Report observation</span>
            <select value={current ? dateKey(current) : ""} onChange={(event) => onSelect(event.target.value)}>
              {usable.map((day) => (
                <option key={day.from} value={dateKey(day)}>
                  {dateKey(day)} · {percent(day.cloudFraction)} cloud
                </option>
              ))}
            </select>
          </label>
          {usable.length > 1 ? (
            <label>
              <span>Compare with earlier or later date</span>
              <select value={reference} onChange={(event) => setReference(event.target.value)}>
                <option value="">Choose a date</option>
                {usable.map((day) => <option key={day.from} value={dateKey(day)}>{dateKey(day)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {baseline && current ? (
        <div className="observation-date-comparison">
          <h3>Difference between dates</h3>
          <p>{dateKey(baseline)} → {dateKey(current)} UTC. Change is descriptive and may reflect seasonality or differences in clear coverage.</p>
          <dl className="observation-deltas">
            {indexKeys.map((key) => {
              const delta = compareDays(baseline, current, key);
              return <div key={key}><dt>{indices[key].label}</dt><dd>{indexValue(baseline[key])} → {indexValue(current[key])} ({delta === null ? "no comparable value" : signedDifference(delta)})</dd></div>;
            })}
          </dl>
        </div>
      ) : null}
      {data.observedDays > 0 ? (
        <details className="observation-quality print-hidden">
          <summary>Daily observation quality</summary>
          <table>
            <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Cloud</th><th scope="col">Clear area</th><th scope="col">Quality</th></tr></thead>
            <tbody>
              {data.days.map((day) => (
                <tr key={day.from}><th scope="row">{dateKey(day)}</th><td>{percent(day.cloudFraction)}</td><td>{percent(day.clearCoverage)}</td><td>{isUsableDay(day) ? "Usable" : "Rejected"}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}
