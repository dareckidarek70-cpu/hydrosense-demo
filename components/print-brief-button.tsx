"use client";

import { useLocale } from "@/components/locale";

import { useState } from "react";

export function PrintBriefButton() {
  const { t } = useLocale();
  const [preparing, setPreparing] = useState(false);
  async function handlePrint() {
    setPreparing(true);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const rasters = document.querySelectorAll<HTMLImageElement>("[data-report-raster]");
      await Promise.race([
        Promise.allSettled(Array.from(rasters, (image) => image.decode())),
        new Promise<void>((resolve) => { deadline = setTimeout(resolve, 25_000); }),
      ]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
    } finally {
      clearTimeout(deadline);
      setPreparing(false);
    }
  }

  return (
    <button className="button export-button print-hidden" onClick={handlePrint} type="button" disabled={preparing}>
      {preparing ? t("printPreparing") : t("printAction")}
    </button>
  );
}
