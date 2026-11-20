import { indexKeys, localIndex } from "./copernicus/interpretation.ts";
import { localization, type Locale } from "./i18n/index.ts";
import { selectAnswer } from "./parcel-chat-answers.ts";
import { cropQuestion, normalizeQuestion } from "./parcel-chat-intent.ts";
import { synthesizeCurrentReport, type ReportChatReference, type ReportChatSnapshot } from "./report-chat.ts";
import { reportEvidenceId, weatherEvidenceLabels, type ReportEvidenceLink } from "./report-evidence-links.ts";
import type { SynthesisFinding } from "./report-synthesis-rules.ts";

const topicFor = (question: string) => {
  const text = normalizeQuestion(question);
  if (/syntez|podsum|\bcaly raport\b|co z tego wynika|wszystkie (dane|zrodla)|\bsummar|full (report|picture)|what does (it|this) mean/.test(text)) return "synthesis";
  if (/\b(?:nawoz\w*|nawiez\w*|wapn\w*|dawk\w* (?:azotu|wapna)|fertili[sz]\w*|liming|lime\b)/.test(text)) return "treatment";
  if (/\b(?:susz[aeoy]\w*|drought\w*)\b/.test(text)) return "drought";
  if (/wilgotnosc\w* (?:gleb|roslin|lisci)|nawodnieni\w* ros|soil moisture|plant moisture|canopy (?:moisture|water)|\bndmi\b/.test(text)) return "moisture";
  if (/\b(?:plon\w*|yield\w*|ile (?:zbior|ton)\w*)\b/.test(text)) return "yield";
  if (/ndvi.*(zmian|zmien|wzros|spad|trend|change|compar)|(?:zmian|zmien|wzros|spad|trend|change|compar).*ndvi/.test(text)) return "ndvi";
  if (/problem.*(roslin|wegetac)|vegetation (?:problem|stress)|problem.*vegetat|chorob.*roslin|roslin.*chor|plant (?:health|stress|disease)|kondycj.*roslin/.test(text)) return "vegetation";
  if (/co .*sprawdz|jakie .*sprawdz|co .*zweryfik|co .*zbadac|what .*check|what .*verify|next steps?|field checks?/.test(text)) return "next";
  if (/\b(?:opad\w*|deszcz\w*|pogod\w*|temperatur\w*|rain\w*|weather|precipitation)\b/.test(text)) return "weather";
  if (/\b(?:gleb\w*|soil|ph|soilgrids)\b/.test(text)) return "soil";
  if (/obserwac|observation|(?:pokaz|widac|shows?).*(?:satelit|satellite|ndvi|ndwi|ndmi)/.test(text)) return "satellite";
  return null;
};

export async function answerCurrentReport(question: string, reference: ReportChatReference, snapshot: ReportChatSnapshot, locale: Locale) {
  const { evidence: { sentinel, weather, soil }, findings, current, latestCandidate, manualComparison } = synthesizeCurrentReport(reference, snapshot, locale);
  const { t, date, num } = localization(locale);
  const find = (rule: SynthesisFinding["rule"]) => findings.find(item => item.rule === rule)?.message;
  const join = (...lines: (string | undefined)[]) => lines.filter(Boolean).join(" ");
  const translated = (pl: string, en: string) => locale === "pl" ? pl : en;
  const crop = cropQuestion(question);
  const topic = crop.kind === "general" ? topicFor(question) : null;
  const selected = sentinel.selected;
  const selectedDate = selected && `${date(selected.day)} UTC`;
  const sentinelLink = selected && selectedDate ? { target: reportEvidenceId.sentinel(selected.day), label: `Sentinel-2 L2A · ${selectedDate}` } : null;
  if (!topic) {
    const answer = await selectAnswer(question, locale, {
      mode: "observation", reference, evidence: current && sentinel.resolutionMeters !== null
        ? { kind: "verified", day: current, resolutionMeters: sentinel.resolutionMeters }
        : latestCandidate ? { kind: "unavailable", reason: "rejected", quality: latestCandidate }
        : { kind: "unavailable", reason: !reference.day ? "unselected" : "missing" },
    });
    return { ...answer, evidenceLinks: sentinelLink && crop.kind !== "unknown-crop" ? [sentinelLink] : [] };
  }

  const observation = () => selected && selectedDate ? join(
    `${translated("Wybrana obserwacja:", "Selected observation:")} ${selectedDate}.`,
    `${indexKeys.map(key => `${key.toUpperCase()} ${selected.indices[key] === null ? t("unavailable") : num(selected.indices[key], 2)}`).join(" · ")}.`,
  ) : find("sentinelMissing");
  const comparison = sentinel.comparison;
  const hasNdviPair = !!comparison && comparison.differences.ndvi !== null;
  const ndviChange = () => {
    if (!selected || !selectedDate || selected.indices.ndvi === null) {
      return selectedDate ? `${selectedDate}: NDVI ${t("unavailable")}.` : find("sentinelMissing");
    }
    if (!comparison || comparison.differences.ndvi === null || comparison.reference.indices.ndvi === null) {
      return join(`${selectedDate}: NDVI ${num(selected.indices.ndvi, 2)}.`, manualComparison ? translated(
        "Brak porównywalnego NDVI dla wybranej pary w tym raporcie.",
        "No comparable NDVI readings for the selected pair in this report.",
      ) : translated(
        "Brak wcześniejszej użytecznej obserwacji z NDVI w tym okresie raportu.",
        "No earlier usable NDVI observation in this report period.",
      ));
    }
    return join(
      `NDVI: ${num(comparison.reference.indices.ndvi, 2)} (${date(comparison.reference.day)}) → ${num(selected.indices.ndvi, 2)} (${selectedDate}); Δ ${num(comparison.differences.ndvi, 2, true)}.`,
      translated("Różnicę obliczono przed zaokrągleniem wartości. To porównanie dwóch obserwacji, nie trend.", "The difference uses unrounded values. This compares two observations; it is not a trend."),
    );
  };
  const intent = normalizeQuestion(question);
  const shortWeather = topic === "weather";
  const temperatureRequested = /temperatur|pogod|weather/.test(intent);
  const temperatureOnly = shortWeather && /temperatur/.test(intent) && !/opad|deszcz|\brain|precipitation|pogod|weather/.test(intent);
  const weatherRows = weather.metrics ? ([
    ["rainSeven", weather.metrics.rainSeven, 2],
    ["rainThirty", weather.metrics.rainThirty, 2],
    ["temperatureSeven", weather.metrics.temperatureSeven, 1],
  ] as const).filter(([key]) => !shortWeather || (key === "temperatureSeven" ? temperatureRequested : !temperatureOnly)) : [];
  const weatherDetails = () => {
    if (!weather.metrics || !selectedDate) return translated(
      "Bez użytecznej obserwacji Sentinel-2 nie można przypisać wcześniejszej pogody do daty satelitarnej.",
      "Without a usable Sentinel-2 observation, preceding weather cannot be tied to an observation date.",
    );
    return [
      t("weatherContextAnchor", { date: selectedDate.replace(/ UTC$/, "") }),
      ...weatherRows.map(([key, item, digits]) => `${t(weatherEvidenceLabels[key])}: ${item.value === null ? t("unavailable") : `${num(item.value, digits)} ${item.unit}`} (${t("weatherContextDays", { count: item.available, total: item.total, missing: item.missing })}).`),
      find("weatherMissing"),
      find("weatherLimits"),
    ].filter(Boolean).join("\n");
  };
  const soilDetails = (full: boolean) => {
    const cell = soil.cell;
    if (!cell) return join(find("soilOutside"), find("soilNoData"), find("soilUnavailable"), find("soilNotProvided"));
    const interval = cell.phPredictionInterval;
    const value = (number: number | null, digits: number, unit = "") => number === null ? t("unavailable") : `${num(number, digits)}${unit ? ` ${unit}` : ""}`;
    const readings = [
      `${t("soilPh")}: ${value(cell.medians.phh2o, 1)}${interval ? ` (${t("soilPredictionInterval")}: ${num(interval.bounds[0], 1)}–${num(interval.bounds[1], 1)})` : ""}.`,
      `${t("soilCarbon")}: ${value(cell.medians.soc, 1, "g/kg")}.`,
      ...(!full || (cell.medians.phh2o === null && cell.medians.soc === null) ? [
        `${t("soilDensity")}: ${value(cell.medians.bdod, 2, "kg/dm³")}.`,
        `${t("soilSand")}: ${value(cell.medians.sand, 1, t("soilMassPercent"))}; ${t("soilSilt")}: ${value(cell.medians.silt, 1, t("soilMassPercent"))}; ${t("soilClay")}: ${value(cell.medians.clay, 1, t("soilMassPercent"))}.`,
      ] : []),
    ];
    return join(
      `${translated("Modelowane mediany", "Modelled medians")} (${cell.depthCm.join("–")} cm, ${num(cell.resolutionMeters)} m).`,
      ...readings, find("soilPartial"), find("soilLimits"),
      !full ? translated("Model nie ustala klasy gleby ani nie zastępuje badania próbki.", "The model does not establish the official soil class or replace a soil test.") : undefined,
    );
  };
  const fieldChecks = () => join(
    selected ? find("fieldVerification") : translated("Najpierw sprawdź, czy w innym terminie dostępna jest użyteczna obserwacja Sentinel-2.", "First check whether a usable Sentinel-2 observation is available on another date."),
    find("soilSamples"),
  );
  const vegetation = () => join(
    translated("Te dane nie potwierdzają problemu z roślinnością.", "These data do not establish a vegetation problem."),
    selected ? ndviChange() : observation(), find("sentinelLimits"), fieldChecks(),
  );
  const heading = (label: string, content?: string) => `${label}\n${content ?? ""}`;
  const ndmi = selected?.indices.ndmi ?? null;

  const content = {
    satellite: () => join(observation(), find("sentinelPartial"), find("sentinelLimits")),
    ndvi: ndviChange,
    vegetation,
    weather: weatherDetails,
    soil: () => soilDetails(false),
    moisture: () => join(
      ndmi !== null ? `${selectedDate}: NDMI ${num(ndmi, 2)}.` : translated("Brak dostępnego NDMI dla wybranej obserwacji.", "NDMI is unavailable for the selected observation."),
      localIndex("ndmi", locale).limitation,
      translated("Aby ocenić wilgotność gleby, potrzebny jest pomiar w strefie korzeniowej.", "Assessing soil moisture requires a root-zone measurement."),
    ),
    drought: () => translated(
      "Ten raport nie rozstrzyga, czy występuje susza glebowa. Opady z reanalizy i sygnał spektralny to kontekst, nie pomiar zasobów wody w glebie. Sprawdź wilgotność w strefie korzeniowej i aktualne regionalne komunikaty o suszy.",
      "This report cannot establish soil drought. Reanalysis rainfall and spectral signals provide context, not a measurement of soil water. Check root-zone moisture and current regional drought bulletins.",
    ),
    treatment: () => translated(
      "Raport nie określa potrzeby ani dawki nawozu lub wapna. Modelowana komórka SoilGrids nie zastępuje reprezentatywnych próbek. Sprawdź laboratoryjne pH i zasobność gleby oraz wymagania planowanej uprawy.",
      "The report cannot establish whether fertiliser or lime is needed, or at what rate. One modelled SoilGrids cell cannot replace representative samples. Check lab-tested pH and nutrient levels alongside the planned crop's requirements.",
    ),
    yield: () => translated(
      "Z tych danych nie da się wiarygodnie przewidzieć plonu. Do oszacowania potrzebne są m.in. gatunek i odmiana, stan uprawy, historia zbiorów oraz warunki w bieżącym sezonie.",
      "These data cannot reliably predict yield. An estimate needs the crop and variety, field condition, harvest records and current-season conditions.",
    ),
    next: () => join(fieldChecks(), !soil.cell ? soilDetails(true) : undefined),
    synthesis: () => [
      heading(translated("Obserwacja satelitarna", "Satellite observation"), join(observation(),
        comparison && comparison.differences.ndvi !== null ? ndviChange() : undefined, find("sentinelPartial"))),
      heading(translated("Kontekst pogodowy", "Weather context"), weatherDetails()),
      heading(translated("Kontekst glebowy", "Soil context"), soilDetails(true)),
      heading(translated("Co z tego wynika?", "What does this mean?"), join(find("sentinelLimits"), fieldChecks())),
    ].join("\n\n"),
  };
  const evidenceLinks: ReportEvidenceLink[] = [];
  const showsNdvi = (topic === "ndvi" || topic === "vegetation") && selected?.indices.ndvi != null;
  if (sentinelLink && (topic === "satellite" || topic === "synthesis" || showsNdvi || (topic === "moisture" && ndmi !== null))) evidenceLinks.push(sentinelLink);
  if (hasNdviPair && (showsNdvi || topic === "synthesis")) evidenceLinks.push({ target: reportEvidenceId.ndviHistory, label: t("historyIndex", { index: "NDVI" }) });
  if (selected && (topic === "weather" || topic === "synthesis")) {
    for (const [key, item] of weatherRows) {
      if (item.value !== null) evidenceLinks.push({ target: reportEvidenceId.weather(selected.day, key), label: `${item.model} · ${t(weatherEvidenceLabels[key])}` });
    }
  }
  if (soil.cell && Object.values(soil.cell.medians).some(value => value !== null) && (topic === "soil" || topic === "synthesis")) {
    evidenceLinks.push({ target: reportEvidenceId.soil, label: `ISRIC SoilGrids · ${soil.cell.depthCm.join("–")} cm` });
  }
  return { answer: content[topic]() ?? "", source: "rules" as const, evidenceLinks, references: undefined };
}
