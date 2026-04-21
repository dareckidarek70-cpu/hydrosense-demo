import { NextRequest } from "next/server";
import { fetchLayerImage } from "@/lib/copernicus/process";
import { getCopernicusAccessToken } from "@/lib/copernicus/auth";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;

    const minLng = Number(search.get("minLng"));
    const minLat = Number(search.get("minLat"));
    const maxLng = Number(search.get("maxLng"));
    const maxLat = Number(search.get("maxLat"));
    const width = Number(search.get("width") ?? 1024);
    const height = Number(search.get("height") ?? 1024);
    const layer = (search.get("layer") ?? "TRUE_COLOR") as
      | "TRUE_COLOR"
      | "NDVI"
      | "NDWI";

    const timeFrom = search.get("from") ?? "2026-04-01T00:00:00Z";
    const timeTo = search.get("to") ?? "2026-04-30T23:59:59Z";

    if (
      !Number.isFinite(minLng) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLng) ||
      !Number.isFinite(maxLat)
    ) {
      return new Response("Invalid bbox parameters", { status: 400 });
    }

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return new Response("Invalid width/height parameters", { status: 400 });
    }

    console.log("[Copernicus layer] Request params:", {
      minLng,
      minLat,
      maxLng,
      maxLat,
      width,
      height,
      layer,
      timeFrom,
      timeTo,
    });

    const token = await getCopernicusAccessToken();
    console.log("[Copernicus layer] Access token received");

    const image = await fetchLayerImage({
      bbox: [minLng, minLat, maxLng, maxLat],
      width,
      height,
      timeFrom,
      timeTo,
      layer,
      accessToken: token,
    });

    console.log("[Copernicus layer] Image fetched successfully");

    return new Response(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("[Copernicus layer] ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return new Response(`Copernicus layer error: ${message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}