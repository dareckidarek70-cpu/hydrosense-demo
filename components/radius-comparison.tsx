"use client";

import { useState } from "react";
import { compareDays, indexKeys, indices, latestSharedDay } from "@/lib/copernicus/interpretation";
import type { AreaStats } from "@/lib/copernicus/observations";
import { radiusAreaHectares, type ObservationWindow } from "@/lib/copernicus/request";
import { useAreaObservation, type PointArea } from "./area-observation";
import { useLocale } from "./locale";

function IndexBar({ value, variant }: { value: number | null; variant: string }) {
  const { num } = useLocale();
  if (value === null) return <span>—</span>;
  return (
    <div className="comparison-reading">
      <span className="comparison-track" aria-hidden="true">
        <span className={variant} style={{ width: `${Math.abs(value) * 50}%`, left: `${50 + Math.min(0, value) * 50}%` }} />
      </span>
      <span>{num(value, 2)}</span>
    </div>
  );
}

export function RadiusComparison({ area, period, data }: { area: PointArea; period: ObservationWindow; data: AreaStats }) {
  const { t, num, date, percent } = useLocale();
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
      <h2>{t("compareRadius")}</h2>
      <p className="print-hidden">{t("compareBlurb")}</p>
      <button type="button" className="button-secondary print-hidden" aria-expanded={compare} onClick={() => setCompare(!compare)}>
        {t(compare ? "hideComparison" : "compareBoth")}
      </button>
      {compare && !state ? <p role="status" className="print-hidden">{t("compareLoading")}</p> : null}
      {compare && state && "error" in state ? (
        <div className="print-hidden"><p role="alert">{t(state.error)}</p><button className="button-secondary" type="button" onClick={retry}>{t("compareRetry")}</button></div>
      ) : null}
      {compare && other ? (
        <>
          <p>
            {shared
              ? t("sharedDate", { date: date(shared.left.from) }) : t("noShared")}
            {" "}{t("overlap")}
          </p>
          <table className="radius-table">
            <thead><tr>
              <th scope="col">{t("index")}</th>
              <th scope="col">500 m · {num(radiusAreaHectares(500), 1)} ha</th>
              <th scope="col">1 km · {num(radiusAreaHectares(1000), 1)} ha</th>
              <th scope="col">{t("delta")}</th>
            </tr></thead>
            <tbody>
              <tr><th scope="row">{t("dateUtc")}</th><td>{left ? date(left.from) : "—"}</td><td>{right ? date(right.from) : "—"}</td><td>—</td></tr>
              <tr><th scope="row">{t("clear")}</th><td>{percent(left?.clearCoverage ?? null)}</td><td>{percent(right?.clearCoverage ?? null)}</td><td>—</td></tr>
              <tr><th scope="row">{t("cloud")}</th><td>{percent(left?.cloudFraction ?? null)}</td><td>{percent(right?.cloudFraction ?? null)}</td><td>—</td></tr>
              {indexKeys.map((key) => {
                const delta = shared ? compareDays(left, right, key) : null;
                return (
                  <tr key={key}>
                    <th scope="row">{indices[key].label}</th>
                    <td><IndexBar value={left?.[key] ?? null} variant="comparison-bar-a" /></td>
                    <td><IndexBar value={right?.[key] ?? null} variant="comparison-bar-b" /></td>
                    <td>{delta === null ? "—" : num(delta, 2, true)}</td>
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
