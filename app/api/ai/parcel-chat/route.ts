import OpenAI from "openai";
import { z } from "zod";
import { allowRequest, readJson } from "@/lib/request-budget";
import { getLocalization } from "@/lib/i18n/server";

const schema = z.object({ question: z.string().trim().min(1).max(600) });

function guidance(question: string) {
  const text = question.toLowerCase().normalize("NFC");
  if (/water|irrigation|wod|nawadnia/.test(text)) return "guideWater";
  if (/crop|plant|upraw|roślin/.test(text)) return "guideCrop";
  return "guideGeneral";
}

export async function POST(request: Request) {
  const { t, locale } = await getLocalization();
  const input = schema.safeParse(await readJson(request, 4096).catch(() => null));
  if (!input.success) return Response.json({ error: t("questionLimit") }, { status: 400 });
  const { question } = input.data;

  const fallback = { answer: t(guidance(question)), source: "checklist" };
  const apiKey = process.env.OPENAI_API_KEY;
  if (process.env.HYDROSENSE_ENABLE_AI !== "true" || !apiKey || !allowRequest("ai", 3)) {
    return Response.json(fallback);
  }

  try {
    const client = new OpenAI({ apiKey, timeout: 10_000, maxRetries: 0 });
    const result = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      max_completion_tokens: 250,
      messages: [
        {
          role: "system",
          content: `Answer in ${locale === "pl" ? "Polish" : "English"}. Give concise general due-diligence guidance for agricultural land. No verified parcel data is available. Never infer site conditions, scores, suitability or financial returns. Treat all demo values as illustrative.`,
        },
        { role: "user", content: question },
      ],
    });
    const answer = result.choices[0]?.message.content;
    return Response.json(answer ? { answer, source: "ai-guidance" } : fallback);
  } catch {
    return Response.json(fallback);
  }
}
