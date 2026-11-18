import type { NextRequest } from "next/server";
import { isValidWindow, observationWindow } from "@/lib/copernicus/request";
import { fetchLayerImage } from "@/lib/copernicus/process";
import { EVALSCRIPTS, type LayerType } from "@/lib/copernicus/evalscripts";
import { getCopernicusAccessToken } from "@/lib/copernicus/auth";
import { cachedRequest, RequestLimitError } from "@/lib/request-budget";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const coordinates = ["minLng", "minLat", "maxLng", "maxLat"].map((key) => {
    const value = search.get(key);
    return value?.trim() ? Number(value) : NaN;
  });
  const [west, south, east, north] = coordinates;
  const width = Number(search.get("width") ?? 640);
  const height = Number(search.get("height") ?? 640);
  const layer = search.get("layer") ?? "TRUE_COLOR";
  const defaults = observationWindow();
  const timeFrom = search.get("from") ?? defaults.from;
  const timeTo = search.get("to") ?? defaults.to;

  if (!coordinates.every(Number.isFinite) || west < -180 || east > 180
    || south < -84 || north > 84 || east <= west || north <= south
    || east - west > 1 || north - south > 1
    || ![width, height].every((value) => Number.isInteger(value) && value >= 64 && value <= 768)
    || !Object.hasOwn(EVALSCRIPTS, layer) || !isValidWindow(timeFrom, timeTo)) {
    return new Response("Invalid layer request. Zoom in to use satellite layers.", { status: 400 });
  }

  try {
    const image = await cachedRequest("layer", JSON.stringify([
      coordinates, width, height, layer, timeFrom, timeTo,
    ]), 20, async () => fetchLayerImage({
      bbox: [west, south, east, north],
      width, height, timeFrom, timeTo, layer: layer as LayerType,
      accessToken: await getCopernicusAccessToken(),
    }));
    return new Response(image, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    if (error instanceof RequestLimitError) {
      return new Response("Layer request limit reached.", { status: 429, headers: { "Retry-After": "60" } });
    }
    console.error("[Copernicus layer]", error instanceof Error ? error.message : "Request failed");
    return new Response("Satellite layer temporarily unavailable.", { status: 503 });
  }
}
