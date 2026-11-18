"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { demoParcels, getDemoAnalysis } from "@/lib/mock-analysis";
import { inclusiveEnd, observationWindow, radiusAreaHectares } from "@/lib/copernicus/request";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { ObservationPeriod } from "./observation-period";

const LiveParcelMap = dynamic(() => import("@/components/live-parcel-map"), {
  ssr: false,
  loading: () => <div className="glass-card" style={{ minHeight: 360 }} role="status">Loading map…</div>,
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
  const [selectedParcelId, setSelectedParcelId] = useState("parcel-b");
  const [pickedPoint, setPickedPoint] = useState<[number, number] | null>(null);
  const [analysisRadius, setAnalysisRadius] = useState<500 | 1000>(500);
  const [period, setPeriod] = useState(() => observationWindow());
  const area: PointArea | null = pickedPoint ? {
    type: "PointBuffer", coordinates: pickedPoint, radiusMeters: analysisRadius,
  } : null;
  const { state, retry } = useAreaObservation(area, period);
  const parcel = getDemoAnalysis(selectedParcelId);
  const summary = parcel.executiveSummary;
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
          parcels={parcels}
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
          <p className="supporting-label">Demo parcels</p>
          <div className="button-row">
            {parcels.map((option) => (
              <button
                key={option.id}
                type="button"
                className={!area && option.id === selectedParcelId ? "button" : "button-secondary"}
                aria-pressed={!area && option.id === selectedParcelId}
                onClick={() => selectDemo(option.id)}
              >
                {option.label.split(" — ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card summary-card summary-card--active">
        <div className="summary-row">
          <div>
            <p className="supporting-label">{area ? "Custom area" : "Demonstration"}</p>
            <h3>{area ? "Selected location" : parcel.meta.label}</h3>
          </div>
        </div>
        {area ? (
          <>
            <p className="body-copy">{area.coordinates.map((value) => value.toFixed(5)).join(", ")}</p>
            <div>
              <p className="supporting-label">Analysis radius · approx. {radiusAreaHectares(analysisRadius).toFixed(1)} ha</p>
              <div className="button-row" role="group" aria-label="Analysis radius">
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
              {!state ? <p>Requesting and screening Sentinel-2 observations…</p> : null}
              {state && "data" in state ? <ObservationDetails data={state.data} /> : null}
              {state && "error" in state ? <p>{state.error}</p> : null}
            </div>
            {state && "error" in state ? (
              <button type="button" className="button-secondary" onClick={retry}>Retry analysis</button>
            ) : null}
            <p className="body-copy">Investment, irrigation, crop fit and sustainability require additional evidence.</p>
          </>
        ) : (
          <>
            <p className="body-copy">Illustrative scores and parcel details. Click the map outside a demo parcel to analyze a custom area.</p>
            <dl className="summary-grid">
              <div><dt className="supporting-label">Illustrative area</dt><dd>{parcel.meta.areaHectares} ha</dd></div>
              <div><dt className="supporting-label">Terrain</dt><dd>{parcel.meta.terrainType}</dd></div>
              <div><dt className="supporting-label">Crop model</dt><dd>{parcel.meta.cropModel}</dd></div>
            </dl>
            <div className="summary-score-strip">
              {[
                ["Investment", summary.investmentReadiness],
                ["Irrigation", summary.irrigationReadiness],
                ["Crop fit", summary.cropFitScore],
                ["Sustainability", parcel.riskAndSustainability.sustainabilityScore],
              ].map(([label, value]) => (
                <div className="summary-score-pill" key={label}><span>{label}</span><strong>{value}%</strong></div>
              ))}
            </div>
          </>
        )}
        <Link href={briefHref} className="button">{area ? "Open observation brief" : "Open demo brief"}</Link>
      </div>
    </div>
  );
}

export default FieldSelectorPanel;
