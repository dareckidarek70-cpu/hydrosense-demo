"use client";

import { Layers3, MapPin } from "lucide-react";
import type { SoilPreviewReading } from "@/lib/soil-preview";
import { useLocale } from "./locale";

const texture = [["sand", "soilSand"], ["silt", "soilSilt"], ["clay", "soilClay"]] as const;

export function SoilPreviewPanel({ reading }: { reading: SoilPreviewReading }) {
  const { t, num } = useLocale();
  const available = reading.status === "available" || reading.status === "partial" ? reading : null;
  const notice = reading.status === "no-data" ? "soilNoDataTitle"
    : reading.status === "outside" ? "soilOutsideTitle" : "soilUnavailable";
  const metric = (value: number | null, unit: string, digits = 1) => value === null
    ? <span>{t("unavailable")}</span> : <><strong>{num(value, digits)}</strong> <span>{unit}</span></>;
  return (
    <section className="observation-section soil-panel print-hidden" aria-labelledby="soil-title" data-soil-status={reading.status}>
      <header className="soil-heading">
        <div>
          <p className="eyebrow">{t("soilEyebrow")}</p>
          <h2 id="soil-title">{t("soilTitle")}</h2>
          <p className="body-copy" id="soil-source-note">{t("soilModel")}</p>
        </div>
        <div className="soil-badges">
          {available ? <>
            <span className="pill"><Layers3 size={15} aria-hidden="true" />{t("soilDepth", { from: available.depthCm[0], to: available.depthCm[1] })}</span>
            <span className="pill">{t("soilGrid", { meters: available.resolutionMeters })}</span>
          </> : null}
          <span className="pill"><MapPin size={15} aria-hidden="true" />{t("soilLimited")}</span>
        </div>
      </header>
      {available ? (
        <div className="soil-readings" aria-describedby="soil-source-note">
          {reading.status === "partial" ? <p className="soil-empty" role="status">{t("soilPartial")}</p> : null}
          <dl className="soil-overview">
            <div className="soil-metric soil-ph">
              <dt>{t("soilPh")}</dt>
              <dd>{metric(available.medians.phh2o, t("soilUnitless"))}</dd>
              {available.phPredictionInterval ? <dd className="soil-interval">
                <b>{num(available.phPredictionInterval[0], 1)} – {num(available.phPredictionInterval[1], 1)}</b>
                <span>{t("soilPredictionInterval")}</span>
              </dd> : null}
            </div>
            <div className="soil-metric">
              <dt>{t("soilCarbon")}</dt>
              <dd>{metric(available.medians.soc, "g/kg")}</dd>
            </div>
            <div className="soil-metric">
              <dt>{t("soilDensity")}</dt>
              <dd>{metric(available.medians.bdod, "kg/dm³", 2)}</dd>
            </div>
          </dl>
          <div className="soil-texture">
            <h3>{t("soilTexture")}</h3>
            <dl className="soil-texture-grid">
              {texture.map(([key, label]) => <div className="soil-metric" key={key}>
                <dt>{t(label)}</dt>
                <dd>{metric(available.medians[key], t("soilMassPercent"))}</dd>
              </div>)}
            </dl>
            <p>{t("soilTextureNote")}</p>
          </div>
        </div>
      ) : (
        <div className="soil-empty" role="status">
          <strong>{t(notice)}</strong>
          <p>{t(reading.status === "no-data" ? "soilMasked" : reading.status === "outside" ? "soilOutside" : "soilBroken")}</p>
        </div>
      )}
      <footer className="soil-footer">
        <p>{t("soilLimits")}</p>
        <p><a href="https://docs.isric.org/globaldata/soilgrids/">ISRIC – World Soil Information</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="https://doi.org/10.5194/soil-7-217-2021">{t("soilMethod")}</a>. {t("soilAdaptation")}</p>
        <p><a href="https://mapy.geoportal.gov.pl/imapnext/imap/index.html?moduleId=modulRol">{t("soilGeoportal")}</a></p>
      </footer>
    </section>
  );
}
