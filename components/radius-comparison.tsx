"use client";

import { useState } from "react";
import { compareDays, indexKeys, indices, latestSharedDay, signedDifference } from "@/lib/copernicus/interpretation";
import type { AreaStats } from "@/lib/copernicus/observations";
import { radiusAreaHectares, type ObservationWindow } from "@/lib/copernicus/request";
import { percent, useAreaObservation, type PointArea } from "./area-observation";

function IndexBar({ value, variant }: { value: number | null; variant: string }) {
  if (value === null) return <span>—</span>;
  return (
    <div className="comparison-reading">
      <span className="comparison-track" aria-hidden="true">
        <span className={variant} style={{ width: `${Math.abs(value) * 50}%`, left: `${50 + Math.min(0, value) * 50}%` }} />
      </span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}

export function RadiusComparison({ area, period, data }: { area: PointArea; period: ObservationWindow; data: AreaStats }) {
  const [compare, setCompare] = useState(false);
  const otherRadius = area.radiusMeters === 500 ? 1000 : 500;
  const { state, retry } = useAreaObservation(compare ? { ...area, radiusMeters: otherRadius } : null, period);
  const other = state && "data" in state ? state.data : null;
  const first = area.radiusMeters === 500 ? data : other;
  const second = area.radiusMeters === 500 ? other : data;
  const shared = first && second ? latestSharedDay(first.days, second.days) : null;
  const left = shared?.left ?? first?.observation ?? null;
  const right = shared?.right ?? second?.observation ?? null;

  return (
    <div className={compare && other ? "radius-comparison" : "radius-comparison print-hidden"}>
      <h2>Compare analysis radii</h2>
      <p className="print-hidden">Compare 500 m and 1 km around this point, using the same period.</p>
      <button type="button" className="button-secondary print-hidden" aria-expanded={compare} onClick={() => setCompare(!compare)}>
        {compare ? "Hide comparison" : "Compare 500 m and 1 km"}
      </button>
      {compare && !state ? <p role="status" className="print-hidden">Loading observations for the second radius…</p> : null}
      {compare && state && "error" in state ? (
        <div className="print-hidden"><p role="alert">{state.error}</p><button className="button-secondary" type="button" onClick={retry}>Retry comparison</button></div>
      ) : null}
      {compare && other ? (
        <>
          <p>
            {shared
              ? `Common observation: ${left?.from.slice(0, 10)} UTC. Delta is the 1 km mean minus the 500 m mean.`
              : "No common usable date. The most recent usable readings are shown separately and no delta is calculated."}
            {" "}The buffers overlap, and different surface mixes and clear coverage can affect the values.
          </p>
          <table className="radius-table">
            <thead><tr>
              <th scope="col">Index</th>
              <th scope="col">500 m · {radiusAreaHectares(500).toFixed(1)} ha</th>
              <th scope="col">1 km · {radiusAreaHectares(1000).toFixed(1)} ha</th>
              <th scope="col">Delta</th>
            </tr></thead>
            <tbody>
              <tr><th scope="row">Date</th><td>{left?.from.slice(0, 10) ?? "—"}</td><td>{right?.from.slice(0, 10) ?? "—"}</td><td>—</td></tr>
              <tr><th scope="row">Clear area</th><td>{percent(left?.clearCoverage ?? null)}</td><td>{percent(right?.clearCoverage ?? null)}</td><td>—</td></tr>
              {indexKeys.map((key) => {
                const delta = shared ? compareDays(left, right, key) : null;
                return (
                  <tr key={key}>
                    <th scope="row">{indices[key].label}</th>
                    <td><IndexBar value={left?.[key] ?? null} variant="comparison-bar-a" /></td>
                    <td><IndexBar value={right?.[key] ?? null} variant="comparison-bar-b" /></td>
                    <td>{delta === null ? "—" : signedDifference(delta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}
