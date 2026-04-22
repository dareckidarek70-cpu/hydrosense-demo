import { PrintBriefButton } from "@/components/print-brief-button";
import { ReportSectionCard } from "@/components/cards/report-section-card";
import { ScoreCard } from "@/components/cards/score-card";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import { ResultsScoreChart } from "@/components/results-score-chart";
import { getDemoAnalysis } from "@/lib/mock-analysis";
import { ParcelAiChat } from "@/components/parcel-ai-chat";

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

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

function formatCoordinatePair(lat: number, lng: number) {
  return `${formatCoordinate(lat)}, ${formatCoordinate(lng)}`;
}

function buildRiskDescription(risk: string) {
  const normalized = risk.toLowerCase();

  if (normalized === "low") {
    return "The overall signal looks stable enough for an early review or a small pilot.";
  }

  if (normalized === "high") {
    return "This area should be treated more carefully until the main field conditions are checked on site.";
  }

  return "The area looks promising, but it still needs a few basic checks before any stronger recommendation.";
}

function buildScoreDescription(name: string, value: number) {
  if (name === "investment") {
    if (value >= 80) return "The area looks strong enough to justify a closer review.";
    if (value >= 70) return "The area looks promising from an investment point of view.";
    return "The business case is still quite early and needs more evidence.";
  }

  if (name === "irrigation") {
    if (value >= 80) return "Water access looks strong and irrigation appears realistic.";
    if (value >= 70) return "Water access looks fairly good and irrigation should be possible.";
    return "Irrigation may be possible, but the case is still only moderate.";
  }

  if (name === "cropFit") {
    if (value >= 80) return "The land appears well suited for the chosen crop profile.";
    if (value >= 70) return "The land looks reasonably well matched to productive use.";
    return "Crop suitability looks mixed and would benefit from deeper checking.";
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
      "This location looks strong and stands out as a good candidate for closer review.";
  } else if (investment >= 70) {
    headline =
      "This location looks promising and is worth considering in a shortlist.";
  } else {
    headline =
      "This location should be treated as an early option rather than a leading recommendation.";
  }

  if (irrigation < 60 && cropFit < 60) {
    body =
      "Water access may need more checking, and crop suitability looks limited under the current signal pattern.";
  } else if (irrigation < 60) {
    body =
      "Water access may need more checking, even though the broader land profile still looks reasonably encouraging.";
  } else if (cropFit < 60) {
    body =
      "Water conditions look workable, but crop suitability appears more mixed and may require a selective production plan.";
  } else if (irrigation >= 75 && cropFit >= 75) {
    body =
      "The selected point shows a balanced profile across land suitability, water access, and overall usefulness for a first screening.";
  } else {
    body =
      "The selected point shows a reasonably balanced profile and is suitable for comparison and follow-up review.";
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
  const coordinatePair = formatCoordinatePair(lat, lng);

  const customVerdict = buildCustomVerdict({
    investment,
    irrigation,
    cropFit,
  });

  return {
    parcelLabel: "Selected area",
    executiveSummary:
      "This location was selected directly on the map and quickly analysed using HydroSense. The result is a simple overview of how the area performs in terms of water access, crop suitability, and overall investment potential.",
    generatedOn: formatDateTime(),
    verdictLabel: "Summary",
    verdictHeadline: customVerdict.headline,
    verdictBody:
      customVerdict.body +
      " This is a useful starting point for deciding whether the area is worth a closer look.",
    quietNote:
      source === "live"
        ? "Live analysis"
        : "Estimated analysis based on available data",
    locationBadge: `📍 ${coordinatePair}`,
    areaBadge:
      radius === 1000 ? "1 km screening radius" : "500 m screening radius",
    terrainBadge: "Map-selected point",
    confidenceBadge:
      source === "live" ? "Live satellite data" : "Estimated data",
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
        title: "What this point shows",
        body: `This point (${lat.toFixed(5)}, ${lng.toFixed(
          5
        )}) was selected directly on the map and turned into a ${
          radius === 1000 ? "1 km" : "500 m"
        } analysis area. It shows how quickly a location can be turned into a clear summary that supports the next decision.`,
      },
      {
        title: "Land and vegetation",
        body:
          cropFit >= 80
            ? "The area looks well suited for agricultural use, with conditions that support stable production."
            : cropFit >= 70
            ? "The land looks reasonably suitable, although the final result may depend on crop choice and field management."
            : "The conditions are more mixed, so any production plan should be tested carefully before going further.",
      },
      {
        title: "Water and irrigation",
        body:
          irrigation >= 80
            ? "Water access looks strong, which makes irrigation a realistic and useful option here."
            : irrigation >= 70
            ? "Water conditions look acceptable, although irrigation would still need to be confirmed locally."
            : "Water access may be limited or uncertain, so irrigation should be checked carefully before planning.",
      },
      {
        title: "What to do next",
        body:
          investment >= 80
            ? "This looks like a strong candidate for a deeper review or a small pilot project."
            : investment >= 70
            ? "This area is worth a closer look and could be compared with other locations before making a final decision."
            : "Treat this as an early option and verify key factors such as water, soil, and access before going further.",
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
    "HydroSense suggests that this parcel combines good crop suitability, workable water access, and land conditions that support a realistic agricultural plan."
  );

  const verdictHeadline = textOrFallback(
    execObj.headline,
    "Parcel B looks like the strongest option in this demo set."
  );

  const verdictBody = textOrFallback(
    execObj.verdict,
    "It is well suited for presentation, planning, and early pilot discussion."
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
          "This parcel presents a coherent land profile and is suitable for a clear first review."
        ),
      },
      {
        title: "Water and irrigation",
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
        title: "What to do next",
        body:
          nextActions.length > 0
            ? nextActions.join(" ")
            : "This parcel is suitable for shortlist review and discussion with decision-makers.",
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
          <ParcelAiChat initialAnswer={analysis.headline} />
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