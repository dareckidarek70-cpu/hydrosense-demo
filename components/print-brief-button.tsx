"use client";

import { useState } from "react";

export function PrintBriefButton() {
  const [preparing, setPreparing] = useState(false);
  async function handlePrint() {
    setPreparing(true);
    try {
      const rasters = document.querySelectorAll<HTMLImageElement>("[data-report-raster]");
      await Promise.allSettled(Array.from(rasters, (image) => image.decode()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
    } finally {
      setPreparing(false);
    }
  }

  return (
    <button className="button export-button print-hidden" onClick={handlePrint} type="button" disabled={preparing}>
      {preparing ? "Preparing brief…" : "Export / Print Brief"}
    </button>
  );
}
