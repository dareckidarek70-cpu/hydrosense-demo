import { z } from "zod";
import { geometrySchema, isValidHistoryWindow, observationWindow } from "@/lib/copernicus/request";
import { getAnalysisArea } from "@/lib/copernicus/stats";
import { loadReportStats } from "@/lib/copernicus/stats-cache";
import { readJson } from "@/lib/request-budget";
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
    return Response.json(await loadReportStats(geometry, area, window));
  } catch (error) {
    return providerFailure("statistics", error);
  }
}
