import { PrintBriefButton } from "@/components/print-brief-button";
import { ReportSectionCard } from "@/components/cards/report-section-card";
import { ScoreCard } from "@/components/cards/score-card";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import { ResultsScoreChart } from "@/components/results-score-chart";
import { getDemoAnalysis } from "@/lib/mock-analysis";

type ResultsPageProps = {
  searchParams?: Promise<{
    parcel?: string;
    mode?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    investment?: string;
    irrigation?: string;
    cropFit?: string;
    risk?: string;
    source?: string;
  }>;
};

type ScoreValue = {
  value: number;
  label: string;
  description: string;
};

type ResultsAnalysis = {
  parcelLabel: string;
  executiveSummary: string;
  generatedOn: string;
  verdictLabel: string;
  verdictHeadline: string;
  verdictBody: string;
  quietNote: string;
  locationBadge: string;
  areaBadge: string;
  terrainBadge: string;
  confidenceBadge: string;
  sourceBadge?: {
    text: string;
    bg: string;
    color: string;
    border: string;
  };
  scores: {
    investment: ScoreValue;
    irrigation: ScoreValue;
    cropFit: ScoreValue;
    risk: {
      value: string;
      label: string;
      description: string;
    };
  };
  sections: Array<{
    title: string;
    body: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberOrFallback(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateTime() {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function buildRiskDescription(risk: string) {
  const normalized = risk.toLowerCase();

  if (normalized === "low") {
    return "The current signal pattern looks stable enough for a first pilot review.";
  }

  if (normalized === "high") {
    return "This area should be treated cautiously until more evidence is collected.";
  }

  return "This area looks promising, but still needs selective follow-up validation.";
}

function buildScoreDescription(name: string, value: number) {
  if (name === "investment") {
    if (value >= 80) return "The business case looks strong for an early-stage review.";
    if (value >= 70) return "The area looks promising from an investment perspective.";
    return "The business case is still early and needs more supporting evidence.";
  }

  if (name === "irrigation") {
    if (value >= 80) return "Water access looks strong and irrigation appears realistic.";
    if (value >= 70) return "Water access looks good and irrigation should be feasible.";
    return "Irrigation looks possible, but the case is still only moderately convincing.";
  }

  if (name === "cropFit") {
    if (value >= 80) return "The land appears well suited for the selected crop profile.";
    if (value >= 70) return "The land looks reasonably well matched to productive use.";
    return "Crop suitability is still mixed and would benefit from deeper validation.";
  }

  return "";
}

function buildCustomVerdict(params: {
  investment: number;
  irrigation: number;
  cropFit: number;
}) {
  const { investment, irrigation, cropFit } = params;

  let headline = "";
  let body = "";

  if (investment >= 80) {
    headline =
      "This location shows strong investment potential and stands out as a high-value screening candidate.";
  } else if (investment >= 70) {
    headline =
      "This location shows credible investment potential and is suitable for a presentation-ready screening brief.";
  } else {
    headline =
      "This location remains exploratory and should be treated as an early-stage screening case.";
  }

  if (irrigation < 60 && cropFit < 60) {
    body =
      "Water access may require additional verification, and crop suitability appears limited under the current signal pattern.";
  } else if (irrigation < 60) {
    body =
      "Water access may require additional verification, even though the broader land-use signal remains reasonably encouraging.";
  } else if (cropFit < 60) {
    body =
      "Water conditions look workable, but crop suitability appears mixed and may require a more selective production strategy.";
  } else if (irrigation >= 75 && cropFit >= 75) {
    body =
      "The point-based analysis suggests a balanced and attractive profile across land suitability, water access, and presentation value.";
  } else {
    body =
      "The point-based analysis suggests a moderately balanced profile, suitable for discussion, comparison, and follow-up review.";
  }

  return { headline, body };
}

function getResultsSourceBadge(source?: string) {
  if (source === "live") {
    return {
      text: "LIVE",
      bg: "rgba(36,107,68,0.12)",
      color: "#1f5e3c",
      border: "1px solid rgba(36,107,68,0.18)",
    };
  }

  if (source === "estimated") {
    return {
      text: "ESTIMATED",
      bg: "rgba(124,110,84,0.12)",
      color: "#6f5a38",
      border: "1px solid rgba(124,110,84,0.18)",
    };
  }

  return undefined;
}

function buildCustomAnalysis(params: {
  lat?: string;
  lng?: string;
  radius?: string;
  investment?: string;
  irrigation?: string;
  cropFit?: string;
  risk?: string;
  source?: string;
}): ResultsAnalysis {
  const lat = toNumber(params.lat, 45.4372);
  const lng = toNumber(params.lng, 12.3346);
  const radius = toNumber(params.radius, 500);
  const investment = toNumber(params.investment, 70);
  const irrigation = toNumber(params.irrigation, 66);
  const cropFit = toNumber(params.cropFit, 69);
  const risk = textOrFallback(params.risk, "Medium");
  const source = textOrFallback(params.source, "estimated");

  const customVerdict = buildCustomVerdict({
    investment,
    irrigation,
    cropFit,
  });

  return {
    parcelLabel: `Selected point — ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    executiveSummary:
      "This brief was generated from a point selected directly on the map. HydroSense combines live Copernicus-based indicators with a simple decision-support scoring model to create a fast, presentation-ready summary.",
    generatedOn: formatDateTime(),
    verdictLabel: "Custom point review",
    verdictHeadline: customVerdict.headline,
    verdictBody: customVerdict.body,
    quietNote: source === "live" ? "Live custom area brief" : "Estimated custom area brief",
    locationBadge: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    areaBadge: radius === 1000 ? "1 km analysis radius" : "500 m analysis radius",
    terrainBadge: "Selected location",
    confidenceBadge: source === "live" ? "Copernicus live screening" : "Estimated satellite screening",
    sourceBadge: getResultsSourceBadge(source),
    scores: {
      investment: {
        value: investment,
        label: "Investment potential",
        description: buildScoreDescription("investment", investment),
      },
      irrigation: {
        value: irrigation,
        label: "Irrigation potential",
        description: buildScoreDescription("irrigation", irrigation),
      },
      cropFit: {
        value: cropFit,
        label: "Crop suitability",
        description: buildScoreDescription("cropFit", cropFit),
      },
      risk: {
        value: risk,
        label: "Risk level",
        description: buildRiskDescription(risk),
      },
    },
    sections: [
      {
        title: "Why this point matters",
        body: `The selected point (${lat.toFixed(5)}, ${lng.toFixed(
          5
        )}) was turned into a ${radius === 1000 ? "1 km" : "500 m"} screening zone to test how quickly HydroSense can move from map interaction to a full decision-ready brief.`,
      },
      {
        title: "Vegetation and land signal",
        body:
          cropFit >= 80
            ? "The available satellite indicators suggest a strong land-use match and a stable basis for productive agricultural planning."
            : cropFit >= 70
            ? "The available indicators suggest a fairly good match between location conditions and productive use, although not without some uncertainty."
            : "Crop suitability appears more limited at this location, so any agricultural recommendation should be treated as selective rather than broad-based.",
      },
      {
        title: "Water and irrigation outlook",
        body:
          irrigation >= 80
            ? "Water-related signals look supportive, which makes irrigation planning more realistic and commercially interesting."
            : irrigation >= 70
            ? "Water-related signals look reasonably supportive, suggesting that irrigation may be feasible under the right operating assumptions."
            : "Water access may require additional verification before this location can be framed as a strong irrigation-ready opportunity.",
      },
      {
        title: "Presentation takeaway",
        body:
          investment >= 80
            ? "This is a strong example of how HydroSense can identify promising locations in real time and turn them into an executive summary within seconds."
            : investment >= 70
            ? "This is a useful example of a balanced screening result that can support discussion, comparison, and follow-up review."
            : "This point works well as a transparent workflow demonstration, but it should be presented as an exploratory case rather than a leading recommendation.",
      },
    ],
  };
}

function normalizeDemoAnalysis(raw: unknown): ResultsAnalysis {
  const data = isRecord(raw) ? raw : {};
  const metaObj = isRecord(data.meta) ? data.meta : {};
  const execObj = isRecord(data.executiveSummary) ? data.executiveSummary : {};
  const groundwaterObj = isRecord(data.groundwaterAndMoisture)
    ? data.groundwaterAndMoisture
    : {};
  const soilObj = isRecord(data.soilAndLandProfile) ? data.soilAndLandProfile : {};
  const cropObj = isRecord(data.cropRecommendations) ? data.cropRecommendations : {};
  const irrigationObj = isRecord(data.irrigationPlan) ? data.irrigationPlan : {};
  const riskObj = isRecord(data.riskAndSustainability)
    ? data.riskAndSustainability
    : {};

  const parcelLabel = textOrFallback(
    metaObj.label ?? metaObj.parcelLabel ?? data.parcelLabel ?? data.title,
    "Parcel B — Mestre Plain"
  );

  const executiveSummary = textOrFallback(
    execObj.summary ?? data.summary,
    "HydroSense suggests that this parcel combines strong crop suitability, realistic water access, and land conditions that support diversified agricultural production with moderate irrigation investment."
  );

  const verdictHeadline = textOrFallback(
    execObj.headline,
    "Parcel B looks like the strongest option in this demo set."
  );

  const verdictBody = textOrFallback(
    execObj.verdict,
    "Well suited for presentation, planning, and pilot development."
  );

  const locationBadge = textOrFallback(
    metaObj.region ?? metaObj.location ?? data.location,
    "Mestre Plain, Veneto"
  );

  const areaBadge =
    typeof metaObj.areaHectares === "number"
      ? `${metaObj.areaHectares} hectares`
      : textOrFallback(metaObj.area ?? data.area, "212 hectares");

  const terrainBadge = textOrFallback(
    metaObj.terrainType ?? metaObj.terrain ?? data.terrainType,
    "Flat irrigable plain"
  );

  const confidenceBadge = textOrFallback(
    execObj.confidenceIndicator ?? metaObj.confidence ?? data.confidenceIndicator,
    "High confidence"
  );

  const investmentValue = numberOrFallback(execObj.investmentReadiness, 84);
  const irrigationValue = numberOrFallback(execObj.irrigationReadiness, 81);
  const cropFitValue = numberOrFallback(execObj.cropFitScore, 86);

  const riskValue = textOrFallback(riskObj.riskBand ?? data.risk, "Low");

  const nextActions = Array.isArray(data.recommendedNextActions)
    ? data.recommendedNextActions.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];

  return {
    parcelLabel,
    executiveSummary,
    generatedOn: formatDateTime(),
    verdictLabel: "Summary",
    verdictHeadline,
    verdictBody,
    quietNote: "Parcel overview",
    locationBadge,
    areaBadge,
    terrainBadge,
    confidenceBadge,
    scores: {
      investment: {
        value: investmentValue,
        label: "Investment potential",
        description: buildScoreDescription("investment", investmentValue),
      },
      irrigation: {
        value: irrigationValue,
        label: "Irrigation potential",
        description: buildScoreDescription("irrigation", irrigationValue),
      },
      cropFit: {
        value: cropFitValue,
        label: "Crop suitability",
        description: buildScoreDescription("cropFit", cropFitValue),
      },
      risk: {
        value: riskValue,
        label: "Risk level",
        description: buildRiskDescription(riskValue),
      },
    },
    sections: [
      {
        title: "Location context",
        body: textOrFallback(
          soilObj.narrative,
          "This parcel presents a coherent land profile for a live presentation and follow-up review."
        ),
      },
      {
        title: "Water and irrigation outlook",
        body: textOrFallback(
          irrigationObj.narrative ?? groundwaterObj.narrative,
          "Water access looks supportive enough for a realistic irrigation discussion."
        ),
      },
      {
        title: "Crop pathway and land fit",
        body: textOrFallback(
          cropObj.narrative,
          "Crop suitability looks strong enough to support a productive agricultural scenario."
        ),
      },
      {
        title: "Recommended next step",
        body:
          nextActions.length > 0
            ? nextActions.join(" ")
            : "This parcel is suitable for shortlist review and presentation to decision-makers.",
      },
    ],
  };
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = searchParams ? await searchParams : {};
  const mode = params?.mode ?? "demo";

  const analysis =
    mode === "custom"
      ? buildCustomAnalysis(params ?? {})
      : normalizeDemoAnalysis(getDemoAnalysis(params?.parcel ?? "parcel-b"));

  return (
    <div className="container">
      <section className="page-section brief-shell">
        <div className="report-hero glass-card">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <HydroSenseWordmark tone="light" compact />
              <p className="eyebrow">Decision-ready review</p>
              <h1 className="section-title">{analysis.parcelLabel}</h1>
            </div>

            <div className="report-hero-actions print-hidden">
              <PrintBriefButton />
            </div>
          </div>

          <p className="lead">{analysis.executiveSummary}</p>

          <div className="report-meta-row">
            <div className="report-brand-lockup">
              <div className="report-brand-mark">H</div>
              <div>
                <strong>HydroSense</strong>
                <p className="report-quiet-note">{analysis.quietNote}</p>
              </div>
            </div>

            <div className="report-generated">
              <strong>Generated on&nbsp;&nbsp;{analysis.generatedOn}</strong>
            </div>
          </div>

          <div className="report-summary-band">
            <div className="report-summary-copy">
              <p className="supporting-label">{analysis.verdictLabel}</p>
              <h3>{analysis.verdictHeadline}</h3>
              <p className="body-copy">{analysis.verdictBody}</p>

              <div className="badge-row">
                <span className="pill">{analysis.locationBadge}</span>
                <span className="pill">{analysis.areaBadge}</span>
                <span className="pill">{analysis.terrainBadge}</span>
                <span className="pill">{analysis.confidenceBadge}</span>

                {analysis.sourceBadge ? (
                  <span
                    className="pill"
                    style={{
                      background: analysis.sourceBadge.bg,
                      color: analysis.sourceBadge.color,
                      border: analysis.sourceBadge.border,
                      fontWeight: 700,
                    }}
                  >
                    {analysis.sourceBadge.text}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="report-score-grid">
              <ScoreCard
                title="Investment"
                score={analysis.scores.investment.value}
                label={analysis.scores.investment.label}
                description={analysis.scores.investment.description}
              />
              <ScoreCard
                title="Irrigation"
                score={analysis.scores.irrigation.value}
                label={analysis.scores.irrigation.label}
                description={analysis.scores.irrigation.description}
              />
              <ScoreCard
                title="Crop Fit"
                score={analysis.scores.cropFit.value}
                label={analysis.scores.cropFit.label}
                description={analysis.scores.cropFit.description}
              />
            </div>
          </div>
        </div>
       
        <div className="report-layout">
          <section className="report-section-card print-chart-card">
            <p className="supporting-label">Visual comparison</p>
            <h3>Core indicator chart</h3>

            <ResultsScoreChart
              investment={analysis.scores.investment.value}
              irrigation={analysis.scores.irrigation.value}
              cropFit={analysis.scores.cropFit.value}
            />
          </section>

          {analysis.sections.map((section, index) => (
            <ReportSectionCard
              key={`${section.title}-${index}`}
              title={section.title}
              body={section.body}
            />
          ))}

          <ReportSectionCard
            title="Risk level"
            body={analysis.scores.risk.description}
            bullets={[`${analysis.scores.risk.label}: ${analysis.scores.risk.value}`]}
          />
        </div>
      </section>
    </div>
  );
}