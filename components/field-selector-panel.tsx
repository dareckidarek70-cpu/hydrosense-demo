"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { demoParcels } from "@/lib/mock-analysis";
import { demoPresentation } from "@/lib/i18n/demo";
import { inclusiveEnd, observationWindow, radiusAreaHectares } from "@/lib/copernicus/request";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { ObservationPeriod } from "./observation-period";
import { useLocale } from "./locale";

function MapPlaceholder() {
  const { t } = useLocale();
  return <div className="glass-card" style={{ minHeight: 360 }} role="status">{t("mapLoading")}</div>;
}

const LiveParcelMap = dynamic(() => import("@/components/live-parcel-map"), {
  ssr: false,
  loading: MapPlaceholder,
});

const boundaries: [number, number][][] = [
  [
    [45.8162, 11.8318],
    [45.8174, 11.8389],
    [45.8117, 11.8413],
    [45.8091, 11.8344],
  ],
  [
    [45.9293, 12.0675],
    [45.9311, 12.0779],
    [45.9242, 12.0815],
    [45.9206, 12.0712],
  ],
  [
    [45.1092, 11.9674],
    [45.1101, 11.9778],
    [45.1038, 11.9811],
    [45.1007, 11.9706],
  ],
  [
    [45.4694, 12.0568],
    [45.4703, 12.0667],
    [45.4639, 12.0692],
    [45.4619, 12.0591],
  ],
];

const parcels = demoParcels.map((parcel, i) => ({
  ...parcel,
  center: [parcel.coordinates.lat, parcel.coordinates.lng] as [number, number],
  polygon: boundaries[i],
}));

export function FieldSelectorPanel() {
  const { locale, t, num, percent, coordinates } = useLocale();
  const [selectedParcelId, setSelectedParcelId] = useState("parcel-b");
  const [pickedPoint, setPickedPoint] = useState<[number, number] | null>(null);
  const [analysisRadius, setAnalysisRadius] = useState<500 | 1000>(500);
  const [period, setPeriod] = useState(() => observationWindow());
  const area: PointArea | null = pickedPoint ? {
    type: "PointBuffer", coordinates: pickedPoint, radiusMeters: analysisRadius,
  } : null;
  const { state, retry } = useAreaObservation(area, period);
  const parcel = demoPresentation(selectedParcelId, locale);
  const recentMosaic = observationWindow(new Date(period.to));

  function selectDemo(id: string) {
    setSelectedParcelId(id);
    setPickedPoint(null);
  }

  const briefHref = area
    ? `/results?mode=custom&lat=${area.coordinates[0]}&lng=${area.coordinates[1]}&radius=${analysisRadius}&from=${period.from.slice(0, 10)}&to=${inclusiveEnd(period)}`
    : `/results?parcel=${parcel.meta.id}`;

  return (
    <div className="selection-layout">
      <div className="metric-stack">
        <LiveParcelMap
          parcels={parcels.map((option) => ({ ...option, label: demoPresentation(option.id, locale).copy.label }))}
          selectedParcelId={selectedParcelId}
          onSelect={selectDemo}
          selectionMode={area ? "custom" : "demo"}
          pickedPoint={pickedPoint}
          onPickPoint={setPickedPoint}
          analysisRadius={analysisRadius}
          observation={state && "data" in state ? state.data.observation : null}
          observationPending={Boolean(area && !state)}
          referenceWindow={area ? { from: period.from > recentMosaic.from ? period.from : recentMosaic.from, to: period.to } : undefined}
        />
        <div className="glass-card">
          <p className="supporting-label">{t("demoParcels")}</p>
          <div className="button-row">
            {parcels.map((option) => (
              <button
                key={option.id}
                type="button"
                className={!area && option.id === selectedParcelId ? "button" : "button-secondary"}
                aria-pressed={!area && option.id === selectedParcelId}
                onClick={() => selectDemo(option.id)}
              >
                {t("parcel", { id: option.id.slice(-1).toUpperCase() })}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card summary-card summary-card--active">
        <div className="summary-row">
          <div>
            <p className="supporting-label">{t(area ? "customArea" : "demo")}</p>
            <h3>{area ? t("location") : parcel.copy.label}</h3>
          </div>
        </div>
        {area ? (
          <>
            <p className="body-copy">{coordinates(area.coordinates)}</p>
            <div>
              <p className="supporting-label">{t("radiusArea", { area: num(radiusAreaHectares(analysisRadius), 1) })}</p>
              <div className="button-row" role="group" aria-label={t("radius")}>
                {([500, 1000] as const).map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    className={analysisRadius === radius ? "button" : "button-secondary"}
                    aria-pressed={analysisRadius === radius}
                    onClick={() => setAnalysisRadius(radius)}
                  >
                    {radius === 500 ? "500 m" : "1 km"}
                  </button>
                ))}
              </div>
            </div>
            <ObservationPeriod period={period} onApply={setPeriod} />
            <div role="status">
              {!state ? <p>{t("loadingStats")}</p> : null}
              {state && "data" in state ? <ObservationDetails data={state.data} /> : null}
              {state && "error" in state ? <p>{t(state.error)}</p> : null}
            </div>
            {state && "error" in state ? (
              <button type="button" className="button-secondary" onClick={retry}>{t("retry")}</button>
            ) : null}
            <p className="body-copy">{t("needed")}</p>
          </>
        ) : (
          <>
            <p className="body-copy">{t("demoHelp")}</p>
            <dl className="summary-grid">
              <div><dt className="supporting-label">{t("demoArea")}</dt><dd>{num(parcel.meta.areaHectares)} ha</dd></div>
              <div><dt className="supporting-label">{t("terrain")}</dt><dd>{parcel.copy.terrain}</dd></div>
              <div><dt className="supporting-label">{t("cropModel")}</dt><dd>{parcel.copy.crop}</dd></div>
            </dl>
            <div className="summary-score-strip">
              {(["investment", "irrigation", "cropFit", "sustainability"] as const).map((key) => (
                <div className="summary-score-pill" key={key}><span>{t(key)}</span><strong>{percent(parcel.scores[key] / 100)}</strong></div>
              ))}
            </div>
          </>
        )}
        <Link href={briefHref} className="button">{t(area ? "openObserved" : "openDemo")}</Link>
      </div>
    </div>
  );
}

export default FieldSelectorPanel;
