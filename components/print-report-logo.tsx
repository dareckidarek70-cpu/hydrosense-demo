"use client";

import { useLocale } from "@/components/locale";
import Image from "next/image";

export function PrintReportLogo() {
  const { t } = useLocale();
  return (
    <div className="print-report-logo">
      <div className="print-report-main-brand">
        <Image
          src="/hydrosense-logo.png"
          alt={t("logo")}
          width={40}
          height={40}
          unoptimized
          className="print-report-hydrosense-mark"
        />

        <div className="print-report-brand-text">
          <strong>HydroSense</strong>
          <span>{t("brand")}</span>
        </div>
      </div>

      <div className="print-report-partner-logos">
        <Image
          src="/Projekt_Logo.png"
          alt={t("leo")}
          width={40}
          height={40}
          unoptimized
          className="print-report-partner-logo"
        />

        <Image
          src="/sketch_Logo.jpg"
          alt={t("ayc")}
          width={40}
          height={40}
          unoptimized
          className="print-report-partner-logo"
        />
      </div>
    </div>
  );
}
