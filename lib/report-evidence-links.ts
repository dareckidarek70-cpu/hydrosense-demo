export const reportEvidenceId = {
  sentinel: (day: string) => `report-sentinel-${day}`,
  ndviHistory: "report-ndvi-history",
  weather: (day: string, metric: WeatherEvidenceKey) => `report-weather-${day}-${metric}`,
  soil: "report-soil-cell",
};

export type ReportEvidenceLink = { target: string; label: string };

export const weatherEvidenceLabels = {
  rainSeven: "weatherContextRain7",
  rainThirty: "weatherContextRain30",
  temperatureSeven: "weatherContextTemperature",
} as const;

export type WeatherEvidenceKey = keyof typeof weatherEvidenceLabels;
