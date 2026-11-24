"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { reportBufferPixels as BUFFER_PIXELS, reportMapHeight as HEIGHT, reportMapWidth as WIDTH } from "@/lib/copernicus/report-map";
import type { PointArea } from "./area-observation";
import { useLocale } from "./locale";

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
            loading="eager" data-report-raster data-print-raster data-raster-ready={status === "ready"}
            onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
        ) : null}
        <ObservationMapMarks area={area} outline={status !== "ready"} />
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

export function ObservationMapMarks({ area, outline }: { area: PointArea; outline: boolean }) {
  const { t } = useLocale();
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t("mapA11y")}>
      {outline ? (
        <g stroke="#becfe4" strokeWidth="0.7">
          {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${i * 35} 0v216`} />)}
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M0 ${i * 36}h480`} />)}
        </g>
      ) : null}
      <circle cx="240" cy="108" r={BUFFER_PIXELS} fill="none" stroke="#0f172a" strokeWidth="4" />
      <circle cx="240" cy="108" r={BUFFER_PIXELS} fill="none" stroke="#cffafe" strokeWidth="2" />
      <circle cx="240" cy="108" r="3.4" fill="#fff" stroke="#0f172a" strokeWidth="1.2" />
      <g fill="#0f172a" stroke="#0f172a">
        <rect x="443" y="11" width="24" height="39" rx="4" fill="#fff" stroke="none" />
        <path d="M455 16l-6 12 6-3 6 3z" />
        <text x="455" y="42" textAnchor="middle" stroke="none">N</text>
        <rect x="12" y="174" width="106" height="31" rx="4" fill="#fff" stroke="none" />
        <path d="M24 184h75m-75-3v6m75-6v6" fill="none" strokeWidth="1.7" />
        <text x="61.5" y="198" textAnchor="middle" stroke="none">{area.radiusMeters} m</text>
      </g>
    </svg>
  );
}
