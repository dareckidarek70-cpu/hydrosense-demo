"use client";

import { useEffect, useState } from "react";
import { responseFailure, type FailureCode } from "@/lib/copernicus/errors";
import { reportRasterDebounceMs } from "@/lib/copernicus/report-map";
import { MapRasterCache } from "@/lib/map-raster-cache";
import { visibleRasterFraction } from "@/lib/raster-viewport";

type Raster = { kind: "ready"; url: string; visible: number } | { kind: "empty" }
  | { kind: "failure"; reason: FailureCode | "mapInvalidImage" | "reportMapFailure" };

export function useReportRaster(key: string | null, attempt: number, cache: MapRasterCache) {
  const [result, setResult] = useState<{ key: string; attempt: number; raster: Raster }>();
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const { signal } = controller;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const set = (raster: Raster) => setResult({ key, attempt, raster });

    const launch = setTimeout(async () => {
      let pendingUrl: string | undefined;
      deadline = setTimeout(() => {
        if (signal.aborted) return;
        controller.abort();
        set({ kind: "failure", reason: "timeout" });
      }, 24_000);
      try {
        const cached = cache.get(key);
        let blob: Blob | undefined;
        if (!cached) {
          const response = await fetch(key, { signal });
          if (!response.ok) {
            const reason = await responseFailure(response);
            if (!signal.aborted) set({ kind: "failure", reason });
            return;
          }
          const type = response.headers.get("Content-Type")?.split(";")[0];
          if (type !== "image/webp" && type !== "image/png") {
            if (!signal.aborted) set({ kind: "failure", reason: "mapInvalidImage" });
            return;
          }
          blob = await response.blob();
          if (signal.aborted) return;
          pendingUrl = URL.createObjectURL(blob);
        }
        const url = cached ?? pendingUrl;
        if (!url) return;
        const image = new Image();
        image.src = url;
        try { await image.decode(); } catch {
          if (!signal.aborted) {
            if (cached) cache.delete(key);
            set({ kind: "failure", reason: "mapInvalidImage" });
          }
          return;
        }
        if (signal.aborted) return;
        if (image.naturalWidth !== 720 || image.naturalHeight !== 324) {
          if (cached) cache.delete(key);
          set({ kind: "failure", reason: "mapInvalidImage" });
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Unavailable raster canvas");
        context.drawImage(image, 0, 0);
        const visible = visibleRasterFraction(context.getImageData(0, 0, canvas.width, canvas.height).data);
        if (blob) {
          cache.store(key, blob, Date.now(), url);
          pendingUrl = undefined;
        }
        set(visible === 0 ? { kind: "empty" } : { kind: "ready", url, visible });
      } catch {
        if (!signal.aborted) set({ kind: "failure", reason: "reportMapFailure" });
      } finally {
        clearTimeout(deadline);
        if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      }
    }, cache.get(key) ? 0 : reportRasterDebounceMs);
    return () => { clearTimeout(launch); clearTimeout(deadline); controller.abort(); };
  }, [key, attempt, cache]);

  return result && result.key === key && result.attempt === attempt ? result.raster : null;
}
