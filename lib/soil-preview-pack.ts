import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const auditedSha256 = "3552c840663a2db94a130e8b04eafb7234b687b28ea71782582a82dda1b179e4";
export const soilGrid = { west: -19949750, north: 8361000, meters: 250 } as const;
export const soilDepth = [0, 5] as const;
export const soilFields = {
  phh2o: { divisor: 10, unit: "pH" },
  sand: { divisor: 10, unit: "% mass" },
  silt: { divisor: 10, unit: "% mass" },
  clay: { divisor: 10, unit: "% mass" },
  soc: { divisor: 10, unit: "g/kg" },
  bdod: { divisor: 100, unit: "kg/dm3" },
} as const;

const band = (min: number, max: number) => z.array(z.number().int().min(min).max(max).nullable()).max(3243);
const ph = () => band(1, 140);
const fraction = () => band(0, 1000);
const offsets = z.tuple([z.number().int(), z.number().int()]);
const bands = z.strictObject({ phh2o: ph(), phLow: ph(), phHigh: ph(),
  sand: fraction(), silt: fraction(), clay: fraction(), soc: band(0, 10000), bdod: band(1, 400) });
const regions = z.tuple([
  z.strictObject({ id: z.literal("biala"), row: z.literal(10440), col: z.literal(91101),
    rows: z.literal(16), cols: z.literal(16), bands }),
  z.strictObject({ id: z.literal("veneto"), row: z.literal(13187), col: z.literal(87421),
    rows: z.literal(69), cols: z.literal(47), bands }),
]);
const field = <T extends { divisor: number; unit: string }>(value: T) =>
  z.strictObject({ divisor: z.literal(value.divisor), unit: z.literal(value.unit) });
const packSchema = z.strictObject({
  dataset: z.literal("ISRIC SoilGrids"), license: z.literal("CC-BY-4.0"), schema: z.literal(2),
  version: z.string().regex(/^soilgrids-igh250-[a-f0-9]{16}$/), preparedOn: z.iso.date(),
  grid: z.strictObject({ west: z.literal(soilGrid.west), north: z.literal(soilGrid.north),
    meters: z.literal(soilGrid.meters), projection: z.literal("igh") }),
  depthCm: z.tuple([z.literal(soilDepth[0]), z.literal(soilDepth[1])]),
  fields: z.strictObject({
    phh2o: field(soilFields.phh2o), sand: field(soilFields.sand), silt: field(soilFields.silt),
    clay: field(soilFields.clay), soc: field(soilFields.soc), bdod: field(soilFields.bdod),
  }),
  sourceOffsets: z.strictObject({ phh2o: offsets, sand: offsets, silt: offsets, clay: offsets,
    soc: offsets, bdod: offsets, phLow: offsets, phHigh: offsets }),
  sources: z.record(z.string().min(1), z.strictObject({
    sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(),
  })).refine(value => Object.keys(value).length === 28),
  regions,
});

type SoilPack = z.infer<typeof packSchema>;

export function parseSoilPack(bytes: Buffer, expectedSha256 = auditedSha256): SoilPack {
  if (createHash("sha256").update(bytes).digest("hex") !== expectedSha256) throw new Error("soil_pack_checksum");
  const parsed = packSchema.safeParse(JSON.parse(bytes.toString("utf8")));
  if (!parsed.success) throw new Error("soil_pack_schema");
  for (const { rows, cols, bands } of parsed.data.regions) {
    if (Object.values(bands).some(layer => layer.length !== rows * cols)) throw new Error("soil_pack_band_length");
    for (let i = 0; i < rows * cols; i++) {
      const low = bands.phLow[i], median = bands.phh2o[i], high = bands.phHigh[i];
      if ((low !== null && high !== null && low > high)
        || (median !== null && ((low !== null && low > median) || (high !== null && median > high)))) {
        throw new Error("soil_pack_quantiles");
      }
    }
  }
  return parsed.data;
}

export function createSoilPackLoader(read: () => Buffer, reportFailure?: () => void, expectedSha256?: string) {
  let cached: SoilPack | null | undefined;
  return () => {
    if (cached !== undefined) return cached;
    try {
      cached = parseSoilPack(read(), expectedSha256);
    } catch {
      cached = null;
      reportFailure?.();
    }
    return cached;
  };
}

// Read the deploy artifact at runtime so optional soil data cannot break the build or other reports.
export const loadSoilPack = createSoilPackLoader(
  () => readFileSync(path.join(process.cwd(), "lib", "soil-preview-regions.json")),
  () => console.warn("HydroSense: audited SoilGrids pack unavailable or invalid"),
);
