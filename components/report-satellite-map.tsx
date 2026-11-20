"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { indices, indexKeys, localIndex, type IndexKey } from "@/lib/copernicus/interpretation";
import type { LayerType } from "@/lib/copernicus/evalscripts";
import type { Observation } from "@/lib/copernicus/observations";
import { reportMapLayers, reportMapUrl } from "@/lib/copernicus/report-map";
import { observationDate } from "@/lib/copernicus/history-view";
import type { MapRasterCache } from "@/lib/map-raster-cache";
import type { MessageKey } from "@/lib/i18n";
import type { PointArea } from "./area-observation";
import { ObservationMap, ObservationMapMarks } from "./observation-map";
import { IndexScale, SatelliteLegend } from "./satellite-legend";
import { useReportRaster } from "./use-report-raster";
import { useLocale } from "./locale";

const desktopQuery = "(min-width: 761px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getDesktop = () => window.matchMedia(desktopQuery).matches;
const getServerDesktop = () => false;
const layerIndex = (layer: LayerType) => indexKeys.find(key => indices[key].layer === layer);
const layerText = { TRUE_COLOR: "Barwy naturalne", NDVI: "NDVI", NDWI: "NDWI", MOISTURE_INDEX: "NDMI" } as const;
export type RasterSide = "current" | "reference";

function RasterPanel({ area, day, layer, side, cache, label }: {
  area: PointArea; day: Observation; layer: LayerType; side: RasterSide; cache: MapRasterCache; label: MessageKey;
}) {
  const { t, date, percent } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const key = reportMapUrl(area, day, layer);
  const raster = useReportRaster(key, attempt, cache);
  const ready = raster?.kind === "ready";
  const dayLabel = `${date(day.from)} UTC`;
  return (
    <figure className="observation-map report-map-panel" data-map-side={side} data-map-day={observationDate(day)} data-map-layer={layer}>
      <div className="report-map-panel-title print-hidden">
        <span>{t(label)}</span>
        <strong>{dayLabel}</strong>
      </div>
      <div className="observation-map-frame report-map-frame" data-raster-state={!key ? "unavailable" : raster?.kind ?? "loading"}>
        {ready ? <Image src={raster.url} alt={`${layer === "TRUE_COLOR" ? t("trueColor") : layerText[layer]} · ${dayLabel}`} fill unoptimized
          data-report-raster data-raster-ready="true" /> : null}
        <ObservationMapMarks area={area} outline={!ready} />
      </div>
      <figcaption>
        <div className="print-hidden">
          <div>{t("cloud")}: {percent(day.cloudFraction)} · {t("clear")}: {percent(day.clearCoverage)}</div>
          <div role="status">{!key ? t("mapOutline") : !raster ? t("mapImageLoading") : raster.kind === "empty" ? t("reportMapEmpty")
            : raster.kind === "failure" ? t(raster.reason) : t("reportMapVisible", { coverage: percent(raster.visible) })}</div>
          {raster?.kind === "failure" ? <button className="button-secondary report-map-retry" type="button" onClick={() => setAttempt(n => n + 1)}>{t("retry")}</button> : null}
        </div>
        <span className="print-only">{!ready ? t("mapOutline") : layer === "TRUE_COLOR" ? t("mapCaption", { date: date(day.from) }) : `${layerText[layer]} · ${dayLabel}`}</span>
      </figcaption>
    </figure>
  );
}

export function SatelliteLayerButtons({ layer, onChange }: { layer: LayerType; onChange: (layer: LayerType) => void }) {
  const { t } = useLocale();
  return <div role="group" aria-label={t("mapLayer")} className="report-map-layers">
    {reportMapLayers.map(option => <button key={option} type="button" aria-pressed={layer === option}
      onClick={() => onChange(option)}>{option === "TRUE_COLOR" ? t("trueColor") : layerText[option]}</button>)}
  </div>;
}

export function SatelliteMapLegend({ layer }: { layer: LayerType }) {
  const { t, locale } = useLocale();
  const index = layerIndex(layer);
  return <div className="report-map-legend print-hidden">
    {index ? <><strong>{indices[index].label} · {localIndex(index, locale).title}</strong><IndexScale index={index} /></> : null}
    <SatelliteLegend key={layer} layer={layer} expanded={false} />
    <p className="report-map-mask"><span aria-hidden="true" />{t("reportMapMask")}</p>
  </div>;
}

export function AlignedSatelliteScenes({ area, day, reference, layer, cache, side, onSideChange,
  currentLabel = "reportMapCurrent", referenceLabel = "reportMapReference" }: {
  area: PointArea; day: Observation; reference: Observation | null; layer: LayerType; cache: MapRasterCache;
  side: RasterSide; onSideChange: (side: RasterSide) => void;
  currentLabel?: MessageKey; referenceLabel?: MessageKey;
}) {
  const { t, date } = useLocale();
  const desktop = useSyncExternalStore(subscribe, getDesktop, getServerDesktop);
  return <>
    {reference ? <div className="report-map-pair-meta print-hidden">
      <p>{t("reportMapCommonFrame")}</p>
      {!desktop ? <div className="report-map-layers" role="group" aria-label={t("reportMapSideLabel")}>
        {([["current", day, currentLabel], ["reference", reference, referenceLabel]] as const).map(([value, reading, label]) => <button key={value}
          type="button" aria-pressed={side === value} onClick={() => onSideChange(value)}>{t(label)} · {date(reading.from)}</button>)}
      </div> : null}
    </div> : null}
    <div className="report-map-scenes" data-map-paired={!!reference}>
      {!reference || desktop || side === "current" ? <RasterPanel area={area} day={day} layer={layer} side="current" cache={cache} label={currentLabel} /> : null}
      {reference && (desktop || side === "reference") ? <RasterPanel area={area} day={reference} layer={layer} side="reference" cache={cache} label={referenceLabel} /> : null}
    </div>
  </>;
}

export function ReportSatelliteMap({ area, day, reference, options, onReferenceChange, onIndexChange, printing, cache }: {
  area: PointArea; day: Observation; reference: Observation | null; options: readonly Observation[];
  onReferenceChange: (date: string) => void; onIndexChange: (index: IndexKey) => void; printing: boolean; cache: MapRasterCache;
}) {
  const { t, date, percent } = useLocale();
  const [layer, setLayer] = useState<LayerType>("TRUE_COLOR");
  const [compare, setCompare] = useState(false);
  const [side, setSide] = useState<RasterSide>("current");
  const pairing = compare ? reference : null;
  const printRaster = printing ? reportMapUrl(area, day, "TRUE_COLOR", "png") : null;

  return (
    <div className="report-satellite-map" data-map-comparing={!!pairing}>
      <div className={printing ? "print-hidden" : undefined}>
        <div className="report-map-controls print-hidden">
          <SatelliteLayerButtons layer={layer} onChange={option => {
            setLayer(option);
            const next = layerIndex(option);
            if (next) onIndexChange(next);
          }} />
          {options.length ? <div className="report-map-compare-controls observation-period">
            <label><span>{t("reportMapCompareDate")}</span><select value={reference ? observationDate(reference) : ""} onChange={event => onReferenceChange(event.target.value)}>
              <option value="">{t("chooseDate")}</option>
              {options.map(option => <option key={option.from} value={observationDate(option)}>
                {t("cloudOption", { date: date(option.from), cloud: percent(option.cloudFraction) })}
              </option>)}
            </select></label>
            <button type="button" className="button-secondary" disabled={!reference} onClick={() => {
              setSide("current"); setCompare(!pairing);
            }}>{t(pairing ? "reportMapClose" : "reportMapCompare")}</button>
          </div> : <p className="report-map-note">{t("reportMapNoPair")}</p>}
        </div>
        <AlignedSatelliteScenes area={area} day={day} reference={pairing} layer={layer} cache={cache} side={side} onSideChange={setSide} />
        <SatelliteMapLegend layer={layer} />
      </div>
      {printing ? <div className="print-only"><ObservationMap key={printRaster ?? "outline"} area={area} url={printRaster} date={observationDate(day)} /></div> : null}
    </div>
  );
}
