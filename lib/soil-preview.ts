import extract from "./soil-preview-cells.json" with { type: "json" };

export type SoilProperty = "phh2o" | "sand" | "silt" | "clay" | "soc" | "bdod";
export type SoilPreviewReading =
  | { status: "outside" | "no-data" }
  | {
      status: "available";
      depthCm: readonly [number, number];
      resolutionMeters: number;
      medians: Record<SoilProperty, number>;
      phPredictionInterval: readonly [number, number];
    };

const wgs84Radius = 6_378_137;
const radians = Math.PI / 180;
const joinLatitude = (40 + 44 / 60 + 11.8 / 3600) * radians;
const centralMeridian = 30 * radians;

function mollweideAngle(latitude: number) {
  const target = Math.PI * Math.sin(latitude);
  let twice = latitude;
  for (let i = 0; i < 12; i++) {
    const correction = (twice + Math.sin(twice) - target) / (1 + Math.cos(twice));
    twice -= correction;
    if (Math.abs(correction) < 1e-12) break;
  }
  return twice / 2;
}

const northingOffset = joinLatitude - Math.SQRT2 * Math.sin(mollweideAngle(joinLatitude));

// Only the northern Mollweide lobe containing the prepared European cells is needed.
export function projectSoilPreviewPoint([lat, lon]: readonly [number, number]): readonly [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 41 || lat > 60 || lon < 5 || lon > 35) return null;
  const theta = mollweideAngle(lat * radians);
  return [
    wgs84Radius * (centralMeridian + 2 * Math.SQRT2 / Math.PI * (lon * radians - centralMeridian) * Math.cos(theta)),
    wgs84Radius * (Math.SQRT2 * Math.sin(theta) + northingOffset),
  ];
}

export function soilCellKey([x, y]: readonly [number, number]) {
  const { west, north, meters } = extract.grid;
  return `${Math.floor((north - y) / meters)}:${Math.floor((x - west) / meters)}`;
}

export function soilPreviewAt(coordinates: readonly [number, number]): SoilPreviewReading {
  const xy = projectSoilPreviewPoint(coordinates);
  if (!xy) return { status: "outside" };
  const key = soilCellKey(xy);
  if (!Object.hasOwn(extract.cells, key)) return { status: "outside" };
  const cell = extract.cells[key as keyof typeof extract.cells];
  if (!cell) return { status: "no-data" };

  const { phh2o, sand, silt, clay, soc, bdod } = cell.rawMedian;
  const [q05, q95] = cell.rawPhInterval;
  return {
    status: "available",
    depthCm: [extract.depthCm[0], extract.depthCm[1]],
    resolutionMeters: extract.grid.meters,
    medians: { phh2o: phh2o / 10, sand: sand / 10, silt: silt / 10, clay: clay / 10, soc: soc / 10, bdod: bdod / 100 },
    phPredictionInterval: [q05 / 10, q95 / 10],
  };
}
