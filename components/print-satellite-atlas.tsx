"use client";

import Image from "next/image";
import { indices, indexKeys, localIndex } from "@/lib/copernicus/interpretation";
import type { LayerType } from "@/lib/copernicus/evalscripts";
import type { Observation } from "@/lib/copernicus/observations";
import { reportMapLayers, reportMapUrl } from "@/lib/copernicus/report-map";
import type { MapRasterCache } from "@/lib/map-raster-cache";
import type { PointArea } from "./area-observation";
import { useLocale } from "./locale";
import { ObservationMapMarks } from "./observation-map";
import { IndexScale } from "./satellite-legend";
import { useReportRaster } from "./use-report-raster";

type Scene = { area: PointArea; day: Observation; cache: MapRasterCache };

function PrintSatelliteLayer({ layer, area, day, cache }: Scene & { layer: LayerType }) {
  const { t, locale, date, num } = useLocale();
  const url = reportMapUrl(area, day, layer);
  const raster = useReportRaster(url, 0, cache);
  const index = indexKeys.find(key => indices[key].layer === layer);
  const title = index ? `${indices[index].label} · ${localIndex(index, locale).title}` : t("trueColorLegend");
  const reading = index ? day[index] : null;
  const ready = raster?.kind === "ready";
  const pending = !!url && !raster;

  return <figure className="print-satellite-tile" data-print-layer={layer} data-print-pending={pending}>
    <h3>{title}{reading !== null ? <strong>{num(reading, 2)}</strong> : null}</h3>
    {ready ? <div className="observation-map-frame report-map-frame">
      <Image src={raster.url} alt={`${title} · ${date(day.from)} UTC`} fill unoptimized loading="eager" data-print-image />
      <ObservationMapMarks area={area} outline={false} />
    </div> : <div className="print-satellite-missing">
      <strong>{t("printRasterUnavailable")}</strong>
      <span>{!url ? t("printRasterNoFrame") : raster?.kind === "empty" ? t("reportMapEmpty")
        : raster?.kind === "failure" ? t(raster.reason) : t("printRasterWaitExpired")}</span>
    </div>}
    <figcaption>{index ? <IndexScale index={index} /> : <p>{t("rgb")}</p>}</figcaption>
  </figure>;
}

export function PrintSatelliteAtlas({ area, day, cache }: Scene) {
  const { t, date } = useLocale();
  return <section className="print-only print-satellite-atlas" aria-label={t("printAtlasTitle")}>
    <div className="print-atlas-heading">
      <h3>{t("printAtlasTitle")}</h3>
      <p>Copernicus Sentinel-2 L2A · <strong>{date(day.from)} UTC</strong></p>
    </div>
    <div className="print-satellite-grid">
      {reportMapLayers.map(layer => <PrintSatelliteLayer key={layer} layer={layer} area={area} day={day} cache={cache} />)}
    </div>
    <p className="report-map-mask"><span aria-hidden="true" />{t("reportMapMask")}</p>
    <p className="print-atlas-note">{t("printAtlasNote")}</p>
  </section>;
}
