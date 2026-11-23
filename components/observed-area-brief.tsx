"use client";

import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isUsableDay } from "@/lib/copernicus/observations";
import { reportComparisonDay } from "@/lib/copernicus/report-map";
import type { IndexKey } from "@/lib/copernicus/interpretation";
import { dateObservationWindow, radiusAreaHectares, type ObservationWindow } from "@/lib/copernicus/request";
import { reportTop, withReportPeriod } from "@/lib/report-navigation";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { ObservationHistory } from "./observation-history";
import { ObservationMap } from "./observation-map";
import { ReportSatelliteMap } from "./report-satellite-map";
import { ObservationPeriod } from "./observation-period";
import { PrintReportLogo } from "./print-report-logo";
import { PrintSatelliteAtlas } from "./print-satellite-atlas";
import { PrintBriefButton } from "./print-brief-button";
import { RadiusComparison } from "./radius-comparison";
import { ParcelAiChat } from "./parcel-ai-chat";
import { useReportWeather, WeatherHistoryPanel } from "./weather-history-panel";
import type { SoilPreviewReading } from "@/lib/soil-preview";
import { reportChatKey, type ReportChatReference } from "@/lib/report-chat";
import { SoilPreviewPanel } from "./soil-preview-panel";
import { SeasonComparison } from "./season-comparison";
import { MapRasterCache } from "@/lib/map-raster-cache";

const requiredEvidence = [
  ["investment", "nextInvestment"], ["irrigation", "nextIrrigation"],
  ["cropFit", "nextCrop"], ["sustainability", "nextSustainability"],
] as const;

export function ObservedAreaBrief({ area, generatedAt, initialPeriod, soilPreview }: {
  area: PointArea;
  generatedAt: string;
  initialPeriod: ObservationWindow;
  soilPreview?: SoilPreviewReading;
}) {
  const { t, dateTime, num, coordinates } = useLocale();
  const query = useSearchParams();
  const period = dateObservationWindow(query.get("from"), query.get("to")) ?? initialPeriod;
  const periodKey = `${period.from}/${period.to}`;
  const [selectionPeriod, setSelectionPeriod] = useState(periodKey);
  const [selectedDay, setSelectedDay] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [printing, setPrinting] = useState(false);
  const [historyIndex, setHistoryIndex] = useState<IndexKey>("ndvi");
  if (selectionPeriod !== periodKey) {
    setSelectionPeriod(periodKey);
    setSelectedDay("");
    setReferenceDate("");
  }
  const [rasterCache] = useState(() => new MapRasterCache());
  useEffect(() => () => rasterCache.clear(), [rasterCache]);
  const { state, retry } = useAreaObservation(area, period);
  const data = state && "data" in state ? state.data : undefined;
  const day = data?.days.find((entry) => entry.from.slice(0, 10) === selectedDay && isUsableDay(entry))
    ?? data?.observation ?? null;
  const observationDay = day?.from.slice(0, 10) ?? null;
  const eligible = data?.days.filter(entry => isUsableDay(entry) && entry.from.slice(0, 10) !== observationDay) ?? [];
  const baseline = reportComparisonDay(eligible, day, referenceDate);
  const comparisonDay = baseline?.from.slice(0, 10);
  const weather = useReportWeather({ coordinates: area.coordinates, reportPeriod: period, observationDay });
  const chatReference: ReportChatReference = { geometry: area, period, day: observationDay };
  const chatWeather = weather.context;
  const chatPending = !!chatWeather?.isLoading;
  const map = day ? <ReportSatelliteMap area={area} day={day} reference={baseline} options={eligible}
    onReferenceChange={setReferenceDate} onIndexChange={setHistoryIndex} printing={printing} cache={rasterCache} /> : <ObservationMap area={area} url={null} />;
  const printAtlas = printing && day ? <PrintSatelliteAtlas area={area} day={day} cache={rasterCache} /> : null;
  const selectReportDay = (date: string) => {
    if (date === referenceDate) setReferenceDate("");
    setSelectedDay(date);
  };
  const water = (day?.waterFraction ?? 0) >= 0.8;
  const sections = [
    ...(data ? [["sentinel-history-title", "jumpHistory"]] as const : []),
    ["season-title", "seasonTitle"],
    ["weather-title", "jumpWeather"],
    ...(soilPreview ? [["soil-title", "jumpSoil"]] as const : []),
    ...(state ? [["parcel-chat-title", "jumpAi"]] as const : []),
  ] as const;

  return (
    <div className="container">
      <section className="page-section brief-shell observation-document">
        <div className="report-hero">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <div className="print-only"><PrintReportLogo /></div>
              <p className="eyebrow">{t("observedBrief")}</p>
              <h1 id={reportTop} className="section-title" data-report-jump tabIndex={-1}>{t("selectedArea")}</h1>
            </div>
            {state ? <div className="report-hero-actions print-hidden"><PrintBriefButton onPrepare={setPrinting} /></div> : null}
          </div>
          <p className="lead">
            {t("radiusSummary", { coordinates: coordinates(area.coordinates), radius: area.radiusMeters === 1000 ? "1 km" : "500 m", area: num(radiusAreaHectares(area.radiusMeters), 1) })}
          </p>
          <p className="report-generated">{t("generated")} {dateTime(generatedAt)} UTC</p>
        </div>

        <nav className="report-jump-nav print-hidden" aria-label={t("jumpSections")}>
          {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{t(label)}</a>)}
        </nav>

        <ObservationPeriod period={period} syncDraft onApply={(next) => {
          if (next.from === period.from && next.to === period.to) return;
          const search = withReportPeriod(new URLSearchParams(query), next);
          window.history.pushState(null, "", `/results?${search}`);
        }} />

        <section className="observation-section">
          <h2>{t("evidence")}</h2>
          {!state ? <p className="status-note" role="status"><LoaderCircle className="loading-icon" size={18} aria-hidden="true" />{t("loadingStats")}</p> : null}
          {state && "error" in state ? (
            <div>
              <p className="status-note status-note--error" role="alert">{t(state.error)} {t("noReplacement")}</p>
              <button type="button" className="button-secondary print-hidden" onClick={retry}>{t("retry")}</button>
            </div>
          ) : null}
          {data ? <ObservationDetails data={data} day={day} map={map} printAtlas={printAtlas} full /> : state ? map : null}
          {water ? <p>{t("waterDominates")}</p> : null}
        </section>

        {data ? (
          <section className="observation-section">
            <ObservationHistory key={data.window.from + data.window.to} data={data} current={day} baseline={baseline}
              index={historyIndex} onIndexChange={setHistoryIndex} onSelect={selectReportDay} onReferenceChange={setReferenceDate} />
          </section>
        ) : null}
        <SeasonComparison area={area} cache={rasterCache} />
        <WeatherHistoryPanel weather={weather} reportPeriod={period} />
        {soilPreview ? <SoilPreviewPanel reading={soilPreview} /> : null}
        {data ? <RadiusComparison area={area} period={period} data={data} /> : null}

        <div className="observation-followup">
          <section className="observation-section">
            <h2>{t("methods")}</h2>
            <p>{t("methodsBody")}</p>
            <p>{t("methodsLimits")}</p>
          </section>

          <section className="observation-section">
            <h2>{t("nextActions")}</h2>
            <dl className="observation-evidence">
              {requiredEvidence.map(([label, evidence]) => (
                <div key={label}>
                  <dt><strong>{t(label)} · {t("notAssessed")}</strong></dt>
                  <dd>{t(evidence)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        {state ? <ParcelAiChat reference={{ mode: "observation", observation: chatReference }}
          onNdviEvidence={() => setHistoryIndex("ndvi")}
          report={{
            identity: reportChatKey(chatReference, weather.key, weather.attempt, chatPending, comparisonDay), pending: chatPending,
            snapshot: { reference: chatReference, comparisonDay, satellite: data, soil: soilPreview, weather: chatWeather && {
              day: chatWeather.observationDay, primary: chatWeather.history, supplemental: chatWeather.supplement,
            } },
          }} subject={`${t("selectedArea")} · ${coordinates(area.coordinates)} · ${num(area.radiusMeters)} m`} /> : null}
        <Link href="/select-area" className="button-secondary print-hidden">{t("anotherArea")}</Link>
        <p className="print-only print-footer">{t("printObservedFooter")}</p>
      </section>
    </div>
  );
}
