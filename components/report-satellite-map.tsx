"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { indices, indexKeys, localIndex, type IndexKey } from "@/lib/copernicus/interpretation";
import type { LayerType } from "@/lib/copernicus/evalscripts";
import type { Observation } from "@/lib/copernicus/observations";
import { reportMapLayers, reportMapUrl } from "@/lib/copernicus/report-map";
import { observationDate } from "@/lib/copernicus/history-view";
import { MapRasterCache } from "@/lib/map-raster-cache";
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
type Side = "current" | "reference";

function RasterPanel({ area, day, layer, side, cache }: {
  area: PointArea; day: Observation; layer: LayerType; side: Side; cache: MapRasterCache;
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
        <span>{t(side === "current" ? "reportMapCurrent" : "reportMapReference")}</span>
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

export function ReportSatelliteMap({ area, day, reference, options, onReferenceChange, onIndexChange, printing }: {
  area: PointArea; day: Observation; reference: Observation | null; options: readonly Observation[];
  onReferenceChange: (date: string) => void; onIndexChange: (index: IndexKey) => void; printing: boolean;
}) {
  const { t, locale, date, percent } = useLocale();
  const [cache] = useState(() => new MapRasterCache());
  const [layer, setLayer] = useState<LayerType>("TRUE_COLOR");
  const [compare, setCompare] = useState(false);
  const [side, setSide] = useState<Side>("current");
  const desktop = useSyncExternalStore(subscribe, getDesktop, getServerDesktop);
  useEffect(() => () => cache.clear(), [cache]);
  const index = layerIndex(layer);
  const pairing = compare ? reference : null;
  const printRaster = printing ? reportMapUrl(area, day, "TRUE_COLOR", "png") : null;

  return (
    <div className="report-satellite-map" data-map-comparing={!!pairing}>
      <div className={printing ? "print-hidden" : undefined}>
        <div className="report-map-controls print-hidden">
          <div role="group" aria-label={t("mapLayer")} className="report-map-layers">
            {reportMapLayers.map(option => <button key={option} type="button" aria-pressed={layer === option} onClick={() => {
              setLayer(option);
              const next = layerIndex(option);
              if (next) onIndexChange(next);
            }}>{option === "TRUE_COLOR" ? t("trueColor") : layerText[option]}</button>)}
          </div>
          {options.length ? <div className="report-map-compare-controls observation-period">
            <label><span>{t("reportMapCompareDate")}</span><select value={reference ? observationDate(reference) : ""} onChange={event => onReferenceChange(event.target.value)}>
              <option value="">{t("chooseDate")}</option>
              {options.map(option => <option key={option.from} value={observationDate(option)}>
                {t("cloudOption", { date: date(option.from), cloud: percent(option.cloudFraction) })}
              </option>)}
            </select></label>
            <button type="button" className="button-secondary report-map-action" disabled={!reference}
              aria-label={t(pairing ? "reportMapClose" : "reportMapCompare")} onClick={() => {
              setSide("current"); setCompare(!pairing);
            }}><span>{t(pairing ? "reportMapClose" : "reportMapCompare")}</span>
              <span aria-hidden="true">{t(pairing ? "reportMapCloseShort" : "reportMapCompareShort")}</span></button>
          </div> : <p className="report-map-note">{t("reportMapNoPair")}</p>}
        </div>
        {pairing ? <div className="report-map-pair-meta print-hidden">
          <p>{t("reportMapCommonFrame")}</p>
          {!desktop ? <div className="report-map-layers" role="group" aria-label={t("reportMapSideLabel")}>
            {([["current", day], ["reference", pairing]] as const).map(([value, reading]) => <button key={value}
              type="button" aria-pressed={side === value} onClick={() => setSide(value)}>
              {t(value === "current" ? "reportMapCurrent" : "reportMapReference")} · {date(reading.from)}
            </button>)}
          </div> : null}
        </div> : null}
        <div className="report-map-scenes" data-map-paired={!!pairing}>
          {!pairing || desktop || side === "current" ? <RasterPanel area={area} day={day} layer={layer} side="current" cache={cache} /> : null}
          {pairing && (desktop || side === "reference") ? <RasterPanel area={area} day={pairing} layer={layer} side="reference" cache={cache} /> : null}
        </div>
        <div className="report-map-legend print-hidden">
          {index ? <><strong>{indices[index].label} · {localIndex(index, locale).title}</strong><IndexScale index={index} /></> : null}
          <SatelliteLegend key={layer} layer={layer} expanded={false} />
          <p className="report-map-mask"><span aria-hidden="true" />{t("reportMapMask")}</p>
        </div>
      </div>
      {printing ? <div className="print-only"><ObservationMap key={printRaster ?? "outline"} area={area} url={printRaster} date={observationDate(day)} /></div> : null}
    </div>
  );
}
