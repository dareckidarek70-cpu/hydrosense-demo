"use client";

import { useLocale } from "@/components/locale";
import { waitForPrintLayers } from "@/lib/print-brief";
import { Download, LoaderCircle } from "lucide-react";

import { useState } from "react";
import { flushSync } from "react-dom";

export function PrintBriefButton({ onPrepare }: { onPrepare?: (active: boolean) => void } = {}) {
  const { t } = useLocale();
  const [preparing, setPreparing] = useState(false);
  async function handlePrint(root: Element | null) {
    setPreparing(true);
    const controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      if (onPrepare) flushSync(() => onPrepare(true));
      const decodeImages = (selector: string) => Promise.allSettled(
        Array.from(root?.querySelectorAll<HTMLImageElement>(selector) ?? [], image => image.decode()),
      );
      await Promise.race([
        Promise.allSettled([
          document.fonts.ready,
          decodeImages(".print-report-logo img"),
          (async () => {
            if (root) await waitForPrintLayers(root, controller.signal);
            if (!controller.signal.aborted) await decodeImages("[data-print-image]");
          })(),
        ]),
        new Promise<void>((resolve) => { deadline = setTimeout(() => { controller.abort(); resolve(); }, 25_000); }),
      ]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
    } finally {
      clearTimeout(deadline);
      controller.abort();
      onPrepare?.(false);
      setPreparing(false);
    }
  }

  return (
    <button className="button export-button print-hidden" onClick={event => void handlePrint(event.currentTarget.closest(".brief-shell"))} type="button" disabled={preparing}>
      {preparing ? <LoaderCircle size={17} className="loading-icon" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
      {preparing ? t("printPreparing") : t("printAction")}
    </button>
  );
}
