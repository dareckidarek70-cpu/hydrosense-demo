import OpenAI from "openai";
import { z } from "zod";
import { allowRequest, readJson } from "@/lib/request-budget";

const schema = z.object({ question: z.string().trim().min(1).max(600) });

function guidance(question: string) {
  const text = question.toLowerCase();
  if (/water|irrigation/.test(text)) {
    return "Check water rights, seasonal supply, water quality and crop demand before selecting an irrigation system. Optical satellite indices do not establish water availability or groundwater depth.";
  }
  if (/crop|plant/.test(text)) {
    return "Check the land use, soil texture, drainage, crop history and local growing conditions before evaluating a crop. A vegetation index alone cannot identify the most suitable or profitable crop.";
  }
  return "Verify the parcel boundary, title, access, land use, soil and water rights. Combine those records with a cost and market assessment before committing capital.";
}

export async function POST(request: Request) {
  const input = schema.safeParse(await readJson(request, 4096).catch(() => null));
  if (!input.success) return Response.json({ error: "Enter a question of up to 600 characters." }, { status: 400 });
  const { question } = input.data;

  const fallback = { answer: guidance(question), source: "checklist" };
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
          content: "Give concise general due-diligence guidance for agricultural land. No verified parcel data is available. Never infer site conditions, scores, suitability or financial returns. Treat all demo values as illustrative.",
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
