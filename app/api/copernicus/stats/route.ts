import { NextRequest, NextResponse } from "next/server";
import { fetchAreaStats, type AreaGeometry } from "@/lib/copernicus/stats";

type StatsResponse = {
  stats: {
    medianNdvi: number | null;
    medianNdwi: number | null;
    ndviStdDev: number | null;
    ndwiStdDev: number | null;
    sampleCount: number;
    intervals: {
      ndvi: Array<{
        mean: number | null;
        stDev: number | null;
        sampleCount: number;
      }>;
      ndwi: Array<{
        mean: number | null;
        stDev: number | null;
        sampleCount: number;
      }>;
    };
  };
  scores: {
    investment: number;
    irrigation: number;
    cropFit: number;
    risk: "Low" | "Medium" | "High";
  };
  meta: {
    source: "copernicus-live" | "fallback";
    note: string;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreFromStats(stats: {
  medianNdvi: number | null;
  medianNdwi: number | null;
  ndviStdDev: number | null;
  ndwiStdDev: number | null;
}): StatsResponse["scores"] {
  const ndvi = stats.medianNdvi ?? 0.32;
  const ndwi = stats.medianNdwi ?? -0.08;
  const ndviVar = stats.ndviStdDev ?? 0.08;
  const ndwiVar = stats.ndwiStdDev ?? 0.08;

  const cropFit = clamp(Math.round(58 + ndvi * 45 - ndviVar * 40), 45, 92);
  const irrigation = clamp(Math.round(60 + (ndwi + 0.2) * 55 - ndwiVar * 30), 40, 92);
  const investment = clamp(
    Math.round((cropFit * 0.45) + (irrigation * 0.4) + ((1 - ndviVar) * 15)),
    45,
    92
  );

  const combined =
    cropFit >= 78 && irrigation >= 74
      ? "Low"
      : cropFit >= 65 && irrigation >= 60
      ? "Medium"
      : "High";

  return {
    investment,
    irrigation,
    cropFit,
    risk: combined,
  };
}

function buildFallbackScores(
  geometry: AreaGeometry
): StatsResponse {
  let seed = 0;

  if (geometry.type === "PointBuffer") {
    const [lat, lng] = geometry.coordinates;
    seed =
      Math.abs(Math.round(lat * 1000)) +
      Math.abs(Math.round(lng * 1000)) +
      geometry.radiusMeters;
  } else {
    seed = geometry.coordinates.length * 37;
  }

  const investment = clamp(68 + (seed % 11), 62, 82);
  const irrigation = clamp(64 + (seed % 10), 58, 80);
  const cropFit = clamp(66 + (seed % 9), 60, 82);

  const risk: "Low" | "Medium" | "High" =
    investment >= 78 && irrigation >= 74
      ? "Low"
      : investment >= 68
      ? "Medium"
      : "High";

  return {
    stats: {
      medianNdvi: null,
      medianNdwi: null,
      ndviStdDev: null,
      ndwiStdDev: null,
      sampleCount: 0,
      intervals: {
        ndvi: [],
        ndwi: [],
      },
    },
    scores: {
      investment,
      irrigation,
      cropFit,
      risk,
    },
    meta: {
      source: "fallback",
      note: "Fallback scores were used because live Copernicus statistics were temporarily unavailable.",
    },
  };
}

function isPointBufferGeometry(value: unknown): value is {
  type: "PointBuffer";
  coordinates: [number, number];
  radiusMeters: number;
} {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return (
    v.type === "PointBuffer" &&
    Array.isArray(v.coordinates) &&
    v.coordinates.length === 2 &&
    typeof v.coordinates[0] === "number" &&
    typeof v.coordinates[1] === "number" &&
    typeof v.radiusMeters === "number"
  );
}

function isPolygonGeometry(value: unknown): value is {
  type: "Polygon";
  coordinates: [number, number][];
} {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return (
    v.type === "Polygon" &&
    Array.isArray(v.coordinates) &&
    v.coordinates.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number"
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const geometryRaw = body?.geometry;
    const from = typeof body?.from === "string" ? body.from : null;
    const to = typeof body?.to === "string" ? body.to : null;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from/to date range." },
        { status: 400 }
      );
    }

    let geometry: AreaGeometry;

    if (isPointBufferGeometry(geometryRaw)) {
      geometry = {
        type: "PointBuffer",
        coordinates: geometryRaw.coordinates,
        radiusMeters: geometryRaw.radiusMeters,
      };
    } else if (isPolygonGeometry(geometryRaw)) {
      geometry = {
        type: "Polygon",
        coordinates: geometryRaw.coordinates,
      };
    } else {
      return NextResponse.json(
        { error: "Invalid geometry payload." },
        { status: 400 }
      );
    }

    try {
      const stats = await fetchAreaStats({
        geometry,
        from,
        to,
      });

      const scores = scoreFromStats(stats);

      const response: StatsResponse = {
        stats,
        scores,
        meta: {
          source: "copernicus-live",
          note: "Live Copernicus statistics were used successfully.",
        },
      };

      return NextResponse.json(response, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("[Copernicus stats] live fetch failed, using fallback:", error);

      const fallback = buildFallbackScores(geometry);

      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (error) {
    console.error("[Copernicus stats] fatal route error:", error);

    const fallback = buildFallbackScores({
      type: "PointBuffer",
      coordinates: [45.4372, 12.3346],
      radiusMeters: 500,
    });

    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}