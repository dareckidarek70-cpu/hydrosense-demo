"use client";

import { historyView, historyX, observationDate } from "@/lib/copernicus/history-view";
import { indexKeys, indices, observedValue, type IndexKey } from "@/lib/copernicus/interpretation";
import { isUsableDay, type AreaStats } from "@/lib/copernicus/observations";
import { inclusiveEnd } from "@/lib/copernicus/request";
import { seasonSummary } from "@/lib/copernicus/season-comparison";
import { useLocale } from "./locale";

type Side = "A" | "B";

export function SeasonPeriodView({ report, side, index, axisDays, selected, onSelect }: {
  report: AreaStats; side: Side; index: IndexKey; axisDays: number; selected: string; onSelect: (day: string) => void;
}) {
  const { t, date, num, percent } = useLocale();
  const { usable, rejected, unobserved } = seasonSummary(report);
  const { days, counts } = historyView(report, index);
  const selectedReading = usable.find(day => observationDate(day) === selected);
  const showValue = (value: number | null) => value === null ? "—" : num(value, 2);
  return <>
    <p>{t("dateRange", { from: date(report.window.from), to: date(inclusiveEnd(report.window)) })}</p>
    <p data-season-counts>{t("historyCounts", { usable: usable.length, rejected, missing: unobserved })}</p>
    <div className="season-track" data-season-track={side} data-season-index={index}
      role="img" aria-label={t("seasonChartLabel", { index: indices[index].label, count: counts.reading })}>
      <div className="season-track-plot" aria-hidden="true">
        {[["+1", 8], ["0", 45], ["−1", 82]].map(([label, top]) => <span key={label} className="season-grid-line" style={{ top: `${top}%` }}><span>{label}</span></span>)}
        {days.map((day, i) => day.observation ? <span key={day.date} className="season-point" data-status={day.status}
          data-season-point={day.date} data-season-selected={selected === day.date}
          title={`${date(day.date)} UTC · ${day.value === null ? t(day.status === "rejected" ? "rejected" : "unavailable") : showValue(day.value)}`}
          style={{ left: `${historyX(i, axisDays)}%`, top: `${day.value === null ? 94 : 45 - day.value * 37}%` }}>
          {day.status === "rejected" ? "×" : null}</span> : null)}
      </div>
      <div className="season-track-extent" aria-hidden="true"><span>1</span>{axisDays > 1 ? <span>{axisDays}</span> : null}</div>
    </div>
    {!usable.length ? <p className="status-note" data-season-empty>{t("seasonNoUsable")}</p> : <label className="season-dates">
      <span>{t("seasonImageDay", { side })}</span>
      <select value={selected} onChange={event => onSelect(event.target.value)} data-season-scene={side}>
        <option value="">{t("chooseDate")}</option>
        {usable.map(day => <option key={day.from} value={observationDate(day)}>{t("cloudOption", { date: date(day.from), cloud: percent(day.cloudFraction) })}</option>)}
      </select>
    </label>}
    {selectedReading ? <div className="season-chosen" data-season-chosen={selected}>
      <strong>{date(selectedReading.from)} UTC</strong>
      <span>{indexKeys.map(key => `${indices[key].label} ${showValue(selectedReading[key])}`).join(" · ")}</span>
      <small>{t("cloud")}: {percent(selectedReading.cloudFraction)} · {t("clear")}: {percent(selectedReading.clearCoverage)}</small>
    </div> : null}
    {report.days.length ? <details className="season-readings">
      <summary>{t("seasonDaily")}</summary>
      <ul>{[...report.days].sort((a, b) => Date.parse(a.from) - Date.parse(b.from)).map(day => <li key={day.from}>
        <strong>{date(day.from)} UTC</strong> · {t(isUsableDay(day) ? "usable" : "rejected")}
        <span>{indexKeys.map(key => `${indices[key].label} ${showValue(observedValue(day, key))}`).join(" · ")}</span>
        <small>{t("cloud")}: {percent(day.cloudFraction)} · {t("clear")}: {percent(day.clearCoverage)}</small>
      </li>)}</ul>
    </details> : null}
  </>;
}
