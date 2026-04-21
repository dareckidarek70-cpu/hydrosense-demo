function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function scoreCropFit(medianNdvi: number | null, ndviStdDev: number | null) {
  if (medianNdvi === null) return 50;

  const base = 50 + medianNdvi * 60;
  const stabilityPenalty = ndviStdDev ? ndviStdDev * 30 : 0;

  return Math.round(clamp(base - stabilityPenalty));
}

export function scoreIrrigation(medianNdwi: number | null, ndwiStdDev: number | null) {
  if (medianNdwi === null) return 50;

  const base = 55 + medianNdwi * 80;
  const stabilityPenalty = ndwiStdDev ? ndwiStdDev * 25 : 0;

  return Math.round(clamp(base - stabilityPenalty));
}

export function scoreRisk(
  ndviStdDev: number | null,
  ndwiStdDev: number | null,
  sampleCount: number
): "Low" | "Medium" | "High" {
  const instability = (ndviStdDev ?? 0) + (ndwiStdDev ?? 0);

  if (sampleCount < 3) return "High";
  if (instability > 0.35) return "High";
  if (instability > 0.18) return "Medium";
  return "Low";
}

export function scoreInvestment(
  cropFit: number,
  irrigation: number,
  risk: "Low" | "Medium" | "High"
) {
  const riskPenalty = risk === "Low" ? 0 : risk === "Medium" ? 8 : 18;
  return Math.round(clamp(cropFit * 0.55 + irrigation * 0.45 - riskPenalty));
}