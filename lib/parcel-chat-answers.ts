import { z } from "zod";
import { inclusiveEnd } from "./copernicus/request.ts";
import { indices, interpretIndex } from "./copernicus/interpretation.ts";
import { localization, type Locale, type MessageKey } from "./i18n/index.ts";
import type { AnswerContext } from "./parcel-chat-context.ts";
import type { ChatSource } from "./parcel-chat-contract.ts";

export const chatTopics = ["water", "vegetation", "crops", "risk", "investment", "limitations", "fieldwork"] as const;
type Topic = typeof chatTopics[number];
const topicSelection = z.strictObject({ topic: z.enum(chatTopics) });

export function questionTopic(question: string): Topic {
  const text = question.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l");
  if (/ograniczen|limitations?|what (can|cannot).*satellite|jakosci dan|zachmurzen|cloud|data quality/.test(text)) return "limitations";
  if (/risk|ryzyk|zagrozen|powodz|flood|eroz|erosion|sustainab|zrownowaz/.test(text)) return "risk";
  if (/water|irrigat|aquifer|nawad|\bwod|ndwi|ndmi|wilgotnosc/.test(text)) return "water";
  if (/ndvi|vegetat|greenness|roslinn|zieleni|kondycj.*roslin/.test(text)) return "vegetation";
  if (/\bcrop|upraw|sadz|plon|yield|agronom|gleb|soil/.test(text)) return "crops";
  if (/zweryfik|weryfik|badani|field\s*work|field checks?|\btest|verify|survey|what .*check/.test(text)) return "fieldwork";
  if (/invest|inwest|opłacal|oplacal|viab|rentown|profit|koszt|cost/.test(text)) return "investment";
  return "fieldwork";
}

const observationGuides = {
  water: "guideWater", vegetation: "chatVegetationGuide", crops: "guideCrop",
  risk: "chatRiskGuide", investment: "chatInvestmentGuide", limitations: "methodsLimits", fieldwork: "chatFieldGuide",
} as const satisfies Record<Topic, MessageKey>;
const unavailable = {
  unselected: "chatObservationUnselected", missing: "noData", rejected: "noUsable",
  timeout: "timeout", providerError: "providerError", providerRate: "providerRate", rateLimit: "rateLimit",
} as const satisfies Record<string, MessageKey>;

export function contextualAnswer(context: AnswerContext, topic: Topic, locale: Locale): string {
  const { t, num, percent, date, coordinates } = localization(locale);
  if (context.mode === "demo") {
    const { label, copy, location, areaHectares, scores, crops } = context;
    const intro = t("chatDemoSubject", { label, region: location.region, area: num(areaHectares) });
    const score = (key: keyof typeof scores) => t("chatDemoScore", { label: t(key), score: percent(scores[key] / 100) });
    const details: Record<Topic, string> = {
      water: [score("irrigation"), copy.water, copy.irrigation, t("guideWater")].join(" "),
      vegetation: [t("chatDemoNoIndices"), copy.soil, t("chatVegetationGuide")].join(" "),
      crops: [score("cropFit"), t("chatDemoCrops", { crops: crops.join(", ") }), copy.crops, t("guideCrop")].join(" "),
      risk: [score("sustainability"), copy.risk, t("chatRiskGuide")].join(" "),
      investment: [score("investment"), copy.verdict, t("guideGeneral")].join(" "),
      limitations: [t("chatDemoNoIndices"), t("methodsLimits")].join(" "),
      fieldwork: copy.next.map((action, i) => `${i + 1}. ${action}`).join("\n"),
    };
    return [intro, details[topic], t("chatDemoWarning")].join("\n\n");
  }

  const { evidence, reference } = context;
  const subject = t("chatObservationSubject", {
    point: coordinates(reference.geometry.coordinates), radius: num(reference.geometry.radiusMeters),
    from: date(reference.period.from), to: date(inclusiveEnd(reference.period)),
  });
  if (evidence.kind === "unavailable") {
    const quality = evidence.quality;
    return [subject, t(unavailable[evidence.reason]),
      ...(quality ? [t("chatObservationQuality", { date: date(quality.from), cloud: percent(quality.cloudFraction), clear: percent(quality.clearCoverage) })] : []),
      t(observationGuides[topic])].join("\n\n");
  }

  const { day, resolutionMeters } = evidence;
  const value = (key: keyof typeof indices) => day[key] === null ? t("unavailable")
    : `${num(day[key], 2)} (${interpretIndex(key, day[key], locale)})`;
  const reading = t("chatObservedValues", {
    ndvi: value("ndvi"), ndwi: value("ndwi"), ndmi: value("ndmi"), resolution: num(resolutionMeters),
  });
  const quality = t("chatObservationQuality", {
    date: date(day.from), cloud: percent(day.cloudFraction), clear: percent(day.clearCoverage),
  });
  const cover = [
    ...(day.vegetationFraction === null ? [] : [t("chatVegetationShare", { percentage: percent(day.vegetationFraction) })]),
    ...(day.waterFraction === null ? [] : [t("chatWaterShare", { percentage: percent(day.waterFraction) })]),
    ...((day.waterFraction ?? 0) >= 0.8 ? [t("waterDominates")] : []),
  ].join(" ");
  return [subject, `${reading} ${quality} ${cover}`.trim(), t(observationGuides[topic])].join("\n\n");
}

export async function selectAnswer(
  question: string,
  locale: Locale,
  context: AnswerContext,
  model?: () => Promise<unknown>,
): Promise<{ answer: string; source: ChatSource }> {
  if (model) {
    try {
      const selection = topicSelection.safeParse(await model());
      if (selection.success) return { answer: contextualAnswer(context, selection.data.topic, locale), source: "model" };
    } catch {
      // A provider failure must not remove the local answer.
    }
  }
  return { answer: contextualAnswer(context, questionTopic(question), locale), source: "rules" };
}
