"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { describeHistory, indexKeys, indices, localIndex, type IndexKey } from "@/lib/copernicus/interpretation";
import { historyDayAtPointer, historyView, historyX, observationDate } from "@/lib/copernicus/history-view";
import { isUsableDay, type AreaStats, type Observation } from "@/lib/copernicus/observations";
import { reportEvidenceId } from "@/lib/report-evidence-links";
import { useLocale } from "./locale";

const guides = { ndvi: "historyReadNdvi", ndwi: "historyReadNdwi", ndmi: "historyReadNdmi" } as const;
const statusLabels = { reading: "historyReading", unavailable: "historyIndexUnavailable", rejected: "historyRejected", unobserved: "historyUnobserved" } as const;
const axis = [["+1", 12], ["0", 44], ["−1", 76]] as const;
const y = (value: number) => 44 - 32 * value;

export function SentinelHistoryChart({ data, current, index, onIndexChange, onSelect }: {
  data: AreaStats; current: Observation | null; index: IndexKey;
  onIndexChange: (index: IndexKey) => void; onSelect: (day: string) => void;
}) {
  const { t, num, date, percent, locale } = useLocale();
  const currentDay = current ? observationDate(current) : null;
  const [inspection, setInspection] = useState<{ date: string; anchor: string | null }>();
  const { days, counts } = historyView(data, index);
  const currentIndex = days.findIndex(day => day.date === currentDay);
  const inspectedIndex = days.findIndex(day => inspection?.anchor === currentDay && inspection.date === day.date);
  const focusedIndex = inspectedIndex >= 0 ? inspectedIndex : currentIndex >= 0 ? currentIndex
    : Math.max(0, days.findLastIndex(day => !!day.observation));
  const inspected = days[focusedIndex];
  const definition = localIndex(index, locale);
  const summary = index === "ndwi" ? null : describeHistory(data.days, index);
  const x = (i: number) => `${historyX(i, days.length)}%`;
  const ticks = [...new Set([0, ...(days.length >= 14 ? [Math.floor((days.length - 1) / 2)] : []), days.length - 1])];
  const ndviTarget = data.days.some(day => day.ndvi !== null && isUsableDay(day));

  function inspect(i: number, apply: boolean) {
    const next = days[Math.max(0, Math.min(days.length - 1, i))];
    if (!next) return;
    setInspection({ date: next.date, anchor: currentDay });
    if (apply && next.usable && next.date !== currentDay) onSelect(next.date);
  }

  function pick(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.firstElementChild?.getBoundingClientRect();
    if (!box) return;
    inspect(historyDayAtPointer(days, event.clientX - box.left, box.width), true);
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const jumps: Record<string, number> = { ArrowLeft: focusedIndex - 1, ArrowRight: focusedIndex + 1,
      PageUp: focusedIndex - 7, PageDown: focusedIndex + 7, Home: 0, End: days.length - 1 };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inspect(focusedIndex, true);
    } else if (Object.hasOwn(jumps, event.key)) {
      event.preventDefault();
      inspect(jumps[event.key], false);
    }
  }

  return (
    <div className="sentinel-history print-hidden" id={ndviTarget ? reportEvidenceId.ndviHistory : undefined}
      tabIndex={ndviTarget ? -1 : undefined} data-evidence-target={ndviTarget ? "history" : undefined}
      role="group" aria-labelledby="sentinel-series-title" data-history-series={index}>
      <div className="sentinel-history-head">
        <div className="sentinel-series" role="group" aria-label={t("historySeriesSelector")}>
          {indexKeys.map(item => <button key={item} type="button" aria-pressed={item === index}
            onClick={() => onIndexChange(item)}>{indices[item].label}</button>)}
        </div>
        <p>{t("historySeriesCoverage", { count: counts.reading, usable: counts.reading + counts.unavailable })}</p>
      </div>
      <figure className="sentinel-series-card">
        <figcaption className="sentinel-series-caption">
          <h3 id="sentinel-series-title">{indices[index].label} <span>{definition.title}</span></h3>
          {currentDay ? <span className="sentinel-report-day">{t("historyReportAnchor", { date: date(currentDay) })}</span> : null}
        </figcaption>
        <div className="sentinel-graph">
          <div className="sentinel-plot" role="group" tabIndex={0} aria-label={t("historyIndex", { index: indices[index].label })}
            aria-describedby="sentinel-chart-key sentinel-chart-instruction" onKeyDown={key} onClick={pick}>
            <div className="sentinel-plot-drawing" aria-hidden="true">
              {axis.map(([label, top]) => <span key={label} className="sentinel-axis-line" data-zero={label === "0"} style={{ top: `${top}%` }}>
                <b>{label}</b>
              </span>)}
              <span className="sentinel-status-rail" />
              {currentIndex >= 0 ? <span className="sentinel-report-line" style={{ left: x(currentIndex) }} /> : null}
              {focusedIndex !== currentIndex ? <span className="sentinel-inspected-line" style={{ left: x(focusedIndex) }} /> : null}
              {days.map((day, i) => day.observation && <span key={day.date} className="sentinel-mark" data-day={day.date}
                data-status={day.status} data-selected={i === currentIndex} data-inspected={i === focusedIndex}
                style={{ left: x(i), top: `${day.value === null ? 92 : y(day.value)}%` }}>
                {day.status === "rejected" ? "×" : null}
              </span>)}
            </div>
          </div>
          <div className="sentinel-axis-dates" aria-hidden="true" data-single={ticks.length === 1}>
            {ticks.map(i => days[i] && <span key={i}>{date(days[i].date)}</span>)}
          </div>
        </div>
        <div className="sentinel-inspector" aria-live="polite" aria-atomic="true" data-history-inspector={inspected?.date}>
          {inspected ? <>
            <span><strong>{date(inspected.date)} UTC</strong>{inspected.status !== "reading" ? <span className="sentinel-inspector-status">{t(statusLabels[inspected.status])}</span> : null}</span>
            {inspected.value !== null ? <b className="sentinel-inspector-value">{indices[index].label} {num(inspected.value, 2)}</b> : null}
            {inspected.observation ? <small>{t("cloud")}: {percent(inspected.observation.cloudFraction)} · {t("clear")}: {percent(inspected.observation.clearCoverage)}</small> : null}
          </> : null}
        </div>
        <ul id="sentinel-chart-key" className="sentinel-chart-key">
          <li><i className="history-key-dot" aria-hidden="true" />{t("historyReading")}</li>
          <li><i aria-hidden="true">◇</i>{t("historyIndexUnavailable")}</li>
          <li><i aria-hidden="true">×</i>{t("historyRejected")}</li>
          <li><i aria-hidden="true">···</i>{t("historyUnobserved")}</li>
        </ul>
        <p id="sentinel-chart-instruction" className="sentinel-instruction">{t("historyChartControls")}</p>
      </figure>
      <details className="sentinel-reading-guide">
        <summary>{t("historyHowToRead", { index: indices[index].label })}</summary>
        <p>{t(guides[index])} {definition.limitation}</p>
        {summary ? <p>{t("median", { early: num(summary.early, 2), late: num(summary.late, 2), delta: num(summary.late - summary.early, 2, true) })}</p> : null}
      </details>
    </div>
  );
}
