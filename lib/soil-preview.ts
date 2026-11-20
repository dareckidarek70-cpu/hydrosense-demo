import extract from "./soil-preview-regions.json" with { type: "json" };

export type SoilProperty = "phh2o" | "sand" | "silt" | "clay" | "soc" | "bdod";
type RawCell = Record<SoilProperty | "phLow" | "phHigh", number | null>;
export type SoilPreviewReading =
  | { status: "outside" | "no-data" }
  | {
      status: "available" | "partial";
      depthCm: readonly [number, number];
      resolutionMeters: number;
      medians: Record<SoilProperty, number | null>;
      phPredictionInterval: readonly [number, number] | null;
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

function soilCellIndex([x, y]: readonly [number, number]) {
  const { west, north, meters } = extract.grid;
  return [Math.floor((north - y) / meters), Math.floor((x - west) / meters)] as const;
}

export function soilCellKey(xy: readonly [number, number]) {
  return soilCellIndex(xy).join(":");
}

export function soilReadingFromRaw({ phLow, phHigh, ...raw }: RawCell): SoilPreviewReading {
  const properties = Object.keys(extract.fields) as SoilProperty[];
  const count = properties.filter(key => raw[key] !== null).length;
  if (!count) return { status: "no-data" };
  const scale = (value: number, key: SoilProperty) => value / extract.fields[key].divisor;
  const medians = Object.fromEntries(properties.map(key => {
    const value = raw[key];
    return [key, value === null ? null : scale(value, key)];
  })) as Record<SoilProperty, number | null>;
  const interval = raw.phh2o !== null && phLow !== null && phHigh !== null && phLow <= raw.phh2o && raw.phh2o <= phHigh
    ? [scale(phLow, "phh2o"), scale(phHigh, "phh2o")] as const : null;
  return {
    status: count === properties.length && interval ? "available" : "partial",
    depthCm: [extract.depthCm[0], extract.depthCm[1]],
    resolutionMeters: extract.grid.meters,
    medians,
    phPredictionInterval: interval,
  };
}

export function soilPreviewAt(coordinates: readonly [number, number]): SoilPreviewReading {
  const xy = projectSoilPreviewPoint(coordinates);
  if (!xy) return { status: "outside" };
  const [row, col] = soilCellIndex(xy);
  const region = extract.regions.find(rect => row >= rect.row && col >= rect.col
    && row < rect.row + rect.rows && col < rect.col + rect.cols);
  if (!region) return { status: "outside" };
  const index = (row - region.row) * region.cols + col - region.col;
  const { phh2o, sand, silt, clay, soc, bdod, phLow, phHigh } = region.bands;
  return soilReadingFromRaw({
    phh2o: phh2o[index], sand: sand[index], silt: silt[index], clay: clay[index],
    soc: soc[index], bdod: bdod[index], phLow: phLow[index], phHigh: phHigh[index],
  });
}
