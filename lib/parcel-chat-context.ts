import { isUsableDay, type AreaStats, type Observation } from "./copernicus/observations.ts";
import { dateObservationWindow, type ObservationWindow } from "./copernicus/request.ts";
import { demoPresentation } from "./i18n/demo.ts";
import { getDemoAnalysis } from "./mock-analysis.ts";
import type { ParcelChatInput } from "./parcel-chat-contract.ts";
import type { Locale } from "./i18n/index.ts";

type ObservationReference = Extract<ParcelChatInput, { mode: "observation" }>["observation"];
type ParcelId = Extract<ParcelChatInput, { mode: "demo" }>["parcelId"];
type MissingReason = "unselected" | "missing" | "rejected" | "timeout" | "providerError" | "providerRate" | "rateLimit";

const cropTranslations: Record<string, string> = {
  "Soft wheat": "pszenica zwyczajna", Sunflower: "słonecznik", Maize: "kukurydza",
  "Processing tomato": "pomidor przemysłowy", Radicchio: "radicchio", Barley: "jęczmień",
  "Forage mix": "mieszanka pastewna", Wheat: "pszenica", Soybean: "soja",
};

export function demoChatContext(parcelId: ParcelId, locale: Locale) {
  const { meta, copy, scores } = demoPresentation(parcelId, locale);
  const report = getDemoAnalysis(parcelId);
  return {
    mode: "demo" as const,
    evidence: "competition-simulation" as const,
    id: meta.id,
    label: copy.label,
    location: { region: copy.region, coordinates: meta.coordinates },
    areaHectares: meta.areaHectares,
    copy,
    scores,
    crops: report.cropRecommendations.recommendedCrops.map(({ name }) => locale === "pl" ? cropTranslations[name] ?? name : name),
  };
}

export type ObservationEvidence =
  | { kind: "verified"; day: Observation; resolutionMeters: number }
  | { kind: "unavailable"; reason: MissingReason; quality?: Pick<Observation, "cloudFraction" | "clearCoverage" | "from"> };

export type AnswerContext = ReturnType<typeof demoChatContext> | {
  mode: "observation";
  reference: ObservationReference;
  evidence: ObservationEvidence;
};

export async function resolveObservationEvidence(
  reference: ObservationReference,
  readCache: (period: ObservationWindow) => AreaStats | undefined,
  fetchDay: (period: ObservationWindow) => Promise<AreaStats>,
): Promise<ObservationEvidence> {
  const cached = readCache(reference.period);
  if (!reference.day) {
    if (!cached || cached.observation) return { kind: "unavailable", reason: "unselected" };
    return withoutUsableDay(cached.latestObserved);
  }
  const day = reference.day;
  const interval = dateObservationWindow(day, day);
  if (!interval) return { kind: "unavailable", reason: "missing" };
  const stats = cached ?? await fetchDay(interval);
  const observation = stats.days.find(({ from, to }) =>
    Date.parse(from) === Date.parse(interval.from) && Date.parse(to) === Date.parse(interval.to));
  return observation && isUsableDay(observation)
    ? { kind: "verified", day: observation, resolutionMeters: stats.resolutionMeters }
    : withoutUsableDay(observation);
}

function withoutUsableDay(day: Observation | null | undefined): ObservationEvidence {
  return day
    ? { kind: "unavailable", reason: "rejected", quality: {
      from: day.from, cloudFraction: day.cloudFraction, clearCoverage: day.clearCoverage,
    } }
    : { kind: "unavailable", reason: "missing" };
}

export async function withinDeadline<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new DOMException("Deadline exceeded", "TimeoutError")), timeoutMs);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
