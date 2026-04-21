type PointBufferGeometry = {
  type: "PointBuffer";
  coordinates: [number, number];
  radiusMeters: number;
};

type PolygonGeometry = {
  type: "Polygon";
  coordinates: [number, number][];
};

export type AreaGeometry = PointBufferGeometry | PolygonGeometry;

export type StatsInterval = {
  mean: number | null;
  stDev: number | null;
  sampleCount: number;
};

export type AreaStatsResult = {
  medianNdvi: number | null;
  medianNdwi: number | null;
  ndviStdDev: number | null;
  ndwiStdDev: number | null;
  sampleCount: number;
  intervals: {
    ndvi: StatsInterval[];
    ndwi: StatsInterval[];
  };
};

const AUTH_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

const STATS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/statistics";

const STATS_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "B03", "SCL", "dataMask"]
    }],
    output: [
      {
        id: "ndvi",
        bands: 1,
        sampleType: "FLOAT32"
      },
      {
        id: "ndwi",
        bands: 1,
        sampleType: "FLOAT32"
      },
      {
        id: "dataMaskOut",
        bands: 1,
        sampleType: "UINT8"
      }
    ]
  };
}

function isBadClass(scl) {
  return scl === 0 || scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}

function evaluatePixel(sample) {
  if (sample.dataMask !== 1 || isBadClass(sample.SCL)) {
    return {
      ndvi: [0],
      ndwi: [0],
      dataMaskOut: [0]
    };
  }

  const ndvi = (sample.B08 - sample.B04) / ((sample.B08 + sample.B04) + 1e-6);
  const ndwi = (sample.B03 - sample.B08) / ((sample.B03 + sample.B08) + 1e-6);

  return {
    ndvi: [ndvi],
    ndwi: [ndwi],
    dataMaskOut: [1]
  };
}
`;

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function toIso(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return date.toISOString();
}

function metersToLatDegrees(meters: number) {
  return meters / 111320;
}

function metersToLngDegrees(meters: number, latitude: number) {
  const safeCos = Math.max(Math.cos((latitude * Math.PI) / 180), 0.1);
  return meters / (111320 * safeCos);
}

function pointBufferToPolygon(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  steps = 48
): [number, number][][] {
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dy = Math.sin(angle) * radiusMeters;
    const dx = Math.cos(angle) * radiusMeters;

    const lat = centerLat + metersToLatDegrees(dy);
    const lng = centerLng + metersToLngDegrees(dx, centerLat);

    ring.push([lng, lat]);
  }

  return [ring];
}

function polygonBounds(coords: [number, number][]) {
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);

  return {
    minLng: Math.min(...lngs),
    minLat: Math.min(...lats),
    maxLng: Math.max(...lngs),
    maxLat: Math.max(...lats),
  };
}

function geometryToBounds(geometry: AreaGeometry) {
  if (geometry.type === "PointBuffer") {
    const [lat, lng] = geometry.coordinates;
    const dLat = metersToLatDegrees(geometry.radiusMeters);
    const dLng = metersToLngDegrees(geometry.radiusMeters, lat);

    return {
      minLng: lng - dLng,
      minLat: lat - dLat,
      maxLng: lng + dLng,
      maxLat: lat + dLat,
    };
  }

  return polygonBounds(geometry.coordinates);
}

function geometryToGeoJson(geometry: AreaGeometry) {
  if (geometry.type === "PointBuffer") {
    const [lat, lng] = geometry.coordinates;

    return {
      type: "Polygon" as const,
      coordinates: pointBufferToPolygon(lat, lng, geometry.radiusMeters),
    };
  }

  const ring = [...geometry.coordinates];
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (!last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  return {
    type: "Polygon" as const,
    coordinates: [ring.map(([lat, lng]) => [lng, lat])],
  };
}

function getSafeResolutionMeters(geometry: AreaGeometry) {
  if (geometry.type === "PointBuffer") {
    if (geometry.radiusMeters <= 500) return 20;
    if (geometry.radiusMeters <= 1000) return 40;
    return 60;
  }

  return 40;
}

async function getAccessToken() {
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET in environment variables."
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Copernicus auth error: ${response.status} ${text}`);
  }

  const json = JSON.parse(text) as { access_token?: string };

  if (!json.access_token) {
    throw new Error("Copernicus auth error: access_token missing");
  }

  return json.access_token;
}

function getTimeIntervals(fromIso: string, toIso: string) {
  return {
    from: fromIso,
    to: toIso,
  };
}

function parseBandStatsEntry(entry: any): StatsInterval {
  const stats = entry?.outputs?.default?.bands?.B0?.stats ?? {};
  return {
    mean: typeof stats.mean === "number" ? stats.mean : null,
    stDev: typeof stats.stDev === "number" ? stats.stDev : null,
    sampleCount:
      typeof stats.sampleCount === "number"
        ? stats.sampleCount
        : typeof stats.sampleCountNoData === "number"
        ? stats.sampleCountNoData
        : 0,
  };
}

function parseStatsResponse(json: any): AreaStatsResult {
  const data = Array.isArray(json?.data) ? json.data : [];

  const ndviSeries = data.map((entry: any) => {
    const stats = entry?.outputs?.ndvi?.bands?.B0?.stats ?? {};
    return {
      mean: typeof stats.mean === "number" ? stats.mean : null,
      stDev: typeof stats.stDev === "number" ? stats.stDev : null,
      sampleCount:
        typeof stats.sampleCount === "number" ? stats.sampleCount : 0,
    };
  });

  const ndwiSeries = data.map((entry: any) => {
    const stats = entry?.outputs?.ndwi?.bands?.B0?.stats ?? {};
    return {
      mean: typeof stats.mean === "number" ? stats.mean : null,
      stDev: typeof stats.stDev === "number" ? stats.stDev : null,
      sampleCount:
        typeof stats.sampleCount === "number" ? stats.sampleCount : 0,
    };
  });

  const ndviMeans = ndviSeries
    .map((item) => item.mean)
    .filter((value): value is number => typeof value === "number");

  const ndwiMeans = ndwiSeries
    .map((item) => item.mean)
    .filter((value): value is number => typeof value === "number");

  const ndviStdValues = ndviSeries
    .map((item) => item.stDev)
    .filter((value): value is number => typeof value === "number");

  const ndwiStdValues = ndwiSeries
    .map((item) => item.stDev)
    .filter((value): value is number => typeof value === "number");

  const sampleCount = ndviSeries.reduce(
    (sum, item) => sum + (item.sampleCount || 0),
    0
  );

  return {
    medianNdvi: median(ndviMeans),
    medianNdwi: median(ndwiMeans),
    ndviStdDev: median(ndviStdValues),
    ndwiStdDev: median(ndwiStdValues),
    sampleCount,
    intervals: {
      ndvi: ndviSeries,
      ndwi: ndwiSeries,
    },
  };
}

export async function fetchSingleStats(params: {
  geometry: AreaGeometry;
  from: string;
  to: string;
  resolutionMeters?: number;
}) {
  const token = await getAccessToken();

  const fromIso = toIso(params.from);
  const toIsoValue = toIso(params.to);
  const resolutionMeters =
    params.resolutionMeters ?? getSafeResolutionMeters(params.geometry);

  const bounds = geometryToBounds(params.geometry);
  const geoJson = geometryToGeoJson(params.geometry);

  const payload = {
    input: {
      bounds: {
        bbox: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
        geometry: geoJson,
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
        },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: getTimeIntervals(fromIso, toIsoValue),
          },
        },
      ],
    },
    aggregation: {
      timeRange: getTimeIntervals(fromIso, toIsoValue),
      aggregationInterval: {
        of: "P1M",
      },
      resx: `${resolutionMeters}m`,
      resy: `${resolutionMeters}m`,
      evalscript: STATS_EVALSCRIPT,
    },
    calculations: {
      default: {},
    },
  };

  const response = await fetch(STATS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Copernicus Statistical API error: ${response.status} ${text}`);
  }

  return JSON.parse(text);
}

export async function fetchAreaStats(params: {
  geometry: AreaGeometry;
  from: string;
  to: string;
}): Promise<AreaStatsResult> {
  const safeResolutions = [20, 40, 60, 80, 120];

  let lastError: unknown = null;

  for (const resolution of safeResolutions) {
    try {
      const json = await fetchSingleStats({
        geometry: params.geometry,
        from: params.from,
        to: params.to,
        resolutionMeters: resolution,
      });

      return parseStatsResponse(json);
    } catch (error) {
      lastError = error;

      const message =
        error instanceof Error ? error.message : String(error);

      const shouldRetry =
        message.includes("meters per pixel exceeds the limit") ||
        message.includes('"COMMON_EXCEPTION"') ||
        message.includes("Bad Request");

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to fetch Copernicus area statistics.");
}