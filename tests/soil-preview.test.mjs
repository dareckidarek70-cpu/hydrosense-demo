import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import extract from "../lib/soil-preview-regions.json" with { type: "json" };
import { projectSoilPreviewPoint, soilCellKey, soilPreviewAt, soilReadingFromRaw } from "../lib/soil-preview.ts";
import { createSoilPackLoader, parseSoilPack } from "../lib/soil-preview-pack.ts";

test("the native cells match independently projected IX A samples", () => {
  for (const [point, expected, key] of [
    [[52.0423, 23.0804], [2827703.6059668474, 5748849.547605346], "10448:91109"],
    [[45.41, 12.30], [1916410.2819100022, 5047876.8819463225], "13252:87464"],
    [[45.55, 12.15], [1906588.8021875364, 5063017.380703863], "13191:87425"],
  ]) {
    const xy = projectSoilPreviewPoint(point);
    assert.ok(Math.hypot(xy[0] - expected[0], xy[1] - expected[1]) < 0.001);
    assert.equal(soilCellKey(xy), key);
  }
});

test("texture medians remain unscaled; pH, carbon and density use their respective units", () => {
  assert.deepEqual(soilPreviewAt([52.0423, 23.0804]), {
    status: "available", depthCm: [0, 5], resolutionMeters: 250,
    medians: { phh2o: 5.4, sand: 60.3, silt: 29.8, clay: 5, soc: 21.6, bdod: 1.27 },
    phPredictionInterval: [3.9, 7.6],
  });
  assert.deepEqual(soilPreviewAt([45.55, 12.15]), {
    status: "available", depthCm: [0, 5], resolutionMeters: 250,
    medians: { phh2o: 7.8, sand: 25.4, silt: 46.8, clay: 19.7, soc: 33.3, bdod: 1.34 },
    phPredictionInterval: [5.6, 8.3],
  });
  assert.equal(extract.license, "CC-BY-4.0");
  assert.equal(extract.schema, 2);
  assert.match(extract.version, /^soilgrids-igh250-[a-f0-9]{16}$/);
  for (const file of Object.values(extract.sources)) assert.match(file.sha256, /^[a-f0-9]{64}$/);
});

test("figure boundaries use the native raster's half-open grid, not distance to demo points", () => {
  assert.equal(soilCellKey([2827500, 5749000]), "10448:91109"); // northwest
  assert.equal(soilCellKey([2827750, 5749000]), "10448:91110"); // east belongs to the next column
  assert.equal(soilCellKey([2827500, 5748750]), "10449:91109"); // south belongs to the next row
  // WGS84 points 1 m on either side of the two extract borders, derived with PROJ/GDAL.
  for (const [inside, outside] of [
    [[52.043760212729936, 23.050481659303152], [52.043760212729936, 23.050454622779647]],
    [[52.043760212729936, 23.104527669787252], [52.043760212729936, 23.104554706310758]],
    [[52.06316313311813, 23.075603589892992], [52.0631825472967, 23.075601686770195]],
    [[52.02436038937192, 23.079403550678492], [52.02434098139363, 23.07940544941987]],
    [[45.4816285534028, 12.150084306064386], [45.4816285534028, 12.150059412237896]],
    [[45.4816285534028, 12.296310642848235], [45.4816285534028, 12.296335536674722]],
    [[45.56139413489147, 12.207351776461028], [45.561412638279386, 12.207348093813438]],
    [[45.401904912509146, 12.238975691963784], [45.40188642857646, 12.238979343308689]],
  ]) {
    assert.notEqual(soilPreviewAt(inside).status, "outside");
    assert.equal(soilPreviewAt(outside).status, "outside");
  }
});

test("changing coordinates never substitutes a nearest cell, and Venice has no numeric reading", () => {
  assert.deepEqual(soilPreviewAt([45.41, 12.30]), { status: "no-data" });
  for (const point of [[45.41, 12.40], [52.0423, 23.20], [52.2297, 21.0122], [39, 23], [23.0804, 52.0423], [NaN, 12]]) {
    assert.deepEqual(soilPreviewAt(point), { status: "outside" });
  }
  assert.equal(soilPreviewAt([52.0423, 23.0804]).status, "available");
});

test("partial cells retain valid zero and other readings; missing quantiles never produce an interval", () => {
  const raw = { phh2o: 54, sand: 0, silt: null, clay: 50, soc: 216, bdod: 127, phLow: null, phHigh: 76 };
  const partial = soilReadingFromRaw(raw);
  assert.equal(partial.status, "partial");
  assert.equal(partial.medians.sand, 0);
  assert.equal(partial.medians.silt, null);
  assert.equal(partial.medians.bdod, 1.27);
  assert.equal(partial.phPredictionInterval, null);
  assert.equal(soilReadingFromRaw({ ...raw, silt: 298, phLow: 39 }).status, "available");
  assert.equal(soilReadingFromRaw({ ...raw, silt: 298, phLow: 70, phHigh: 71 }).phPredictionInterval, null);
  assert.deepEqual(soilReadingFromRaw(Object.fromEntries(Object.keys(raw).map(key => [key, null]))), { status: "no-data" });
});

test("both continuous windows keep all native rows with separate masks", () => {
  assert.deepEqual(extract.regions.map(r => [r.id, r.rows, r.cols]), [["biala", 16, 16], ["veneto", 69, 47]]);
  assert.deepEqual(extract.sourceOffsets.soc, [0, -3]);
  assert.deepEqual(extract.sourceOffsets.bdod, [0, -3]);
  for (const region of extract.regions) {
    assert.equal(Object.keys(region.bands).length, 8);
    for (const layer of Object.values(region.bands)) {
      assert.equal(layer.length, region.rows * region.cols);
      assert.ok(layer.every(v => v === null || Number.isInteger(v) && v >= 0));
    }
  }
  assert.ok(extract.regions[1].bands.phh2o.includes(null));
});

test("new independently sampled regional locations return their own readings and masks", () => {
  const biala = soilPreviewAt([52.059532736, 23.064128316]);
  const veneto = soilPreviewAt([45.523244962, 12.221163987]);
  assert.deepEqual(biala.medians, { phh2o: 5.4, sand: 61.3, silt: 25.7, clay: 4.7, soc: 24.5, bdod: 1.21 });
  assert.deepEqual(veneto.medians, { phh2o: 7.7, sand: 18.1, silt: 44.8, clay: 27.2, soc: 35.6, bdod: 1.34 });
  assert.deepEqual(soilPreviewAt([52.061959460, 23.077411797]), { status: "no-data" });
});

test("a missing, altered or malformed pack is unavailable, never a misleading soil value", () => {
  let reads = 0, warnings = 0;
  const broken = createSoilPackLoader(() => { reads++; throw new Error("ENOENT"); }, () => warnings++);
  assert.deepEqual(soilPreviewAt([52.0423, 23.0804], broken), { status: "unavailable" });
  assert.deepEqual(soilPreviewAt([45.55, 12.15], broken), { status: "unavailable" });
  assert.equal(reads, 1);
  assert.equal(warnings, 1);
  const malformed = Buffer.from("{not-json");
  const hash = value => createHash("sha256").update(value).digest("hex");
  assert.equal(createSoilPackLoader(() => malformed, undefined, hash(malformed))(), null);
  const altered = structuredClone(extract);
  altered.regions[0].bands.soc[0] = 120;
  const bytes = Buffer.from(JSON.stringify(altered));
  assert.throws(() => parseSoilPack(bytes), /soil_pack_checksum/);
});

test("valid checksums cannot authorize bad metadata, truncated bands or impossible quantiles", () => {
  for (const [mutate, error] of [
    [pack => { pack.schema = 3; }, /soil_pack_schema/],
    [pack => { pack.fields.soc.divisor = 100; }, /soil_pack_schema/],
    [pack => { pack.grid.projection = "EPSG:3857"; }, /soil_pack_schema/],
    [pack => { pack.regions[0].bands.silt.pop(); }, /soil_pack_band_length/],
    [pack => { pack.regions[1].bands.phLow[0] = 98; pack.regions[1].bands.phh2o[0] = 61; }, /soil_pack_quantiles/],
    [pack => { pack.regions[1].bands.sand[0] = -32768; }, /soil_pack_schema/],
  ]) {
    const amended = structuredClone(extract);
    mutate(amended);
    const bytes = Buffer.from(JSON.stringify(amended));
    assert.throws(() => parseSoilPack(bytes, createHash("sha256").update(bytes).digest("hex")), error);
  }
});

test("invalid coordinates do not read the optional artifact", () => {
  for (const point of [[Infinity, 23], [-90, -180], [52, NaN], [52, 180], [0, 0], [91, 361]]) {
    assert.deepEqual(soilPreviewAt(point, () => { throw new Error("unexpected read"); }), { status: "outside" });
  }
});
