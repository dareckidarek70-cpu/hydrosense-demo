"use client";

import Link from "next/link";
import { useState } from "react";
import { isUsableDay } from "@/lib/copernicus/observations";
import { radiusAreaHectares, type ObservationWindow } from "@/lib/copernicus/request";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { ObservationHistory } from "./observation-history";
import { ObservationMap, observationMapUrl } from "./observation-map";
import { ObservationPeriod } from "./observation-period";
import { PrintReportLogo } from "./print-report-logo";
import { PrintBriefButton } from "./print-brief-button";
import { RadiusComparison } from "./radius-comparison";

const requiredEvidence = [
  ["Investment", "Check land title, planning rules, access, costs and market assumptions."],
  ["Irrigation", "Confirm water rights, dependable supply, water quality and crop demand."],
  ["Crop fit", "Verify land use, soil profile, local climate and crop requirements."],
  ["Sustainability", "Establish baselines for water use, habitat, emissions and related impacts."],
];

export function ObservedAreaBrief({ area, generated, initialPeriod }: {
  area: PointArea;
  generated: string;
  initialPeriod: ObservationWindow;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [selectedDay, setSelectedDay] = useState("");
  const { state, retry } = useAreaObservation(area, period);
  const data = state && "data" in state ? state.data : undefined;
  const day = data?.days.find((entry) => entry.from.slice(0, 10) === selectedDay && isUsableDay(entry))
    ?? data?.observation ?? null;
  const [lat, lng] = area.coordinates;
  const raster = observationMapUrl(area, day);
  const map = <ObservationMap key={raster ?? "outline"} area={area} url={raster} date={day?.from.slice(0, 10)} />;
  const water = (day?.waterFraction ?? 0) >= 0.8;

  return (
    <div className="container">
      <section className="page-section brief-shell observation-document">
        <div className="report-hero glass-card">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <div className="print-only"><PrintReportLogo /></div>
              <p className="eyebrow">Satellite observation brief</p>
              <h1 className="section-title">Selected area</h1>
            </div>
            {state ? <div className="report-hero-actions print-hidden"><PrintBriefButton /></div> : null}
          </div>
          <p className="lead">
            {lat.toFixed(5)}, {lng.toFixed(5)} · {area.radiusMeters === 1000 ? "1 km" : "500 m"} radius ·
            {" "}approximately {radiusAreaHectares(area.radiusMeters).toFixed(1)} ha
          </p>
          <p className="report-generated">Generated on {generated} UTC</p>
        </div>

        <ObservationPeriod period={period} onApply={(next) => {
          setSelectedDay("");
          setPeriod(next);
        }} />

        <section className="observation-section">
          <h2>Satellite evidence</h2>
          {!state ? <p role="status">Requesting and screening Sentinel-2 observations…</p> : null}
          {state && "error" in state ? (
            <div>
              <p role="alert">{state.error} No replacement values were generated.</p>
              <button type="button" className="button-secondary print-hidden" onClick={retry}>Retry analysis</button>
            </div>
          ) : null}
          {data ? <ObservationDetails data={data} day={day} map={map} full /> : state ? map : null}
          {water ? <p>Water dominates the clear pixels on this day. Verify the area boundary before agricultural screening.</p> : null}
        </section>

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
            <h2>Method and limitations</h2>
            <p>
              Sentinel-2 L2A daily mosaics on an approximately 20 m grid. We exclude cloud, shadow, snow and invalid
              pixels. A usable day needs 50% approximate clear area and 20 valid pixels for at least one index.
              NDVI and NDMI exclude water.
            </p>
            <p>
              A buffer can include multiple surface types. Optical indices cannot establish groundwater levels,
              soil moisture, ownership, crop fit or investment viability.
            </p>
          </section>

          <section className="observation-section">
            <h2>Recommended next actions</h2>
            <dl className="observation-evidence">
              {requiredEvidence.map(([label, evidence]) => (
                <div key={label}>
                  <dt><strong>{label} · Not assessed</strong></dt>
                  <dd>{evidence}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <Link href="/select-area" className="button-secondary print-hidden">Select another area</Link>
      </section>
    </div>
  );
}
