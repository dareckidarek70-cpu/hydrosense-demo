export type ParcelId = "parcel-a" | "parcel-b" | "parcel-c";

export type DemoParcel = {
  id: ParcelId;
  label: string;
  region: string;
  areaHectares: number;
  terrainType: string;
  intendedUse: string;
  cropModel: string;
  dataSources: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
};

export type SelectedAreaInput = DemoParcel;

export type ExecutiveSummary = {
  headline: string;
  verdict: string;
  summary: string;
  investmentReadiness: number;
  irrigationReadiness: number;
  cropFitScore: number;
  confidenceIndicator: string;
  keyTakeaways: string[];
};

export type GroundwaterAndMoisture = {
  groundwaterPotential: string;
  moistureStatus: string;
  rechargeOutlook: string;
  potentialScore: number;
  narrative: string;
};

export type SoilAndLandProfile = {
  dominantSoil: string;
  drainageClass: string;
  terrain: string;
  narrative: string;
};

export type RecommendedCrop = {
  name: string;
  fitScore: number;
  rationale: string;
};

export type CropRecommendations = {
  narrative: string;
  recommendedCrops: RecommendedCrop[];
};

export type IrrigationPlan = {
  recommendedSystem: string;
  strategy: string;
  efficiencyNote: string;
  narrative: string;
};

export type RiskAndSustainability = {
  sustainabilityScore: number;
  riskBand: string;
  primaryRisk: string;
  mitigationPriority: string;
  narrative: string;
};

export type AnalysisResult = {
  meta: SelectedAreaInput;
  executiveSummary: ExecutiveSummary;
  groundwaterAndMoisture: GroundwaterAndMoisture;
  soilAndLandProfile: SoilAndLandProfile;
  cropRecommendations: CropRecommendations;
  irrigationPlan: IrrigationPlan;
  riskAndSustainability: RiskAndSustainability;
  recommendedNextActions: string[];
  conceptNote: string;
};
