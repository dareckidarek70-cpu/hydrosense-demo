"use client";

import Link from "next/link";
import { ObservationDetails, useAreaObservation, type PointArea } from "./area-observation";
import { PrintReportLogo } from "./print-report-logo";
import { PrintBriefButton } from "./print-brief-button";
import { ReportSectionCard } from "./cards/report-section-card";
import { radiusAreaHectares } from "@/lib/copernicus/request";

const requiredEvidence = [
  ["Investment", "Land title, planning rules, access, costs and market assumptions."],
  ["Irrigation", "Water rights, dependable supply, water quality and crop demand."],
  ["Crop fit", "Verified land use, soil profile, local climate and crop requirements."],
  ["Sustainability", "Verified baselines for water use, habitat, emissions and related impacts."],
];

export function ObservedAreaBrief({ area, generated }: { area: PointArea; generated: string }) {
  const { state, retry } = useAreaObservation(area);
  const data = state && "data" in state ? state.data : undefined;
  const [lat, lng] = area.coordinates;
  const water = (data?.observation?.waterFraction ?? 0) >= 0.8;

  return (
    <div className="container">
      <section className="page-section brief-shell report-layout">
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
            {lat.toFixed(5)}, {lng.toFixed(5)} · {area.radiusMeters} m radius ·
            {" "}approximately {radiusAreaHectares(area.radiusMeters).toFixed(1)} ha
          </p>
          <p className="report-quiet-note">Optical screening for field verification. Agricultural and investment scores are not assessed.</p>
          <p className="report-generated">Generated on {generated} UTC</p>
        </div>

        <div className="report-section-card">
          <h2>Satellite evidence</h2>
          <div role="status">
            {!state ? <p>Loading observations for this area…</p> : null}
            {state && "error" in state ? <p>{state.error}</p> : null}
            {data ? <ObservationDetails data={data} /> : null}
          </div>
          {state && "error" in state ? (
            <button type="button" className="button-secondary print-hidden" onClick={retry}>Retry analysis</button>
          ) : null}
          {water ? <p>Surface water dominates the clear pixels on the reported day. Verify the boundary before agricultural screening.</p> : null}
        </div>

        <div className="report-section-card">
          <h2>Evidence needed for a decision</h2>
          <dl className="summary-grid">
            {requiredEvidence.map(([label, evidence]) => (
              <div key={label}>
                <dt><strong>{label} · Not assessed</strong></dt>
                <dd className="body-copy">{evidence}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ReportSectionCard
          title="Recommended next actions"
          body="Verify the parcel boundary and land use, then obtain local soil, water and regulatory records before drawing agricultural or investment conclusions."
        />
        <Link href="/select-area" className="button-secondary print-hidden">Select another area</Link>
      </section>
    </div>
  );
}
