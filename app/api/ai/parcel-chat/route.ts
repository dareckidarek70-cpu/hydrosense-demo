import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParcelPayload = {
  title?: string;
  headline?: string;
  locationLabel?: string;
  coordinates?: string;
  investmentScore?: number | null;
  irrigationScore?: number | null;
  cropFitScore?: number | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  ndvi?: number | null;
  ndwi?: number | null;
  summary?: string | null;
  verdict?: string | null;
  waterOutlook?: string | null;
  cropPathway?: string | null;
  nextStep?: string | null;
};

type RequestBody = {
  question?: string;
  parcel?: ParcelPayload;
};

type ChatResponse = {
  shortTitle: string;
  answer: string;
  suggestedFollowUps: string[];
  confidence: "low" | "medium" | "high";
  warning: string | null;
};

function normalizeResponse(data: unknown): ChatResponse {
  const obj =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};

  return {
    shortTitle:
      typeof obj.shortTitle === "string" && obj.shortTitle.trim()
        ? obj.shortTitle.trim()
        : "Parcel insight",
    answer:
      typeof obj.answer === "string" && obj.answer.trim()
        ? obj.answer.trim()
        : "I could not generate a useful answer for this parcel.",
    suggestedFollowUps: Array.isArray(obj.suggestedFollowUps)
      ? obj.suggestedFollowUps
          .filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
          .slice(0, 3)
      : [],
    confidence:
      obj.confidence === "low" ||
      obj.confidence === "medium" ||
      obj.confidence === "high"
        ? obj.confidence
        : "medium",
    warning:
      typeof obj.warning === "string"
        ? obj.warning
        : obj.warning === null
        ? null
        : null,
  };
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreBand(score: number | null): "low" | "medium" | "high" {
  if (score === null) return "medium";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function riskText(parcel: ParcelPayload): string {
  const riskScore = toNumber(parcel.riskScore);
  const riskLevel = parcel.riskLevel?.toLowerCase();

  if (riskLevel) return riskLevel;
  if (riskScore === null) return "moderate";
  if (riskScore >= 75) return "high";
  if (riskScore >= 50) return "moderate";
  return "low";
}

function buildFallbackAnswer(
  question: string,
  parcel: ParcelPayload
): ChatResponse {
  const investment = toNumber(parcel.investmentScore);
  const irrigation = toNumber(parcel.irrigationScore);
  const cropFit = toNumber(parcel.cropFitScore);
  const ndvi = toNumber(parcel.ndvi);
  const ndwi = toNumber(parcel.ndwi);

  const investmentBand = scoreBand(investment);
  const irrigationBand = scoreBand(irrigation);
  const cropBand = scoreBand(cropFit);
  const risk = riskText(parcel);

  const lowerQuestion = question.toLowerCase();

  let shortTitle = "Parcel insight";
  let answer =
    "This parcel looks moderately promising, but the recommendation should still be verified with local field conditions, water access, and agronomic constraints.";

  if (lowerQuestion.includes("irrigation") || lowerQuestion.includes("water")) {
    shortTitle = "Irrigation outlook";

    if (irrigationBand === "high") {
      answer =
        "This parcel looks relatively strong for irrigation-focused investment. The irrigation score is supportive, so the main next check should be real water availability, pumping cost, and permit practicality rather than parcel suitability alone.";
    } else if (irrigationBand === "medium") {
      answer =
        "This parcel may support irrigation, but it should be treated as a conditional case rather than an immediate green light. Before investing, verify dependable water access, infrastructure cost, and whether irrigation would materially improve yield stability.";
    } else {
      answer =
        "At the moment this parcel does not look like a strong irrigation-first candidate. The main risk is that irrigation capex may be difficult to justify unless local water access and crop economics are significantly better than the current indicators suggest.";
    }
  } else if (
    lowerQuestion.includes("crop") ||
    lowerQuestion.includes("crops")
  ) {
    shortTitle = "Crop suitability";

    if (cropBand === "high") {
      answer =
        "Crop fit looks relatively strong, so this parcel is more suitable for a focused pilot with practical, proven crops rather than experimental planting. A sensible direction would be crops that reward stable field management and can benefit from good moisture control if available.";
    } else if (cropBand === "medium") {
      answer =
        "Crop suitability looks mixed rather than weak. This suggests the parcel may work for a pilot, but crop choice should stay conservative and be validated against soil class, local rainfall pattern, and expected input costs.";
    } else {
      answer =
        "Crop fit looks limited on current indicators, so this parcel is not the strongest candidate for a crop-intensive first pilot. The safer path would be to confirm soil constraints and test only low-risk, resilient crop options before any bigger commitment.";
    }
  } else if (
    lowerQuestion.includes("risk") ||
    lowerQuestion.includes("risky")
  ) {
    shortTitle = "Risk view";

    if (risk.includes("high")) {
      answer =
        "This parcel should be treated as a higher-risk pilot candidate. The prudent approach would be to limit upfront spend, verify water reliability and soil quality first, and avoid assuming that current indicator strength will automatically translate into field performance.";
    } else if (risk.includes("low")) {
      answer =
        "On current indicators, the parcel does not look unusually risky for a first pilot. That said, the key remaining unknowns are still operational: legal access, water logistics, soil confirmation, and expected cost per hectare.";
    } else {
      answer =
        "This parcel looks like a moderate-risk case. It is not an obvious reject, but it still needs validation in the field before being treated as investment-ready.";
    }
  } else if (
    lowerQuestion.includes("verify") ||
    lowerQuestion.includes("before investment") ||
    lowerQuestion.includes("before investing")
  ) {
    shortTitle = "Pre-investment checks";
    answer =
      "Before investment, the first things to verify are real water access, soil class and drainage, parcel legal status, machinery access, and whether the expected crop plan matches the parcel’s actual field constraints. These checks matter more than dashboard scores alone.";
  } else {
    shortTitle = "General parcel view";

    const strengths: string[] = [];
    const cautions: string[] = [];

    if (investmentBand === "high") strengths.push("strong investment profile");
    if (irrigationBand === "high") strengths.push("good irrigation potential");
    if (cropBand === "high") strengths.push("solid crop fit");

    if (investmentBand === "low") cautions.push("weak investment score");
    if (irrigationBand === "low") cautions.push("limited irrigation case");
    if (cropBand === "low") cautions.push("uncertain crop fit");
    if (risk.includes("high")) cautions.push("elevated risk");

    answer = `This parcel looks ${
      strengths.length > 0 ? "promising in some key areas" : "mixed overall"
    }. ${
      strengths.length > 0
        ? `Current positives include ${strengths.join(", ")}. `
        : ""
    }${
      cautions.length > 0
        ? `Main caution points are ${cautions.join(", ")}. `
        : ""
    }The next decision should be based on field verification, especially water, soil, and access conditions.`;
  }

  const followUps = [
    "What should be verified in the field first?",
    "Would this parcel work for a small pilot?",
    "What is the biggest investment risk here?",
  ];

  if (ndvi !== null || ndwi !== null) {
    answer += ` Indicator context: NDVI is ${
      ndvi !== null ? ndvi : "not available"
    } and NDWI is ${ndwi !== null ? ndwi : "not available"}.`;
  }

  return {
    shortTitle,
    answer,
    suggestedFollowUps: followUps,
    confidence: "medium",
    warning:
      "OpenAI quota/billing is currently unavailable, so this answer was generated from local parcel rules instead of the API.",
  };
}

async function askOpenAI(
  question: string,
  parcel: ParcelPayload,
  apiKey: string
): Promise<ChatResponse> {
  const openai = new OpenAI({ apiKey });

  const parcelContext = {
    title: parcel.title ?? parcel.headline ?? "Unknown parcel",
    locationLabel: parcel.locationLabel ?? "Unknown location",
    coordinates: parcel.coordinates ?? "Unknown coordinates",
    investmentScore: parcel.investmentScore ?? "unknown",
    irrigationScore: parcel.irrigationScore ?? "unknown",
    cropFitScore: parcel.cropFitScore ?? "unknown",
    riskScore: parcel.riskScore ?? "unknown",
    riskLevel: parcel.riskLevel ?? "unknown",
    ndvi: parcel.ndvi ?? "unknown",
    ndwi: parcel.ndwi ?? "unknown",
    summary: parcel.summary ?? "No summary available",
    verdict: parcel.verdict ?? "No verdict available",
    waterOutlook: parcel.waterOutlook ?? "No water outlook available",
    cropPathway: parcel.cropPathway ?? "No crop pathway available",
    nextStep: parcel.nextStep ?? "No next step available",
  };

  const prompt = `
You are HydroSense AI, a concise agricultural-investment assistant.

Answer clearly, practically, and concisely.
Focus on parcel suitability, irrigation, crop fit, risk, and investment potential.
Stay grounded in the parcel data below.

Parcel data:
${JSON.stringify(parcelContext, null, 2)}

User question:
${question}

Return JSON only in this exact shape:
{
  "shortTitle": "short heading",
  "answer": "clear practical answer",
  "suggestedFollowUps": ["question 1", "question 2", "question 3"],
  "confidence": "low" | "medium" | "high",
  "warning": null
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a concise agricultural and land-investment analyst for HydroSense. Always return valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;

  if (!raw || typeof raw !== "string") {
    throw new Error("Empty response from OpenAI");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON returned by OpenAI");
  }

  return normalizeResponse(parsed);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const question = body?.question?.trim();
    const parcel = body?.parcel ?? {};

    if (!question) {
      return NextResponse.json(
        {
          shortTitle: "Missing question",
          answer: "Please provide a question for the AI assistant.",
          suggestedFollowUps: [],
          confidence: "low",
          warning: "Question is required",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(buildFallbackAnswer(question, parcel));
    }

    try {
      const aiResult = await askOpenAI(question, parcel, apiKey);
      return NextResponse.json(aiResult);
    } catch (error: unknown) {
      console.error("HydroSense AI route error:", error);
      return NextResponse.json(buildFallbackAnswer(question, parcel));
    }
  } catch (error: unknown) {
    console.error("HydroSense AI request parse error:", error);

    return NextResponse.json(
      {
        shortTitle: "Server error",
        answer: "The AI assistant could not process this request.",
        suggestedFollowUps: [],
        confidence: "low",
        warning: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}