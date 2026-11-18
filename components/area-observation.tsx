"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AreaStats, Observation } from "@/lib/copernicus/observations";
import { inclusiveEnd, type AreaGeometry, type ObservationWindow } from "@/lib/copernicus/request";
import { indexKeys, indices, interpretIndex } from "@/lib/copernicus/interpretation";
import { IndexScale } from "./satellite-legend";

export type PointArea = Extract<AreaGeometry, { type: "PointBuffer" }>;

type ObservationState = { data: AreaStats } | { error: string };
const recent = new Map<string, { data: AreaStats; expires: number }>();

export function useAreaObservation(area: PointArea | null, period: ObservationWindow) {
  const key = area ? JSON.stringify({ geometry: area, from: period.from, to: period.to }) : null;
  const [result, setResult] = useState<{ key: string; attempt: number; state: ObservationState }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      const cached = recent.get(key);
      if (cached && cached.expires > Date.now()) {
        setResult({ key, attempt, state: { data: cached.data } });
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
        const first = recent.keys().next().value;
        if (recent.size >= 8 && first) recent.delete(first);
        recent.set(key, { data: body, expires: Date.now() + 5 * 60_000 });
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

export function percent(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

export function ObservationDetails({ data, day = data.observation, full = false, map }: {
  data: AreaStats;
  day?: Observation | null;
  full?: boolean;
  map?: ReactNode;
}) {
  const quality = day ?? data.latestObserved;

  return (
    <div className="metric-stack">
      <div className={map ? "observation-overview" : undefined}>
        {map}
        <div className="observation-source">
          <p className="body-copy">
            <strong>Copernicus Sentinel-2 L2A</strong> · {data.resolutionMeters} m sampling grid
          </p>
          <p className="body-copy">{data.window.from.slice(0, 10)} to {inclusiveEnd(data.window)} UTC</p>
          {quality ? (
            <>
              <p className="body-copy">{day ? "Observation day" : "Latest candidate"} <strong>{quality.from.slice(0, 10)} UTC</strong></p>
              <p className="body-copy">
                {percent(quality.cloudFraction)} cloud over observed pixels · {percent(quality.clearCoverage)} approximate clear area coverage
                {" · "}{data.observedDays} observed day{data.observedDays === 1 ? "" : "s"} in range
              </p>
            </>
          ) : null}
        </div>
      </div>
      {day ? (
        <>
          <dl className={full ? "observation-index-grid" : "summary-grid"}>
            {indexKeys.map((key) => (
              <div key={key}>
                <dt className="supporting-label">{indices[key].label} · {indices[key].title}</dt>
                <dd><strong>{day[key]?.toFixed(2) ?? "Unavailable"}</strong></dd>
                <dd className="body-copy">{interpretIndex(key, day[key]) ?? "Too few eligible pixels for this index."}</dd>
                {full ? (
                  <>
                    <dd className="body-copy">{indices[key].limitation}</dd>
                    <dd><IndexScale index={key} /></dd>
                  </>
                ) : null}
              </div>
            ))}
          </dl>
          <p className="body-copy">
            <strong>Among clear pixels (Sentinel-2 SCL):</strong>{" "}
            {percent(day.waterFraction)} water · {percent(day.vegetationFraction)} vegetation
          </p>
          <p className="body-copy">
            Indices are daily area means. Colour breaks are for display and do not classify the land.
          </p>
        </>
      ) : (
        <p className="body-copy">
          {data.observedDays === 0
            ? "No satellite observations were returned for this area and period."
            : "No day met the clear coverage and valid pixel requirements. No indices are reported."}
        </p>
      )}
    </div>
  );
}
