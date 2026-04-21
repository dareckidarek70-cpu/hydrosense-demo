import { AnalysisResult, DemoParcel, ParcelId } from "@/lib/types";

export const demoParcels: DemoParcel[] = [
  {
    id: "parcel-a",
    label: "Parcel A — Veneto North",
    region: "Veneto North Corridor",
    areaHectares: 146,
    terrainType: "Alluvial plain with a gentle slope",
    intendedUse: "Large-scale crop production",
    cropModel: "Rotational cereals and oilseeds",
    dataSources: ["Copernicus", "GIS overlays", "Terrain model"],
    coordinates: {
      lat: 45.631,
      lng: 11.886,
    },
  },
  {
    id: "parcel-b",
    label: "Parcel B — Mestre Plain",
    region: "Mestre Plain, Veneto",
    areaHectares: 212,
    terrainType: "Flat irrigable plain",
    intendedUse: "Mixed crop production",
    cropModel: "Vegetable and maize rotation",
    dataSources: ["Copernicus", "GIS overlays", "Terrain model"],
    coordinates: {
      lat: 45.508,
      lng: 12.249,
    },
  },
  {
    id: "parcel-c",
    label: "Parcel C — Coastal Belt",
    region: "Southern Coastal Belt, Veneto",
    areaHectares: 168,
    terrainType: "Coastal silty area with some exposure risk",
    intendedUse: "Higher-value crop production",
    cropModel: "Specialty crops with adapted rotation",
    dataSources: ["Copernicus", "GIS overlays", "Terrain model"],
    coordinates: {
      lat: 45.233,
      lng: 12.312,
    },
  },
];

const parcelProfiles: Record<ParcelId, Omit<AnalysisResult, "meta">> = {
  "parcel-a": {
    executiveSummary: {
      headline: "Parcel A looks suitable for gradual agricultural development",
      verdict: "A good option for further review and pilot planning.",
      summary:
        "HydroSense suggests that this parcel offers solid land quality, realistic water access, and crop potential that could support phased agricultural development without major infrastructure at the start.",
      investmentReadiness: 78,
      irrigationReadiness: 73,
      cropFitScore: 81,
      confidenceIndicator: "Moderate to high confidence",
      keyTakeaways: [
        "Water access looks sufficient for step-by-step development.",
        "The soil profile supports a diversified crop strategy.",
        "Irrigation would improve yields, but it is not the only factor behind the parcel’s potential.",
      ],
    },
    groundwaterAndMoisture: {
      groundwaterPotential: "Moderately high",
      moistureStatus: "Stable moisture retention with some dry-period pressure",
      rechargeOutlook: "Good seasonal recharge potential",
      potentialScore: 76,
      narrative:
        "The available data suggests encouraging water access and enough moisture stability to support reliable crop planning. The parcel appears resilient under normal seasonal conditions.",
    },
    soilAndLandProfile: {
      dominantSoil: "Loam-silt mix with good productivity",
      drainageClass: "Well drained with limited runoff risk",
      terrain: "Lightly sloped alluvial farmland",
      narrative:
        "The parcel offers a productive land base with manageable topography and drainage, making it suitable for larger annual crop programs.",
    },
    cropRecommendations: {
      narrative:
        "The best crop options here are those that benefit from stable soil conditions and moderate irrigation support, while still offering flexibility in production planning.",
      recommendedCrops: [
        {
          name: "Soft wheat",
          fitScore: 83,
          rationale: "A good match for the parcel’s soil structure, moisture balance, and general production profile.",
        },
        {
          name: "Sunflower",
          fitScore: 78,
          rationale: "A useful rotation crop with lower water demand and good compatibility with local conditions.",
        },
        {
          name: "Maize",
          fitScore: 81,
          rationale: "A strong commercial option, especially when paired with well-timed irrigation.",
        },
      ],
    },
    irrigationPlan: {
      recommendedSystem: "Targeted center-pivot system with zone scheduling",
      strategy: "Start with the most productive blocks before expanding infrastructure",
      efficiencyNote: "Use variable-rate scheduling to improve water efficiency",
      narrative:
        "Irrigation looks like a useful improvement rather than an urgent requirement. A phased rollout would help control costs while increasing yield consistency and crop options.",
    },
    riskAndSustainability: {
      sustainabilityScore: 79,
      riskBand: "Low to moderate",
      primaryRisk: "Lower yields during longer dry periods without irrigation",
      mitigationPriority: "Combine moisture monitoring with gradual irrigation rollout",
      narrative:
        "The environmental risk appears manageable in this concept scenario. The parcel’s sustainability profile improves when irrigation is used efficiently and crop choices remain aligned with local water conditions.",
    },
    recommendedNextActions: [
      "Verify water access and soil texture with on-site checks.",
      "Compare phased irrigation costs with a three-season crop plan.",
      "Confirm parcel boundaries, access, and drainage conditions before moving further.",
    ],
    conceptNote:
      "Concept simulation only. Results are based on mocked Copernicus, GIS overlay, and terrain-model interpretation for presentation purposes.",
  },

  "parcel-b": {
    executiveSummary: {
      headline: "Parcel B looks like the strongest option in this demo set",
      verdict: "Well suited for presentation, planning, and pilot development.",
      summary:
        "HydroSense suggests that this parcel combines strong crop suitability, realistic water access, and land conditions that support diversified agricultural production with moderate irrigation investment.",
      investmentReadiness: 84,
      irrigationReadiness: 81,
      cropFitScore: 86,
      confidenceIndicator: "High confidence",
      keyTakeaways: [
        "The parcel combines water access with strong operational flexibility.",
        "Soil and terrain conditions support a realistic medium-term farming strategy.",
        "Irrigation looks like a practical way to improve performance rather than a defensive necessity.",
      ],
    },
    groundwaterAndMoisture: {
      groundwaterPotential: "High",
      moistureStatus: "Balanced moisture retention with good seasonal stability",
      rechargeOutlook: "Positive under current assumptions",
      potentialScore: 82,
      narrative:
        "The available data suggests favorable water conditions for a plain parcel in Veneto. Moisture performance and recharge patterns support a cultivation model that could scale with measured irrigation investment.",
    },
    soilAndLandProfile: {
      dominantSoil: "Silty loam with consistent productivity",
      drainageClass: "Controlled drainage with low terrain limitations",
      terrain: "Flat irrigable plain with efficient field layout",
      narrative:
        "Parcel B stands out because it is simple to work with. The land profile supports efficient field management, good machinery access, and flexibility for several high-value crop options.",
    },
    cropRecommendations: {
      narrative:
        "This parcel is best suited for crop programs that benefit from stable moisture conditions, reliable soil structure, and irrigation-supported yield performance.",
      recommendedCrops: [
        {
          name: "Processing tomato",
          fitScore: 88,
          rationale: "A strong match for irrigable plain conditions and value-focused production.",
        },
        {
          name: "Maize",
          fitScore: 86,
          rationale: "A reliable commercial choice supported by balanced water and soil conditions.",
        },
        {
          name: "Radicchio",
          fitScore: 80,
          rationale: "Adds higher-value potential when combined with controlled irrigation.",
        },
      ],
    },
    irrigationPlan: {
      recommendedSystem: "Pivot and lateral irrigation with sensor-based scheduling",
      strategy: "Start with the highest-return areas first",
      efficiencyNote: "Focus on water consistency, crop timing, and efficient input use",
      narrative:
        "Irrigation looks like a clear advantage for Parcel B. A phased rollout could improve yield consistency, support higher-value crops, and strengthen the overall case for development.",
    },
    riskAndSustainability: {
      sustainabilityScore: 83,
      riskBand: "Low",
      primaryRisk: "Execution risk if irrigation timing and crop planning are not aligned",
      mitigationPriority: "Coordinate irrigation rollout with crop priorities and field monitoring",
      narrative:
        "This parcel supports a credible sustainability story: efficient water use, strong land productivity, and manageable environmental exposure when managed carefully.",
    },
    recommendedNextActions: [
      "Move to field validation with a focus on irrigation planning and crop sequencing.",
      "Check local operating assumptions with soil sampling and water-access verification.",
      "Prepare a low-risk pilot plan for the first growing season.",
    ],
    conceptNote:
      "Concept simulation only. Results are based on mocked Copernicus, GIS overlay, and terrain-model interpretation for presentation purposes.",
  },

  "parcel-c": {
    executiveSummary: {
      headline: "Parcel C offers potential, but with tighter environmental limits",
      verdict: "Better suited for selective crop use than broad expansion.",
      summary:
        "HydroSense suggests that this parcel can support agricultural use, but it would require more careful crop selection, water management, and environmental control because of its coastal setting.",
      investmentReadiness: 71,
      irrigationReadiness: 67,
      cropFitScore: 74,
      confidenceIndicator: "Moderate confidence",
      keyTakeaways: [
        "The parcel can work well if crop selection matches local conditions.",
        "Water management should focus on precision rather than expansion.",
        "Environmental sensitivity matters more here than on the inland parcels.",
      ],
    },
    groundwaterAndMoisture: {
      groundwaterPotential: "Moderate, with some seasonal uncertainty",
      moistureStatus: "Useful moisture retention, but less stable under coastal stress",
      rechargeOutlook: "Adequate, with monitoring needed",
      potentialScore: 68,
      narrative:
        "The concept model suggests workable water access, but with more variation than on inland parcels. Moisture conditions could support cultivation, but only with careful irrigation timing and regular monitoring.",
    },
    soilAndLandProfile: {
      dominantSoil: "Silty clay loam with coastal sensitivity",
      drainageClass: "Moderate drainage with local exposure constraints",
      terrain: "Flat coastal agricultural area",
      narrative:
        "The parcel is workable, but the land profile calls for tighter agronomic control. It is better suited to a focused, higher-value crop strategy than to large-scale expansion.",
    },
    cropRecommendations: {
      narrative:
        "Crop selection should prioritize resilience, value, and compatibility with coastal water-management conditions.",
      recommendedCrops: [
        {
          name: "Barley",
          fitScore: 77,
          rationale: "A resilient option with manageable water demand under changing coastal conditions.",
        },
        {
          name: "Artichoke",
          fitScore: 73,
          rationale: "Offers specialty-value potential when paired with careful irrigation management.",
        },
        {
          name: "Forage mix",
          fitScore: 72,
          rationale: "Supports a lower-risk strategy and helps protect soil cover.",
        },
      ],
    },
    irrigationPlan: {
      recommendedSystem: "Localized drip irrigation with monitored low-pressure delivery",
      strategy: "Focus on the most suitable crop zones first",
      efficiencyNote: "Protect water quality and avoid over-application",
      narrative:
        "Irrigation is possible here, but it should be selective. The strongest case is a precision-based strategy that protects margins and environmental stability, rather than trying to maximize irrigated area.",
    },
    riskAndSustainability: {
      sustainabilityScore: 75,
      riskBand: "Moderate",
      primaryRisk: "Coastal exposure and salinity sensitivity with poor water management",
      mitigationPriority: "Use salinity monitoring and conservative crop selection",
      narrative:
        "Parcel C can still support a sustainability-focused approach, but only with stronger controls and a more selective cultivation strategy than the inland parcels.",
    },
    recommendedNextActions: [
      "Check water quality before planning any larger irrigation investment.",
      "Review crop economics under a more conservative coastal-risk scenario.",
      "Treat this parcel as a selective-value option rather than a scale-first opportunity.",
    ],
    conceptNote:
      "Concept simulation only. Results are based on mocked Copernicus, GIS overlay, and terrain-model interpretation for presentation purposes.",
  },
};

function findParcel(parcelId: string | undefined) {
  return demoParcels.find((parcel) => parcel.id === parcelId) ?? demoParcels[1];
}

export function getDemoParcel(parcelId?: string) {
  return findParcel(parcelId);
}

export function getDemoAnalysis(parcelId?: string): AnalysisResult {
  const parcel = findParcel(parcelId);

  return {
    meta: parcel,
    ...parcelProfiles[parcel.id],
  };
}