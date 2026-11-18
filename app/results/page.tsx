import Link from "next/link";
import { PrintBriefButton } from "@/components/print-brief-button";
import { ReportSectionCard } from "@/components/cards/report-section-card";
import { ScoreCard } from "@/components/cards/score-card";
import { ResultsScoreChart } from "@/components/results-score-chart";
import { ParcelAiChat } from "@/components/parcel-ai-chat";
import { PrintReportLogo } from "@/components/print-report-logo";
import { ObservedAreaBrief } from "@/components/observed-area-brief";
import { getDemoAnalysis } from "@/lib/mock-analysis";
import { pointFromQuery } from "@/lib/copernicus/request";

type ResultsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = searchParams ? await searchParams : {};
  const generated = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date());
  if (params.mode === "custom" || params.mode === "water") {
    const area = pointFromQuery(params.lat, params.lng, params.radius);
    return area ? <ObservedAreaBrief area={area} generated={generated} /> : (
      <section className="container page-section">
        <h1 className="section-title">Invalid area selection</h1>
        <Link className="button-secondary" href="/select-area">Choose an area</Link>
      </section>
    );
  }

  const {
    meta, executiveSummary, groundwaterAndMoisture, soilAndLandProfile,
    cropRecommendations, irrigationPlan, riskAndSustainability, recommendedNextActions,
  } = getDemoAnalysis(typeof params.parcel === "string" ? params.parcel : undefined);

  const scores = {
    investment: executiveSummary.investmentReadiness,
    irrigation: executiveSummary.irrigationReadiness,
    cropFit: executiveSummary.cropFitScore,
    sustainability: riskAndSustainability.sustainabilityScore,
  };

  return (
    <div className="container">
      <section className="page-section brief-shell report-layout">
        <div className="report-hero glass-card">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <div className="print-only"><PrintReportLogo /></div>
              <p className="eyebrow">Sample brief · Demonstration</p>
              <h1 className="section-title">{meta.label}</h1>
            </div>
            <div className="report-hero-actions print-hidden"><PrintBriefButton /></div>
          </div>

          <p className="lead">{executiveSummary.summary}</p>
          <div className="report-meta-row">
            <p className="report-quiet-note">
              Scores, site descriptions and recommendations are illustrative. No satellite measurements are used in this sample.
            </p>
            <div className="report-generated"><span>Generated on</span><strong>{generated} UTC</strong></div>
          </div>

          <div className="report-summary-band">
            <div className="report-summary-copy">
              <p className="supporting-label">Example verdict</p>
              <h3>{executiveSummary.headline}</h3>
              <p className="body-copy">{executiveSummary.verdict}</p>
              <div className="badge-row">
                <span className="pill">{meta.region}</span>
                <span className="pill">{meta.areaHectares} hectares</span>
                <span className="pill">{meta.terrainType}</span>
              </div>
            </div>
            <div className="report-score-grid">
              <ScoreCard title="Investment" score={scores.investment} label="Demo score" />
              <ScoreCard title="Irrigation" score={scores.irrigation} label="Demo score" />
              <ScoreCard title="Crop Fit" score={scores.cropFit} label="Demo score" />
              <ScoreCard title="Sustainability" score={scores.sustainability} label="Demo score" />
            </div>
          </div>
        </div>

        <section className="report-section-card print-chart-card"><ResultsScoreChart {...scores} /></section>
        <ReportSectionCard title="Water & Ground Conditions" body={groundwaterAndMoisture.narrative} />
        <ReportSectionCard title="Soil & Land Profile" body={soilAndLandProfile.narrative} />
        <ReportSectionCard title="Crop Suitability" body={cropRecommendations.narrative} />
        <ReportSectionCard title="Irrigation Opportunity" body={irrigationPlan.narrative} />
        <ReportSectionCard title="Risks & Sustainability" body={riskAndSustainability.narrative} />
        <ReportSectionCard title="Recommended Next Actions" body="Verify the example assumptions before considering an investment." bullets={recommendedNextActions} />
        <div className="print-hidden">
          <ParcelAiChat initialAnswer="Ask what records and field checks to gather before evaluating a parcel." />
        </div>
      </section>
    </div>
  );
}
