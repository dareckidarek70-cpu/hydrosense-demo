import { PrintBriefButton } from "@/components/print-brief-button";
import { ReportSectionCard } from "@/components/cards/report-section-card";
import { ScoreCard } from "@/components/cards/score-card";
import { ResultsScoreChart } from "@/components/results-score-chart";
import { getDemoAnalysis } from "@/lib/mock-analysis";
import { ParcelAiChat } from "@/components/parcel-ai-chat";
import { PrintReportLogo } from "@/components/print-report-logo";

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
    sustainability?: string;
    risk?: string;
    source?: string;
    water?: string;
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
    sustainability: ScoreValue;
    productivity: {
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

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toScore(value: string | undefined, fallback: number) {
  return clampScore(toNumber(value, fallback));
}

function formatDateTime() {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

function formatCoordinatePair(lat: number, lng: number) {
  return `${formatCoordinate(lat)}, ${formatCoordinate(lng)}`;
}

function formatRadius(radius: number) {
  return radius >= 1000 ? "1 km" : "500 m";
}

function buildProductivityLabel(params: {
  investment: number;
  irrigation: number;
  cropFit: number;
  sustainability: number;
}) {
  const average = Math.round(
    (params.investment + params.irrigation + params.cropFit + params.sustainability) / 4
  );

  if (average >= 80) return "High";
  if (average >= 65) return "Moderate";
  return "Early-stage";
}

function buildProductivityDescription(productivity: string) {
  const normalized = productivity.toLowerCase();

  if (normalized === "high") {
    return "The location shows strong agricultural productivity signals and is suitable for deeper review.";
  }

  if (normalized === "moderate") {
    return "The location shows usable agricultural productivity signals, but the final decision should still be checked locally.";
  }

  return "The location should be treated as an early-stage option until water access, soil quality, and field conditions are verified.";
}

function buildScoreDescription(name: string, value: number) {
  if (name === "investment") {
    if (value >= 80) return "The area looks strong enough to justify a closer review.";
    if (value >= 70) return "The area looks promising from an investment point of view.";
    if (value >= 55) return "The business case is still moderate and needs more evidence.";
    return "The business case is early and should be verified before stronger recommendations.";
  }

  if (name === "irrigation") {
    if (value >= 80) return "Water access looks strong and irrigation appears realistic.";
    if (value >= 70) return "Water access looks fairly good and irrigation should be possible.";
    if (value >= 55) return "Irrigation may be possible, but the case is still only moderate.";
    return "Water access may be limited or uncertain and should be checked carefully.";
  }

  if (name === "cropFit") {
    if (value >= 80)
      return "Seasonal satellite indicators suggest a strong crop suitability profile.";
    if (value >= 70)
      return "Seasonal satellite indicators suggest a reasonable crop suitability profile.";
    if (value >= 55)
      return "Crop suitability looks mixed and would benefit from deeper seasonal checking.";
    return "Crop suitability appears limited under the current signal pattern.";
  }

  if (name === "sustainability") {
    if (value >= 80)
      return "Long-term land resilience looks strong for continued agricultural use.";
    if (value >= 70)
      return "Long-term sustainability signals look positive, with stable environmental suitability.";
    if (value >= 55)
      return "Sustainability signals are moderate and should be checked against local soil and water conditions.";
    return "Long-term sustainability signals are weak and require careful local verification.";
  }

  return "";
}

function buildCustomVerdict(params: {
  investment: number;
  irrigation: number;
  cropFit: number;
  sustainability: number;
}) {
  const { investment, irrigation, cropFit, sustainability } = params;
  const average = Math.round((investment + irrigation + cropFit + sustainability) / 4);

  let headline = "";
  let body = "";

  if (average >= 80 && sustainability >= 75) {
    headline =
      "This map-selected area shows strong agricultural potential and is worth deeper review.";
  } else if (average >= 70) {
    headline =
      "This map-selected area looks promising and can be considered for shortlist comparison.";
  } else if (average >= 55) {
    headline =
      "This map-selected area shows moderate potential and should be checked before stronger recommendations.";
  } else {
    headline =
      "This map-selected area should be treated as an early screening option, not a final recommendation.";
  }

  if (irrigation < 55 && cropFit < 55) {
    body =
      "Water access and crop suitability both need further checking, so this point should not be treated as a strong agricultural candidate yet.";
  } else if (sustainability < 55) {
    body =
      "The area has some usable signals, but long-term sustainability should be verified before it is used for planning or investment decisions.";
  } else if (irrigation < 55) {
    body =
      "Water access may need more checking, even though the broader land profile still looks reasonably encouraging.";
  } else if (cropFit < 55) {
    body =
      "Water conditions look workable, but crop suitability appears more mixed and may require a selective production plan.";
  } else if (irrigation >= 75 && cropFit >= 75 && sustainability >= 75) {
    body =
      "The selected point shows a balanced profile across land suitability, water access, crop fit, and long-term sustainability.";
  } else {
    body =
      "The selected point shows a usable but not final profile. It is suitable for comparison, follow-up review, and local verification.";
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
  sustainability?: string;
  risk?: string;
  source?: string;
}): ResultsAnalysis {
  const lat = toNumber(params.lat, 45.4372);
  const lng = toNumber(params.lng, 12.3346);
  const radius = toNumber(params.radius, 500);

  const investment = toScore(params.investment, 70);
  const irrigation = toScore(params.irrigation, 66);
  const cropFit = toScore(params.cropFit, 69);
  const sustainability = toScore(
    params.sustainability,
    Math.round((investment + irrigation + cropFit) / 3)
  );

  const source = textOrFallback(params.source, "estimated");
  const coordinatePair = formatCoordinatePair(lat, lng);
  const radiusLabel = formatRadius(radius);

  const productivity = buildProductivityLabel({
    investment,
    irrigation,
    cropFit,
    sustainability,
  });

  const customVerdict = buildCustomVerdict({
    investment,
    irrigation,
    cropFit,
    sustainability,
  });

  const isLive = source === "live";

  return {
    parcelLabel: "Map-selected agricultural screening area",
    executiveSummary: `This location was selected directly on the map and converted into a ${radiusLabel} decision-ready agricultural screening area. HydroSense compares water access, crop suitability, sustainability, and investment potential to support an early location review.`,
    generatedOn: formatDateTime(),
    verdictLabel: "Custom area summary",
    verdictHeadline: customVerdict.headline,
    verdictBody:
      customVerdict.body +
      " The result should be treated as a practical first screening layer before field verification.",
    quietNote: isLive ? "Live custom analysis" : "Estimated custom analysis",
    locationBadge: `📍 ${coordinatePair}`,
    areaBadge: `${radiusLabel} screening radius`,
    terrainBadge: "Map-selected point",
    confidenceBadge: isLive ? "Live satellite data" : "Estimated data",
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
      sustainability: {
        value: sustainability,
        label: "Sustainability",
        description: buildScoreDescription("sustainability", sustainability),
      },
      productivity: {
        value: productivity,
        label: "Agricultural productivity",
        description: buildProductivityDescription(productivity),
      },
    },
    sections: [
      {
        title: "Selected point context",
        body: `The selected point is located at ${coordinatePair}. The current brief uses a ${radiusLabel} analysis radius and turns the map selection into a structured agricultural screening report.`,
      },
      {
        title: "Land and vegetation",
        body:
          cropFit >= 80
            ? "Seasonal satellite indicators suggest strong crop suitability and a positive vegetation profile for agricultural use."
            : cropFit >= 70
            ? "The land looks reasonably suitable, although the final result may depend on crop choice, soil quality, and field management."
            : cropFit >= 55
            ? "Crop suitability is moderate. The area may still be useful, but it needs deeper checking before planning production."
            : "Crop suitability is limited under the current signal pattern, so any production plan should be verified carefully.",
      },
      {
        title: "Water and irrigation",
        body:
          irrigation >= 80
            ? "Water access looks strong, which makes irrigation a realistic and useful option for this location."
            : irrigation >= 70
            ? "Water conditions look acceptable, although irrigation should still be confirmed locally."
            : irrigation >= 55
            ? "Water access appears moderate. Irrigation may be possible, but this should be checked before any stronger recommendation."
            : "Water access may be limited or uncertain, so irrigation should be treated as a key follow-up check.",
      },
      {
        title: "Sustainability outlook",
        body:
          sustainability >= 80
            ? "The long-term sustainability signal looks strong, suggesting stable land resilience and good suitability for continued agricultural use."
            : sustainability >= 70
            ? "The sustainability profile looks positive, although it should still be confirmed with local soil, water, and field management checks."
            : sustainability >= 55
            ? "The sustainability profile is moderate, so this location should be verified carefully before being treated as a long-term agricultural option."
            : "The sustainability profile is weak and should be treated as a warning signal until local conditions are verified.",
      },
      {
        title: "What to do next",
        body:
          investment >= 80
            ? "This looks like a strong candidate for a deeper review, field verification, or a small pilot project."
            : investment >= 70
            ? "This area is worth a closer look and could be compared with other selected locations before making a final decision."
            : investment >= 55
            ? "This is a moderate candidate. Compare it with stronger areas and verify water, soil, and access conditions before going further."
            : "Treat this as an early option only. Verify water access, soil quality, access roads, and local field conditions before making any decision.",
      },
    ],
  };
}

function buildWaterAnalysis(params: {
  lat?: string;
  lng?: string;
  radius?: string;
}): ResultsAnalysis {
  const lat = toNumber(params.lat, 45.4372);
  const lng = toNumber(params.lng, 12.3346);
  const radius = toNumber(params.radius, 500);

  const coordinatePair = formatCoordinatePair(lat, lng);
  const radiusLabel = formatRadius(radius);

  return {
    parcelLabel: "Selected water area",
    executiveSummary:
      "This point appears to be located on a water surface. HydroSense is designed for agricultural land screening, so agricultural indicators are not calculated for this location.",
    generatedOn: formatDateTime(),
    verdictLabel: "Outside agricultural scope",
    verdictHeadline: "Water area detected.",
    verdictBody:
      "HydroSense analyses agricultural land, not open water surfaces. Please select a land parcel or agricultural area to generate a meaningful field screening report.",
    quietNote: "Water area detected",
    locationBadge: `📍 ${coordinatePair}`,
    areaBadge: `${radiusLabel} screening radius`,
    terrainBadge: "Water surface",
    confidenceBadge: "Not calculated",
    sourceBadge: {
      text: "WATER AREA",
      bg: "rgba(64, 120, 160, 0.14)",
      color: "#315f7a",
      border: "1px solid rgba(64, 120, 160, 0.22)",
    },
    scores: {
      investment: {
        value: 0,
        label: "Not calculated",
        description:
          "Investment potential is not calculated because this point is outside agricultural land.",
      },
      irrigation: {
        value: 0,
        label: "Not calculated",
        description:
          "Irrigation potential is not calculated for water surfaces.",
      },
      cropFit: {
        value: 0,
        label: "Not calculated",
        description:
          "Crop suitability is not calculated because this location is not an agricultural parcel.",
      },
      sustainability: {
        value: 0,
        label: "Not calculated",
        description:
          "Sustainability screening is not applied to open water areas.",
      },
      productivity: {
        value: "Outside scope",
        label: "Agricultural productivity",
        description:
          "Agricultural productivity is not assessed for water surfaces. Please select land or an agricultural parcel.",
      },
    },
    sections: [
      {
        title: "Why indicators are not shown",
        body:
          "The selected point is probably located on a water surface. Showing values such as 0% moisture, 0% crop suitability, or 0% sustainability would be misleading, so HydroSense stops the agricultural analysis instead.",
      },
      {
        title: "What to do next",
        body:
          "Please select a point located on land, preferably within or near an agricultural parcel. HydroSense will then generate a normal field screening report with investment, irrigation, crop suitability, sustainability, and agricultural productivity indicators.",
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
    "HydroSense suggests that this parcel combines good crop suitability, workable water access, sustainability signals, and land conditions that support a realistic agricultural plan."
  );

  const verdictHeadline = textOrFallback(
    execObj.headline,
    "Parcel B looks like the strongest option in this demo set."
  );

  const verdictBody = textOrFallback(
    execObj.verdict,
    "It is well suited for presentation, planning, early pilot discussion, and long-term agricultural screening."
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

  const investmentValue = clampScore(numberOrFallback(execObj.investmentReadiness, 84));
  const irrigationValue = clampScore(numberOrFallback(execObj.irrigationReadiness, 81));
  const cropFitValue = clampScore(numberOrFallback(execObj.cropFitScore, 86));

  const sustainabilityValue = clampScore(
    numberOrFallback(
      execObj.sustainabilityScore ?? riskObj.sustainabilityScore ?? data.sustainability,
      Math.round((investmentValue + irrigationValue + cropFitValue) / 3)
    )
  );

  const productivityValue = buildProductivityLabel({
    investment: investmentValue,
    irrigation: irrigationValue,
    cropFit: cropFitValue,
    sustainability: sustainabilityValue,
  });

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
      sustainability: {
        value: sustainabilityValue,
        label: "Sustainability",
        description: buildScoreDescription("sustainability", sustainabilityValue),
      },
      productivity: {
        value: productivityValue,
        label: "Agricultural productivity",
        description: buildProductivityDescription(productivityValue),
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
          "Crop suitability looks strong enough to support a productive agricultural scenario based on seasonal satellite indicators."
        ),
      },
      {
        title: "Sustainability outlook",
        body: textOrFallback(
          riskObj.sustainabilityNarrative ?? data.sustainabilityNarrative,
          "The parcel shows positive long-term sustainability signals, with stable environmental suitability for continued agricultural use."
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

  const isWaterArea =
    params?.water === "true" ||
    params?.water === "1" ||
    mode === "water";

const analysis = isWaterArea
    ? buildWaterAnalysis(params ?? {})
    : mode === "custom"
    ? buildCustomAnalysis(params ?? {})
    : normalizeDemoAnalysis(getDemoAnalysis(params?.parcel ?? "parcel-b"));

  return (
    <div className="container">
      <section className="page-section brief-shell">
        <div className="report-hero glass-card">
          <div className="report-hero-top">
            <div className="report-brand-summary">
              <div className="print-only">
                <PrintReportLogo />
              </div>

              <p className="eyebrow">Decision-ready review</p>
              <h1 className="section-title">{analysis.parcelLabel}</h1>
            </div>

            <div className="report-hero-actions print-hidden">
              <PrintBriefButton />
            </div>
          </div>

          <p className="lead">{analysis.executiveSummary}</p>

          <div className="report-meta-row">
            <p className="report-quiet-note">{analysis.quietNote}</p>

            <div className="report-generated">
            <span>Generated on</span>
            <strong>{analysis.generatedOn}</strong>
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

{isWaterArea ? (
  <div className="report-score-grid">
    <div
      className="glass-card"
      style={{
        padding: "1.25rem",
        background: "rgba(236, 244, 239, 0.96)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        color: "#163728",
      }}
    >
      <p
        className="supporting-label"
        style={{
          color: "#5b7567",
        }}
      >
        Water area
      </p>

      <h3
        style={{
          marginTop: "0.35rem",
          color: "#123423",
        }}
      >
        Agricultural indicators not calculated
      </h3>

      <p
        className="body-copy"
        style={{
          marginTop: "0.75rem",
          color: "#456255",
        }}
      >
        This point appears to be located on water, so HydroSense does not show
        agricultural percentage indicators for this selection.
      </p>
    </div>
  </div>
) : (
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
    <ScoreCard
      title="Sustainability"
      score={analysis.scores.sustainability.value}
      label={analysis.scores.sustainability.label}
      description={analysis.scores.sustainability.description}
    />
  </div>
)}
          </div>
        </div>

        <div className="report-layout">
          {!isWaterArea ? (
  <section className="report-section-card print-chart-card">
    <ResultsScoreChart
      investment={analysis.scores.investment.value}
      irrigation={analysis.scores.irrigation.value}
      cropFit={analysis.scores.cropFit.value}
      sustainability={analysis.scores.sustainability.value}
    />
  </section>
) : null}

          <ParcelAiChat initialAnswer={analysis.executiveSummary} />

          {analysis.sections.map((section, index) => (
            <ReportSectionCard
              key={`${section.title}-${index}`}
              title={section.title}
              body={section.body}
            />
          ))}

          {!isWaterArea ? (
            <ReportSectionCard
            title={analysis.scores.productivity.label}
            body={analysis.scores.productivity.description}
            bullets={[`Productivity level: ${analysis.scores.productivity.value}`]}
         />
) : null}

          <ReportSectionCard
            title="Prototype note"
            body="HydroSense is a prototype decision-support tool. Results are generated for demonstration and early screening purposes and should be confirmed with local field verification before investment decisions."
          />
        </div>
      </section>
    </div>
  );
}