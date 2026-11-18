import { z } from "zod";
import { DAY, geometrySchema, isValidHistoryWindow, observationWindow } from "@/lib/copernicus/request";
import { fetchAreaStats, getAnalysisArea } from "@/lib/copernicus/stats";
import { cachedRequest, readJson } from "@/lib/request-budget";
import { apiFailure, providerFailure } from "@/lib/copernicus/api-error";

const inputSchema = z.object({
  geometry: geometrySchema,
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await readJson(request, 8192).catch(() => null));
  if (!input.success) return apiFailure("badRequest", 400);

  const { geometry, from, to } = input.data;
  const area = getAnalysisArea(geometry);
  const window = from && to ? { from, to } : observationWindow();
  if (!area || Boolean(from) !== Boolean(to) || !isValidHistoryWindow(window)) {
    return apiFailure("badRequest", 400);
  }

  try {
    const canonicalWindow = { from: new Date(window.from).toISOString(), to: new Date(window.to).toISOString() };
    const longRange = Date.parse(window.to) - Date.parse(window.from) > 90 * DAY;
    const stats = await cachedRequest(longRange ? "stats-history" : "stats", JSON.stringify([geometry, canonicalWindow]),
      longRange ? 3 : 10, () => fetchAreaStats(area, canonicalWindow));
    return Response.json(stats);
  } catch (error) {
    return providerFailure("statistics", error);
  }
}
