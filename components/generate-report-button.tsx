"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type GenerateReportButtonProps = {
  parcelId: string;
};

export function GenerateReportButton({ parcelId }: GenerateReportButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isActive = isGenerating || isPending;

  async function handleGenerate() {
    if (isActive) {
      return;
    }

    setIsGenerating(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 950);
    });

    startTransition(() => {
      router.push(`/results?parcel=${parcelId}`);
    });
  }

  return (
    <div className="generate-stack" aria-live="polite">
      <button className="button button--hero" disabled={isActive} onClick={handleGenerate} type="button">
        {isActive ? "Preparing Executive Brief..." : "Generate Executive Brief"}
      </button>
      <p className={`generate-caption ${isActive ? "generate-caption--active" : ""}`}>
        {isActive
          ? "Interpreting curated parcel signals for investor presentation."
          : "Demo-only flow using curated parcel data and mocked Copernicus/GIS interpretation."}
      </p>
    </div>
  );
}
