"use client";

import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isUsableDay } from "@/lib/copernicus/observations";
import { radiusAreaHectares, type ObservationWindow } from "@/lib/copernicus/request";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { ObservationHistory } from "./observation-history";
import { ObservationMap, observationMapUrl } from "./observation-map";
import { ObservationPeriod } from "./observation-period";
import { PrintReportLogo } from "./print-report-logo";
import { PrintBriefButton } from "./print-brief-button";
import { RadiusComparison } from "./radius-comparison";
import { ParcelAiChat } from "./parcel-ai-chat";
import { WeatherHistoryPanel } from "./weather-history-panel";
import type { SoilPreviewReading } from "@/lib/soil-preview";
import { SoilPreviewPanel } from "./soil-preview-panel";

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
  const [period, setPeriod] = useState(initialPeriod);
  const [selectedDay, setSelectedDay] = useState("");
  const { state, retry } = useAreaObservation(area, period);
  const data = state && "data" in state ? state.data : undefined;
  const day = data?.days.find((entry) => entry.from.slice(0, 10) === selectedDay && isUsableDay(entry))
    ?? data?.observation ?? null;
  const raster = observationMapUrl(area, day);
  const map = <ObservationMap key={raster ?? "outline"} area={area} url={raster} date={day?.from.slice(0, 10)} />;
  const water = (day?.waterFraction ?? 0) >= 0.8;

  return (
    <div className="container">
      <section className="page-section brief-shell observation-document">
        <div className="report-hero">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <div className="print-only"><PrintReportLogo /></div>
              <p className="eyebrow">{t("observedBrief")}</p>
              <h1 className="section-title">{t("selectedArea")}</h1>
            </div>
            {state ? <div className="report-hero-actions print-hidden"><PrintBriefButton /></div> : null}
          </div>
          <p className="lead">
            {t("radiusSummary", { coordinates: coordinates(area.coordinates), radius: area.radiusMeters === 1000 ? "1 km" : "500 m", area: num(radiusAreaHectares(area.radiusMeters), 1) })}
          </p>
          <p className="report-generated">{t("generated")} {dateTime(generatedAt)} UTC</p>
        </div>

        <ObservationPeriod period={period} onApply={(next) => {
          setSelectedDay("");
          setPeriod(next);
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
          {data ? <ObservationDetails data={data} day={day} map={map} full /> : state ? map : null}
          {water ? <p>{t("waterDominates")}</p> : null}
        </section>

        <WeatherHistoryPanel coordinates={area.coordinates} reportPeriod={period} observationDay={day?.from.slice(0, 10) ?? null} />
        {soilPreview ? <SoilPreviewPanel reading={soilPreview} /> : null}

        {data ? (
          <>
            <section className="observation-section">
              <ObservationHistory key={data.window.from + data.window.to} data={data} current={day} onSelect={setSelectedDay} />
            </section>
            <RadiusComparison area={area} period={period} data={data} />
          </>
        ) : null}

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
        {state ? <ParcelAiChat reference={{
          mode: "observation",
          observation: { geometry: area, period, day: day?.from.slice(0, 10) ?? null },
        }} subject={`${t("selectedArea")} · ${coordinates(area.coordinates)} · ${num(area.radiusMeters)} m`} /> : null}
        <Link href="/select-area" className="button-secondary print-hidden">{t("anotherArea")}</Link>
        <p className="print-only print-footer">{t("printObservedFooter")}</p>
      </section>
    </div>
  );
}
