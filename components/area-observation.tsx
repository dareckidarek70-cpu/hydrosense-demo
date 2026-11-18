"use client";

import { useEffect, useState } from "react";
import type { AreaStats } from "@/lib/copernicus/observations";
import type { AreaGeometry } from "@/lib/copernicus/request";

export type PointArea = Extract<AreaGeometry, { type: "PointBuffer" }>;

type ObservationState = { data: AreaStats } | { error: string };
let recent: { key: string; data: AreaStats; expires: number } | undefined;

export function useAreaObservation(area: PointArea | null) {
  const key = area ? JSON.stringify({ geometry: area }) : null;
  const [result, setResult] = useState<{ key: string; attempt: number; state: ObservationState }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      if (recent?.key === key && recent.expires > Date.now()) {
        setResult({ key, attempt, state: { data: recent.data } });
        return;
      }
      try {
        const response = await fetch("/api/copernicus/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Sentinel-2 data is unavailable.");
        if (controller.signal.aborted) return;
        recent = { key, data: body, expires: Date.now() + 5 * 60_000 };
        setResult({ key, attempt, state: { data: body } });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            key, attempt, state: { error: error instanceof Error ? error.message : "Analysis unavailable." },
          });
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, attempt]);

  return {
    state: result && result.key === key && result.attempt === attempt ? result.state : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}

function percent(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

const indexLabels = [
  ["ndvi", "NDVI", "Vegetation greenness over clear land"],
  ["ndwi", "NDWI", "Green–NIR contrast for surface water screening"],
  ["ndmi", "NDMI", "NIR–SWIR response linked to canopy moisture"],
] as const;

export function ObservationDetails({ data }: { data: AreaStats }) {
  const day = data.observation;
  const quality = day ?? data.latestObserved;

  return (
    <div className="metric-stack">
      <p className="body-copy">
        <strong>Copernicus Sentinel-2 L2A</strong> · {data.resolutionMeters} m sampling grid ·
        {" "}{data.window.from.slice(0, 10)} to {data.window.to.slice(0, 10)} (end excluded, UTC)
      </p>
      {quality ? (
        <p className="body-copy">
          {day ? "Observation day" : "Latest candidate"} <strong>{quality.from.slice(0, 10)} UTC</strong>
          {" · "}{percent(quality.cloudFraction)} cloud over observed pixels
          {" · "}{percent(quality.clearCoverage)} approximate clear area coverage
          {" · "}{data.observedDays} observed day{data.observedDays === 1 ? "" : "s"} in range
        </p>
      ) : null}
      {day ? (
        <>
          <dl className="summary-grid">
            {indexLabels.map(([key, label, description]) => (
              <div key={key}>
                <dt className="supporting-label">{label}</dt>
                <dd><strong>{day[key]?.toFixed(2) ?? "Unavailable"}</strong></dd>
                <dd className="body-copy">{description}</dd>
              </div>
            ))}
            <div>
              <dt className="supporting-label">Surface classification</dt>
              <dd className="body-copy">
                {percent(day.waterFraction)} water · {percent(day.vegetationFraction)} vegetation
                {" "}among clear pixels (Sentinel-2 SCL)
              </dd>
            </div>
          </dl>
          <p className="body-copy">
            Daily area means. The scene classification cannot distinguish crops from forests,
            or bare soil from built surfaces. NDWI and NDMI do not measure soil moisture or groundwater.
          </p>
        </>
      ) : (
        <p className="body-copy">
          No day met the clear coverage and valid pixel requirements. No indices are reported.
        </p>
      )}
    </div>
  );
}
