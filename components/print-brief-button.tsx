"use client";

import { useLocale } from "@/components/locale";
import { Download, LoaderCircle } from "lucide-react";

import { useState } from "react";
import { flushSync } from "react-dom";

export function PrintBriefButton({ onPrepare }: { onPrepare?: (active: boolean) => void } = {}) {
  const { t } = useLocale();
  const [preparing, setPreparing] = useState(false);
  async function handlePrint() {
    setPreparing(true);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      if (onPrepare) flushSync(() => onPrepare(true));
      const rasters = document.querySelectorAll<HTMLImageElement>(onPrepare ? "[data-print-raster]" : "[data-report-raster]");
      await Promise.race([
        Promise.allSettled(Array.from(rasters, (image) => image.decode())),
        new Promise<void>((resolve) => { deadline = setTimeout(resolve, 25_000); }),
      ]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
    } finally {
      clearTimeout(deadline);
      onPrepare?.(false);
      setPreparing(false);
    }
  }

  return (
    <button className="button export-button print-hidden" onClick={handlePrint} type="button" disabled={preparing}>
      {preparing ? <LoaderCircle size={17} className="loading-icon" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
      {preparing ? t("printPreparing") : t("printAction")}
    </button>
  );
}
