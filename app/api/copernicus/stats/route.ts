import { z } from "zod";
import { geometrySchema, isValidWindow, observationWindow } from "@/lib/copernicus/request";
import { fetchAreaStats, getAnalysisArea } from "@/lib/copernicus/stats";
import { cachedRequest, readJson, RequestLimitError } from "@/lib/request-budget";

const inputSchema = z.object({
  geometry: geometrySchema,
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await readJson(request, 8192).catch(() => null));
  if (!input.success) return Response.json({ error: "Invalid geometry or dates." }, { status: 400 });

  const { geometry, from, to } = input.data;
  const area = getAnalysisArea(geometry);
  const window = from && to ? { from, to } : observationWindow();
  if (!area || Boolean(from) !== Boolean(to) || !isValidWindow(window.from, window.to)) {
    return Response.json({ error: "Unsupported area or observation window." }, { status: 400 });
  }

  try {
    const stats = await cachedRequest("stats", JSON.stringify([geometry, window]), 10,
      () => fetchAreaStats(area, window));
    return Response.json(stats);
  } catch (error) {
    if (error instanceof RequestLimitError) {
      return Response.json({ error: "Analysis limit reached. Try again in one minute." }, {
        status: 429, headers: { "Retry-After": "60" },
      });
    }
    console.error("[Copernicus stats]", error instanceof Error ? error.message : "Request failed");
    return Response.json({ error: "Sentinel-2 data is temporarily unavailable." }, { status: 503 });
  }
}
