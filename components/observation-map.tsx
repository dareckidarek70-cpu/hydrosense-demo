"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Observation } from "@/lib/copernicus/observations";
import type { PointArea } from "./area-observation";
import { useLocale } from "./locale";

const WIDTH = 480;
const HEIGHT = 216;
const BUFFER_PIXELS = 75;
const METERS_PER_DEGREE = Math.PI * 6_371_008.8 / 180;

export function observationMapUrl(area: PointArea, day: Observation | null) {
  if (!day) return null;
  const [lat, lng] = area.coordinates;
  const step = area.radiusMeters / BUFFER_PIXELS;
  const latitudeSpan = (HEIGHT / 2) * step / METERS_PER_DEGREE;
  const longitudeSpan = (WIDTH / 2) * step / METERS_PER_DEGREE / Math.cos(lat * Math.PI / 180);
  if (Math.abs(lat) + latitudeSpan > 84 || Math.abs(lng) + longitudeSpan > 180) return null;
  const query = new URLSearchParams({
    minLng: (lng - longitudeSpan).toFixed(7), minLat: (lat - latitudeSpan).toFixed(7),
    maxLng: (lng + longitudeSpan).toFixed(7), maxLat: (lat + latitudeSpan).toFixed(7),
    width: "720", height: "324", layer: "TRUE_COLOR", from: day.from, to: day.to,
  });
  return `/api/copernicus/layer?${query}`;
}

export function ObservationMap({ area, url, date }: { area: PointArea; url: string | null; date?: string }) {
  const { t, date: formatDate } = useLocale();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(url ? "loading" : "error");
  useEffect(() => {
    if (status !== "loading") return;
    const timeout = setTimeout(() => setStatus("error"), 24_000);
    return () => clearTimeout(timeout);
  }, [status]);
  return (
    <figure className="observation-map">
      <div className="observation-map-frame">
        {url ? (
          <Image src={url} alt={t("mapAlt")} fill unoptimized
            loading="eager" data-report-raster data-raster-ready={status === "ready"}
            onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
        ) : null}
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t("mapA11y")}>
          {status !== "ready" ? (
            <g stroke="#c5d2c8" strokeWidth="0.7">
              {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${i * 35} 0v216`} />)}
              {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M0 ${i * 36}h480`} />)}
            </g>
          ) : null}
          <circle cx="240" cy="108" r={BUFFER_PIXELS} fill="#9cf6c5" fillOpacity=".14" stroke="#143d2e" strokeWidth="5" />
          <circle cx="240" cy="108" r={BUFFER_PIXELS} fill="none" stroke="#f9fff7" strokeWidth="2.5" />
          <circle cx="240" cy="108" r="3.4" fill="#fff" stroke="#143d2e" strokeWidth="1.2" />
          <g fill="#143d2e" stroke="#143d2e">
            <rect x="443" y="11" width="24" height="39" rx="4" fill="#fff" stroke="none" />
            <path d="M455 16l-6 12 6-3 6 3z" />
            <text x="455" y="42" textAnchor="middle" stroke="none">N</text>
            <rect x="12" y="174" width="106" height="31" rx="4" fill="#fff" stroke="none" />
            <path d="M24 184h75m-75-3v6m75-6v6" fill="none" strokeWidth="1.7" />
            <text x="61.5" y="198" textAnchor="middle" stroke="none">{area.radiusMeters} m</text>
          </g>
        </svg>
      </div>
      <figcaption>
        {status === "loading" ? (
          <>
            <span className="print-hidden">{t("mapImageLoading")}</span>
            <span className="print-only">{t("mapOutline")}</span>
          </>
        ) : status === "ready" && date ? t("mapCaption", { date: formatDate(date) }) : t("mapOutline")}
      </figcaption>
    </figure>
  );
}
