"use client";

import { useState, type FormEvent } from "react";
import { indexKeys, indices, type IndexKey } from "@/lib/copernicus/interpretation";
import type { LayerType } from "@/lib/copernicus/evalscripts";
import { FIRST_HISTORY_DAY, inclusiveEnd, observationWindow, type ObservationWindow } from "@/lib/copernicus/request";
import { MAX_SEASON_DAYS, MIN_SEASON_READINGS, pickSeasonDay, seasonImageGap, seasonSummary, seasonWindow, windowDays, windowRelationship } from "@/lib/copernicus/season-comparison";
import type { MapRasterCache } from "@/lib/map-raster-cache";
import type { MessageKey } from "@/lib/i18n";
import { useAreaObservation, type PointArea } from "./area-observation";
import { AlignedSatelliteScenes, SatelliteLayerButtons, SatelliteMapLegend, type RasterSide } from "./report-satellite-map";
import { SeasonPeriodView } from "./season-period-view";
import { useLocale } from "./locale";

type Pair = readonly [ObservationWindow, ObservationWindow];
const labels = ["seasonWindowA", "seasonWindowB"] as const;
const letters = ["A", "B"] as const;

export function SeasonComparison({ area, cache }: { area: PointArea; cache: MapRasterCache }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return <section className="observation-section season-comparison print-hidden" aria-labelledby="season-title">
    <div className="season-heading">
      <div><h2 id="season-title" data-report-jump tabIndex={-1}>{t("seasonTitle")}</h2><p>{t("seasonIntro")}</p></div>
      <button type="button" className="button-secondary" aria-expanded={open} aria-controls="season-workspace"
        onClick={() => setOpen(value => !value)}>{t(open ? "seasonClose" : "seasonOpen")}</button>
    </div>
    <div id="season-workspace">{open ? <SeasonForm area={area} cache={cache} /> : null}</div>
  </section>;
}

function SeasonForm({ area, cache }: { area: PointArea; cache: MapRasterCache }) {
  const { t } = useLocale();
  const maxDay = inclusiveEnd(observationWindow());
  const [periods, setPeriods] = useState<Pair | null>(null);
  const [error, setError] = useState<MessageKey>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const a = seasonWindow(String(values.get("A-from")), String(values.get("A-to")));
    const b = seasonWindow(String(values.get("B-from")), String(values.get("B-to")));
    if (!a || !b) { setError("seasonInvalid"); return; }
    if (windowRelationship(a, b) === "identical") { setError("seasonIdentical"); return; }
    setError(undefined);
    setPeriods([a, b]);
  }

  return <>
    <form className="season-form" onSubmit={submit} onChange={() => { setPeriods(null); setError(undefined); }}>
      <div className="season-grid">
        {letters.map((letter, i) => <fieldset key={letter}>
          <legend>{t(labels[i])}</legend>
          <label className="season-dates"><span>{t("startUtc")}</span><input name={`${letter}-from`} type="date" min={FIRST_HISTORY_DAY} max={maxDay} required /></label>
          <label className="season-dates"><span>{t("endUtc")}</span><input name={`${letter}-to`} type="date" min={FIRST_HISTORY_DAY} max={maxDay} required /></label>
        </fieldset>)}
      </div>
      <p>{t("seasonWindowHelp", { max: MAX_SEASON_DAYS })}</p>
      {error ? <p role="alert" className="status-note status-note--error">{t(error, { max: MAX_SEASON_DAYS })}</p> : null}
      <button type="submit" className="button">{t("seasonApply")}</button>
    </form>
    {periods ? <SeasonResults key={JSON.stringify(periods)} area={area} periods={periods} cache={cache} /> : null}
  </>;
}

function SeasonResults({ area, periods, cache }: { area: PointArea; periods: Pair; cache: MapRasterCache }) {
  const { t, date, num } = useLocale();
  const first = useAreaObservation(area, periods[0], 180);
  const second = useAreaObservation(area, periods[1], 180);
  const states = [first, second] as const;
  const data = states.map(({ state }) => state && "data" in state ? state.data : undefined);
  const [index, setIndex] = useState<IndexKey>("ndvi");
  const [dates, setDates] = useState<readonly [string, string]>(["", ""]);
  const [maps, setMaps] = useState(false);
  const [layer, setLayer] = useState<LayerType>("TRUE_COLOR");
  const [side, setSide] = useState<RasterSide>("current");
  const a = pickSeasonDay(data[0], dates[0]), b = pickSeasonDay(data[1], dates[1]);
  const matching = a && b && dates[0] === dates[1];
  const summaries = data.map(report => report ? seasonSummary(report) : undefined);
  const axisDays = Math.max(...periods.map(windowDays));
  const canSummarize = indexKeys.some((_, i) => summaries.every(s => s?.metrics[i].summary));
  const select = (which: number, value: string) => {
    setDates(previous => which === 0 ? [value, previous[1]] : [previous[0], value]);
    setSide("current");
  };

  return <div className="season-results" data-season-results>
    {windowRelationship(...periods) === "overlap" ? <p className="status-note">{t("seasonOverlap")}</p> : null}
    <div className="sentinel-series" role="group" aria-label={t("historySeriesSelector")}>
      {indexKeys.map(key => <button key={key} type="button" aria-pressed={key === index} onClick={() => setIndex(key)}>{indices[key].label}</button>)}
    </div>
    <p>{t("seasonChartGuide")}</p>
    <div className="season-grid">
      {states.map(({ state, retry }, i) => <article className="season-period" key={letters[i]} data-season-period={letters[i]}>
        <h3>{t(labels[i])}</h3>
        {data[i] ? <SeasonPeriodView report={data[i]} side={letters[i]} index={index} axisDays={axisDays} selected={dates[i]}
          onSelect={value => select(i, value)} /> : state && "error" in state ? <>
          <p className="status-note status-note--error" role="alert">{t(state.error)}</p>
          <button className="button-secondary" type="button" onClick={retry}>{t("retry")}</button>
        </> : <p className="status-note" role="status">{t("loadingStats")}</p>}
      </article>)}
    </div>
    {summaries.every(Boolean) ? <div className="season-summary">
      <h3>{t("seasonSummary")}</h3>
      <p>{t("seasonMethod", { min: MIN_SEASON_READINGS })}</p>
      {!canSummarize ? <p className="status-note">{t("seasonInsufficient")}</p> : null}
      <table><thead><tr><th scope="col">{t("seasonIndex")}</th>{labels.map(label => <th scope="col" key={label}>{t(label)}</th>)}</tr></thead>
        <tbody>{indexKeys.map((key, i) => <tr key={key}>
          <th scope="row">{indices[key].label}</th>
          {summaries.map((summary, s) => {
            const reading = summary?.metrics[i];
            if (!reading || !summary) return null;
            return <td key={letters[s]}>{reading.summary ? <>
              <strong>{num(reading.summary.median, 2)}</strong>
              <span>{num(reading.summary.min, 2)} – {num(reading.summary.max, 2)}</span>
            </> : <span>{t("seasonTooFew")}</span>}
              <small>{t("seasonSamples", { count: reading.count, available: summary.usable.length })}</small>
            </td>;
          })}
        </tr>)}</tbody></table>
    </div> : null}
    <div className="season-maps" data-season-maps>
      <h3>{t("seasonMapTitle")}</h3>
      <p>{t("seasonMapHelp")}</p>
      {matching ? <p role="status">{t("seasonSameScene")}</p> : null}
      {a && b && !matching ? <>
        <p data-season-gap>{t("seasonMapGap", { a: date(a.from), b: date(b.from), days: num(seasonImageGap(a, b)) })}</p>
        {!maps ? <button type="button" className="button-secondary" onClick={() => setMaps(true)}>{t("seasonShowMaps")}</button> : <>
          <div className="season-map-toolbar">
            <SatelliteLayerButtons layer={layer} onChange={setLayer} />
            <button type="button" className="button-secondary" onClick={() => { setMaps(false); setSide("current"); }}>{t("reportMapClose")}</button>
          </div>
          <AlignedSatelliteScenes area={area} day={a} reference={b} layer={layer} cache={cache} side={side} onSideChange={setSide}
            currentLabel="seasonWindowA" referenceLabel="seasonWindowB" />
          <SatelliteMapLegend layer={layer} />
        </>}
      </> : null}
    </div>
  </div>;
}
