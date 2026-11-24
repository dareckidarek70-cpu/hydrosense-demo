"use client";

import { isUsableDay, type AreaStats, type Observation } from "@/lib/copernicus/observations";
import { compareDays, describeHistory, indexKeys, indices, observedValue, type HistoryIndex, type IndexKey } from "@/lib/copernicus/interpretation";
import { observationDate } from "@/lib/copernicus/history-view";
import { DAY, inclusiveEnd } from "@/lib/copernicus/request";
import { useLocale } from "./locale";
import { SentinelHistoryChart } from "./sentinel-history-chart";

const printIndices = ["ndvi", "ndmi"] as const;

function PrintHistoryChart({ data, index }: { data: AreaStats; index: HistoryIndex }) {
  const { t, num, date, percent } = useLocale();
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
      <h3>{t("historyIndex", { index: indices[index].label })}</h3>
      <svg className="history-plot" viewBox="0 0 467 132" role="img"
        aria-label={t("chartA11y", { index: indices[index].label })}>
        {[1, 0, -1].map((tick) => (
          <g key={tick}>
            <line x1="38" y1={y(tick)} x2="445" y2={y(tick)} stroke={tick === 0 ? "#94a3b8" : "#cbd5e1"} strokeWidth="0.75" />
            <text x="29" y={y(tick) + 3} textAnchor="end">{tick}</text>
          </g>
        ))}
        {ticks.map((tick, i) => (
          <text key={tick} x={x(tick)} y="130"
            textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
            {date(tick)}
          </text>
        ))}
        <text x="29" y="112" textAnchor="end">{t("noReading")}</text>
        {readings.map(({ day, value }) => {
          const px = x(Date.parse(day.from));
          const label = t("pointQuality", { date: date(day.from), value: value === null ? t("noReading") : num(value, 2), cloud: percent(day.cloudFraction), clear: percent(day.clearCoverage) });
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
          ? t("median", { early: num(summary.early, 2), late: num(summary.late, 2), delta: num(summary.late - summary.early, 2, true) })
          : t("fewDays")}
      </figcaption>
    </figure>
  );
}

export function ObservationHistory({ data, current, onSelect, index, onIndexChange, baseline, onReferenceChange }: {
  data: AreaStats;
  current: Observation | null;
  onSelect: (day: string) => void;
  index: IndexKey;
  onIndexChange: (index: IndexKey) => void;
  baseline: Observation | null;
  onReferenceChange: (date: string) => void;
}) {
  const { t, num, date, percent } = useLocale();
  const usable = data.days.filter(isUsableDay);
  const currentDay = current ? observationDate(current) : "";
  const comparable = usable.filter(day => observationDate(day) !== currentDay);
  const dayCount = (Date.parse(data.window.to) - Date.parse(data.window.from)) / DAY;
  const unobserved = Math.max(0, dayCount - data.observedDays);

  return (
    <div className="observation-history">
      <h2 id="sentinel-history-title" data-report-jump tabIndex={-1}>{t("history")}</h2>
      <p>{t("dateRange", { from: date(data.window.from), to: date(inclusiveEnd(data.window)) })} · {t("historyCounts", { usable: usable.length, rejected: data.observedDays - usable.length, missing: unobserved })}</p>
      {data.observedDays > 0 ? (
        <>
          <SentinelHistoryChart data={data} current={current} index={index} onIndexChange={onIndexChange} onSelect={onSelect} />
          <div className="print-only">
            <div className="history-charts">
              {printIndices.map(key => <PrintHistoryChart key={key} data={data} index={key} />)}
            </div>
            <p>{t("chartGuide")}</p>
          </div>
        </>
      ) : <p className="status-note print-hidden">{t("noData")}</p>}
      {usable.length > 0 ? (
        <div className="observation-period print-hidden">
          <label>
            <span>{t("reportDay")}</span>
            <select value={currentDay} onChange={(event) => onSelect(event.target.value)}>
              {usable.map((day) => (
                <option key={day.from} value={observationDate(day)}>
                  {t("cloudOption", { date: date(day.from), cloud: percent(day.cloudFraction) })}
                </option>
              ))}
            </select>
          </label>
          {comparable.length ? (
            <label>
              <span>{t("compareDate")}</span>
              <select value={baseline ? observationDate(baseline) : ""} onChange={(event) => onReferenceChange(event.target.value)}>
                <option value="">{t("chooseDate")}</option>
                {comparable.map((day) => <option key={day.from} value={observationDate(day)}>{date(day.from)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {baseline && current ? (
        <div className="observation-date-comparison">
          <h3>{t("valueComparison")}</h3>
          <p>{t("descriptiveChange", { from: date(baseline.from), to: date(current.from) })}</p>
          <p>{t("clear")}: {percent(baseline.clearCoverage)} → {percent(current.clearCoverage)} · {t("cloud")}: {percent(baseline.cloudFraction)} → {percent(current.cloudFraction)}</p>
          <p className="print-hidden">{t("historyCompareLimits")}</p>
          <dl className="observation-deltas">
            {indexKeys.map((key) => {
              const delta = compareDays(baseline, current, key);
              const a = baseline[key];
              const b = current[key];
              return <div key={key}><dt>{indices[key].label}</dt><dd>{a === null ? "—" : num(a, 2)} → {b === null ? "—" : num(b, 2)} ({delta === null ? t("noComparison") : num(delta, 2, true)})</dd></div>;
            })}
          </dl>
        </div>
      ) : null}
      {data.observedDays > 0 ? (
        <details className="observation-quality print-hidden">
          <summary>{t("qualityDaily")}</summary>
          <table>
            <thead><tr><th scope="col">{t("dateUtc")}</th><th scope="col">{t("cloud")}</th><th scope="col">{t("clear")}</th><th scope="col">{t("quality")}</th></tr></thead>
            <tbody>
              {data.days.map((day) => (
                <tr key={day.from}><th scope="row">{date(day.from)}</th><td>{percent(day.cloudFraction)}</td><td>{percent(day.clearCoverage)}</td><td>{t(isUsableDay(day) ? "usable" : "rejected")}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}
