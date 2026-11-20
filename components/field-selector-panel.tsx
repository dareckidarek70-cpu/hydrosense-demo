"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Crosshair, LoaderCircle, MapPin } from "lucide-react";
import { demoParcels } from "@/lib/mock-analysis";
import { demoPresentation } from "@/lib/i18n/demo";
import { inclusiveEnd, observationWindow, radiusAreaHectares } from "@/lib/copernicus/request";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { ObservationPeriod } from "./observation-period";
import { useLocale } from "./locale";

function MapPlaceholder() {
  const { t } = useLocale();
  return <div className="map-placeholder status-note" role="status"><LoaderCircle className="loading-icon" size={18} aria-hidden="true" />{t("mapLoading")}</div>;
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
  const reportAction = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const action = reportAction.current;
    if (!pickedPoint || !action || !window.matchMedia("(max-width: 860px)").matches) return;
    action.focus({ preventScroll: true });
    action.closest("aside")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [pickedPoint]);
  const area: PointArea | null = pickedPoint ? {
    type: "PointBuffer", coordinates: pickedPoint, radiusMeters: analysisRadius,
  } : null;
  const { state, retry } = useAreaObservation(area, period, 350);
  const parcel = demoPresentation(selectedParcelId, locale);
  const mapParcels = useMemo(() => parcels.map(({ id, center, polygon, areaHectares }) => ({
    id, center, polygon, areaHectares, label: demoPresentation(id, locale).copy.label,
  })), [locale]);
  const referenceWindow = useMemo(() => {
    const mosaic = observationWindow(new Date(period.to));
    return { from: period.from > mosaic.from ? period.from : mosaic.from, to: period.to };
  }, [period]);
  const observation = state && "data" in state ? state.data.observation : null;

  const selectDemo = useCallback((id: string) => {
    setSelectedParcelId(id);
    setPickedPoint(null);
  }, []);

  const briefHref = area
    ? `/results?mode=custom&lat=${area.coordinates[0]}&lng=${area.coordinates[1]}&radius=${analysisRadius}&from=${period.from.slice(0, 10)}&to=${inclusiveEnd(period)}`
    : `/results?parcel=${parcel.meta.id}`;
  const action = <Link ref={reportAction} href={briefHref} data-report-jump={area ? "" : undefined} className="button summary-action">{t(area ? "openObserved" : "openDemo")} <ArrowRight size={17} aria-hidden="true" /></Link>;
  const demoPicker = (
    <section className="demo-picker" aria-labelledby="demo-picker-title">
      <h2 id="demo-picker-title" className="supporting-label">{t("demoParcels")}</h2>
      <div className="button-row" role="group" aria-labelledby="demo-picker-title">
        {parcels.map((option) => (
          <button key={option.id} type="button" className="button-secondary"
            aria-pressed={!area && option.id === selectedParcelId} onClick={() => selectDemo(option.id)}>
            {t("parcel", { id: option.id.slice(-1).toUpperCase() })}
          </button>
        ))}
      </div>
    </section>
  );
  return (
    <div className="selection-layout">
        <section className="workspace-map" aria-labelledby="workspace-map-title">
          <div className="workspace-map-head">
            <h2 id="workspace-map-title"><Crosshair size={19} aria-hidden="true" /> {t("mapWorkspace")}</h2>
            <p>{t("mapInstruction")}</p>
          </div>
          <LiveParcelMap
            parcels={mapParcels}
            selectedParcelId={selectedParcelId}
            onSelect={selectDemo}
            pickedPoint={pickedPoint}
            onPickPoint={setPickedPoint}
            analysisRadius={analysisRadius}
            observation={observation}
            observationPending={Boolean(area && !state)}
            referenceWindow={area ? referenceWindow : undefined}
          />
        </section>
      {!area ? demoPicker : null}

      <aside className="summary-card" aria-labelledby="selection-title" data-report-jump={area ? "" : undefined}>
        <div className="summary-row">
          <span className="tool-icon"><MapPin size={19} aria-hidden="true" /></span>
          <div>
            <p className="supporting-label">{t(area ? "customArea" : "demo")}</p>
            <h2 id="selection-title">{area ? t("location") : parcel.copy.label}</h2>
          </div>
        </div>
        {area ? (
          <>
            <p className="coordinate-reading">{coordinates(area.coordinates)}</p>
            {action}
            <div>
              <p className="supporting-label">{t("radiusArea", { area: num(radiusAreaHectares(analysisRadius), 1) })}</p>
              <div className="button-row" role="group" aria-label={t("radius")}>
                {([500, 1000] as const).map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    className="button-secondary"
                    aria-pressed={analysisRadius === radius}
                    onClick={() => setAnalysisRadius(radius)}
                  >
                    {radius === 500 ? "500 m" : "1 km"}
                  </button>
                ))}
              </div>
            </div>
            <ObservationPeriod period={period} onApply={setPeriod} />
            {!state ? <p className="status-note" role="status"><LoaderCircle className="loading-icon" size={17} aria-hidden="true" />{t("loadingStats")}</p> : null}
            {state && "data" in state ? <ObservationDetails data={state.data} /> : null}
            {state && "error" in state ? <p className="status-note status-note--error" role="alert">{t(state.error)}</p> : null}
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
            {action}
          </>
        )}
      </aside>
      {area ? demoPicker : null}
    </div>
  );
}

export default FieldSelectorPanel;
