"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AreaStats, Observation } from "@/lib/copernicus/observations";
import { inclusiveEnd, type AreaGeometry, type ObservationWindow } from "@/lib/copernicus/request";
import { indexKeys, indices, interpretIndex, localIndex } from "@/lib/copernicus/interpretation";
import { IndexScale } from "./satellite-legend";
import { responseFailure, type FailureCode } from "@/lib/copernicus/response-error";
import { useLocale } from "./locale";
import { getCachedObservation, rememberObservation } from "@/lib/observation-cache";
import { reportEvidenceId } from "@/lib/report-evidence-links";

export type PointArea = Extract<AreaGeometry, { type: "PointBuffer" }>;

type ObservationState = { data: AreaStats } | { error: FailureCode };
const recent = new Map<string, { data: AreaStats; expires: number }>();

function session() {
  try { return window.sessionStorage; } catch { return null; }
}

export function useAreaObservation(area: PointArea | null, period: ObservationWindow, debounceMs = 0) {
  const key = area ? JSON.stringify({ geometry: area, from: period.from, to: period.to }) : null;
  const [result, setResult] = useState<{ key: string; attempt: number; state: ObservationState }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const requested = JSON.parse(key) as ObservationWindow;
    const matchesWindow = (data: AreaStats) => Date.parse(data.window?.from) === Date.parse(requested.from)
      && Date.parse(data.window?.to) === Date.parse(requested.to);
    const storage = session();
    const recentEntry = recent.get(key);
    const stored = recentEntry && recentEntry.expires > Date.now() ? recentEntry.data
      : storage ? getCachedObservation(storage, key) : undefined;
    const cached = stored && matchesWindow(stored) ? stored : undefined;
    const controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    const timer = window.setTimeout(async () => {
      if (cached) {
        setResult({ key, attempt, state: { data: cached } });
        return;
      }
      deadline = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 35_000);
      try {
        const response = await fetch("/api/copernicus/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = await responseFailure(response);
          if (!controller.signal.aborted) setResult({ key, attempt, state: { error } });
          return;
        }
        const body = await response.json() as AreaStats;
        if (!Array.isArray(body.days) || !matchesWindow(body)) {
          if (!controller.signal.aborted) setResult({ key, attempt, state: { error: "providerError" } });
          return;
        }
        if (controller.signal.aborted) return;
        const first = recent.keys().next().value;
        if (recent.size >= 8 && first) recent.delete(first);
        recent.set(key, { data: body, expires: Date.now() + 5 * 60_000 });
        if (storage) rememberObservation(storage, key, body);
        setResult({ key, attempt, state: { data: body } });
      } catch {
        if (timedOut || !controller.signal.aborted) {
          setResult({
            key, attempt, state: { error: timedOut ? "timeout" : "networkError" },
          });
        }
      } finally {
        clearTimeout(deadline);
      }
    }, cached ? 0 : debounceMs);

    return () => {
      window.clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [key, attempt, debounceMs]);

  return {
    state: result && result.key === key && result.attempt === attempt ? result.state : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}

export function ObservationDetails({ data, day = data.observation, full = false, map, printAtlas }: {
  data: AreaStats;
  day?: Observation | null;
  full?: boolean;
  map?: ReactNode;
  printAtlas?: ReactNode;
}) {
  const { locale, t, date, num, percent } = useLocale();
  const quality = day ?? data.latestObserved;
  const target = full && day ? reportEvidenceId.sentinel(day.from.slice(0, 10)) : undefined;

  return (
    <div className="metric-stack">
      <div className={map ? "observation-overview" : undefined} data-print-atlas={printAtlas ? "true" : undefined}>
        {map}
        <div className="observation-source" id={target} tabIndex={target ? -1 : undefined}
          data-evidence-target={target ? "sentinel" : undefined} role={target ? "group" : undefined}
          aria-label={target && day ? `Sentinel-2 L2A · ${date(day.from)} UTC` : undefined}>
          <div className="source-block">
            <p className="supporting-label">{t("evidenceSource")}</p>
            <p className="source-title">Copernicus Sentinel-2 L2A</p>
            <p className="body-copy">{t("grid", { resolution: data.resolutionMeters })}</p>
          </div>
          <div className="source-block">
            <p className="supporting-label">{t("period")}</p>
            <p className="body-copy">{t("dateRange", { from: date(data.window.from), to: date(inclusiveEnd(data.window)) })}</p>
            {quality ? <p className="body-copy">{t(day ? "observationDay" : "candidate")} <strong>{date(quality.from)} UTC</strong></p> : null}
          </div>
          {quality ? (
            <dl className="source-quality">
              <div><dt>{t("cloud")}</dt><dd>{percent(quality.cloudFraction)}</dd></div>
              <div><dt>{t("clear")}</dt><dd>{percent(quality.clearCoverage)}</dd></div>
              <div><dt>{t("observationCount")}</dt><dd>{num(data.observedDays)}</dd></div>
            </dl>
          ) : null}
        </div>
      </div>
      {printAtlas}
      {day ? (
        <>
          {printAtlas ? <h3 className="print-only print-index-heading">{t("printIndexDetails")}</h3> : null}
          <dl className={full ? "observation-index-grid" : "observation-index-grid observation-index-grid--compact"}>
            {indexKeys.map((key) => {
              const copy = localIndex(key, locale);
              return <div key={key} className={`index-card index-card--${key}`}>
                <dt><span className="index-tag">{indices[key].label}</span> <span>{copy.title}</span></dt>
                <dd><strong>{day[key] === null ? t("unavailable") : num(day[key], 2)}</strong></dd>
                <dd className="body-copy">{interpretIndex(key, day[key], locale) ?? t("fewPixels")}</dd>
                {full ? (
                  <>
                    <dd className="body-copy">{copy.limitation}</dd>
                    <dd><IndexScale index={key} /></dd>
                  </>
                ) : null}
              </div>;
            })}
          </dl>
          <p className="body-copy surface-share">
            <strong>{t("scl")}</strong>{" "}
            {t("surfaceShare", { water: percent(day.waterFraction), vegetation: percent(day.vegetationFraction) })}
          </p>
          <p className="body-copy">
            {t("means")}
          </p>
        </>
      ) : (
        <p className="status-note">
          {data.observedDays === 0
            ? t("noData") : t("noUsable")}
        </p>
      )}
    </div>
  );
}
