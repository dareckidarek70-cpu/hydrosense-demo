import { collectSynthesisEvidence, type SynthesisInput } from "./report-synthesis.ts";

const rules = {
  sentinelObservation: ["observation", "sentinel.selected", "Wskaźniki i pokrycie wybranej obserwacji Sentinel-2.", "Indices and coverage for the selected Sentinel-2 observation."],
  sentinelComparison: ["observation", "sentinel.comparison", "Różnica wskaźników: wybrana doba minus doba odniesienia. Nie jest to trend.", "Index difference: selected day minus reference day. This is not a trend."],
  sentinelPartial: ["limitation", "sentinel.selected", "Nie wszystkie wskaźniki są dostępne dla tej doby.", "Not all indices are available for this day."],
  sentinelMissing: ["limitation", "sentinel.status", "Brak użytecznej wybranej obserwacji. Pogoda i gleba jej nie zastępują.", "No usable selected observation. Weather and soil cannot replace it."],
  sentinelLimits: ["limitation", "sentinel.selected", "Wskaźniki spektralne nie mierzą bezpośrednio wilgotności gleby, wód gruntowych ani plonu. Nie wystarczają do rozpoznania chorób, niedoborów czy suszy glebowej.", "Spectral indices do not directly measure soil moisture, groundwater, or yield. They cannot establish disease, nutrient deficiencies, or soil drought."],
  rainSeven: ["context", "weather.metrics.rainSeven", "Suma opadów ERA5 z dostępnych dób w poprzednich 7 dniach.", "ERA5 precipitation total from available days in the preceding 7 days."],
  rainThirty: ["context", "weather.metrics.rainThirty", "Suma opadów ERA5 z dostępnych dób w poprzednich 30 dniach.", "ERA5 precipitation total from available days in the preceding 30 days."],
  temperatureSeven: ["context", "weather.metrics.temperatureSeven", "Średnia z dostępnych średnich dobowych temperatury powietrza ERA5-Land w poprzednich 7 dniach.", "Mean of available ERA5-Land daily mean air temperatures in the preceding 7 days."],
  weatherPartial: ["limitation", "weather.metrics", "Co najmniej jedno okno lub zmienna ma braki. Liczby dni podano osobno dla każdej miary; brak danych nie oznacza zera.", "At least one window or variable has gaps. Day counts are specific to each metric; missing data is not zero."],
  weatherMissing: ["limitation", "weather.metrics", "Brak danych pogodowych w oknach przed wybraną obserwacją.", "No weather data is available in the windows before the selected observation."],
  weatherLimits: ["limitation", "weather.source", "To siatkowa reanaliza, nie pomiar ze stacji na działce. Zbieżność dat nie dowodzi, że pogoda spowodowała zmianę wskaźnika.", "This is gridded reanalysis, not an on-site station measurement. Timing alone does not establish that weather caused an index change."],
  soilCell: ["context", "soil.cell", "Modelowane mediany SoilGrids i dostępny przedział predykcji pH dotyczą jednej komórki i podanej głębokości.", "SoilGrids modelled medians and any available pH prediction interval describe one cell at the stated depth."],
  soilPartial: ["limitation", "soil.cell", "Nie wszystkie właściwości lub granice predykcji pH są dostępne.", "Some soil properties or pH prediction bounds are unavailable."],
  soilLimits: ["limitation", "soil.cell", "Jedna komórka nie opisuje całej działki. Osobnych median frakcji nie przeliczamy do 100%.", "One cell does not describe the entire parcel. Separate fraction medians are not rescaled to 100%."],
  soilOutside: ["limitation", "soil.status", "Punkt poza przygotowanym obszarem SoilGrids.", "The point is outside the prepared SoilGrids coverage."],
  soilNoData: ["limitation", "soil.status", "Brak danych SoilGrids dla tej komórki.", "No SoilGrids data for this cell."],
  soilUnavailable: ["limitation", "soil.status", "Paczka SoilGrids jest niedostępna lub nie przeszła weryfikacji.", "The SoilGrids data package is unavailable or failed validation."],
  soilNotProvided: ["limitation", "soil.status", "Nie przekazano odczytu SoilGrids dla tego punktu.", "No SoilGrids reading was supplied for this point."],
  fieldVerification: ["next-step", "sentinel.status", "Jeśli potrzebna jest ocena stanu uprawy lub wilgotności gleby, sprawdź warunki w terenie i porównaj kolejne użyteczne obserwacje.", "If crop condition or soil moisture needs assessment, verify conditions in the field and compare further usable observations."],
  soilSamples: ["next-step", "soil.status", "Do oceny właściwości całej działki potrzebne są reprezentatywne próbki glebowe.", "Representative soil samples are needed to assess whole-parcel soil properties."],
} as const;

type Rule = keyof typeof rules;
export type SynthesisFinding = {
  rule: Rule;
  section: (typeof rules)[Rule][0];
  evidence: (typeof rules)[Rule][1];
  message: string;
};

export function synthesizeReport(input: SynthesisInput, locale: "pl" | "en" = "pl") {
  const evidence = collectSynthesisEvidence(input);
  const { sentinel, weather, soil } = evidence;
  const findings: SynthesisFinding[] = [];
  const add = (rule: Rule) => {
    const [section, path, pl, en] = rules[rule];
    findings.push({ rule, section, evidence: path, message: locale === "pl" ? pl : en });
  };

  if (sentinel.selected) {
    add("sentinelObservation");
    if (sentinel.comparison && Object.values(sentinel.comparison.differences).some(value => value !== null)) add("sentinelComparison");
    if (sentinel.status === "partial") add("sentinelPartial");
    add("sentinelLimits");
  } else add("sentinelMissing");

  if (weather.metrics) {
    for (const key of ["rainSeven", "rainThirty", "temperatureSeven"] as const) {
      if (weather.metrics[key].value !== null) add(key);
    }
    if (weather.status === "partial") add("weatherPartial");
    if (weather.status === "no-data") add("weatherMissing");
    if (weather.status !== "no-data") add("weatherLimits");
  }

  if (soil.cell) {
    add("soilCell");
    if (soil.status === "partial") add("soilPartial");
    add("soilLimits");
  } else {
    add(({ outside: "soilOutside", "no-data": "soilNoData", unavailable: "soilUnavailable", "not-provided": "soilNotProvided" } as const)[soil.status]);
  }

  if (sentinel.selected) add("fieldVerification");
  if (soil.cell) add("soilSamples");
  return { evidence, findings };
}
