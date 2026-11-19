import assert from "node:assert/strict";
import { test } from "node:test";
import extract from "../lib/soil-preview-cells.json" with { type: "json" };
import { projectSoilPreviewPoint, soilCellKey, soilPreviewAt } from "../lib/soil-preview.ts";

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
  assert.equal(Object.keys(extract.inputSha256).length, 28);
});

test("figure boundaries use the native raster's half-open grid, not distance to demo points", () => {
  assert.equal(soilCellKey([2827500, 5749000]), "10448:91109"); // northwest
  assert.equal(soilCellKey([2827750, 5749000]), "10448:91110"); // east belongs to the next column
  assert.equal(soilCellKey([2827500, 5748750]), "10449:91109"); // south belongs to the next row
  // WGS84 points 1 m on either side, independently derived with PROJ/GDAL.
  for (const [inside, outside] of [
    [[52.04254702647824, 23.077636986436577], [52.04254702647824, 23.077609950377067]],
    [[52.04254702647824, 23.080989457814944], [52.04254702647824, 23.081016493874447]],
    [[52.04134355768081, 23.07943103833634], [52.04132414699141, 23.07943293852883]],
    [[52.04375050719185, 23.079195397497028], [52.04376991826876, 23.079193497030804]],
  ]) {
    assert.equal(soilPreviewAt(inside).status, "available");
    assert.equal(soilPreviewAt(outside).status, "outside");
  }
});

test("changing coordinates never substitutes a nearest cell, and Venice has no numeric reading", () => {
  assert.equal(extract.cells["13252:87464"], null);
  assert.deepEqual(soilPreviewAt([45.41, 12.30]), { status: "no-data" });
  for (const point of [[45.41, 12.32], [52.0423, 23.09], [52.2297, 21.0122], [39, 23], [23.0804, 52.0423], [NaN, 12]]) {
    assert.deepEqual(soilPreviewAt(point), { status: "outside" });
  }
  assert.equal(soilPreviewAt([52.0423, 23.0804]).status, "available");
});
