"use client";

import { indices, indexKeys, localIndex, type IndexKey } from "@/lib/copernicus/interpretation";
import { palettes } from "@/lib/copernicus/palettes";
import type { LayerType } from "@/lib/copernicus/evalscripts";
import { useLocale } from "./locale";

export function IndexScale({ index, describe = false }: { index: IndexKey; describe?: boolean }) {
  const { t, num, locale } = useLocale();
  const definition = indices[index];
  return (
    <ul className="layer-swatch-list" aria-label={t("mapLegend", { index: definition.label })}>
      {palettes[definition.layer].map(({ below, rgb }, i, bins) => (
        <li key={below}>
          <span className="layer-swatch" aria-hidden="true" style={{ background: `rgb(${rgb.join(",")})` }} />
          <span>[{num(bins[i - 1]?.below ?? -1, 1)}; {num(below, 1)}{i === bins.length - 1 ? "]" : ")"}</span>
          {describe ? <span className="layer-swatch-description">{localIndex(index, locale).bands[i]}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function SatelliteLegend({ layer, expanded = true }: { layer: LayerType; expanded?: boolean }) {
  const { t, locale } = useLocale();
  const index = indexKeys.find((key) => indices[key].layer === layer);
  return (
    <details className="satellite-legend" open={expanded}>
      <summary>{index ? `${indices[index].label} · ${localIndex(index, locale).title}` : t("trueColorLegend")}</summary>
      {index ? (
        <>
          <IndexScale index={index} describe />
          <p><strong>{indices[index].formula}</strong></p>
          <p>{localIndex(index, locale).limitation} {t("intervalLimit")}</p>
        </>
      ) : (
        <>
          <div className="rgb-scale" aria-hidden="true" />
          <div className="rgb-labels"><span>0 · {t("dark")}</span><span>255 · {t("bright")}</span></div>
          <p>{t("rgb")}</p>
          <p>{t("rgbLimits")}</p>
        </>
      )}
    </details>
  );
}
