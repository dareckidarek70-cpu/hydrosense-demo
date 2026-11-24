import Link from "next/link";
import { PrintBriefButton } from "@/components/print-brief-button";
import { ReportSectionCard } from "@/components/cards/report-section-card";
import { ScoreCard } from "@/components/cards/score-card";
import { ResultsScoreChart } from "@/components/results-score-chart";
import { ParcelAiChat } from "@/components/parcel-ai-chat";
import { PrintReportLogo } from "@/components/print-report-logo";
import { ObservedAreaBrief } from "@/components/observed-area-brief";
import { getLocalization } from "@/lib/i18n/server";
import { demoPresentation } from "@/lib/i18n/demo";
import { dateObservationWindow, observationWindow, pointFromQuery } from "@/lib/copernicus/request";
import { soilPreviewAt } from "@/lib/soil-preview";
import { reportTop } from "@/lib/report-navigation";
import { releaseFeatures } from "@/lib/release-features";

type ResultsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = searchParams ? await searchParams : {};
  const { locale, t, dateTime, num } = await getLocalization();
  const generatedAt = new Date().toISOString();
  if (params.mode === "custom" || params.mode === "water") {
    const area = pointFromQuery(params.lat, params.lng, params.radius);
    const period = params.from === undefined && params.to === undefined
      ? observationWindow() : dateObservationWindow(params.from, params.to);
    return area && period ? <ObservedAreaBrief key={JSON.stringify([area, period])} area={area} generatedAt={generatedAt}
      initialPeriod={period} soilPreview={releaseFeatures().soil ? soilPreviewAt(area.coordinates) : undefined} /> : (
      <section className="container page-section">
        <h1 id={reportTop} className="section-title" data-report-jump tabIndex={-1}>{t("invalidArea")}</h1>
        <Link className="button-secondary" href="/select-area">{t("chooseArea")}</Link>
      </section>
    );
  }

  const { meta, copy, scores } = demoPresentation(typeof params.parcel === "string" ? params.parcel : undefined, locale);

  return (
    <div className="container">
      <section className="page-section brief-shell demo-brief-shell">
        <div className="report-hero">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <div className="print-only"><PrintReportLogo /></div>
              <p className="eyebrow">{t("sampleBrief")}</p>
              <h1 id={reportTop} className="section-title" data-report-jump tabIndex={-1}>{copy.label}</h1>
            </div>
            <div className="report-hero-actions print-hidden"><PrintBriefButton /></div>
          </div>

          <p className="lead">{copy.summary}</p>
          <div className="report-meta-row">
            <p className="report-quiet-note">{t("demoNote")}</p>
            <div className="report-generated"><span>{t("generated")}</span><strong>{dateTime(generatedAt)} UTC</strong></div>
          </div>

          <div className="report-summary-band">
            <div className="report-summary-copy">
              <p className="supporting-label">{t("verdict")}</p>
              <h3>{copy.headline}</h3>
              <p className="body-copy">{copy.verdict}</p>
              <div className="badge-row">
                <span className="pill">{copy.region}</span>
                <span className="pill">{num(meta.areaHectares)} ha</span>
                <span className="pill">{copy.terrain}</span>
              </div>
            </div>
            <div className="report-score-grid">
              <ScoreCard title={t("investment")} score={scores.investment} label={t("scoreDemo")} />
              <ScoreCard title={t("irrigation")} score={scores.irrigation} label={t("scoreDemo")} />
              <ScoreCard title={t("cropFit")} score={scores.cropFit} label={t("scoreDemo")} />
              <ScoreCard title={t("sustainability")} score={scores.sustainability} label={t("scoreDemo")} />
            </div>
          </div>
        </div>

        <ResultsScoreChart scores={scores} locale={locale} />
        <div className="demo-brief-sections">
          <ReportSectionCard title={t("waterGround")} body={copy.water} />
          <ReportSectionCard title={t("soilLand")} body={copy.soil} />
          <ReportSectionCard title={t("cropSuitability")} body={copy.crops} />
          <ReportSectionCard title={t("irrigationOpportunity")} body={copy.irrigation} />
          <ReportSectionCard title={t("riskSustainability")} body={copy.risk} />
          <ReportSectionCard title={t("nextActions")} body={t("verifyDemo")} bullets={copy.next} />
        </div>
        <ParcelAiChat reference={{ mode: "demo", parcelId: meta.id }} subject={copy.label} />
        <p className="print-only print-footer">{t("printDemoFooter")}</p>
      </section>
    </div>
  );
}
