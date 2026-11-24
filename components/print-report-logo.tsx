"use client";

import { useLocale } from "@/components/locale";
import Image from "next/image";
import { brandAssets } from "@/lib/brand-assets";

export function PrintReportLogo() {
  const { t } = useLocale();
  return (
    <div className="print-report-logo">
      <div className="print-report-main-brand">
        <Image
          src={brandAssets.hydroSense}
          alt={t("logo")}
          width={40}
          height={40}
          unoptimized
          loading="eager"
          className="print-report-hydrosense-mark"
        />

        <div className="print-report-brand-text">
          <strong>HydroSense</strong>
          <span>{t("brand")}</span>
        </div>
      </div>

      <div className="print-report-partner-logos">
        <Image
          src={brandAssets.leo}
          alt={t("leo")}
          width={40}
          height={40}
          unoptimized
          loading="eager"
          className="print-report-partner-logo"
        />

        <Image
          src={brandAssets.astroYouth}
          alt={t("ayc")}
          width={40}
          height={40}
          unoptimized
          loading="eager"
          className="print-report-partner-logo"
        />
      </div>
    </div>
  );
}
