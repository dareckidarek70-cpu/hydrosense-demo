"use client";

import { useLocale } from "@/components/locale";
export default function Loading() {
  const { t } = useLocale();
  return (
    <div className="container">
      <section className="page-section report-layout">
        <div className="glass-card report-hero loading-card">
          <div className="section-heading">
            <span className="eyebrow">{t("generating")}</span>
            <h1 className="section-title">{t("preparing")}</h1>
            <p className="lead">{t("loadingReport")}</p>
          </div>
          <div className="report-summary-band">
            <div className="loading-block shimmer" />
            <div className="report-score-grid">
              <div className="loading-block shimmer loading-block--tall" />
              <div className="loading-block shimmer loading-block--tall" />
              <div className="loading-block shimmer loading-block--tall" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
